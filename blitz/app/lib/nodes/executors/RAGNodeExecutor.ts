import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { RAGConfig, NodeData } from '@/app/lib/types/workflow';
import { ExecutionContext, ExecutionError } from '../types/execution';
import { searchSimilarDocuments } from '@/app/lib/rag';

export interface RAGExecutionResult {
  answer: string;
  hasContext: boolean;
  confidence: number;
  sources: Array<{
    category?: string;
    similarity: number;
    content?: string;
  }>;
  method: 'RAG_TO_FRONTEND';
  responseMode: 'concise' | 'detailed' | 'raw';
}

export class RAGNodeExecutor {
  private config: RAGConfig;

  constructor(nodeData: NodeData & { ragConfig?: RAGConfig }) {
    if (!nodeData.ragConfig) {
      throw new Error('RAG configuration is missing');
    }
    
    // Validate that required fields are present
    if (!nodeData.ragConfig.responseMode) {
      throw new Error('RAG configuration is incomplete: responseMode is required');
    }
    
    this.config = nodeData.ragConfig;
  }

  /**
   * Validates the RAG node configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.responseMode) {
      errors.push('Response mode is required');
    }

    const validModes = ['concise', 'detailed', 'raw'];
    if (this.config.responseMode && !validModes.includes(this.config.responseMode)) {
      errors.push(`Invalid response mode: "${this.config.responseMode}"`);
    }

    // Validate threshold
    if (this.config.matchThreshold !== undefined) {
      const threshold = this.config.matchThreshold;
      if (threshold < 0 || threshold > 1) {
        errors.push('Match threshold must be between 0 and 1');
      }
    }

    // Validate count
    if (this.config.matchCount !== undefined) {
      const count = this.config.matchCount;
      if (count < 1 || count > 10) {
        errors.push('Match count must be between 1 and 10');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Ingests documents if needed (for paste or upload modes)
   */
  private async ingestDocumentsIfNeeded(): Promise<void> {
    const { documentMode, documentContent, uploadedFiles, category } = this.config;

    // Only ingest for paste or upload modes
    if (documentMode === 'existing') {
      return; // Use existing knowledge base
    }

    console.log('[RAGNodeExecutor] Ingesting documents...', { mode: documentMode });

    const { ingestDocument } = await import('@/app/lib/rag');

    if (documentMode === 'paste' && documentContent) {
      // Ingest pasted content
      await ingestDocument(documentContent, {
        category: category || 'rag-module',
        source: 'rag-node',
        nodeIngested: true,
      });
      console.log('[RAGNodeExecutor] Pasted content ingested');
    } else if (documentMode === 'upload' && uploadedFiles && uploadedFiles.length > 0) {
      // Ingest uploaded files
      for (const file of uploadedFiles) {
        await ingestDocument(file.content, {
          category: category || 'rag-module',
          source: 'rag-node',
          fileName: file.name,
          fileType: file.type,
          nodeIngested: true,
        });
      }
      console.log('[RAGNodeExecutor] Uploaded files ingested:', uploadedFiles.length);
    }
  }

  /**
   * Executes the RAG node to retrieve context and generate answer
   */
  async execute(
    query: string,
    context: ExecutionContext,
    nodeId?: string
  ): Promise<RAGExecutionResult> {
    // Validate configuration first
    const validation = this.validateConfig();
    if (!validation.valid) {
      throw {
        code: 'RAG_CONFIG_ERROR',
        message: `RAG node configuration invalid: ${validation.errors.join(', ')}`,
      } as ExecutionError;
    }

    // Use node ID as category if provided (to search only this node's documents)
    const category = nodeId ? `rag-module-${nodeId}` : this.config.category;

    console.log('[RAGNodeExecutor] Starting execution with config:', {
      documentMode: this.config.documentMode,
      category: category || 'all',
      matchThreshold: this.config.matchThreshold || 0.7,
      matchCount: this.config.matchCount || 3,
      responseMode: this.config.responseMode,
      nodeId,
    });

    try {
      // Step 0: Ingest documents if needed (paste or upload mode)
      // Note: Documents are now ingested when saving the configuration
      // This is kept for backward compatibility
      await this.ingestDocumentsIfNeeded();
      
      // Step 1: Search for relevant documents
      const searchOptions: any = {
        matchThreshold: this.config.matchThreshold || 0.7,
        matchCount: this.config.matchCount || 3,
      };

      // Add category filter to search only this node's documents
      if (category) {
        searchOptions.metadataFilter = { category };
      }

      console.log('[RAGNodeExecutor] Searching with options:', searchOptions);
      
      const results = await searchSimilarDocuments(query, searchOptions);

      console.log('[RAGNodeExecutor] Search results:', {
        count: results.length,
        avgSimilarity: results.length > 0 
          ? (results.reduce((sum, r) => sum + r.similarity, 0) / results.length).toFixed(2)
          : 0,
      });

      // Step 2: Check if we have context
      if (results.length === 0) {
        const fallbackMessage = this.config.fallbackMessage || 
          "I couldn't find specific information about that. Please contact support for assistance.";
        
        return {
          answer: fallbackMessage,
          hasContext: false,
          confidence: 0,
          sources: [],
          method: 'RAG_TO_FRONTEND',
          responseMode: this.config.responseMode,
        };
      }

      // Step 3: Prepare sources
      const sources = results.map(r => ({
        category: r.metadata?.category as string | undefined,
        similarity: Math.round(r.similarity * 100) / 100,
        content: this.config.responseMode === 'raw' ? r.content : undefined,
      }));

      const avgConfidence = results.reduce((sum, r) => sum + r.similarity, 0) / results.length;

      // Step 4: Generate response based on mode
      let answer: string;

      if (this.config.responseMode === 'raw') {
        // Raw mode: return the context directly
        answer = results.map((r, i) => `[Source ${i + 1}]\n${r.content}`).join('\n\n---\n\n');
      } else {
        // Concise or detailed mode: use LLM to generate answer
        const contextText = results.map(r => r.content).join('\n\n');
        
        const systemPrompt = this.config.responseMode === 'concise'
          ? `You are a helpful assistant. Answer the user's question in 2-4 lines maximum using the provided context. Be direct and concise.`
          : `You are a helpful assistant. Answer the user's question thoroughly using the provided context. Provide detailed, accurate information.`;

        const prompt = `Context:\n${contextText}\n\nUser Question: ${query}\n\nProvide a ${this.config.responseMode} answer based on the context above:`;

        console.log('[RAGNodeExecutor] Generating answer with LLM...');

        // Check if Groq API key is available
        if (!process.env.GROQ_API_KEY) {
          throw {
            code: 'RAG_CONFIG_ERROR',
            message: 'GROQ_API_KEY is not configured. Please add it to your environment variables.',
          } as ExecutionError;
        }

        const result = await generateText({
          model: groq('llama-3.3-70b-versatile'),
          system: systemPrompt,
          prompt: prompt,
        });

        answer = result.text.trim();
      }

      console.log('[RAGNodeExecutor] Execution successful:', {
        answerLength: answer.length,
        confidence: avgConfidence.toFixed(2),
        sourcesCount: sources.length,
      });

      return {
        answer,
        hasContext: true,
        confidence: avgConfidence,
        sources,
        method: 'RAG_TO_FRONTEND',
        responseMode: this.config.responseMode,
      };

    } catch (error) {
      console.error('[RAGNodeExecutor] Execution error:', error);
      
      // Return error response
      throw {
        code: 'RAG_EXECUTION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to execute RAG node',
        details: {
          config: this.config,
          error: error instanceof Error ? error.stack : String(error),
        },
      } as ExecutionError;
    }
  }

  /**
   * Tests the RAG node configuration with a sample query
   */
  async test(query: string = 'What is your return policy?'): Promise<RAGExecutionResult> {
    const testContext: ExecutionContext = {
      businessId: 'test',
      userId: 'test',
      conversationHistory: [],
    };

    return this.execute(query, testContext);
  }
}

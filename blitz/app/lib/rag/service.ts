import { Pinecone } from '@pinecone-database/pinecone';
import { DocumentChunk, SimilaritySearchResult, ChunkingOptions } from './types';
import { chunkText } from './chunking';
import { generateEmbedding, generateEmbeddings } from './embeddings';
import { RAG_CONFIG } from './config';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

// Get or create index
async function getIndex() {
  const indexHost = process.env.PINECONE_INDEX_HOST;
  if (indexHost) {
    return pinecone.index(RAG_CONFIG.indexName, indexHost);
  }
  return pinecone.index(RAG_CONFIG.indexName);
}

/**
 * Ingest a document by chunking and storing with embeddings
 */
export async function ingestDocument(
  content: string,
  metadata: Record<string, any> = {},
  options: ChunkingOptions = {}
): Promise<{ success: boolean; chunksCreated: number; error?: string }> {
  try {
    console.log('[RAG] Starting document ingestion...');
    const index = await getIndex();
    console.log('[RAG] Got index reference');
    
    // Split content into chunks
    const chunks = chunkText(content, options);
    console.log(`[RAG] Split into ${chunks.length} chunks`);
    
    // Generate embeddings for all chunks
    console.log('[RAG] Generating embeddings...');
    const embeddings = await generateEmbeddings(chunks);
    console.log('[RAG] Embeddings generated');
    
    // Validate embedding dimensions
    const expectedDim = RAG_CONFIG.embeddingDimension;
    for (let i = 0; i < embeddings.length; i++) {
      if (embeddings[i].length !== expectedDim) {
        throw new Error(
          `Embedding ${i} has invalid dimension: ${embeddings[i].length}, expected ${expectedDim}`
        );
      }
    }
    console.log(`[RAG] All embeddings validated (${expectedDim} dimensions)`);

    // Prepare vectors for Pinecone
    const vectors = chunks.map((chunk, i) => ({
      id: `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
      values: embeddings[i],
      metadata: {
        content: chunk,
        ...metadata,
      },
    }));

    console.log(`[RAG] Upserting ${vectors.length} vectors to Pinecone...`);
    // Upsert to Pinecone with timeout handling
    const upsertPromise = index.upsert(vectors);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Upsert timeout after 30s')), 30000)
    );
    
    await Promise.race([upsertPromise, timeoutPromise]);
    console.log('[RAG] Upsert successful!');

    return { success: true, chunksCreated: chunks.length };
  } catch (error) {
    console.error('[RAG] Error ingesting document:', error);
    return {
      success: false,
      chunksCreated: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Search for similar documents using semantic search
 */
export async function searchSimilarDocuments(
  query: string,
  options: {
    matchThreshold?: number;
    matchCount?: number;
    metadataFilter?: Record<string, any>;
  } = {}
): Promise<SimilaritySearchResult[]> {
  try {
    const index = await getIndex();
    const {
      matchThreshold = 0.7,
      matchCount = 5,
      metadataFilter,
    } = options;

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Query Pinecone
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK: matchCount,
      includeMetadata: true,
      filter: metadataFilter,
    });

    // Transform results and filter by threshold
    const results: SimilaritySearchResult[] = queryResponse.matches
      .filter((match) => (match.score || 0) >= matchThreshold)
      .map((match) => ({
        id: match.id,
        content: (match.metadata?.content as string) || '',
        metadata: match.metadata || {},
        similarity: match.score || 0,
      }));

    return results;
  } catch (error) {
    console.error('Error in similarity search:', error);
    throw error;
  }
}

/**
 * Delete all document chunks (useful for re-ingestion)
 */
export async function clearAllDocuments(): Promise<{ success: boolean; error?: string }> {
  try {
    const index = await getIndex();
    await index.deleteAll();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete documents by metadata filter
 */
export async function deleteDocumentsByMetadata(
  metadataFilter: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const index = await getIndex();
    
    // Pinecone supports delete by metadata filter directly
    await index.deleteMany(metadataFilter);
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

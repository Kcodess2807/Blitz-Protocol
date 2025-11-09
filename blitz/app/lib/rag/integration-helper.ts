/**
 * Helper functions to integrate RAG with your existing modules
 * Use these in your cancellation, tracking, shipping modules
 */

import { searchSimilarDocuments } from './service';

/**
 * Enhance any user query with relevant context from RAG
 * This is the main function you'll use in your modules
 */
export async function enhanceQueryWithContext(
  userQuery: string,
  options?: {
    category?: string;
    matchCount?: number;
    matchThreshold?: number;
  }
) {
  const { category, matchCount = 3, matchThreshold = 0.75 } = options || {};

  try {
    // Search for relevant documents
    const results = await searchSimilarDocuments(userQuery, {
      matchThreshold,
      matchCount,
      metadataFilter: category ? { category } : undefined,
    });

    if (results.length === 0) {
      return {
        hasContext: false,
        context: '',
        originalQuery: userQuery,
        sources: [],
      };
    }

    // Build context string for LLM
    const contextString = results
      .map((r, i) => `[Source ${i + 1}] ${r.content}`)
      .join('\n\n');

    return {
      hasContext: true,
      context: contextString,
      originalQuery: userQuery,
      sources: results.map((r) => ({
        content: r.content,
        similarity: r.similarity,
        metadata: r.metadata,
      })),
    };
  } catch (error) {
    console.error('Error enhancing query with context:', error);
    return {
      hasContext: false,
      context: '',
      originalQuery: userQuery,
      sources: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Build a system prompt with RAG context
 * Use this to create enhanced prompts for your LLM
 */
export function buildSystemPromptWithContext(
  baseSystemPrompt: string,
  context: string
): string {
  if (!context) {
    return baseSystemPrompt;
  }

  return `${baseSystemPrompt}

RELEVANT COMPANY INFORMATION:
${context}

Use the above information to provide accurate answers. If the information doesn't contain the answer, say so clearly.`;
}

/**
 * Quick helper for common use cases
 */
export const ragHelpers = {
  // For cancellation module
  async getCancellationContext(query: string) {
    return enhanceQueryWithContext(query, {
      category: 'cancellation-policy',
      matchCount: 3,
    });
  },

  // For shipping module
  async getShippingContext(query: string) {
    return enhanceQueryWithContext(query, {
      category: 'shipping-policy',
      matchCount: 3,
    });
  },

  // For tracking module
  async getTrackingContext(query: string) {
    return enhanceQueryWithContext(query, {
      category: 'tracking-info',
      matchCount: 3,
    });
  },

  // For general company info
  async getCompanyContext(query: string) {
    return enhanceQueryWithContext(query, {
      category: 'company-info',
      matchCount: 5,
    });
  },

  // For product/return policies
  async getReturnPolicyContext(query: string) {
    return enhanceQueryWithContext(query, {
      category: 'return-policy',
      matchCount: 3,
    });
  },
};

/**
 * RAG module usage examples
 * Reference implementation for integrating RAG in custom modules
 */

import { searchSimilarDocuments } from './service';

/**
 * Example: Get relevant context for a cancellation query
 */
export async function getCancellationContext(userQuery: string) {
  const results = await searchSimilarDocuments(userQuery, {
    matchThreshold: 0.75,
    matchCount: 3,
    metadataFilter: { category: 'cancellation-policy' },
  });

  return {
    context: results.map(r => r.content).join('\n\n'),
    sources: results.map(r => ({
      content: r.content,
      similarity: r.similarity,
      metadata: r.metadata,
    })),
  };
}

/**
 * Example: Get relevant context for a shipping query
 */
export async function getShippingContext(userQuery: string) {
  const results = await searchSimilarDocuments(userQuery, {
    matchThreshold: 0.75,
    matchCount: 3,
    metadataFilter: { category: 'shipping-policy' },
  });

  return {
    context: results.map(r => r.content).join('\n\n'),
    sources: results.map(r => ({
      content: r.content,
      similarity: r.similarity,
      metadata: r.metadata,
    })),
  };
}

/**
 * Example: Get general company information
 */
export async function getCompanyContext(userQuery: string) {
  const results = await searchSimilarDocuments(userQuery, {
    matchThreshold: 0.7,
    matchCount: 5,
  });

  return {
    context: results.map(r => r.content).join('\n\n'),
    sources: results.map(r => ({
      content: r.content,
      similarity: r.similarity,
      metadata: r.metadata,
    })),
  };
}

/**
 * Example: Integration with LLM chat
 */
export async function enhanceChatWithRAG(
  userMessage: string,
  category?: string
) {
  // Search for relevant context
  const results = await searchSimilarDocuments(userMessage, {
    matchThreshold: 0.7,
    matchCount: 3,
    metadataFilter: category ? { category } : undefined,
  });

  // Build context for LLM
  const context = results.length > 0
    ? `Relevant information:\n\n${results.map(r => r.content).join('\n\n')}`
    : '';

  // Return enhanced prompt
  return {
    enhancedPrompt: context
      ? `${context}\n\nUser question: ${userMessage}`
      : userMessage,
    hasContext: results.length > 0,
    sources: results,
  };
}

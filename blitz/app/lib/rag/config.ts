/**
 * RAG Configuration
 * Customize these settings per company/deployment
 */

export const RAG_CONFIG = {
  // Pinecone settings
  indexName: process.env.PINECONE_INDEX_NAME || 'blitz-rag',
  
  // Embedding model settings
  // Available models and their dimensions:
  // - 'Xenova/all-MiniLM-L6-v2': 384 dimensions (fast, good quality)
  // - 'Xenova/gte-small': 384 dimensions (better quality)
  // - 'Xenova/bge-small-en-v1.5': 384 dimensions (optimized for retrieval)
  // - 'Xenova/all-mpnet-base-v2': 768 dimensions (higher quality, slower)
  embeddingModel: process.env.EMBEDDING_MODEL || 'Xenova/gte-small',
  embeddingDimension: parseInt(process.env.EMBEDDING_DIMENSION || '384'),
  
  // Search settings
  defaultMatchThreshold: parseFloat(process.env.DEFAULT_MATCH_THRESHOLD || '0.7'),
  defaultMatchCount: parseInt(process.env.DEFAULT_MATCH_COUNT || '5'),
  
  // Chunking settings
  defaultChunkSize: parseInt(process.env.CHUNK_SIZE || '800'),
  defaultChunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '200'),
};

/**
 * Validate configuration
 */
export function validateConfig() {
  if (!process.env.PINECONE_API_KEY) {
    throw new Error('PINECONE_API_KEY is required in .env');
  }
  
  console.log('RAG Configuration:', {
    indexName: RAG_CONFIG.indexName,
    embeddingModel: RAG_CONFIG.embeddingModel,
    embeddingDimension: RAG_CONFIG.embeddingDimension,
  });
}

import { pipeline } from '@xenova/transformers';
import { RAG_CONFIG } from './config';

// Use free Hugging Face embeddings (runs locally, no API key needed!)
let embedder: any = null;

async function getEmbedder() {
  if (!embedder) {
    console.log(`Loading embedding model: ${RAG_CONFIG.embeddingModel}...`);
    embedder = await pipeline('feature-extraction', RAG_CONFIG.embeddingModel);
    console.log('Embedding model loaded successfully!');
  }
  return embedder;
}

/**
 * Generate embeddings for a single text using free local model
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = await getEmbedder();
    const output = await model(text, { pooling: 'mean', normalize: true });
    const embedding = Array.from(output.data);
    
    // Ensure correct dimension (384 for gte-small)
    const expectedDim = RAG_CONFIG.embeddingDimension;
    if (embedding.length !== expectedDim) {
      console.warn(`Embedding dimension mismatch: got ${embedding.length}, expected ${expectedDim}`);
      // Pad or truncate to match expected dimension
      if (embedding.length < expectedDim) {
        return [...embedding, ...Array(expectedDim - embedding.length).fill(0)];
      }
      return embedding.slice(0, expectedDim);
    }
    
    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding');
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    console.log(`[Embeddings] Generating embeddings for ${texts.length} chunks...`);
    const embeddings: number[][] = [];
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      console.log(`[Embeddings] Processing chunk ${i + 1}/${texts.length} (${text.length} chars)`);
      const embedding = await generateEmbedding(text);
      console.log(`[Embeddings] Generated embedding with ${embedding.length} dimensions`);
      embeddings.push(embedding);
    }
    console.log(`[Embeddings] Successfully generated ${embeddings.length} embeddings`);
    return embeddings;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw new Error('Failed to generate embeddings');
  }
}

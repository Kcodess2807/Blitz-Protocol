import { ChunkingOptions } from './types';

const DEFAULT_CHUNK_SIZE = 800;
const DEFAULT_CHUNK_OVERLAP = 200;

/**
 * Split text into overlapping chunks for better context preservation
 */
export function chunkText(
  text: string,
  options: ChunkingOptions = {}
): string[] {
  const chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;
  const chunkOverlap = options.chunkOverlap || DEFAULT_CHUNK_OVERLAP;

  // Clean and normalize text
  const cleanText = text.replace(/\s+/g, ' ').trim();
  
  if (cleanText.length <= chunkSize) {
    return [cleanText];
  }

  const chunks: string[] = [];
  let startIndex = 0;
  const maxChunks = Math.ceil(cleanText.length / (chunkSize - chunkOverlap)) + 10; // Safety limit
  let iterations = 0;

  while (startIndex < cleanText.length && iterations < maxChunks) {
    iterations++;
    
    const endIndex = Math.min(startIndex + chunkSize, cleanText.length);
    let chunk = cleanText.slice(startIndex, endIndex);
    let actualChunkLength = chunk.length;

    // Try to break at sentence boundary if not at the end
    if (endIndex < cleanText.length) {
      const lastPeriod = chunk.lastIndexOf('. ');
      const lastQuestion = chunk.lastIndexOf('? ');
      const lastExclamation = chunk.lastIndexOf('! ');
      const lastBreak = Math.max(lastPeriod, lastQuestion, lastExclamation);

      if (lastBreak > chunkSize * 0.5) {
        chunk = chunk.slice(0, lastBreak + 1).trim();
        actualChunkLength = lastBreak + 1;
      }
    }

    const trimmedChunk = chunk.trim();
    if (trimmedChunk.length > 0) {
      chunks.push(trimmedChunk);
    }
    
    // Move start index forward, accounting for overlap
    const step = Math.max(actualChunkLength - chunkOverlap, 1);
    startIndex += step;
    
    // Safety check: ensure we're making progress
    if (step <= 0) {
      console.warn('[Chunking] Invalid step size, breaking to prevent infinite loop');
      break;
    }
  }

  if (iterations >= maxChunks) {
    console.warn(`[Chunking] Reached max iterations (${maxChunks}), text may be truncated`);
  }

  console.log(`[Chunking] Created ${chunks.length} chunks from ${cleanText.length} characters`);
  
  // Safety limit: max 100 chunks per document
  if (chunks.length > 100) {
    console.warn(`[Chunking] Too many chunks (${chunks.length}), limiting to 100`);
    return chunks.slice(0, 100);
  }
  
  return chunks;
}

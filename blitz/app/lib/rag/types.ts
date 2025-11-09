export interface DocumentChunk {
  id?: string;
  content: string;
  metadata?: {
    source?: string;
    category?: string;
    title?: string;
    [key: string]: any;
  };
  embedding?: number[];
  created_at?: string;
  updated_at?: string;
}

export interface SimilaritySearchResult {
  id: string;
  content: string;
  metadata: Record<string, any>;
  similarity: number;
}

export interface ChunkingOptions {
  chunkSize?: number;
  chunkOverlap?: number;
}

# RAG (Retrieval-Augmented Generation) Module

This module provides semantic search capabilities using OpenAI embeddings and Pinecone vector database.

## Setup

1. **Create a Pinecone account** at https://www.pinecone.io/
   - Sign up for free (100K vectors included)
   - Create a new index named `blitz-rag`
   - Dimensions: `384` (for Xenova/all-MiniLM-L6-v2)
   - Metric: `cosine`

2. **Add API Key** to `.env`:
```
PINECONE_API_KEY=your_pinecone_api_key_here
```

**Note**: This uses FREE local embeddings (no OpenAI API key needed!)

## API Endpoints

### 1. Ingest Documents
**POST** `/api/rag/ingest`

Upload and store company information with embeddings.

```json
{
  "content": "Your company information, policies, about us, etc.",
  "metadata": {
    "source": "about-us",
    "category": "company-info",
    "title": "About Our Company"
  },
  "options": {
    "chunkSize": 800,
    "chunkOverlap": 200
  }
}
```

### 2. Search Documents
**POST** `/api/rag/search`

Search for relevant information using semantic similarity.

```json
{
  "query": "What is your return policy?",
  "matchThreshold": 0.7,
  "matchCount": 5,
  "metadataFilter": {
    "category": "policies"
  }
}
```

### 3. Delete Documents
**DELETE** `/api/rag/delete`

Delete all documents or by metadata filter.

```json
{
  "metadataFilter": {
    "source": "old-policies"
  }
}
```

## Usage in Your Modules

### Example: Using RAG in Cancellation Module

```typescript
import { searchSimilarDocuments } from '@/app/lib/rag';

async function handleCancellationQuery(userQuery: string) {
  // Search for relevant cancellation policies
  const relevantDocs = await searchSimilarDocuments(userQuery, {
    matchThreshold: 0.75,
    matchCount: 3,
    metadataFilter: { category: 'cancellation-policy' }
  });

  // Use the retrieved context with your LLM
  const context = relevantDocs
    .map(doc => doc.content)
    .join('\n\n');

  // Pass context to your LLM for response generation
  const response = await generateLLMResponse(userQuery, context);
  
  return response;
}
```

## Data Ingestion Examples

### Company About Us
```bash
curl -X POST http://localhost:3000/api/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "content": "We are a leading e-commerce company...",
    "metadata": {
      "source": "about-us",
      "category": "company-info"
    }
  }'
```

### Shipping Policy
```bash
curl -X POST http://localhost:3000/api/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Our shipping policy: We ship worldwide...",
    "metadata": {
      "source": "shipping-policy",
      "category": "policies"
    }
  }'
```

## How It Works

1. **Chunking**: Documents are split into 800-token chunks with 200-token overlap
2. **Embedding**: Each chunk is converted to a 1536-dimensional vector using OpenAI's text-embedding-3-small
3. **Storage**: Chunks and embeddings are stored in Pinecone (separate from your main DB)
4. **Search**: User queries are embedded and compared using cosine similarity
5. **Retrieval**: Most similar chunks are returned for LLM context

## Cost Estimation

**Pinecone Free Tier**: 100K vectors (plenty for company info)
**Embeddings**: 100% FREE (runs locally using Hugging Face Transformers)

**Total Cost**: $0 for embeddings, $0 for Pinecone free tier!

## Why This Setup?

- **Completely Free**: No API costs for embeddings
- **Isolated**: Your RAG data is completely separate from business data
- **No Risk**: Won't affect your Supabase database
- **Purpose-Built**: Optimized specifically for vector search
- **Fast**: Sub-100ms query times
- **Privacy**: Embeddings generated locally, no data sent to external APIs

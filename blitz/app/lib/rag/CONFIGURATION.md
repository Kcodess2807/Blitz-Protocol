# RAG Configuration Guide

## Multi-Company / Multi-Tenant Setup

The RAG module is fully configurable to support different companies with different indexes and settings.

## Environment Variables

Add these to your `.env` file:

```env
# Required
PINECONE_API_KEY=your-pinecone-api-key

# Optional - Customize per company/deployment
PINECONE_INDEX_NAME=blitz-rag              # Default: blitz-rag
EMBEDDING_MODEL=Xenova/gte-small           # Default: Xenova/gte-small
EMBEDDING_DIMENSION=384                    # Default: 384

# Search settings
DEFAULT_MATCH_THRESHOLD=0.7                # Default: 0.7
DEFAULT_MATCH_COUNT=5                      # Default: 5

# Chunking settings
CHUNK_SIZE=800                             # Default: 800
CHUNK_OVERLAP=200                          # Default: 200
```

## Multi-Company Scenarios

### Scenario 1: Different Companies, Different Indexes

**Company A (.env):**
```env
PINECONE_INDEX_NAME=company-a-rag
EMBEDDING_MODEL=Xenova/gte-small
EMBEDDING_DIMENSION=384
```

**Company B (.env):**
```env
PINECONE_INDEX_NAME=company-b-rag
EMBEDDING_MODEL=Xenova/gte-small
EMBEDDING_DIMENSION=384
```

Each company gets their own isolated index in Pinecone!

### Scenario 2: Using Metadata Filters (Shared Index)

Alternatively, use a single index with metadata filters:

```typescript
// Ingest with company identifier
await ingestDocument(content, {
  companyId: 'company-a',
  category: 'policies',
});

// Search with company filter
await searchSimilarDocuments(query, {
  metadataFilter: { companyId: 'company-a' },
});
```

### Scenario 3: Different Embedding Models

If you need higher quality embeddings:

```env
# Higher quality, 768 dimensions (requires more storage)
EMBEDDING_MODEL=Xenova/all-mpnet-base-v2
EMBEDDING_DIMENSION=768
```

**Note**: Your Pinecone index dimensions must match `EMBEDDING_DIMENSION`!

## Available Embedding Models

| Model | Dimensions | Speed | Quality | Best For |
|-------|-----------|-------|---------|----------|
| `Xenova/all-MiniLM-L6-v2` | 384 | Fast | Good | General use, fast queries |
| `Xenova/gte-small` | 384 | Fast | Better | Recommended default |
| `Xenova/bge-small-en-v1.5` | 384 | Fast | Better | Retrieval-optimized |
| `Xenova/all-mpnet-base-v2` | 768 | Slower | Best | High accuracy needs |

## Creating Pinecone Indexes

For each company/deployment:

1. Go to https://app.pinecone.io/
2. Create index with:
   - **Name**: Match your `PINECONE_INDEX_NAME`
   - **Dimensions**: Match your `EMBEDDING_DIMENSION`
   - **Metric**: `cosine`

## Dynamic Configuration (Advanced)

For SaaS platforms serving multiple companies:

```typescript
// app/lib/rag/dynamic-config.ts
export function getCompanyConfig(companyId: string) {
  return {
    indexName: `company-${companyId}-rag`,
    embeddingModel: 'Xenova/gte-small',
    embeddingDimension: 384,
  };
}

// Use in your API
const config = getCompanyConfig(req.companyId);
// Pass config to RAG functions
```

## Best Practices

1. **Development**: Use one index for testing
2. **Production**: Separate indexes per company for isolation
3. **Staging**: Use different index names to avoid conflicts
4. **Metadata**: Use metadata filters for multi-tenancy in single index

## Example: Multi-Tenant Setup

```env
# Development
PINECONE_INDEX_NAME=dev-rag

# Staging
PINECONE_INDEX_NAME=staging-rag

# Production - Company A
PINECONE_INDEX_NAME=prod-company-a-rag

# Production - Company B
PINECONE_INDEX_NAME=prod-company-b-rag
```

## Cost Optimization

**Free Tier Strategy:**
- Use 384-dimension models (smaller storage)
- Share index with metadata filters
- One index can handle multiple small companies

**Paid Tier Strategy:**
- Separate indexes per company (better isolation)
- Use 768-dimension models for better quality
- Scale independently per company

## Testing Different Configurations

```bash
# Test with custom settings
PINECONE_INDEX_NAME=test-rag EMBEDDING_DIMENSION=384 npm run dev
```

## Migration Between Configurations

If you need to change dimensions:

1. Create new index with new dimensions
2. Update `EMBEDDING_DIMENSION` in .env
3. Re-ingest all documents
4. Delete old index

The system will automatically use the new configuration!

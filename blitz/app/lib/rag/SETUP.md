# Pinecone Setup Guide

## Step 1: Create Pinecone Account

1. Go to https://www.pinecone.io/
2. Click "Sign Up" (free tier available)
3. Verify your email

## Step 2: Create Index

1. In Pinecone dashboard, click "Create Index"
2. Fill in the details:
   - **Name**: `blitz-rag`
   - **Dimensions**: `1536`
   - **Metric**: `cosine`
   - **Cloud**: Choose your preferred region
   - **Plan**: Starter (Free)
3. Click "Create Index"

## Step 3: Get API Key

1. In Pinecone dashboard, go to "API Keys"
2. Copy your API key
3. Add to `.env`:
```
PINECONE_API_KEY=your-api-key-here
```

## Step 4: Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Add to `.env`:
```
OPENAI_API_KEY=sk-your-key-here
```

## Step 5: Test the Setup

Start your dev server and test the ingest endpoint:

```bash
curl -X POST http://localhost:3000/api/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Test document for RAG system",
    "metadata": {
      "category": "test"
    }
  }'
```

Then test search:

```bash
curl -X POST http://localhost:3000/api/rag/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "test document"
  }'
```

## Troubleshooting

**Error: "Index not found"**
- Make sure index name is exactly `blitz-rag`
- Check that index creation is complete (can take 1-2 minutes)

**Error: "Invalid API key"**
- Verify PINECONE_API_KEY in .env
- Make sure there are no extra spaces

**Error: "Incorrect API key provided"**
- Verify OPENAI_API_KEY in .env
- Check that you have credits in your OpenAI account

## Free Tier Limits

- **Pinecone**: 100K vectors, 1 index
- **OpenAI**: Pay-as-you-go (very cheap for embeddings)

For 100K vectors, you can store approximately:
- 50-100 pages of company policies
- Multiple product catalogs
- Extensive FAQ databases

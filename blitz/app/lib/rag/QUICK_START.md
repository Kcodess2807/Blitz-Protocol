# RAG Quick Start Guide

## 🚀 Setup (5 minutes)

### 1. Create Pinecone Index
- Go to https://pinecone.io → Sign up (free)
- Create index: `blitz-rag`, dimensions: `1536`, metric: `cosine`

### 2. Add API Keys to `.env`
```bash
OPENAI_API_KEY=sk-your-key-here
PINECONE_API_KEY=your-pinecone-key-here
```

### 3. Start Your Server
```bash
npm run dev
```

## 📝 Ingest Your Company Data

```bash
# Example: Add cancellation policy
curl -X POST http://localhost:3000/api/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Cancellation Policy: Customers can cancel orders within 24 hours of purchase for a full refund. After 24 hours, a 10% restocking fee applies. Refunds are processed within 5-7 business days.",
    "metadata": {
      "category": "cancellation-policy",
      "source": "company-policies",
      "title": "Cancellation Policy"
    }
  }'

# Example: Add shipping info
curl -X POST http://localhost:3000/api/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Shipping Information: We offer free shipping on orders over $50. Standard shipping takes 3-5 business days. Express shipping (1-2 days) is available for $15.",
    "metadata": {
      "category": "shipping-policy",
      "source": "company-policies"
    }
  }'
```

## 🔍 Use in Your Code

### Simple Usage
```typescript
import { ragHelpers } from '@/app/lib/rag';

// In your cancellation module
const { context } = await ragHelpers.getCancellationContext(
  "Can I cancel my order?"
);

// Pass context to your LLM
const response = await yourLLM.chat({
  systemPrompt: `Use this info: ${context}`,
  userMessage: "Can I cancel my order?"
});
```

### Advanced Usage
```typescript
import { enhanceQueryWithContext } from '@/app/lib/rag';

const { hasContext, context, sources } = await enhanceQueryWithContext(
  userQuery,
  {
    category: 'shipping-policy',
    matchCount: 3,
    matchThreshold: 0.75
  }
);

if (hasContext) {
  // Use context in your LLM
  console.log('Found relevant info:', sources.length);
}
```

## 📊 Categories to Use

Organize your data with these categories:
- `cancellation-policy`
- `shipping-policy`
- `return-policy`
- `tracking-info`
- `company-info`
- `product-info`
- `faq`
- `terms-of-service`

## 🧪 Test It

```bash
# Search for information
curl -X POST http://localhost:3000/api/rag/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How long does shipping take?",
    "matchCount": 3
  }'
```

## 🎯 Next Steps

1. Ingest all your company policies
2. Test search with various queries
3. Integrate into your chat/module APIs
4. Monitor and improve based on user queries

See `INTEGRATION_EXAMPLE.md` for detailed code examples!

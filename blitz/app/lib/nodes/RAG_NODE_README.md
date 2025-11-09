# RAG Module Documentation

## Overview

The RAG (Retrieval-Augmented Generation) Module retrieves relevant context from your company's knowledge base and generates accurate, context-aware responses. You can upload documents, paste text, or use existing knowledge base content.

## Features

- **Smart Context Retrieval**: Searches your knowledge base using semantic similarity
- **Category Filtering**: Narrow down search to specific policy types
- **Multiple Response Modes**: Concise, detailed, or raw context
- **Confidence Scoring**: Shows how relevant the retrieved information is
- **Source Attribution**: Tracks which documents were used
- **Fallback Handling**: Custom messages when no context is found

## Configuration Options

### Input Mode
- **Type**: Select (required)
- **Options**:
  - **Use Existing Knowledge Base**: Query from already ingested documents
  - **Upload Documents**: Upload .txt or .pdf files
  - **Paste Text Directly**: Paste content directly in the configuration
- **Description**: Choose how to provide knowledge base content

### Document Content
- **Type**: Textarea (required for "Paste Text" mode)
- **Description**: Paste your company policies, FAQs, or other information
- **Note**: Content is automatically chunked and indexed when the node runs

### Knowledge Category
- **Type**: Select (optional)
- **Options**: 
  - All Categories (default)
  - Cancellation Policy
  - Shipping Policy
  - Return Policy
  - Tracking Information
  - Company Information
  - Product Information
  - Payment Information
  - FAQ
- **Description**: Filter knowledge base by category

### Match Threshold
- **Type**: Number (0-1)
- **Default**: 0.7
- **Description**: Minimum similarity score for retrieved content
- **Higher value** = More strict matching
- **Lower value** = More lenient matching

### Max Results
- **Type**: Number (1-10)
- **Default**: 3
- **Description**: Maximum number of relevant chunks to retrieve

### Response Mode
- **Type**: Select (required)
- **Options**:
  - **Concise Answer**: 2-4 lines, direct response
  - **Detailed Answer**: Thorough, comprehensive response
  - **Raw Context**: Returns retrieved chunks without AI generation
- **Description**: How to format the response

### Fallback Message
- **Type**: Textarea (optional)
- **Default**: "I couldn't find specific information about that. Please contact support for assistance."
- **Description**: Message shown when no relevant context is found

## Usage in Workflows

### Example 1: Simple FAQ Bot

```
User Input → RAG Node (All Categories, Concise) → Response to User
```

**Configuration**:
- Category: All Categories
- Match Threshold: 0.7
- Max Results: 3
- Response Mode: Concise

### Example 2: Policy-Specific Bot

```
User Input → GenAI Intent → Router → RAG Node (Filtered) → Response
```

**Configuration**:
- Category: Cancellation Policy (or specific category)
- Match Threshold: 0.75
- Max Results: 3
- Response Mode: Detailed

### Example 3: Hybrid Bot (Intent + RAG)

```
User Input → GenAI Intent
    ├─ General Query → RAG Node → Response
    └─ Specific Action → Module Node → Response
```

## Output Structure

The RAG node returns:

```typescript
{
  answer: string;              // Generated answer
  hasContext: boolean;         // Whether relevant context was found
  confidence: number;          // Average similarity score (0-1)
  sources: Array<{
    category?: string;         // Source category
    similarity: number;        // Similarity score
    content?: string;          // Raw content (if responseMode is 'raw')
  }>;
  method: 'RAG_TO_FRONTEND';
  responseMode: string;        // 'concise' | 'detailed' | 'raw'
}
```

## Best Practices

### 1. Choose the Right Response Mode

- **Concise**: For quick answers, chat interfaces
- **Detailed**: For complex queries, email responses
- **Raw**: For debugging, or when you want to process context yourself

### 2. Set Appropriate Thresholds

- **High confidence needed** (policies, legal): 0.8-0.9
- **General information**: 0.7-0.8
- **Exploratory search**: 0.6-0.7

### 3. Use Category Filters

- Improves accuracy by narrowing search scope
- Faster retrieval
- More relevant results

### 4. Handle No Context Gracefully

- Always set a helpful fallback message
- Consider routing to human support
- Log queries with no context for knowledge base improvement

### 5. Monitor Performance

Track these metrics:
- Average confidence scores
- % of queries with context
- Response times
- User satisfaction

## Integration with Other Nodes

### With GenAI Intent Node

```typescript
// GenAI detects intent
if (intent === 'general_query') {
  // Route to RAG node
  ragNode.execute(query);
} else {
  // Route to specific module
  moduleNode.execute(intent, data);
}
```

### With Module Nodes

```typescript
// Get RAG context first
const ragResult = await ragNode.execute(query);

// Pass context to module
const moduleResult = await moduleNode.execute({
  query,
  context: ragResult.answer,
  sources: ragResult.sources
});
```

### With Router Node

```typescript
// Route based on confidence
if (ragResult.confidence > 0.8) {
  // High confidence - use RAG answer
  return ragResult.answer;
} else {
  // Low confidence - route to human support
  return routeToSupport(query);
}
```

## Testing

### Test the Node

```typescript
import { RAGNodeExecutor } from '@/app/lib/nodes/executors';

const executor = new RAGNodeExecutor({
  id: 'test',
  type: 'rag',
  ragConfig: {
    category: 'return-policy',
    matchThreshold: 0.7,
    matchCount: 3,
    responseMode: 'concise',
  }
});

const result = await executor.test('What is your return policy?');
console.log(result);
```

### Test via API

```bash
# Test RAG search
curl -X POST http://localhost:3000/api/rag/search \
  -H "Content-Type: application/json" \
  -d '{"query": "Can I return my order?"}'

# Test RAG answer
curl -X POST http://localhost:3000/api/rag/answer \
  -H "Content-Type: application/json" \
  -d '{"query": "What is your shipping policy?"}'
```

## Troubleshooting

### Low Confidence Scores

**Problem**: All results have low similarity scores

**Solutions**:
- Check if relevant content is ingested
- Lower match threshold temporarily
- Rephrase the query
- Add more content to knowledge base

### No Results Found

**Problem**: RAG returns no context

**Solutions**:
- Verify content is ingested for that category
- Check category filter settings
- Lower match threshold
- Review fallback message

### Slow Responses

**Problem**: RAG node takes too long

**Solutions**:
- Reduce max results count
- Use category filters
- Check Pinecone latency
- Consider caching frequent queries

### Irrelevant Results

**Problem**: Retrieved context doesn't match query

**Solutions**:
- Increase match threshold
- Use more specific categories
- Improve content organization
- Add better metadata to documents

## Advanced Usage

### Custom Prompts

For detailed mode, you can customize the system prompt by modifying the executor:

```typescript
const systemPrompt = `You are a ${category} specialist. 
Answer questions using the provided context.
Be professional and accurate.`;
```

### Combining Multiple Categories

```typescript
// Search multiple categories
const results1 = await search(query, { category: 'return-policy' });
const results2 = await search(query, { category: 'shipping-policy' });
const combined = [...results1, ...results2];
```

### Confidence-Based Routing

```typescript
if (ragResult.confidence > 0.9) {
  return ragResult.answer; // High confidence
} else if (ragResult.confidence > 0.7) {
  return ragResult.answer + "\n\nNeed more help? Contact support.";
} else {
  return "Let me connect you with a specialist.";
}
```

## Performance Metrics

Expected performance:
- **Search time**: 100-300ms
- **Answer generation**: 500-1500ms (concise), 1000-3000ms (detailed)
- **Total response time**: <2 seconds

## Dependencies

- Pinecone (vector database)
- Groq (LLM for answer generation)
- Local embeddings (Xenova/gte-small)

## Related Documentation

- `app/lib/rag/README.md` - RAG system overview
- `RAG_INTEGRATION_GUIDE.md` - Integration guide
- `app/lib/rag/CONFIGURATION.md` - Multi-company setup

# Integration Example: Using RAG in Your Modules

## Example 1: Enhance Your Chat API

```typescript
// app/api/chat/route.ts
import { enhanceQueryWithContext, buildSystemPromptWithContext } from '@/app/lib/rag/integration-helper';

export async function POST(request: Request) {
  const { message, category } = await request.json();

  // Get relevant context from RAG
  const { hasContext, context } = await enhanceQueryWithContext(message, {
    category, // e.g., 'cancellation-policy', 'shipping-policy'
    matchCount: 3,
    matchThreshold: 0.75,
  });

  // Build enhanced system prompt
  const basePrompt = "You are a helpful customer service assistant.";
  const systemPrompt = buildSystemPromptWithContext(basePrompt, context);

  // Call your LLM with enhanced context
  const response = await yourLLM.chat({
    systemPrompt,
    userMessage: message,
  });

  return Response.json({ response });
}
```

## Example 2: Cancellation Module

```typescript
// app/api/cancellation/route.ts
import { ragHelpers } from '@/app/lib/rag/integration-helper';

export async function POST(request: Request) {
  const { userQuery } = await request.json();

  // Get cancellation-specific context
  const { hasContext, context, sources } = await ragHelpers.getCancellationContext(userQuery);

  if (hasContext) {
    // Use context to generate accurate response
    const response = await generateLLMResponse({
      query: userQuery,
      context,
      systemPrompt: "You are a cancellation specialist. Use the provided policy information to help users.",
    });

    return Response.json({
      response,
      sources, // Show which policies were referenced
    });
  }

  // Fallback if no context found
  return Response.json({
    response: "I don't have specific information about that. Please contact support.",
  });
}
```

## Example 3: Shipping Module

```typescript
// app/api/shipping/route.ts
import { ragHelpers } from '@/app/lib/rag/integration-helper';

export async function POST(request: Request) {
  const { userQuery } = await request.json();

  const { context } = await ragHelpers.getShippingContext(userQuery);

  // Pass context to your LLM
  const response = await yourLLM.chat({
    systemPrompt: `You are a shipping specialist. Use this information:\n\n${context}`,
    userMessage: userQuery,
  });

  return Response.json({ response });
}
```

## Example 4: Dynamic Category Selection

```typescript
// Automatically determine which category to search
import { enhanceQueryWithContext } from '@/app/lib/rag/integration-helper';

async function handleUserQuery(query: string) {
  // Determine category based on keywords
  let category: string | undefined;
  
  if (query.toLowerCase().includes('cancel') || query.toLowerCase().includes('refund')) {
    category = 'cancellation-policy';
  } else if (query.toLowerCase().includes('ship') || query.toLowerCase().includes('deliver')) {
    category = 'shipping-policy';
  } else if (query.toLowerCase().includes('track')) {
    category = 'tracking-info';
  }

  // Get context with or without category filter
  const { hasContext, context } = await enhanceQueryWithContext(query, {
    category,
    matchCount: 3,
  });

  return { context, hasContext };
}
```

## Example 5: Workflow Node Integration

```typescript
// app/lib/nodes/executors/rag-search-node.ts
import { searchSimilarDocuments } from '@/app/lib/rag';

export async function executeRAGSearch(input: any) {
  const { query, category } = input;

  const results = await searchSimilarDocuments(query, {
    matchThreshold: 0.75,
    matchCount: 5,
    metadataFilter: category ? { category } : undefined,
  });

  return {
    results,
    context: results.map(r => r.content).join('\n\n'),
    hasResults: results.length > 0,
  };
}
```

## Best Practices

1. **Always check `hasContext`** before using the context
2. **Set appropriate thresholds** (0.75 is good for most cases)
3. **Use category filters** to narrow down results
4. **Show sources** to users when possible (builds trust)
5. **Have fallbacks** when no context is found
6. **Log queries** to improve your knowledge base over time

## Testing Your Integration

```bash
# 1. First, ingest some test data
curl -X POST http://localhost:3000/api/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Our cancellation policy: You can cancel within 24 hours for a full refund.",
    "metadata": { "category": "cancellation-policy" }
  }'

# 2. Test the search
curl -X POST http://localhost:3000/api/rag/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Can I get a refund if I cancel?",
    "metadataFilter": { "category": "cancellation-policy" }
  }'

# 3. Integrate into your module and test end-to-end
```

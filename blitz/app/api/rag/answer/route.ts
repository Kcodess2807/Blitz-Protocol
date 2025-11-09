import { NextRequest, NextResponse } from 'next/server';
import { searchSimilarDocuments } from '@/app/lib/rag';
import { generateText } from 'ai';
import { createGroq } from '@ai-sdk/groq';

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    // Search for relevant documents
    const results = await searchSimilarDocuments(query, {
      matchThreshold: 0.7,
      matchCount: 5,
    });

    if (results.length === 0) {
      return NextResponse.json({
        success: true,
        answer: "I couldn't find any relevant information to answer your question. Please try rephrasing or add more documents.",
        sources: [],
      });
    }

    // Combine all relevant context
    const context = results.map(r => r.content).join('\n\n');

    // Generate concise answer using LLM
    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      prompt: `Based on the following information, answer the user's question in 2-4 lines maximum. Be direct and concise. Only include the most important information.

Context:
${context}

User Question: ${query}

Provide a brief, direct answer (2-4 lines max):`,
    });

    return NextResponse.json({
      success: true,
      answer: text.trim(),
      confidence: Math.round(results[0].similarity * 100),
      sources: results.slice(0, 3).map(r => ({
        category: r.metadata?.category,
        similarity: Math.round(r.similarity * 100),
      })),
    });
  } catch (error) {
    console.error('Error in answer endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

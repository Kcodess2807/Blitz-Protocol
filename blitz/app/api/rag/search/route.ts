import { NextRequest, NextResponse } from 'next/server';
import { searchSimilarDocuments } from '@/app/lib/rag';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, matchThreshold, matchCount, metadataFilter } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    const results = await searchSimilarDocuments(query, {
      matchThreshold,
      matchCount,
      metadataFilter,
    });

    return NextResponse.json({
      success: true,
      results,
      count: results.length,
    });
  } catch (error) {
    console.error('Error in search endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

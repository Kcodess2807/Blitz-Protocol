import { NextRequest, NextResponse } from 'next/server';
import { ingestDocument } from '@/app/lib/rag';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, metadata, options } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required and must be a string' },
        { status: 400 }
      );
    }

    const result = await ingestDocument(content, metadata, options);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      chunksCreated: result.chunksCreated,
      message: `Successfully ingested document into ${result.chunksCreated} chunks`,
    });
  } catch (error) {
    console.error('Error in ingest endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

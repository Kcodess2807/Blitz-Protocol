import { NextRequest, NextResponse } from 'next/server';
import { ingestDocument } from '@/app/lib/rag';
import * as pdfParse from 'pdf-parse';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const category = formData.get('category') as string;
    const source = formData.get('source') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Get file content based on type
    let content = '';
    const fileType = file.name.split('.').pop()?.toLowerCase();

    if (fileType === 'txt') {
      // Handle text files
      content = await file.text();
    } else if (fileType === 'pdf') {
      // Handle PDF files
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const data = await (pdfParse as any).default(buffer);
      content = data.text;
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload .txt or .pdf files.' },
        { status: 400 }
      );
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'File is empty or could not be read' },
        { status: 400 }
      );
    }

    // Ingest the document
    const result = await ingestDocument(content, {
      category: category || 'uploaded-document',
      source: source || file.name,
      fileName: file.name,
      fileType,
      uploadedAt: new Date().toISOString(),
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileType,
      fileSize: file.size,
      chunksCreated: result.chunksCreated,
      contentLength: content.length,
      message: `Successfully ingested ${file.name} into ${result.chunksCreated} chunks`,
    });
  } catch (error) {
    console.error('Error in upload endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

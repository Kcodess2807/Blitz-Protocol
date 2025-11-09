import { NextRequest, NextResponse } from 'next/server';
import { clearAllDocuments, deleteDocumentsByMetadata } from '@/app/lib/rag';

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { metadataFilter } = body;

    let result;
    if (metadataFilter && Object.keys(metadataFilter).length > 0) {
      result = await deleteDocumentsByMetadata(metadataFilter);
    } else {
      result = await clearAllDocuments();
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: metadataFilter
        ? 'Documents deleted by metadata filter'
        : 'All documents cleared',
    });
  } catch (error) {
    console.error('Error in delete endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

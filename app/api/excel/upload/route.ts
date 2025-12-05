import { NextRequest, NextResponse } from 'next/server';
import { uploadExcelToSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * Upload Excel file to Supabase Storage
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (
      !file.name.endsWith('.xlsx') &&
      !file.name.endsWith('.xls')
    ) {
      return NextResponse.json(
        { error: 'Invalid file type. Only .xlsx and .xls files are allowed.' },
        { status: 400 }
      );
    }

    // Convert to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase
    const result = await uploadExcelToSupabase(buffer, file.name);

    return NextResponse.json({
      success: true,
      data: {
        fileName: file.name,
        path: result.path,
        publicUrl: result.publicUrl,
      },
    });
  } catch (error) {
    console.error('Excel upload error:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload Excel file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

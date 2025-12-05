import { NextRequest, NextResponse } from 'next/server';
import { compareExcelFiles } from '@/lib/excel-compare';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Compare two Excel files
 *
 * Request body:
 * - oldExcelBase64: Base64 encoded Excel file (old/reference)
 * - newExcelBase64: Base64 encoded Excel file (new/comparison)
 * - keyColumns: Array of column names to use as composite key
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { oldExcelBase64, newExcelBase64, keyColumns } = body;

    // Validate inputs
    if (!oldExcelBase64 || !newExcelBase64) {
      return NextResponse.json(
        { error: 'Both old and new Excel files are required' },
        { status: 400 }
      );
    }

    if (!keyColumns || !Array.isArray(keyColumns) || keyColumns.length === 0) {
      return NextResponse.json(
        { error: 'At least one key column is required' },
        { status: 400 }
      );
    }

    // Convert base64 to buffers
    const oldBuffer = Buffer.from(oldExcelBase64, 'base64');
    const newBuffer = Buffer.from(newExcelBase64, 'base64');

    // Compare files
    console.log('🔍 Starting Excel comparison...');
    console.log(`  Key columns: ${keyColumns.join(', ')}`);

    const comparison = await compareExcelFiles(oldBuffer, newBuffer, keyColumns);

    console.log('✅ Comparison completed:');
    console.log(`  Added: ${comparison.summary.added}`);
    console.log(`  Deleted: ${comparison.summary.deleted}`);
    console.log(`  Modified: ${comparison.summary.modified}`);
    console.log(`  Unchanged: ${comparison.summary.unchanged}`);

    return NextResponse.json({
      success: true,
      data: comparison,
    });
  } catch (error) {
    console.error('Excel comparison error:', error);
    return NextResponse.json(
      {
        error: 'Failed to compare Excel files',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

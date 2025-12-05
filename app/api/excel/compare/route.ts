import { NextRequest, NextResponse } from 'next/server';
import { readExcelFile, compareSheets } from '@/lib/excel-compare';
import { downloadExcelFromSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Compare two Excel sheets
 *
 * Request body:
 * - oldExcelPath: Path to old Excel in Supabase Storage
 * - newExcelPath: Path to new Excel in Supabase Storage
 * - oldSheetIndex: Index of sheet to compare from old Excel
 * - newSheetIndex: Index of sheet to compare from new Excel
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { oldExcelPath, newExcelPath, oldSheetIndex, newSheetIndex } = body;

    // Validate inputs
    if (!oldExcelPath || !newExcelPath) {
      return NextResponse.json(
        { error: 'Both old and new Excel paths are required' },
        { status: 400 }
      );
    }

    console.log('📥 Downloading Excel files from Supabase...');

    // Download Excel files from Supabase
    const oldBlob = await downloadExcelFromSupabase(oldExcelPath);
    const newBlob = await downloadExcelFromSupabase(newExcelPath);

    // Convert blobs to buffers
    const oldBuffer = Buffer.from(await oldBlob.arrayBuffer());
    const newBuffer = Buffer.from(await newBlob.arrayBuffer());

    // Read Excel files
    console.log('📖 Reading Excel files...');
    const oldExcel = await readExcelFile(oldBuffer, 'Old Excel');
    const newExcel = await readExcelFile(newBuffer, 'New Excel');

    console.log(`  Old Excel: ${oldExcel.sheets.length} sheets`);
    console.log(`  New Excel: ${newExcel.sheets.length} sheets`);

    // If sheet indices are provided, compare specific sheets
    if (oldSheetIndex !== undefined && newSheetIndex !== undefined) {
      const oldSheet = oldExcel.sheets[oldSheetIndex];
      const newSheet = newExcel.sheets[newSheetIndex];

      if (!oldSheet || !newSheet) {
        return NextResponse.json(
          { error: 'Invalid sheet index' },
          { status: 400 }
        );
      }

      console.log(`🔍 Comparing sheets: "${oldSheet.name}" vs "${newSheet.name}"`);

      const comparison = compareSheets(oldSheet, newSheet);

      console.log('✅ Comparison completed:');
      console.log(`  Changed cells: ${comparison.summary.changedCells}`);
      console.log(`  Added rows: ${comparison.summary.addedRows}`);
      console.log(`  Deleted rows: ${comparison.summary.deletedRows}`);

      return NextResponse.json({
        success: true,
        data: comparison,
      });
    }

    // Otherwise, just return the sheets info for selection
    return NextResponse.json({
      success: true,
      data: {
        oldExcel: {
          fileName: oldExcel.fileName,
          sheets: oldExcel.sheets.map(s => ({
            name: s.name,
            index: s.index,
            rowCount: s.rowCount,
            columnCount: s.columnCount,
          })),
        },
        newExcel: {
          fileName: newExcel.fileName,
          sheets: newExcel.sheets.map(s => ({
            name: s.name,
            index: s.index,
            rowCount: s.rowCount,
            columnCount: s.columnCount,
          })),
        },
      },
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

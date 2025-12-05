import { NextRequest, NextResponse } from 'next/server';
import { readExcelFile, compareSheets } from '@/lib/excel-compare';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Compare two Excel sheets
 *
 * Request body:
 * - oldExcelBase64: Base64 encoded Excel file (old/reference)
 * - newExcelBase64: Base64 encoded Excel file (new/comparison)
 * - oldSheetIndex: Index of sheet to compare from old Excel
 * - newSheetIndex: Index of sheet to compare from new Excel
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { oldExcelBase64, newExcelBase64, oldSheetIndex, newSheetIndex } = body;

    // Validate inputs
    if (!oldExcelBase64 || !newExcelBase64) {
      return NextResponse.json(
        { error: 'Both old and new Excel files are required' },
        { status: 400 }
      );
    }

    // Convert base64 to buffers
    const oldBuffer = Buffer.from(oldExcelBase64, 'base64');
    const newBuffer = Buffer.from(newExcelBase64, 'base64');

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

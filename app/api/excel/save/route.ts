import { NextRequest, NextResponse } from 'next/server';
import { uploadExcelToSupabase } from '@/lib/supabase';
import ExcelJS from 'exceljs';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Save edited Excel data as new file
 *
 * Request body:
 * - headers: Array of column headers
 * - rows: Array of row data objects
 * - fileName: Name for the saved file
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { headers, rows, fileName } = body;

    // Validate inputs
    if (!headers || !Array.isArray(headers) || headers.length === 0) {
      return NextResponse.json(
        { error: 'Headers are required' },
        { status: 400 }
      );
    }

    if (!rows || !Array.isArray(rows)) {
      return NextResponse.json(
        { error: 'Rows are required' },
        { status: 400 }
      );
    }

    if (!fileName) {
      return NextResponse.json(
        { error: 'File name is required' },
        { status: 400 }
      );
    }

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data');

    // Add headers
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4A90E2' },
    };
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Add data rows
    rows.forEach((row: any, index: number) => {
      const rowData = headers.map((header) => row[header] || '');
      const excelRow = worksheet.addRow(rowData);

      // Zebra striping
      if (index % 2 === 0) {
        excelRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF5F5F5' },
        };
      }

      excelRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // Auto-size columns
    worksheet.columns.forEach((column) => {
      let maxLength = 10;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const cellLength = String(cell.value || '').length;
        if (cellLength > maxLength) {
          maxLength = Math.min(cellLength, 50);
        }
      });
      column.width = maxLength + 2;
    });

    // Convert to buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const excelBuffer = Buffer.from(buffer);

    // Upload to Supabase
    const result = await uploadExcelToSupabase(excelBuffer, fileName);

    console.log('✅ Excel saved successfully:', result.path);

    return NextResponse.json({
      success: true,
      data: {
        fileName,
        path: result.path,
        publicUrl: result.publicUrl,
      },
    });
  } catch (error) {
    console.error('Excel save error:', error);
    return NextResponse.json(
      {
        error: 'Failed to save Excel file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

import ExcelJS from 'exceljs';

/**
 * Excel row data structure
 */
export interface ExcelRow {
  [key: string]: any;
  _rowNumber: number; // Original row number from Excel
}

/**
 * Excel data structure
 */
export interface ExcelData {
  headers: string[];
  rows: ExcelRow[];
  sheetName: string;
}

/**
 * Diff types
 */
export type DiffType = 'added' | 'deleted' | 'modified' | 'unchanged';

/**
 * Row diff structure
 */
export interface RowDiff {
  type: DiffType;
  oldRow?: ExcelRow;
  newRow?: ExcelRow;
  changedFields?: string[]; // For modified rows, which fields changed
  key: string; // Composite key for matching
}

/**
 * Comparison result
 */
export interface ComparisonResult {
  summary: {
    totalOld: number;
    totalNew: number;
    added: number;
    deleted: number;
    modified: number;
    unchanged: number;
  };
  diffs: RowDiff[];
  headers: string[];
  keyColumns: string[];
}

/**
 * Read Excel file and extract data
 */
export async function readExcelFile(buffer: Buffer | ArrayBuffer): Promise<ExcelData> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);

  // Get first worksheet
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('Excel file has no worksheets');
  }

  const rows: ExcelRow[] = [];
  let headers: string[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      // First row is headers
      headers = row.values as string[];
      // Remove first empty element (Excel rows are 1-indexed)
      headers = headers.slice(1);
    } else {
      // Data rows
      const rowData: ExcelRow = { _rowNumber: rowNumber };

      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) {
          // Handle different cell types
          let value = cell.value;

          // Handle rich text
          if (value && typeof value === 'object' && 'richText' in value) {
            value = (value as any).richText.map((t: any) => t.text).join('');
          }

          // Handle dates
          if (cell.type === ExcelJS.ValueType.Date) {
            value = cell.value instanceof Date ? cell.value.toISOString().split('T')[0] : cell.value;
          }

          rowData[header] = value;
        }
      });

      rows.push(rowData);
    }
  });

  return {
    headers,
    rows,
    sheetName: worksheet.name,
  };
}

/**
 * Generate composite key from selected columns
 */
function generateKey(row: ExcelRow, keyColumns: string[]): string {
  return keyColumns
    .map((col) => String(row[col] || '').trim().toLowerCase())
    .join('||');
}

/**
 * Compare two rows and find changed fields
 */
function findChangedFields(oldRow: ExcelRow, newRow: ExcelRow, headers: string[]): string[] {
  const changed: string[] = [];

  for (const header of headers) {
    const oldValue = String(oldRow[header] || '').trim();
    const newValue = String(newRow[header] || '').trim();

    if (oldValue !== newValue) {
      changed.push(header);
    }
  }

  return changed;
}

/**
 * Compare two Excel files
 */
export async function compareExcelFiles(
  oldBuffer: Buffer | ArrayBuffer,
  newBuffer: Buffer | ArrayBuffer,
  keyColumns: string[]
): Promise<ComparisonResult> {
  // Read both Excel files
  const oldExcel = await readExcelFile(oldBuffer);
  const newExcel = await readExcelFile(newBuffer);

  // Combine headers from both files
  const allHeaders = Array.from(
    new Set([...oldExcel.headers, ...newExcel.headers])
  );

  // Validate key columns exist
  const missingKeys = keyColumns.filter(
    (key) => !allHeaders.includes(key)
  );
  if (missingKeys.length > 0) {
    throw new Error(`Key columns not found in Excel: ${missingKeys.join(', ')}`);
  }

  // Create maps for quick lookup
  const oldMap = new Map<string, ExcelRow>();
  const newMap = new Map<string, ExcelRow>();

  oldExcel.rows.forEach((row) => {
    const key = generateKey(row, keyColumns);
    oldMap.set(key, row);
  });

  newExcel.rows.forEach((row) => {
    const key = generateKey(row, keyColumns);
    newMap.set(key, row);
  });

  // Find diffs
  const diffs: RowDiff[] = [];
  const processedKeys = new Set<string>();

  // Check old rows (deleted or modified)
  oldMap.forEach((oldRow, key) => {
    processedKeys.add(key);
    const newRow = newMap.get(key);

    if (!newRow) {
      // Row deleted
      diffs.push({
        type: 'deleted',
        oldRow,
        key,
      });
    } else {
      // Check if modified
      const changedFields = findChangedFields(oldRow, newRow, allHeaders);

      if (changedFields.length > 0) {
        // Row modified
        diffs.push({
          type: 'modified',
          oldRow,
          newRow,
          changedFields,
          key,
        });
      } else {
        // Row unchanged
        diffs.push({
          type: 'unchanged',
          oldRow,
          newRow,
          key,
        });
      }
    }
  });

  // Check new rows (added)
  newMap.forEach((newRow, key) => {
    if (!processedKeys.has(key)) {
      diffs.push({
        type: 'added',
        newRow,
        key,
      });
    }
  });

  // Calculate summary
  const summary = {
    totalOld: oldExcel.rows.length,
    totalNew: newExcel.rows.length,
    added: diffs.filter((d) => d.type === 'added').length,
    deleted: diffs.filter((d) => d.type === 'deleted').length,
    modified: diffs.filter((d) => d.type === 'modified').length,
    unchanged: diffs.filter((d) => d.type === 'unchanged').length,
  };

  return {
    summary,
    diffs,
    headers: allHeaders,
    keyColumns,
  };
}

/**
 * Export comparison result to Excel with highlighting
 */
export async function exportComparisonToExcel(
  comparison: ComparisonResult,
  includeUnchanged: boolean = false
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Karşılaştırma');

  // Add summary at the top
  worksheet.addRow(['📊 KARŞILAŞTIRMA ÖZETİ']);
  worksheet.addRow(['Eski Excel Satır Sayısı:', comparison.summary.totalOld]);
  worksheet.addRow(['Yeni Excel Satır Sayısı:', comparison.summary.totalNew]);
  worksheet.addRow(['✅ Eklenen:', comparison.summary.added]);
  worksheet.addRow(['❌ Silinen:', comparison.summary.deleted]);
  worksheet.addRow(['🔄 Değiştirilen:', comparison.summary.modified]);
  worksheet.addRow(['⚪ Değişmeyen:', comparison.summary.unchanged]);
  worksheet.addRow([]); // Empty row

  // Style summary
  worksheet.getCell('A1').font = { bold: true, size: 14 };
  worksheet.getCell('A1').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4A90E2' },
  };

  // Add headers
  const headerRow = worksheet.addRow(['Durum', 'Değişen Alanlar', ...comparison.headers]);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' },
  };

  // Add data rows
  const diffsToShow = includeUnchanged
    ? comparison.diffs
    : comparison.diffs.filter((d) => d.type !== 'unchanged');

  diffsToShow.forEach((diff) => {
    const row = diff.newRow || diff.oldRow!;
    const statusText =
      diff.type === 'added'
        ? '✅ YENİ'
        : diff.type === 'deleted'
        ? '❌ SİLİNDİ'
        : diff.type === 'modified'
        ? '🔄 DEĞİŞTİ'
        : '⚪ AYNI';

    const changedFieldsText = diff.changedFields?.join(', ') || '-';

    const rowData = [
      statusText,
      changedFieldsText,
      ...comparison.headers.map((header) => row[header] || ''),
    ];

    const excelRow = worksheet.addRow(rowData);

    // Color coding
    let fillColor: string;
    if (diff.type === 'added') {
      fillColor = 'FFC6EFCE'; // Light green
    } else if (diff.type === 'deleted') {
      fillColor = 'FFFFC7CE'; // Light red
    } else if (diff.type === 'modified') {
      fillColor = 'FFFFEB9C'; // Light orange
    } else {
      fillColor = 'FFFFFFFF'; // White
    }

    excelRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: fillColor },
      };
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

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

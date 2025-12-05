import ExcelJS from 'exceljs';

/**
 * Excel cell value
 */
export type CellValue = string | number | boolean | Date | null;

/**
 * Excel sheet structure
 */
export interface ExcelSheet {
  name: string;
  index: number;
  rowCount: number;
  columnCount: number;
  data: CellValue[][]; // 2D array: rows x columns
  headers?: string[]; // First row as headers (if exists)
}

/**
 * Excel file structure
 */
export interface ExcelFile {
  fileName: string;
  sheets: ExcelSheet[];
}

/**
 * Cell diff type
 */
export type CellDiffType = 'added' | 'deleted' | 'modified' | 'unchanged';

/**
 * Cell difference
 */
export interface CellDiff {
  row: number;
  col: number;
  type: CellDiffType;
  oldValue?: CellValue;
  newValue?: CellValue;
}

/**
 * Sheet comparison result
 */
export interface SheetComparison {
  oldSheetName: string;
  newSheetName: string;
  summary: {
    totalCells: number;
    changedCells: number;
    addedRows: number;
    deletedRows: number;
    addedColumns: number;
    deletedColumns: number;
  };
  diffs: CellDiff[];
  oldData: CellValue[][];
  newData: CellValue[][];
}

/**
 * Parse cell value from ExcelJS cell
 */
function parseCellValue(cell: ExcelJS.Cell): CellValue {
  if (!cell || cell.value === null || cell.value === undefined) {
    return null;
  }

  let value = cell.value;

  // Handle rich text
  if (value && typeof value === 'object' && 'richText' in value) {
    value = (value as any).richText.map((t: any) => t.text).join('');
  }

  // Handle dates
  if (cell.type === ExcelJS.ValueType.Date) {
    return value instanceof Date ? value.toISOString().split('T')[0] : String(value);
  }

  // Handle formulas - get result value
  if (typeof value === 'object' && 'result' in value) {
    return (value as any).result;
  }

  // Handle hyperlinks
  if (typeof value === 'object' && 'hyperlink' in value) {
    return (value as any).text || (value as any).hyperlink;
  }

  // Convert to appropriate type
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  return String(value);
}

/**
 * Read all sheets from Excel file
 */
export async function readExcelFile(buffer: Buffer | ArrayBuffer, fileName: string = 'Excel'): Promise<ExcelFile> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);

  const sheets: ExcelSheet[] = [];

  workbook.worksheets.forEach((worksheet, index) => {
    const data: CellValue[][] = [];
    let maxColumnCount = 0;

    // Read all rows and cells
    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const rowData: CellValue[] = [];

      // Get actual column count for this row
      const actualColumnCount = row.actualCellCount || row.cellCount;
      maxColumnCount = Math.max(maxColumnCount, actualColumnCount);

      // Read all cells in the row
      for (let colNumber = 1; colNumber <= actualColumnCount; colNumber++) {
        const cell = row.getCell(colNumber);
        rowData.push(parseCellValue(cell));
      }

      data.push(rowData);
    });

    // Extract headers (first row if exists)
    const headers = data.length > 0 ? data[0].map(v => String(v || '')) : undefined;

    sheets.push({
      name: worksheet.name,
      index,
      rowCount: data.length,
      columnCount: maxColumnCount,
      data,
      headers,
    });
  });

  return {
    fileName,
    sheets,
  };
}

/**
 * Compare two values for equality
 */
function valuesEqual(a: CellValue, b: CellValue): boolean {
  if (a === b) return true;
  if (a === null || b === null) return a === b;

  // Normalize strings (trim and case-insensitive)
  const aStr = String(a).trim().toLowerCase();
  const bStr = String(b).trim().toLowerCase();

  // Try numeric comparison if both are numbers
  const aNum = parseFloat(aStr);
  const bNum = parseFloat(bStr);
  if (!isNaN(aNum) && !isNaN(bNum)) {
    return Math.abs(aNum - bNum) < 0.0001; // Float comparison with tolerance
  }

  return aStr === bStr;
}

/**
 * Compare two sheets
 */
export function compareSheets(
  oldSheet: ExcelSheet,
  newSheet: ExcelSheet
): SheetComparison {
  const oldData = oldSheet.data;
  const newData = newSheet.data;

  const maxRows = Math.max(oldData.length, newData.length);
  const maxCols = Math.max(oldSheet.columnCount, newSheet.columnCount);

  const diffs: CellDiff[] = [];
  let changedCells = 0;

  // Compare cell by cell
  for (let row = 0; row < maxRows; row++) {
    const oldRow = oldData[row] || [];
    const newRow = newData[row] || [];

    for (let col = 0; col < maxCols; col++) {
      const oldValue = oldRow[col] ?? null;
      const newValue = newRow[col] ?? null;

      if (!valuesEqual(oldValue, newValue)) {
        let type: CellDiffType;

        if (oldValue === null && newValue !== null) {
          type = 'added';
        } else if (oldValue !== null && newValue === null) {
          type = 'deleted';
        } else {
          type = 'modified';
        }

        diffs.push({
          row,
          col,
          type,
          oldValue,
          newValue,
        });

        changedCells++;
      }
    }
  }

  // Calculate summary
  const addedRows = Math.max(0, newData.length - oldData.length);
  const deletedRows = Math.max(0, oldData.length - newData.length);
  const addedColumns = Math.max(0, newSheet.columnCount - oldSheet.columnCount);
  const deletedColumns = Math.max(0, oldSheet.columnCount - newSheet.columnCount);

  return {
    oldSheetName: oldSheet.name,
    newSheetName: newSheet.name,
    summary: {
      totalCells: maxRows * maxCols,
      changedCells,
      addedRows,
      deletedRows,
      addedColumns,
      deletedColumns,
    },
    diffs,
    oldData,
    newData,
  };
}

/**
 * Export comparison result to Excel with highlighting
 */
export async function exportComparisonToExcel(
  comparison: SheetComparison,
  showOnlyChanges: boolean = false
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Karşılaştırma');

  // Add summary at the top
  worksheet.addRow(['📊 KARŞILAŞTIRMA ÖZETİ']).font = { bold: true, size: 14 };
  worksheet.addRow(['Eski Sayfa:', comparison.oldSheetName]);
  worksheet.addRow(['Yeni Sayfa:', comparison.newSheetName]);
  worksheet.addRow(['Değiştirilen Hücre:', comparison.summary.changedCells]);
  worksheet.addRow(['Eklenen Satır:', comparison.summary.addedRows]);
  worksheet.addRow(['Silinen Satır:', comparison.summary.deletedRows]);
  worksheet.addRow(['Eklenen Sütun:', comparison.summary.addedColumns]);
  worksheet.addRow(['Silinen Sütun:', comparison.summary.deletedColumns]);
  worksheet.addRow([]); // Empty row

  // Create a map of changed cells for quick lookup
  const changedCellsMap = new Map<string, CellDiff>();
  comparison.diffs.forEach((diff) => {
    changedCellsMap.set(`${diff.row},${diff.col}`, diff);
  });

  // Add side-by-side comparison
  const maxRows = Math.max(comparison.oldData.length, comparison.newData.length);
  const maxCols = Math.max(
    Math.max(...comparison.oldData.map((r) => r.length)),
    Math.max(...comparison.newData.map((r) => r.length))
  );

  // Header row
  const headerRow = worksheet.addRow([
    'Satır',
    ...Array(maxCols).fill(0).map((_, i) => `Sütun ${i + 1} (ESKİ)`),
    '|',
    ...Array(maxCols).fill(0).map((_, i) => `Sütun ${i + 1} (YENİ)`),
  ]);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' },
  };

  // Data rows
  for (let row = 0; row < maxRows; row++) {
    if (showOnlyChanges) {
      // Check if this row has any changes
      const hasChanges = comparison.diffs.some((d) => d.row === row);
      if (!hasChanges) continue;
    }

    const oldRow = comparison.oldData[row] || [];
    const newRow = comparison.newData[row] || [];

    const rowData = [
      row + 1, // Row number
      ...Array(maxCols).fill(0).map((_, col) => oldRow[col] ?? ''),
      '|',
      ...Array(maxCols).fill(0).map((_, col) => newRow[col] ?? ''),
    ];

    const excelRow = worksheet.addRow(rowData);

    // Highlight changed cells
    for (let col = 0; col < maxCols; col++) {
      const diff = changedCellsMap.get(`${row},${col}`);
      if (diff) {
        let fillColor: string;
        if (diff.type === 'added') {
          fillColor = 'FFC6EFCE'; // Light green
        } else if (diff.type === 'deleted') {
          fillColor = 'FFFFC7CE'; // Light red
        } else {
          fillColor = 'FFFFEB9C'; // Light orange
        }

        // Highlight in old column
        const oldCell = excelRow.getCell(col + 2);
        oldCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: fillColor },
        };

        // Highlight in new column
        const newCell = excelRow.getCell(maxCols + 3 + col);
        newCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: fillColor },
        };
      }
    }
  }

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

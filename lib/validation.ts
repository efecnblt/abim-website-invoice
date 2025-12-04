import { ExtractedInvoiceData, TableRow } from "./types";

export interface ValidationIssue {
  rowIndex: number;
  tableIndex: number;
  expected: number;
  actual: number;
  difference: number;
  description: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  needsReview: boolean;
}

/**
 * Detect column names for quantity, unit price, and total amount
 * Supports multiple languages: French, German, English, Turkish
 */
function detectColumns(headers: string[]): {
  quantity: string | null;
  unitPrice: string | null;
  totalAmount: string | null;
} {
  const headerLower = headers.map(h => h.toLowerCase().trim());

  // Quantity column patterns
  const quantityPatterns = [
    'quantité', 'quantity', 'menge', 'miktar', 'qty', 'qté',
    'nombre', 'anzahl', 'adet', 'amount'
  ];

  // Unit price patterns
  const unitPricePatterns = [
    'pu', 'p.u', 'prix unitaire', 'unit price', 'einzelpreis', 'ep', 'e.p',
    'birim fiyat', 'birim fiyatı', 'price', 'fiyat', 'preis'
  ];

  // Total amount patterns
  const totalPatterns = [
    'somme', 'total', 'montant', 'gesamt', 'betrag', 'toplam',
    'sum', 'amount', 'tutar', 'monta'
  ];

  let quantity: string | null = null;
  let unitPrice: string | null = null;
  let totalAmount: string | null = null;

  // Find quantity column
  for (let i = 0; i < headerLower.length; i++) {
    const header = headerLower[i];
    if (quantityPatterns.some(pattern => header.includes(pattern))) {
      quantity = headers[i];
      break;
    }
  }

  // Find unit price column
  for (let i = 0; i < headerLower.length; i++) {
    const header = headerLower[i];
    if (unitPricePatterns.some(pattern => header.includes(pattern))) {
      unitPrice = headers[i];
      break;
    }
  }

  // Find total amount column
  for (let i = 0; i < headerLower.length; i++) {
    const header = headerLower[i];
    if (totalPatterns.some(pattern => header.includes(pattern))) {
      totalAmount = headers[i];
      break;
    }
  }

  return { quantity, unitPrice, totalAmount };
}

/**
 * Parse a value to number, handling different formats
 */
function parseNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;

  // Convert to string and clean
  const str = String(value)
    .replace(/\s/g, '') // Remove spaces
    .replace(/,/g, '.') // Replace comma with dot
    .replace(/[^\d.-]/g, ''); // Remove non-numeric except dot and minus

  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

/**
 * Validate invoice data by checking unit price × quantity = total for each row
 */
export function validateInvoiceData(invoice: ExtractedInvoiceData): ValidationResult {
  const issues: ValidationIssue[] = [];

  invoice.tables.forEach((table, tableIndex) => {
    const columns = detectColumns(table.headers);

    // Skip validation if we can't find the necessary columns
    if (!columns.quantity || !columns.unitPrice || !columns.totalAmount) {
      return;
    }

    table.rows.forEach((row, rowIndex) => {
      const quantity = parseNumber(row[columns.quantity!]);
      const unitPrice = parseNumber(row[columns.unitPrice!]);
      const total = parseNumber(row[columns.totalAmount!]);

      // Skip rows with missing data
      if (quantity === null || unitPrice === null || total === null) {
        return;
      }

      const expected = quantity * unitPrice;
      const difference = Math.abs(expected - total);

      // Allow 1% tolerance for rounding errors
      const tolerance = Math.max(0.01, Math.abs(expected) * 0.01);

      if (difference > tolerance) {
        issues.push({
          rowIndex,
          tableIndex,
          expected: Math.round(expected * 100) / 100,
          actual: Math.round(total * 100) / 100,
          difference: Math.round(difference * 100) / 100,
          description: `Satır ${rowIndex + 1}: ${quantity} × ${unitPrice} = ${expected.toFixed(2)}, fakat toplam ${total}`,
        });
      }
    });
  });

  return {
    isValid: issues.length === 0,
    issues,
    needsReview: issues.length > 0,
  };
}

/**
 * Extract key information from first table row for display
 */
export function extractDisplayInfo(invoice: ExtractedInvoiceData): {
  concreteType?: string;
  quantity?: number;
  unitPrice?: number;
  plateNumber?: string;
} {
  const info: any = {};

  if (invoice.tables.length === 0 || invoice.tables[0].rows.length === 0) {
    return info;
  }

  const table = invoice.tables[0];
  const firstRow = table.rows[0];
  const columns = detectColumns(table.headers);

  // Get quantity and unit price
  if (columns.quantity) {
    info.quantity = parseNumber(firstRow[columns.quantity]);
  }
  if (columns.unitPrice) {
    info.unitPrice = parseNumber(firstRow[columns.unitPrice]);
  }

  // Try to find concrete type (Dénomination, Bezeichnung, Description, etc.)
  const descriptionPatterns = ['dénomination', 'bezeichnung', 'description', 'tanım', 'ürün', 'product', 'artikel'];
  for (const header of table.headers) {
    const headerLower = header.toLowerCase();
    if (descriptionPatterns.some(pattern => headerLower.includes(pattern))) {
      info.concreteType = firstRow[header];
      break;
    }
  }

  // Try to find plate number
  const platePatterns = ['plaque', 'plaka', 'plate', 'kennzeichen', 'vehicle', 'araç'];
  for (const header of table.headers) {
    const headerLower = header.toLowerCase();
    if (platePatterns.some(pattern => headerLower.includes(pattern))) {
      info.plateNumber = firstRow[header];
      break;
    }
  }

  return info;
}

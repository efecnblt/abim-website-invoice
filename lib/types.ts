// Flexible invoice data structure for any table format
export interface InvoiceMetadata {
  id: string;
  fileName: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  supplier?: string;
  customer?: string;
  totalAmount?: number;
  currency?: string;
  notes?: string;
}

export interface TableRow {
  [key: string]: string | number | null; // Dynamic columns
}

export interface InvoiceTable {
  headers: string[]; // Column headers (e.g., ["Quantité", "Dénomination", "PU", "Somme EUR"])
  rows: TableRow[]; // Array of row data
}

export interface ExtractedInvoiceData {
  metadata: InvoiceMetadata;
  tables: InvoiceTable[]; // Multiple tables if needed
}

export interface ExtractionResult {
  success: boolean;
  data?: ExtractedInvoiceData[];
  error?: string;
  totalProcessed: number;
}

export interface ProcessingStatus {
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
}

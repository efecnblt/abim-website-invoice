// Updated storage with PDF data
import { ExtractedInvoiceData } from "./types";
import { validateInvoiceData, ValidationResult } from "./validation";

export interface InvoiceTemplate {
  id: string;
  name: string;
  description: string;
  language: string;
  samplePdfName?: string;
  fieldMappings: {
    metadata: string[];
    tableHeaders: string[];
  };
  customPrompt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessedInvoice {
  id: string;
  data: ExtractedInvoiceData;
  pdfData?: string; // base64 PDF data for preview (deprecated, use pdfUrl)
  pdfUrl?: string; // Supabase public URL
  pdfPath?: string; // Supabase storage path
  templateId?: string;
  processedAt: string;
  isFavorite: boolean;
  tags: string[];
  validation: ValidationResult; // Validation result for calculations
}

// Invoice History with PDF
export const saveProcessedInvoiceWithPdf = (
  invoice: ExtractedInvoiceData,
  pdfBase64?: string,
  templateId?: string
): ProcessedInvoice => {
  // Automatically validate the invoice data
  const validation = validateInvoiceData(invoice);

  const processed: ProcessedInvoice = {
    id: crypto.randomUUID(),
    data: invoice,
    pdfData: pdfBase64, // Store PDF for preview
    templateId,
    processedAt: new Date().toISOString(),
    isFavorite: false,
    tags: [],
    validation, // Add validation result
  };

  const history = getInvoiceHistory();
  history.unshift(processed);

  // Store with size limit check (localStorage has ~5-10MB limit)
  try {
    localStorage.setItem("invoice_history", JSON.stringify(history));
  } catch (e) {
    // If quota exceeded, remove oldest items
    console.warn("Storage quota exceeded, removing old items");
    const reduced = history.slice(0, 50); // Keep only 50 most recent
    localStorage.setItem("invoice_history", JSON.stringify(reduced));
  }

  return processed;
};

export const saveProcessedInvoice = (invoice: ExtractedInvoiceData, templateId?: string): ProcessedInvoice => {
  return saveProcessedInvoiceWithPdf(invoice, undefined, templateId);
};

export const getInvoiceHistory = (): ProcessedInvoice[] => {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem("invoice_history");
  if (!data) return [];

  const history = JSON.parse(data);

  // Migrate old invoices without validation field
  const migrated = history.map((item: any) => {
    if (!item.validation) {
      return {
        ...item,
        validation: validateInvoiceData(item.data),
      };
    }
    return item;
  });

  // Save migrated data if changes were made
  if (migrated.some((item: any, index: number) => !history[index].validation)) {
    try {
      localStorage.setItem("invoice_history", JSON.stringify(migrated));
    } catch (e) {
      console.warn("Failed to save migrated data");
    }
  }

  return migrated;
};

export const getProcessedInvoice = (id: string): ProcessedInvoice | undefined => {
  const history = getInvoiceHistory();
  return history.find((item) => item.id === id);
};

export const updateProcessedInvoice = (id: string, updates: Partial<ProcessedInvoice>): void => {
  const history = getInvoiceHistory();
  const updated = history.map((item) =>
    item.id === id ? { ...item, ...updates } : item
  );
  localStorage.setItem("invoice_history", JSON.stringify(updated));
};

export const deleteProcessedInvoice = (id: string): void => {
  const history = getInvoiceHistory();
  const filtered = history.filter((item) => item.id !== id);
  localStorage.setItem("invoice_history", JSON.stringify(filtered));
};

export const toggleFavorite = (id: string): void => {
  const history = getInvoiceHistory();
  const updated = history.map((item) =>
    item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
  );
  localStorage.setItem("invoice_history", JSON.stringify(updated));
};

export const addTag = (id: string, tag: string): void => {
  const history = getInvoiceHistory();
  const updated = history.map((item) =>
    item.id === id ? { ...item, tags: [...new Set([...item.tags, tag])] } : item
  );
  localStorage.setItem("invoice_history", JSON.stringify(updated));
};

// Templates (unchanged)
export const saveTemplate = (template: Omit<InvoiceTemplate, "id" | "createdAt" | "updatedAt">): InvoiceTemplate => {
  const newTemplate: InvoiceTemplate = {
    ...template,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const templates = getTemplates();
  templates.push(newTemplate);
  localStorage.setItem("invoice_templates", JSON.stringify(templates));
  return newTemplate;
};

export const getTemplates = (): InvoiceTemplate[] => {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem("invoice_templates");
  return data ? JSON.parse(data) : [];
};

export const getTemplate = (id: string): InvoiceTemplate | undefined => {
  const templates = getTemplates();
  return templates.find((t) => t.id === id);
};

export const updateTemplate = (id: string, updates: Partial<InvoiceTemplate>): void => {
  const templates = getTemplates();
  const updated = templates.map((t) =>
    t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
  );
  localStorage.setItem("invoice_templates", JSON.stringify(updated));
};

export const deleteTemplate = (id: string): void => {
  const templates = getTemplates();
  const filtered = templates.filter((t) => t.id !== id);
  localStorage.setItem("invoice_templates", JSON.stringify(filtered));
};

// Stats (unchanged)
export const getStats = () => {
  const history = getInvoiceHistory();
  const templates = getTemplates();

  const totalProcessed = history.length;
  const favorites = history.filter((h) => h.isFavorite).length;
  const totalTemplates = templates.length;

  const supplierStats: Record<string, number> = {};
  history.forEach((h) => {
    const supplier = h.data.metadata.supplier || "Unknown";
    supplierStats[supplier] = (supplierStats[supplier] || 0) + 1;
  });

  const monthlyStats: Record<string, number> = {};
  history.forEach((h) => {
    const month = h.processedAt.substring(0, 7);
    monthlyStats[month] = (monthlyStats[month] || 0) + 1;
  });

  return {
    totalProcessed,
    favorites,
    totalTemplates,
    supplierStats,
    monthlyStats,
  };
};

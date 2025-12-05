import { createClient } from '@supabase/supabase-js';

// Supabase client for browser
let supabaseBrowser: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowser() {
  if (!supabaseBrowser) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey);
  }

  return supabaseBrowser;
}

// Supabase client for server (API routes)
let supabaseServer: ReturnType<typeof createClient> | null = null;

export function getSupabaseServer() {
  if (!supabaseServer) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    supabaseServer = createClient(supabaseUrl, supabaseAnonKey);
  }

  return supabaseServer;
}

/**
 * Upload PDF to Supabase Storage
 */
export async function uploadPDFToSupabase(
  file: File | Buffer,
  fileName: string
): Promise<{ path: string; publicUrl: string }> {
  const supabase = getSupabaseServer();

  // Generate unique filename
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(7);
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const uniqueFileName = `${timestamp}_${randomString}_${sanitizedName}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('invoices')
    .upload(uniqueFileName, file, {
      contentType: 'application/pdf',
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: publicData } = supabase.storage
    .from('invoices')
    .getPublicUrl(data.path);

  return {
    path: data.path,
    publicUrl: publicData.publicUrl,
  };
}

/**
 * Download PDF from Supabase Storage
 */
export async function downloadPDFFromSupabase(filePath: string): Promise<Blob> {
  const supabase = getSupabaseServer();

  const { data, error } = await supabase.storage
    .from('invoices')
    .download(filePath);

  if (error) {
    console.error('Supabase download error:', error);
    throw new Error(`Download failed: ${error.message}`);
  }

  return data;
}

/**
 * Delete PDF from Supabase Storage
 */
export async function deletePDFFromSupabase(filePath: string): Promise<boolean> {
  const supabase = getSupabaseServer();

  const { error } = await supabase.storage
    .from('invoices')
    .remove([filePath]);

  if (error) {
    console.error('Supabase delete error:', error);
    return false;
  }

  return true;
}

/**
 * Get public URL for PDF
 */
export function getPDFPublicUrl(filePath: string): string {
  const supabase = getSupabaseBrowser();

  const { data } = supabase.storage
    .from('invoices')
    .getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * List all files in storage (for admin)
 */
export async function listStorageFiles() {
  const supabase = getSupabaseServer();

  const { data, error } = await supabase.storage
    .from('invoices')
    .list('', {
      limit: 100,
      offset: 0,
      sortBy: { column: 'created_at', order: 'desc' },
    });

  if (error) {
    console.error('Supabase list error:', error);
    throw new Error(`List failed: ${error.message}`);
  }

  return data;
}

/**
 * Upload Excel to Supabase Storage
 */
export async function uploadExcelToSupabase(
  file: File | Buffer,
  fileName: string
): Promise<{ path: string; publicUrl: string }> {
  const supabase = getSupabaseServer();

  // Generate unique filename
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(7);
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const uniqueFileName = `excel/${timestamp}_${randomString}_${sanitizedName}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('invoices')
    .upload(uniqueFileName, file, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Supabase Excel upload error:', error);
    throw new Error(`Excel upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: publicData } = supabase.storage
    .from('invoices')
    .getPublicUrl(data.path);

  return {
    path: data.path,
    publicUrl: publicData.publicUrl,
  };
}

/**
 * Download Excel from Supabase Storage
 */
export async function downloadExcelFromSupabase(filePath: string): Promise<Blob> {
  const supabase = getSupabaseServer();

  const { data, error } = await supabase.storage
    .from('invoices')
    .download(filePath);

  if (error) {
    console.error('Supabase Excel download error:', error);
    throw new Error(`Excel download failed: ${error.message}`);
  }

  return data;
}

/**
 * Delete Excel from Supabase Storage
 */
export async function deleteExcelFromSupabase(filePath: string): Promise<boolean> {
  const supabase = getSupabaseServer();

  const { error } = await supabase.storage
    .from('invoices')
    .remove([filePath]);

  if (error) {
    console.error('Supabase Excel delete error:', error);
    return false;
  }

  return true;
}

import { NextRequest, NextResponse } from "next/server";
import { uploadPDFToSupabase } from "@/lib/supabase";

export const runtime = 'nodejs';

/**
 * Migrate old invoices with base64 PDF data to Supabase Storage
 */
export async function POST(request: NextRequest) {
  try {
    const { invoices } = await request.json();

    if (!invoices || !Array.isArray(invoices)) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    const migrated: any[] = [];
    const errors: any[] = [];

    for (const invoice of invoices) {
      // Skip if already has Supabase URL
      if (invoice.pdfUrl) {
        continue;
      }

      // Skip if no base64 data
      if (!invoice.pdfData) {
        continue;
      }

      try {
        console.log(`Migrating invoice: ${invoice.data.metadata.fileName}`);

        // Convert base64 to buffer
        const buffer = Buffer.from(invoice.pdfData, 'base64');

        // Upload to Supabase
        const uploadResult = await uploadPDFToSupabase(
          buffer,
          invoice.data.metadata.fileName
        );

        migrated.push({
          id: invoice.id,
          fileName: invoice.data.metadata.fileName,
          pdfUrl: uploadResult.publicUrl,
          pdfPath: uploadResult.path,
        });

        console.log(`✅ Migrated: ${invoice.data.metadata.fileName}`);
      } catch (error) {
        console.error(`❌ Failed to migrate ${invoice.data.metadata.fileName}:`, error);
        errors.push({
          id: invoice.id,
          fileName: invoice.data.metadata.fileName,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      migrated,
      errors,
      totalMigrated: migrated.length,
      totalErrors: errors.length,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      {
        error: "Migration failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

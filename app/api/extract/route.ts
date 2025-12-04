import { NextRequest, NextResponse } from "next/server";
import { extractInvoiceData } from "@/lib/openai";
import { ExtractedInvoiceData } from "@/lib/types";
import { uploadPDFToSupabase } from "@/lib/supabase";

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for processing multiple files

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    const results: ExtractedInvoiceData[] = [];
    const errors: { fileName: string; error: string }[] = [];
    const uploadedFiles: Array<{
      fileName: string;
      storagePath: string;
      publicUrl: string;
    }> = [];

    // Process each file
    for (const file of files) {
      try {
        console.log(`Processing file: ${file.name}`);

        // Convert file to base64 and buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString("base64");

        // Extract data using GPT-4o-mini
        const result = await extractInvoiceData(base64, file.name);

        if (result.success && result.data) {
          results.push(result.data as ExtractedInvoiceData);

          // Upload PDF to Supabase Storage
          try {
            console.log(`📤 Uploading to Supabase: ${file.name}`);
            const uploadResult = await uploadPDFToSupabase(buffer, file.name);

            uploadedFiles.push({
              fileName: file.name,
              storagePath: uploadResult.path,
              publicUrl: uploadResult.publicUrl,
            });

            console.log(`✅ Uploaded successfully: ${uploadResult.path}`);
          } catch (uploadError) {
            console.error(`❌ Upload failed for ${file.name}:`, uploadError);
            // Continue even if upload fails - data is still extracted
          }

          console.log(`Successfully processed: ${file.name}`);
        } else {
          errors.push({
            fileName: file.name,
            error: result.error || "Failed to extract data",
          });
          console.error(`Failed to process: ${file.name}`, result.error);
        }
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        errors.push({
          fileName: file.name,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      uploadedFiles,
      errors: errors.length > 0 ? errors : undefined,
      totalProcessed: results.length,
      totalErrors: errors.length,
      totalUploaded: uploadedFiles.length,
    });
  } catch (error) {
    console.error("Extraction error:", error);
    return NextResponse.json(
      {
        error: "Failed to process files",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

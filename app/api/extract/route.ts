import { NextRequest, NextResponse } from "next/server";
import { extractInvoiceData } from "@/lib/openai";
import { ExtractedInvoiceData } from "@/lib/types";
import { uploadPDFToSupabase } from "@/lib/supabase";

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for processing multiple files

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('\n🚀 ========== NEW EXTRACTION REQUEST ==========');
  console.log(`⏰ Start time: ${new Date().toISOString()}`);

  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    console.log(`📁 Total files received: ${files.length}`);
    files.forEach((f, i) => console.log(`  ${i + 1}. ${f.name} (${(f.size / 1024).toFixed(2)} KB)`));

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
    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
      const file = files[fileIndex];
      const fileStartTime = Date.now();

      try {
        console.log(`\n📄 ========== Processing file ${fileIndex + 1}/${files.length}: ${file.name} ==========`);

        // Convert file to base64 and buffer
        console.log(`  📦 Converting to buffer...`);
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString("base64");
        console.log(`  ✅ Buffer created: ${base64.length} chars`);

        // Extract data using GPT-4o-mini
        console.log(`  🤖 Starting AI extraction...`);
        const extractionStart = Date.now();
        const result = await extractInvoiceData(base64, file.name);
        const extractionDuration = ((Date.now() - extractionStart) / 1000).toFixed(2);
        console.log(`  ⏱️  AI extraction took: ${extractionDuration}s`);

        if (result.success && result.data) {
          results.push(result.data as ExtractedInvoiceData);
          console.log(`  ✅ Extraction successful!`);

          // Upload PDF to Supabase Storage
          try {
            console.log(`  📤 Uploading to Supabase...`);
            const uploadStart = Date.now();
            const uploadResult = await uploadPDFToSupabase(buffer, file.name);
            const uploadDuration = ((Date.now() - uploadStart) / 1000).toFixed(2);

            uploadedFiles.push({
              fileName: file.name,
              storagePath: uploadResult.path,
              publicUrl: uploadResult.publicUrl,
            });

            console.log(`  ✅ Upload completed in ${uploadDuration}s: ${uploadResult.path}`);
          } catch (uploadError) {
            console.error(`  ❌ Upload failed:`, uploadError);
            // Continue even if upload fails - data is still extracted
          }

          const fileDuration = ((Date.now() - fileStartTime) / 1000).toFixed(2);
          console.log(`  🎉 File completed in ${fileDuration}s`);
        } else {
          errors.push({
            fileName: file.name,
            error: result.error || "Failed to extract data",
          });
          console.error(`  ❌ Extraction failed:`, result.error);
        }
      } catch (error) {
        const fileDuration = ((Date.now() - fileStartTime) / 1000).toFixed(2);
        console.error(`  ❌ Error processing ${file.name} (after ${fileDuration}s):`, error);
        errors.push({
          fileName: file.name,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ ========== REQUEST COMPLETED ==========`);
    console.log(`⏱️  Total time: ${totalDuration}s`);
    console.log(`✅ Successful: ${results.length}`);
    console.log(`❌ Errors: ${errors.length}`);

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

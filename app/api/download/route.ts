import { NextRequest, NextResponse } from "next/server";
import { generateExcel } from "@/lib/excel";
import { ExtractedInvoiceData } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const data: ExtractedInvoiceData[] = await request.json();

    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: "No data provided" },
        { status: 400 }
      );
    }

    // Generate Excel file
    const excelBuffer = await generateExcel(data);

    // Return file
    return new NextResponse(new Uint8Array(excelBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="faturalar_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Excel generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate Excel file" },
      { status: 500 }
    );
  }
}

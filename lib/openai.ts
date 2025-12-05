import OpenAI from "openai";
import pdf from "pdf-parse";

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Helper function to chunk long text
function chunkText(text: string, maxChunkSize: number = 10000): string[] {
  const chunks: string[] = [];
  let currentPos = 0;

  while (currentPos < text.length) {
    // Try to find a good break point (newline or space)
    let endPos = Math.min(currentPos + maxChunkSize, text.length);

    if (endPos < text.length) {
      // Look for newline or space within last 500 chars
      const searchStart = Math.max(endPos - 500, currentPos);
      const lastNewline = text.lastIndexOf('\n', endPos);
      const lastSpace = text.lastIndexOf(' ', endPos);

      if (lastNewline > searchStart) {
        endPos = lastNewline + 1;
      } else if (lastSpace > searchStart) {
        endPos = lastSpace + 1;
      }
    }

    chunks.push(text.substring(currentPos, endPos));
    currentPos = endPos;
  }

  return chunks;
}

export async function extractInvoiceData(pdfBase64: string, fileName: string) {
  const openai = getOpenAIClient();
  const prompt = `Sen bir fatura/belge analiz uzmanısın. Verilen fatura metninden TÜM TABLO VERİLERİNİ çıkarman gerekiyor.

ÖNEMLİ TALİMATLAR:
1. Faturadaki BAŞLIKLARI (headers) tespit et:
   - Miktar: Quantité, Menge, Qty, Anzahl
   - Açıklama: Dénomination, Bezeichnung, Description, Article
   - Birim: Unité, Unit, Einheit
   - Fiyat: PU (Prix Unitaire), EP (Einzelpreis), Unit Price
   - KDV: TVA, MWST, VAT
   - Toplam: Somme, Total, Gesamt
   - TARİH SÜTUNLARI (ÇOK ÖNEMLİ!): Date de prestation, Leistungsdatum, Lieferdatum, Service Date, Delivery Date, Date

2. Her satırdaki verileri doğru sütunlara eşleştir
3. Farklı dillerdeki (Fransızca, Almanca, İngilizce, Türkçe) başlıkları tanı
4. Tablo dışı bilgileri metadata'ya al: Fatura No, Tarih, Tedarikçi, Müşteri, Toplam Tutar
5. ÇOK SAYFALÎ FATURALAR: Eğer fatura birden fazla sayfaysa, TÜM SAYFALARDAKI verileri tek tabloda birleştir

ÇIKTI FORMATI (JSON):
{
  "metadata": {
    "invoiceNumber": "302504056",
    "invoiceDate": "2025-08-22",
    "supplier": "HEIN SABLIERE",
    "customer": "77 CONSTRUCTION",
    "totalAmount": 1225.43,
    "currency": "EUR",
    "notes": "Ek önemli notlar varsa"
  },
  "tables": [
    {
      "headers": ["Pos", "Date de prestation", "Article", "Dénomination", "Quantité", "Unité", "TVA", "PU", "Somme EUR"],
      "rows": [
        {
          "Pos": "1",
          "Date de prestation": "2025-04-01",
          "Article": "6031",
          "Dénomination": "Concassé grès 0-45 mm type 2",
          "Quantité": 20.640,
          "Unité": "t",
          "TVA": "17%",
          "PU": 17.50,
          "Somme EUR": 361.20
        },
        {
          "Pos": "2",
          "Date de prestation": "2025-04-15",
          "Article": "6031",
          "Dénomination": "Concassé grès 0-45 mm type 2",
          "Quantité": 21.900,
          "Unité": "t",
          "TVA": "17%",
          "PU": 17.50,
          "Somme EUR": 383.25
        }
      ]
    }
  ]
}

ÖNEMLİ NOTLAR:
- Tüm sayısal değerleri NUMBER olarak ver (string değil!)
- Tarih formatı: YYYY-MM-DD (örn: 01.04.2025 → 2025-04-01, 19.08.2025 → 2025-08-19)
- TARİH SÜTUNLARINI MUTLAKA ÇIKAR: Eğer tabloda "Date de prestation", "Leistungsdatum", "Lieferdatum" gibi tarih sütunu varsa, headers'a ekle ve her satırdaki tarihi çıkar
- Eğer bir alan bulunamazsa null kullan
- Boş satırları atla
- Her satırdaki tüm sütun verilerini eksiksiz çıkar
- Başlıkları faturadaki orijinal dilleriyle koru
- ÇOK SAYFALÎ FATURALAR: Fatura 2+ sayfa ise, tüm sayfaları oku ve BÜTÜN verileri tek tabloda birleştir

SADECE JSON döndür, başka açıklama ekleme!`;

  try {
    // Step 1: Convert PDF base64 to buffer and extract text
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const pdfData = await pdf(pdfBuffer);
    const pdfText = pdfData.text;

    if (!pdfText || pdfText.trim().length === 0) {
      throw new Error("PDF'den metin çıkarılamadı. PDF bozuk veya boş olabilir.");
    }

    console.log("📄 PDF Info:");
    console.log("  - Total Pages:", pdfData.numpages);
    console.log("  - Text Length:", pdfText.length, "characters");
    console.log("  - File Name:", fileName);
    console.log("PDF Text Preview (first 500 chars):", pdfText.substring(0, 500));

    // Step 2: Check if PDF is too long and needs chunking
    const MAX_TEXT_LENGTH = 15000; // Characters (rough estimate for token limit)
    let extractedData;

    if (pdfText.length > MAX_TEXT_LENGTH) {
      console.log(`⚠️  Long PDF detected (${pdfText.length} chars). Using chunk-based processing...`);

      const chunks = chunkText(pdfText, MAX_TEXT_LENGTH);
      console.log(`📦 Split into ${chunks.length} chunks`);

      const allTables: any[] = [];
      let metadata: any = null;

      for (let i = 0; i < chunks.length; i++) {
        console.log(`Processing chunk ${i + 1}/${chunks.length}...`);

        const chunkPrompt = i === 0
          ? `${prompt}\n\n=== FATURA METNİ (Bölüm ${i + 1}/${chunks.length}) ===\n${chunks[i]}`
          : `Sen bir fatura analiz uzmanısın. Bu faturanın ${i + 1}. bölümünü işliyorsun. SADECE tablo verilerini çıkar, metadata atla.

SADECE JSON formatında döndür:
{
  "tables": [
    {
      "headers": [...],
      "rows": [...]
    }
  ]
}

=== FATURA METNİ (Bölüm ${i + 1}/${chunks.length}) ===
${chunks[i]}`;

        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "Sen bir fatura tablo veri çıkarma uzmanısın. Verilen fatura metninden tablo verilerini JSON formatında çıkarırsın."
            },
            {
              role: "user",
              content: chunkPrompt
            }
          ],
          max_tokens: 16000,
          temperature: 0.1,
          response_format: { type: "json_object" }
        });

        const chunkText = response.choices[0]?.message?.content;
        if (chunkText) {
          let jsonText = chunkText.trim();
          if (jsonText.startsWith("```json")) {
            jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
          }

          const chunkData = JSON.parse(jsonText);

          // First chunk has metadata
          if (i === 0 && chunkData.metadata) {
            metadata = chunkData.metadata;
          }

          // Collect all tables
          if (chunkData.tables && Array.isArray(chunkData.tables)) {
            allTables.push(...chunkData.tables);
          }
        }
      }

      // Merge all tables into one
      extractedData = {
        metadata: metadata || {
          invoiceNumber: null,
          invoiceDate: null,
          supplier: null,
          customer: null,
          totalAmount: null,
          currency: null
        },
        tables: allTables
      };

      console.log(`✅ Merged ${allTables.length} tables from ${chunks.length} chunks`);
    } else {
      // Normal processing for short PDFs
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Sen bir fatura tablo veri çıkarma uzmanısın. Verilen fatura metninden tüm tablo verilerini ve metadata'yı yapılandırılmış JSON formatında çıkarırsın. Çok sayfalı faturalarda TÜM SAYFALARDAKI verileri tek tabloda birleştirirsin. Tarih sütunlarını (Date de prestation, Leistungsdatum, etc.) mutlaka tespit edersin. Sadece JSON formatında cevap verirsin."
          },
          {
            role: "user",
            content: `${prompt}\n\n=== FATURA METNİ (${pdfData.numpages} SAYFA) ===\n${pdfText}`
          }
        ],
        max_tokens: 16000,
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const textContent = response.choices[0]?.message?.content;
      if (!textContent) {
        console.error("No text content in response:", response);
        throw new Error("GPT-4o-mini'den yanıt alınamadı - response boş");
      }

      console.log("GPT Response:", textContent.substring(0, 500));

      // Extract JSON from response
      let jsonText = textContent.trim();

      // Remove markdown code blocks if present
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      } else if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/```\n?/g, "");
      }

      extractedData = JSON.parse(jsonText);
    }

    return {
      success: true,
      data: {
        ...extractedData,
        metadata: {
          ...extractedData.metadata,
          id: crypto.randomUUID(),
          fileName: fileName,
        }
      },
    };
  } catch (error) {
    console.error("OpenAI API Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

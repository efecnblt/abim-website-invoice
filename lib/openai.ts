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

    // Step 2: Send text to GPT-4o-mini for structured extraction
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Cost-effective and reliable for document processing
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
      max_tokens: 16000, // GPT-4o-mini max output is 16,384 tokens - enough for very long invoices
      temperature: 0.1, // Low temperature for consistent extraction
      response_format: { type: "json_object" } // Force JSON response
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

    const extractedData = JSON.parse(jsonText);

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

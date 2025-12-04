"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ExtractedInvoiceData } from "@/lib/types";
import { saveProcessedInvoiceWithPdf } from "@/lib/storage";
import { validateInvoiceData } from "@/lib/validation";
import { Loader2, FileSpreadsheet, ArrowRight, CheckCircle2, XCircle } from "lucide-react";

export default function NewInvoicePage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedInvoiceData[]>([]);
  const [errors, setErrors] = useState<{ fileName: string; error: string }[]>([]);
  const [progress, setProgress] = useState(0);

  const handleProcess = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setProgress(0);
    setExtractedData([]);
    setErrors([]);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });

      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 500);

      const response = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        throw new Error("Failed to process files");
      }

      const result = await response.json();

      if (result.data) {
        setExtractedData(result.data);

        // Save to localStorage with Supabase URLs
        result.data.forEach((invoice: ExtractedInvoiceData, index: number) => {
          const uploadedFile = result.uploadedFiles?.[index];

          if (uploadedFile) {
            // Save with Supabase URL and path
            const processed = {
              ...invoice,
              pdfUrl: uploadedFile.publicUrl,
              pdfPath: uploadedFile.storagePath,
            };

            // Validate and save
            const validation = validateInvoiceData(invoice);
            const storage = JSON.parse(localStorage.getItem('invoice_history') || '[]');
            storage.unshift({
              id: crypto.randomUUID(),
              data: invoice,
              pdfUrl: uploadedFile.publicUrl,
              pdfPath: uploadedFile.storagePath,
              processedAt: new Date().toISOString(),
              isFavorite: false,
              tags: [],
              validation,
            });
            localStorage.setItem('invoice_history', JSON.stringify(storage));
          } else {
            // Fallback: save without PDF
            saveProcessedInvoiceWithPdf(invoice);
          }
        });
      }

      if (result.errors) {
        setErrors(result.errors);
      }
    } catch (error) {
      console.error("Processing error:", error);
      alert("Dosyalar işlenirken bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const handleViewResults = () => {
    router.push("/dashboard/history");
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Yeni Fatura İşle</h1>
        <p className="text-muted-foreground mt-2">
          PDF faturalarınızı yükleyin ve tablo verilerini otomatik çıkarın
        </p>
      </div>

      <div className="grid gap-6">
        {/* Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle>1. Dosya Yükleme</CardTitle>
            <CardDescription>
              PDF formatındaki faturalarınızı yükleyin. Farklı diller desteklenir.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload files={files} onFilesChange={setFiles} maxFiles={20} />

            {files.length > 0 && (
              <div className="mt-6 flex gap-4">
                <Button
                  onClick={handleProcess}
                  disabled={isProcessing}
                  size="lg"
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      İşleniyor...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="mr-2 h-5 w-5" />
                      Verileri Çıkar ({files.length} Dosya)
                    </>
                  )}
                </Button>
                {!isProcessing && (
                  <Button
                    onClick={() => {
                      setFiles([]);
                      setExtractedData([]);
                      setErrors([]);
                    }}
                    variant="outline"
                    size="lg"
                  >
                    Temizle
                  </Button>
                )}
              </div>
            )}

            {isProcessing && progress > 0 && (
              <div className="mt-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">İşleme Durumu</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Summary */}
        {(extractedData.length > 0 || errors.length > 0) && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>2. İşlem Sonucu</CardTitle>
                  <CardDescription>
                    {extractedData.length} fatura başarıyla işlendi
                    {errors.length > 0 && `, ${errors.length} hata oluştu`}
                  </CardDescription>
                </div>
                {extractedData.length > 0 && (
                  <Button onClick={handleViewResults} size="lg">
                    Sonuçları Görüntüle
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {extractedData.length > 0 && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">İşlem Başarılı!</p>
                    <p className="text-sm text-green-700">
                      {extractedData.length} fatura işlendi ve geçmişe kaydedildi.
                      "Geçmiş" sekmesinden detaylara ulaşabilir ve Excel indirebilirsiniz.
                    </p>
                  </div>
                </div>
              )}

              {errors.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3 mb-2">
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-900">Bazı Dosyalarda Hata Oluştu</p>
                    </div>
                  </div>
                  <ul className="ml-8 mt-2 space-y-1">
                    {errors.map((err, idx) => (
                      <li key={idx} className="text-sm text-red-700">
                        <span className="font-medium">{err.fileName}:</span> {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

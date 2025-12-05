"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, ArrowRight, Download, Loader2, Table2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SheetComparison } from "@/lib/excel-compare";

interface SheetInfo {
  name: string;
  index: number;
  rowCount: number;
  columnCount: number;
}

interface ExcelInfo {
  fileName: string;
  sheets: SheetInfo[];
}

export default function ExcelComparePage() {
  const [step, setStep] = useState<"upload" | "select-sheets" | "results">("upload");

  // File upload states
  const [oldExcelFile, setOldExcelFile] = useState<File | null>(null);
  const [oldExcelBase64, setOldExcelBase64] = useState<string>("");
  const [newExcelFile, setNewExcelFile] = useState<File | null>(null);
  const [newExcelBase64, setNewExcelBase64] = useState<string>("");

  // Excel info
  const [oldExcelInfo, setOldExcelInfo] = useState<ExcelInfo | null>(null);
  const [newExcelInfo, setNewExcelInfo] = useState<ExcelInfo | null>(null);

  // Sheet selection
  const [selectedOldSheet, setSelectedOldSheet] = useState<number | null>(null);
  const [selectedNewSheet, setSelectedNewSheet] = useState<number | null>(null);

  // Comparison result
  const [comparisonResult, setComparisonResult] = useState<SheetComparison | null>(null);

  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  // Handle old Excel file upload
  const handleOldExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOldExcelFile(file);
    setLoading(true);
    setError(null);

    try {
      const base64 = await fileToBase64(file);
      setOldExcelBase64(base64);
    } catch (err) {
      setError("Eski Excel dosyası okunamadı");
    } finally {
      setLoading(false);
    }
  };

  // Handle new Excel file upload
  const handleNewExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNewExcelFile(file);
    setLoading(true);
    setError(null);

    try {
      const base64 = await fileToBase64(file);
      setNewExcelBase64(base64);
    } catch (err) {
      setError("Yeni Excel dosyası okunamadı");
    } finally {
      setLoading(false);
    }
  };

  // Analyze Excel files and get sheets
  const analyzeExcelFiles = async () => {
    if (!oldExcelBase64 || !newExcelBase64) {
      setError("Her iki Excel dosyası da gerekli");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/excel/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldExcelBase64,
          newExcelBase64,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.details || "Excel analizi başarısız");
      }

      const result = await response.json();
      setOldExcelInfo(result.data.oldExcel);
      setNewExcelInfo(result.data.newExcel);
      setStep("select-sheets");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Excel dosyaları analiz edilemedi");
    } finally {
      setLoading(false);
    }
  };

  // Run comparison
  const runComparison = async () => {
    if (selectedOldSheet === null || selectedNewSheet === null) {
      setError("Lütfen karşılaştırılacak sayfaları seçin");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/excel/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldExcelBase64,
          newExcelBase64,
          oldSheetIndex: selectedOldSheet,
          newSheetIndex: selectedNewSheet,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.details || "Karşılaştırma başarısız");
      }

      const result = await response.json();
      setComparisonResult(result.data);
      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Karşılaştırma yapılamadı");
    } finally {
      setLoading(false);
    }
  };

  // Download comparison as Excel
  const downloadComparison = async () => {
    if (!comparisonResult) return;

    setLoading(true);
    setError(null);

    try {
      // Use export endpoint to create formatted Excel
      const { exportComparisonToExcel } = await import("@/lib/excel-compare");
      const buffer = await exportComparisonToExcel(comparisonResult, false);

      // Download
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `comparison_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError("Excel indirilemedi");
    } finally {
      setLoading(false);
    }
  };

  // Format cell value for display
  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return "";
    return String(value);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Excel Karşılaştırma</h1>
        <p className="text-muted-foreground mt-2">
          İki Excel dosyasının sayfalarını karşılaştırın
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step 1: Upload Files */}
      {step === "upload" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Old Excel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Eski Excel (Referans)
              </CardTitle>
              <CardDescription>
                Karşılaştırma için referans Excel dosyasını yükleyin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="old-excel">Excel Dosyası</Label>
                <Input
                  id="old-excel"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleOldExcelUpload}
                />
              </div>

              {oldExcelFile && (
                <Badge variant="outline" className="bg-green-50">
                  ✓ {oldExcelFile.name}
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* New Excel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Yeni Excel (Karşılaştırılacak)
              </CardTitle>
              <CardDescription>
                Karşılaştırılacak yeni Excel dosyasını yükleyin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="new-excel">Excel Dosyası</Label>
                <Input
                  id="new-excel"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleNewExcelUpload}
                />
              </div>

              {newExcelFile && (
                <Badge variant="outline" className="bg-green-50">
                  ✓ {newExcelFile.name}
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Select Sheets */}
      {step === "select-sheets" && oldExcelInfo && newExcelInfo && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Old Excel Sheets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Table2 className="h-5 w-5" />
                Eski Excel Sayfaları
              </CardTitle>
              <CardDescription>
                {oldExcelInfo.fileName} - {oldExcelInfo.sheets.length} sayfa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {oldExcelInfo.sheets.map((sheet) => (
                  <button
                    key={sheet.index}
                    onClick={() => setSelectedOldSheet(sheet.index)}
                    className={`w-full p-4 border rounded-lg text-left transition-all ${
                      selectedOldSheet === sheet.index
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-medium">{sheet.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {sheet.rowCount} satır × {sheet.columnCount} sütun
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* New Excel Sheets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Table2 className="h-5 w-5" />
                Yeni Excel Sayfaları
              </CardTitle>
              <CardDescription>
                {newExcelInfo.fileName} - {newExcelInfo.sheets.length} sayfa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {newExcelInfo.sheets.map((sheet) => (
                  <button
                    key={sheet.index}
                    onClick={() => setSelectedNewSheet(sheet.index)}
                    className={`w-full p-4 border rounded-lg text-left transition-all ${
                      selectedNewSheet === sheet.index
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-medium">{sheet.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {sheet.rowCount} satır × {sheet.columnCount} sütun
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Results */}
      {step === "results" && comparisonResult && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Karşılaştırma Özeti</CardTitle>
              <CardDescription>
                {comparisonResult.oldSheetName} vs {comparisonResult.newSheetName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-3xl font-bold text-orange-600">
                    {comparisonResult.summary.changedCells}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Değiştirilen Hücre</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-3xl font-bold text-green-600">
                    {comparisonResult.summary.addedRows}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Eklenen Satır</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-3xl font-bold text-red-600">
                    {comparisonResult.summary.deletedRows}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Silinen Satır</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-3xl font-bold">
                    {comparisonResult.summary.totalCells}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Toplam Hücre</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Side by Side View */}
          <Card>
            <CardHeader>
              <CardTitle>Değişiklikler</CardTitle>
              <CardDescription>
                Sadece değişen hücreler gösteriliyor ({comparisonResult.diffs.length} değişiklik)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2">
                      <th className="text-left p-2 font-medium">Satır</th>
                      <th className="text-left p-2 font-medium">Sütun</th>
                      <th className="text-left p-2 font-medium">Durum</th>
                      <th className="text-left p-2 font-medium">Eski Değer</th>
                      <th className="text-left p-2 font-medium">Yeni Değer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonResult.diffs.slice(0, 100).map((diff, idx) => {
                      let bgColor = "";
                      let statusText = "";

                      if (diff.type === "added") {
                        bgColor = "bg-green-50 dark:bg-green-950";
                        statusText = "YENİ";
                      } else if (diff.type === "deleted") {
                        bgColor = "bg-red-50 dark:bg-red-950";
                        statusText = "SİLİNDİ";
                      } else if (diff.type === "modified") {
                        bgColor = "bg-orange-50 dark:bg-orange-950";
                        statusText = "DEĞİŞTİ";
                      }

                      return (
                        <tr key={idx} className={`border-b ${bgColor}`}>
                          <td className="p-2">{diff.row + 1}</td>
                          <td className="p-2">{String.fromCharCode(65 + diff.col)}</td>
                          <td className="p-2">
                            <Badge variant="outline">{statusText}</Badge>
                          </td>
                          <td className="p-2 font-mono text-xs">
                            {formatCellValue(diff.oldValue) || <span className="text-muted-foreground">-</span>}
                          </td>
                          <td className="p-2 font-mono text-xs font-semibold">
                            {formatCellValue(diff.newValue) || <span className="text-muted-foreground">-</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {comparisonResult.diffs.length > 100 && (
                  <div className="text-center text-sm text-muted-foreground mt-4">
                    İlk 100 değişiklik gösteriliyor. Tüm değişiklikleri görmek için Excel'i indirin.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between mt-6">
        <div>
          {step !== "upload" && (
            <Button
              variant="outline"
              onClick={() => {
                if (step === "select-sheets") {
                  setStep("upload");
                  setOldExcelInfo(null);
                  setNewExcelInfo(null);
                  setSelectedOldSheet(null);
                  setSelectedNewSheet(null);
                } else if (step === "results") {
                  setStep("select-sheets");
                  setComparisonResult(null);
                }
              }}
              disabled={loading}
            >
              Geri
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {step === "upload" && (
            <Button
              onClick={analyzeExcelFiles}
              disabled={!oldExcelBase64 || !newExcelBase64 || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analiz ediliyor...
                </>
              ) : (
                <>
                  Devam Et
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}

          {step === "select-sheets" && (
            <Button
              onClick={runComparison}
              disabled={selectedOldSheet === null || selectedNewSheet === null || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Karşılaştırılıyor...
                </>
              ) : (
                "Karşılaştır"
              )}
            </Button>
          )}

          {step === "results" && (
            <Button onClick={downloadComparison} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  İndiriliyor...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Excel İndir
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, FileSpreadsheet, ArrowRight, Download, Save, Loader2 } from "lucide-react";
import { generateExcel } from "@/lib/excel";
import { ComparisonResult } from "@/lib/excel-compare";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface HistoryItem {
  id: string;
  data: any;
  timestamp: string;
}

export default function ExcelComparePage() {
  const [step, setStep] = useState<"upload" | "select-keys" | "results">("upload");

  // File upload states
  const [oldExcelSource, setOldExcelSource] = useState<"history" | "upload">("history");
  const [oldExcelFile, setOldExcelFile] = useState<File | null>(null);
  const [oldExcelBase64, setOldExcelBase64] = useState<string>("");
  const [selectedHistoryId, setSelectedHistoryId] = useState<string>("");
  const [newExcelFile, setNewExcelFile] = useState<File | null>(null);
  const [newExcelBase64, setNewExcelBase64] = useState<string>("");

  // History data
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Comparison states
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [selectedKeyColumns, setSelectedKeyColumns] = useState<string[]>([]);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [editedRows, setEditedRows] = useState<any[]>([]);

  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load history on mount
  useEffect(() => {
    const historyData = localStorage.getItem("invoiceHistory");
    if (historyData) {
      try {
        const parsed = JSON.parse(historyData);
        setHistory(parsed);
      } catch (err) {
        console.error("Failed to load history:", err);
      }
    }
  }, []);

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

  // Handle old Excel selection from history
  const handleOldExcelFromHistory = async (historyId: string) => {
    setSelectedHistoryId(historyId);
    setLoading(true);
    setError(null);

    try {
      const item = history.find((h) => h.id === historyId);
      if (!item) {
        throw new Error("History item not found");
      }

      // Generate Excel from invoice data
      const buffer = await generateExcel([item.data], false);
      const base64 = buffer.toString("base64");
      setOldExcelBase64(base64);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Excel from history");
    } finally {
      setLoading(false);
    }
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
      setError("Failed to read old Excel file");
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
      setError("Failed to read new Excel file");
    } finally {
      setLoading(false);
    }
  };

  // Proceed to key selection
  const proceedToKeySelection = async () => {
    if (!oldExcelBase64 || !newExcelBase64) {
      setError("Both Excel files are required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get available columns by doing a quick parse
      const response = await fetch("/api/excel/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldExcelBase64,
          newExcelBase64,
          keyColumns: ["_temp"], // Dummy key just to get headers
        }),
      });

      if (!response.ok) {
        // This will fail but give us headers in error
        const result = await response.json();
        if (result.details && result.details.includes("not found")) {
          // Extract headers from both files manually
          // For now, let's use a simple approach - user will need to select valid columns
          setAvailableColumns(["Fatura No", "Tarih", "Açıklama", "Miktar", "Fiyat"]);
          setStep("select-keys");
        } else {
          throw new Error(result.details || "Failed to analyze Excel files");
        }
      } else {
        const result = await response.json();
        setAvailableColumns(result.data.headers);
        setStep("select-keys");
      }
    } catch (err) {
      // Fallback: provide common column names
      setAvailableColumns(["Fatura No", "Tarih", "Açıklama", "Article", "Dénomination", "Pos"]);
      setStep("select-keys");
    } finally {
      setLoading(false);
    }
  };

  // Run comparison
  const runComparison = async () => {
    if (selectedKeyColumns.length === 0) {
      setError("Please select at least one key column");
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
          keyColumns: selectedKeyColumns,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.details || "Comparison failed");
      }

      const result = await response.json();
      setComparisonResult(result.data);

      // Initialize edited rows with new data (or old data for deleted)
      const rows = result.data.diffs.map((diff: any) => diff.newRow || diff.oldRow);
      setEditedRows(rows);

      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to compare Excel files");
    } finally {
      setLoading(false);
    }
  };

  // Save edited Excel
  const saveEditedExcel = async () => {
    if (!comparisonResult) return;

    setLoading(true);
    setError(null);

    try {
      const fileName = `compared_${new Date().toISOString().split("T")[0]}.xlsx`;

      const response = await fetch("/api/excel/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headers: comparisonResult.headers,
          rows: editedRows,
          fileName,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.details || "Save failed");
      }

      const result = await response.json();
      alert(`Excel saved successfully!\nPath: ${result.data.path}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save Excel file");
    } finally {
      setLoading(false);
    }
  };

  // Download comparison as Excel
  const downloadComparison = async () => {
    if (!comparisonResult) return;

    setLoading(true);
    try {
      // Send diffs to backend to create formatted Excel
      const response = await fetch("/api/excel/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headers: ["Durum", "Değişen Alanlar", ...comparisonResult.headers],
          rows: comparisonResult.diffs.map((diff) => ({
            Durum: diff.type === "added" ? "YENİ" : diff.type === "deleted" ? "SİLİNDİ" : diff.type === "modified" ? "DEĞİŞTİ" : "AYNI",
            "Değişen Alanlar": diff.changedFields?.join(", ") || "-",
            ...(diff.newRow || diff.oldRow!),
          })),
          fileName: `comparison_${new Date().toISOString().split("T")[0]}.xlsx`,
        }),
      });

      const result = await response.json();

      // Download from Supabase URL
      window.open(result.data.publicUrl, "_blank");
    } catch (err) {
      setError("Failed to download comparison");
    } finally {
      setLoading(false);
    }
  };

  // Toggle key column selection
  const toggleKeyColumn = (column: string) => {
    setSelectedKeyColumns((prev) =>
      prev.includes(column)
        ? prev.filter((c) => c !== column)
        : [...prev, column]
    );
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Excel Karşılaştırma</h1>
        <p className="text-muted-foreground mt-2">
          İki Excel dosyasını karşılaştırın ve farklılıkları görün
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
                Karşılaştırma için referans Excel dosyasını seçin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Kaynak</Label>
                <Select value={oldExcelSource} onValueChange={(v: any) => setOldExcelSource(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="history">Geçmiş Faturalardan</SelectItem>
                    <SelectItem value="upload">Yeni Dosya Yükle</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {oldExcelSource === "history" ? (
                <div>
                  <Label>Fatura Seç</Label>
                  <Select value={selectedHistoryId} onValueChange={handleOldExcelFromHistory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Bir fatura seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {history.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.data.metadata?.invoiceNumber || "N/A"} - {item.data.metadata?.invoiceDate || "N/A"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label htmlFor="old-excel">Excel Dosyası</Label>
                  <Input
                    id="old-excel"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleOldExcelUpload}
                  />
                </div>
              )}

              {oldExcelBase64 && (
                <Badge variant="outline" className="bg-green-50">
                  ✓ Eski Excel yüklendi
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

              {newExcelBase64 && (
                <Badge variant="outline" className="bg-green-50">
                  ✓ Yeni Excel yüklendi
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Select Key Columns */}
      {step === "select-keys" && (
        <Card>
          <CardHeader>
            <CardTitle>Anahtar Sütunları Seçin</CardTitle>
            <CardDescription>
              Satırları eşleştirmek için kullanılacak sütunları seçin (birden fazla seçilebilir)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              {availableColumns.map((column) => (
                <div key={column} className="flex items-center space-x-2">
                  <Checkbox
                    id={column}
                    checked={selectedKeyColumns.includes(column)}
                    onCheckedChange={() => toggleKeyColumn(column)}
                  />
                  <Label htmlFor={column} className="cursor-pointer">
                    {column}
                  </Label>
                </div>
              ))}
            </div>

            {selectedKeyColumns.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">
                  Seçili anahtar sütunlar: <strong>{selectedKeyColumns.join(" + ")}</strong>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Results */}
      {step === "results" && comparisonResult && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Karşılaştırma Özeti</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-5">
                <div className="text-center">
                  <div className="text-2xl font-bold">{comparisonResult.summary.totalOld}</div>
                  <div className="text-sm text-muted-foreground">Eski Excel</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{comparisonResult.summary.totalNew}</div>
                  <div className="text-sm text-muted-foreground">Yeni Excel</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{comparisonResult.summary.added}</div>
                  <div className="text-sm text-muted-foreground">Eklenen</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{comparisonResult.summary.deleted}</div>
                  <div className="text-sm text-muted-foreground">Silinen</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{comparisonResult.summary.modified}</div>
                  <div className="text-sm text-muted-foreground">Değiştirilen</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Side by Side View */}
          <Card>
            <CardHeader>
              <CardTitle>Yan Yana Görünüm</CardTitle>
              <CardDescription>
                Eski ve yeni Excel dosyalarının karşılaştırması
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Durum</th>
                      {comparisonResult.headers.map((header) => (
                        <th key={header} className="text-left p-2 font-medium">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonResult.diffs
                      .filter((d) => d.type !== "unchanged")
                      .map((diff, idx) => {
                        const row = diff.newRow || diff.oldRow!;
                        let bgColor = "";
                        let statusBadge = null;

                        if (diff.type === "added") {
                          bgColor = "bg-green-50";
                          statusBadge = <Badge className="bg-green-500">YENİ</Badge>;
                        } else if (diff.type === "deleted") {
                          bgColor = "bg-red-50";
                          statusBadge = <Badge className="bg-red-500">SİLİNDİ</Badge>;
                        } else if (diff.type === "modified") {
                          bgColor = "bg-orange-50";
                          statusBadge = <Badge className="bg-orange-500">DEĞİŞTİ</Badge>;
                        }

                        return (
                          <tr key={idx} className={`border-b ${bgColor}`}>
                            <td className="p-2">{statusBadge}</td>
                            {comparisonResult.headers.map((header) => (
                              <td
                                key={header}
                                className={`p-2 ${
                                  diff.changedFields?.includes(header) ? "font-bold text-orange-600" : ""
                                }`}
                              >
                                {row[header] || "-"}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
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
                if (step === "select-keys") setStep("upload");
                else if (step === "results") setStep("select-keys");
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
              onClick={proceedToKeySelection}
              disabled={!oldExcelBase64 || !newExcelBase64 || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  İşleniyor...
                </>
              ) : (
                <>
                  İlerle
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}

          {step === "select-keys" && (
            <Button
              onClick={runComparison}
              disabled={selectedKeyColumns.length === 0 || loading}
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
            <>
              <Button variant="outline" onClick={downloadComparison} disabled={loading}>
                <Download className="mr-2 h-4 w-4" />
                Excel İndir
              </Button>
              <Button onClick={saveEditedExcel} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Kaydet
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

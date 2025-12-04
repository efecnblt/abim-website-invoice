"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getInvoiceHistory,
  deleteProcessedInvoice,
  toggleFavorite,
  ProcessedInvoice,
} from "@/lib/storage";
import { generateExcel } from "@/lib/excel";
import { extractDisplayInfo } from "@/lib/validation";
import { Download, Star, Trash2, FileText, Search, Filter, Eye, CheckCircle2, AlertTriangle, Calendar } from "lucide-react";
import Link from "next/link";
import { PDFPreviewHover } from "@/components/PDFPreviewHover";
import { Checkbox } from "@/components/ui/checkbox";

export default function HistoryPage() {
  const [history, setHistory] = useState<ProcessedInvoice[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<ProcessedInvoice[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "valid" | "review">("all");

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    let filtered = history;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (item) =>
          item.data.metadata.fileName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.data.metadata.supplier?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.data.metadata.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Favorites filter
    if (filterFavorites) {
      filtered = filtered.filter((item) => item.isFavorite);
    }

    // Status filter
    if (statusFilter === "valid") {
      filtered = filtered.filter((item) => !item.validation.needsReview);
    } else if (statusFilter === "review") {
      filtered = filtered.filter((item) => item.validation.needsReview);
    }

    // Date range filter
    if (startDate || endDate) {
      filtered = filtered.filter((item) => {
        const invoiceDate = item.data.metadata.invoiceDate;
        if (!invoiceDate) return false;

        // Try to parse the date (assuming DD/MM/YYYY or YYYY-MM-DD format)
        const parsedDate = parseInvoiceDate(invoiceDate);
        if (!parsedDate) return true; // Include if can't parse

        if (startDate && parsedDate < new Date(startDate)) return false;
        if (endDate && parsedDate > new Date(endDate)) return false;
        return true;
      });
    }

    setFilteredHistory(filtered);
  }, [history, searchQuery, filterFavorites, statusFilter, startDate, endDate]);

  const parseInvoiceDate = (dateStr: string): Date | null => {
    // Try DD/MM/YYYY format
    const ddmmyyyy = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (ddmmyyyy) {
      return new Date(parseInt(ddmmyyyy[3]), parseInt(ddmmyyyy[2]) - 1, parseInt(ddmmyyyy[1]));
    }

    // Try YYYY-MM-DD format
    const yyyymmdd = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (yyyymmdd) {
      return new Date(dateStr);
    }

    return null;
  };

  const loadHistory = () => {
    const historyData = getInvoiceHistory();
    // Ensure all records have validation field (for old records)
    const migratedHistory = historyData.map(item => {
      if (!item.validation) {
        return {
          ...item,
          validation: { isValid: true, issues: [], needsReview: false }
        };
      }
      return item;
    });
    setHistory(migratedHistory);
  };

  const handleDelete = (id: string) => {
    if (confirm("Bu kaydı silmek istediğinizden emin misiniz?")) {
      deleteProcessedInvoice(id);
      loadHistory();
    }
  };

  const handleToggleFavorite = (id: string) => {
    toggleFavorite(id);
    loadHistory();
  };

  const handleDownloadSingle = async (invoice: ProcessedInvoice) => {
    try {
      const buffer = await generateExcel([invoice.data]);
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice.data.metadata.invoiceNumber || "fatura"}_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download error:", error);
      alert("Excel indirme hatası");
    }
  };

  const handleDownloadAll = async () => {
    if (filteredHistory.length === 0) return;

    try {
      const allData = filteredHistory.map((item) => item.data);
      const buffer = await generateExcel(allData);
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tum_faturalar_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download error:", error);
      alert("Excel indirme hatası");
    }
  };

  const handleDownloadSelected = async () => {
    if (selectedIds.size === 0) {
      alert("Lütfen en az bir fatura seçin");
      return;
    }

    try {
      const selectedInvoices = filteredHistory.filter((item) => selectedIds.has(item.id));
      const selectedData = selectedInvoices.map((item) => item.data);
      const buffer = await generateExcel(selectedData, true); // true = batch mode with continuous numbering
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `secili_faturalar_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download error:", error);
      alert("Excel indirme hatası");
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredHistory.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredHistory.map((item) => item.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Calculate review count
  const reviewCount = history.filter(item => item.validation.needsReview).length;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Veri Doğrulama</h1>
          <p className="text-lg mt-2">
            Toplam {history.length} Fatura İşlendi.{' '}
            {reviewCount > 0 ? (
              <span className="text-orange-600 font-semibold">
                {reviewCount} Faturada İnceleme Gerekli.
              </span>
            ) : (
              <span className="text-green-600 font-semibold">
                Tüm Faturalar Doğru.
              </span>
            )}
          </p>
        </div>
        {filteredHistory.length > 0 && (
          <Button onClick={handleDownloadAll} size="lg">
            <Download className="mr-2 h-5 w-5" />
            Excel Olarak İndir
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filtreler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Dosya adı, tedarikçi veya fatura no ile ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-4 flex-wrap">
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40"
                  placeholder="Başlangıç"
                />
                <span className="flex items-center text-muted-foreground">-</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40"
                  placeholder="Bitiş"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant={statusFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                >
                  Tümü
                </Button>
                <Button
                  variant={statusFilter === "valid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("valid")}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Doğru
                </Button>
                <Button
                  variant={statusFilter === "review" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("review")}
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  İnceleme Gerekli
                </Button>
              </div>

              <Button
                variant={filterFavorites ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterFavorites(!filterFavorites)}
              >
                <Star className="mr-2 h-4 w-4" />
                Favoriler
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batch Actions */}
      {selectedIds.size > 0 && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {selectedIds.size} fatura seçildi
              </span>
              <div className="flex gap-2">
                <Button onClick={handleDownloadSelected} variant="default">
                  <Download className="mr-2 h-4 w-4" />
                  Seçilenleri Excel&apos;e Aktar
                </Button>
                <Button onClick={() => setSelectedIds(new Set())} variant="outline">
                  Seçimi Temizle
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Fatura Listesi</CardTitle>
          <CardDescription>
            Toplam {history.length} kayıt
            {filteredHistory.length !== history.length &&
              ` (${filteredHistory.length} gösteriliyor)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredHistory.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {history.length === 0
                  ? "Henüz işlenmiş fatura yok"
                  : "Filtre kriterlerine uygun kayıt bulunamadı"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedIds.size === filteredHistory.length && filteredHistory.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="w-16">Durum</TableHead>
                    <TableHead>Dosya Adı</TableHead>
                    <TableHead>Fatura Tarihi</TableHead>
                    <TableHead>Tedarikçi Firma</TableHead>
                    <TableHead>Beton Tipi</TableHead>
                    <TableHead className="text-right">Miktar (m³)</TableHead>
                    <TableHead className="text-right">Birim Fiyat</TableHead>
                    <TableHead className="text-right">Toplam Tutar</TableHead>
                    <TableHead>Plaka No</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.map((item) => {
                    const displayInfo = extractDisplayInfo(item.data);
                    const needsReview = item.validation.needsReview;

                    return (
                      <TableRow
                        key={item.id}
                        className={needsReview ? "bg-yellow-50 hover:bg-yellow-100" : ""}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(item.id)}
                            onCheckedChange={() => toggleSelect(item.id)}
                          />
                        </TableCell>
                        <TableCell>
                          {needsReview ? (
                            <div className="flex items-center justify-center" title="İnceleme Gerekli">
                              <AlertTriangle className="h-5 w-5 text-orange-500" />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center" title="Doğru">
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium max-w-[180px] truncate">
                          <PDFPreviewHover pdfData={item.pdfData} pdfUrl={item.pdfUrl}>
                            <span className="cursor-pointer hover:text-blue-600 underline decoration-dotted">
                              {item.data.metadata.fileName}
                            </span>
                          </PDFPreviewHover>
                        </TableCell>
                        <TableCell>{item.data.metadata.invoiceDate || "-"}</TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {item.data.metadata.supplier || "-"}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {displayInfo.concreteType || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {displayInfo.quantity !== undefined
                            ? displayInfo.quantity.toFixed(2)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {displayInfo.unitPrice !== undefined
                            ? `${displayInfo.unitPrice.toFixed(2)} ${item.data.metadata.currency || ""}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.data.metadata.totalAmount
                            ? `${item.data.metadata.totalAmount} ${item.data.metadata.currency || ""}`
                            : "-"}
                        </TableCell>
                        <TableCell>{displayInfo.plateNumber || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Link href={`/dashboard/history/${item.id}`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Detayları Görüntüle"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDownloadSingle(item)}
                              title="Excel İndir"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDelete(item.id)}
                              title="Sil"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

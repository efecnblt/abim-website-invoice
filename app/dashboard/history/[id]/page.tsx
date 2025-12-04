"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PDFViewer } from "@/components/PDFViewer";
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
  getProcessedInvoice,
  updateProcessedInvoice,
  ProcessedInvoice,
} from "@/lib/storage";
import { ExtractedInvoiceData } from "@/lib/types";
import { ArrowLeft, Save, Download, Edit2, Check, X } from "lucide-react";
import { generateExcel } from "@/lib/excel";

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<ProcessedInvoice | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<ProcessedInvoice | null>(null);
  const [editingCell, setEditingCell] = useState<{ tableIdx: number; rowIdx: number; header: string } | null>(null);

  useEffect(() => {
    const data = getProcessedInvoice(id);
    if (data) {
      // Ensure validation field exists (for old records)
      if (!data.validation) {
        data.validation = { isValid: true, issues: [], needsReview: false };
      }
      setInvoice(data);
      setEditedData(JSON.parse(JSON.stringify(data))); // Deep clone
    } else {
      alert("Fatura bulunamadı");
      router.push("/dashboard/history");
    }
  }, [id, router]);

  const handleMetadataEdit = (field: keyof ExtractedInvoiceData['metadata'], value: any) => {
    if (!editedData) return;
    setEditedData({
      ...editedData,
      data: {
        ...editedData.data,
        metadata: {
          ...editedData.data.metadata,
          [field]: value,
        },
      },
    });
  };

  const handleCellEdit = (tableIdx: number, rowIdx: number, header: string, value: any) => {
    if (!editedData) return;
    const newData = { ...editedData };
    newData.data.tables[tableIdx].rows[rowIdx][header] = value;
    setEditedData(newData);
  };

  const handleSave = () => {
    if (!editedData) return;
    updateProcessedInvoice(id, { data: editedData.data });
    setInvoice(editedData);
    setIsEditing(false);
    setEditingCell(null);
    alert("Değişiklikler kaydedildi!");
  };

  const handleCancel = () => {
    if (invoice) {
      setEditedData(JSON.parse(JSON.stringify(invoice)));
    }
    setIsEditing(false);
    setEditingCell(null);
  };

  const handleDownload = async () => {
    if (!invoice) return;
    try {
      const buffer = await generateExcel([invoice.data]);
      const blob = new Blob([new Uint8Array(buffer)], {
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

  if (!invoice || !editedData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Yükleniyor...</div>
      </div>
    );
  }

  const displayData = isEditing ? editedData : invoice;

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b bg-white">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/history">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              {displayData.data.metadata.invoiceNumber || "Fatura Detayı"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {displayData.data.metadata.fileName}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button onClick={handleCancel} variant="outline">
                <X className="mr-2 h-4 w-4" />
                İptal
              </Button>
              <Button onClick={handleSave}>
                <Check className="mr-2 h-4 w-4" />
                Kaydet
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setIsEditing(true)} variant="outline">
                <Edit2 className="mr-2 h-4 w-4" />
                Düzenle
              </Button>
              <Button onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Excel İndir
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Content: Side by Side */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: PDF Preview */}
        <div className="w-1/2 border-r">
          {invoice.pdfUrl || invoice.pdfData ? (
            <PDFViewer
              file={invoice.pdfUrl || `data:application/pdf;base64,${invoice.pdfData}`}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-100">
              <div className="text-center">
                <p className="text-muted-foreground mb-2">PDF önizlemesi mevcut değil</p>
                <p className="text-sm text-muted-foreground">
                  Bu fatura PDF verisi olmadan kaydedilmiş
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Invoice Data */}
        <div className="w-1/2 overflow-y-auto p-6 space-y-6">
          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Fatura Bilgileri</CardTitle>
              <CardDescription>Genel bilgiler ve metadata</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Fatura No</label>
                  {isEditing ? (
                    <Input
                      value={displayData.data.metadata.invoiceNumber || ""}
                      onChange={(e) => handleMetadataEdit("invoiceNumber", e.target.value)}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm mt-1">{displayData.data.metadata.invoiceNumber || "-"}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Tarih</label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={displayData.data.metadata.invoiceDate || ""}
                      onChange={(e) => handleMetadataEdit("invoiceDate", e.target.value)}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm mt-1">{displayData.data.metadata.invoiceDate || "-"}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Tedarikçi</label>
                  {isEditing ? (
                    <Input
                      value={displayData.data.metadata.supplier || ""}
                      onChange={(e) => handleMetadataEdit("supplier", e.target.value)}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm mt-1">{displayData.data.metadata.supplier || "-"}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Müşteri</label>
                  {isEditing ? (
                    <Input
                      value={displayData.data.metadata.customer || ""}
                      onChange={(e) => handleMetadataEdit("customer", e.target.value)}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm mt-1">{displayData.data.metadata.customer || "-"}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Toplam Tutar</label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={displayData.data.metadata.totalAmount || ""}
                      onChange={(e) => handleMetadataEdit("totalAmount", parseFloat(e.target.value))}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm mt-1">
                      {displayData.data.metadata.totalAmount} {displayData.data.metadata.currency}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Para Birimi</label>
                  {isEditing ? (
                    <Input
                      value={displayData.data.metadata.currency || ""}
                      onChange={(e) => handleMetadataEdit("currency", e.target.value)}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm mt-1">{displayData.data.metadata.currency || "-"}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tables */}
          {displayData.data.tables.map((table, tableIdx) => (
            <Card key={tableIdx}>
              <CardHeader>
                <CardTitle>
                  {displayData.data.tables.length > 1 ? `Tablo ${tableIdx + 1}` : "Fatura Kalemleri"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {table.headers.map((header, hIdx) => (
                          <TableHead key={hIdx}>{header}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {table.rows.map((row, rowIdx) => (
                        <TableRow key={rowIdx}>
                          {table.headers.map((header, hIdx) => (
                            <TableCell key={hIdx}>
                              {isEditing && editingCell?.tableIdx === tableIdx && editingCell?.rowIdx === rowIdx && editingCell?.header === header ? (
                                <Input
                                  value={row[header] || ""}
                                  onChange={(e) => handleCellEdit(tableIdx, rowIdx, header, e.target.value)}
                                  onBlur={() => setEditingCell(null)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") setEditingCell(null);
                                  }}
                                  autoFocus
                                  className="h-8"
                                />
                              ) : (
                                <div
                                  className={isEditing ? "cursor-pointer hover:bg-gray-100 p-1 rounded" : ""}
                                  onClick={() => isEditing && setEditingCell({ tableIdx, rowIdx, header })}
                                >
                                  {row[header] !== null && row[header] !== undefined ? String(row[header]) : "-"}
                                </div>
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Download, FileJson, Upload, Loader2 } from "lucide-react";
import { getInvoiceHistory, getTemplates } from "@/lib/storage";

export default function SettingsPage() {
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{
    totalMigrated: number;
    totalErrors: number;
  } | null>(null);

  const handleMigratePDFs = async () => {
    if (!confirm("Base64 formatındaki PDF'leri Supabase'e taşımak istiyor musunuz?")) {
      return;
    }

    setIsMigrating(true);
    setMigrationResult(null);

    try {
      const invoices = getInvoiceHistory();

      // Call migration API
      const response = await fetch("/api/migrate-pdfs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoices }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Migration failed");
      }

      // Update localStorage with new URLs
      const updatedInvoices = invoices.map((invoice) => {
        const migrated = result.migrated.find((m: any) => m.id === invoice.id);
        if (migrated) {
          return {
            ...invoice,
            pdfUrl: migrated.pdfUrl,
            pdfPath: migrated.pdfPath,
            pdfData: undefined, // Remove base64 data
          };
        }
        return invoice;
      });

      localStorage.setItem("invoice_history", JSON.stringify(updatedInvoices));

      setMigrationResult({
        totalMigrated: result.totalMigrated,
        totalErrors: result.totalErrors,
      });

      alert(
        `Migration tamamlandı!\n✅ ${result.totalMigrated} PDF başarıyla taşındı\n❌ ${result.totalErrors} hata`
      );

      if (result.totalMigrated > 0) {
        window.location.reload();
      }
    } catch (error) {
      console.error("Migration error:", error);
      alert("Migration başarısız: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsMigrating(false);
    }
  };

  const handleClearHistory = () => {
    if (
      confirm(
        "Tüm işlem geçmişini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!"
      )
    ) {
      localStorage.removeItem("invoice_history");
      alert("İşlem geçmişi temizlendi");
      window.location.reload();
    }
  };

  const handleClearTemplates = () => {
    if (
      confirm(
        "Tüm şablonları silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!"
      )
    ) {
      localStorage.removeItem("invoice_templates");
      alert("Şablonlar temizlendi");
      window.location.reload();
    }
  };

  const handleExportData = () => {
    const data = {
      history: getInvoiceHistory(),
      templates: getTemplates(),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-data-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Ayarlar</h1>
        <p className="text-muted-foreground mt-2">
          Uygulama ayarlarını ve verilerinizi yönetin
        </p>
      </div>

      <div className="grid gap-6">
        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle>Veri Yönetimi</CardTitle>
            <CardDescription>
              Verilerinizi dışa aktarın veya temizleyin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg border-blue-200 bg-blue-50">
              <div>
                <p className="font-medium">PDF Migration</p>
                <p className="text-sm text-muted-foreground">
                  Eski base64 PDF'leri Supabase'e taşı
                </p>
              </div>
              <Button
                onClick={handleMigratePDFs}
                disabled={isMigrating}
                variant="outline"
              >
                {isMigrating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Taşınıyor...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Migrate
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Veri Yedekleme</p>
                <p className="text-sm text-muted-foreground">
                  Tüm verilerinizi JSON formatında dışa aktarın
                </p>
              </div>
              <Button onClick={handleExportData}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg border-orange-200 bg-orange-50">
              <div>
                <p className="font-medium">İşlem Geçmişini Temizle</p>
                <p className="text-sm text-muted-foreground">
                  Tüm işlenmiş faturaları sil
                </p>
              </div>
              <Button variant="outline" onClick={handleClearHistory}>
                <Trash2 className="mr-2 h-4 w-4" />
                Temizle
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg border-red-200 bg-red-50">
              <div>
                <p className="font-medium">Şablonları Temizle</p>
                <p className="text-sm text-muted-foreground">
                  Tüm şablonları sil
                </p>
              </div>
              <Button variant="outline" onClick={handleClearTemplates}>
                <Trash2 className="mr-2 h-4 w-4" />
                Temizle
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle>Hakkında</CardTitle>
            <CardDescription>Uygulama bilgileri</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Versiyon:</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">AI Model:</span>
                <span className="font-medium">GPT-4o-mini</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Framework:</span>
                <span className="font-medium">Next.js 14</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveTemplate } from "@/lib/storage";
import { ArrowLeft, Plus, X } from "lucide-react";
import Link from "next/link";

export default function CreateTemplatePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("Türkçe");
  const [metadataFields, setMetadataFields] = useState<string[]>(["invoiceNumber", "invoiceDate", "supplier"]);
  const [tableHeaders, setTableHeaders] = useState<string[]>(["Açıklama", "Miktar", "Birim Fiyat", "Toplam"]);
  const [newMetadataField, setNewMetadataField] = useState("");
  const [newTableHeader, setNewTableHeader] = useState("");

  const handleAddMetadataField = () => {
    if (newMetadataField.trim()) {
      setMetadataFields([...metadataFields, newMetadataField.trim()]);
      setNewMetadataField("");
    }
  };

  const handleAddTableHeader = () => {
    if (newTableHeader.trim()) {
      setTableHeaders([...tableHeaders, newTableHeader.trim()]);
      setNewTableHeader("");
    }
  };

  const handleRemoveMetadataField = (index: number) => {
    setMetadataFields(metadataFields.filter((_, i) => i !== index));
  };

  const handleRemoveTableHeader = (index: number) => {
    setTableHeaders(tableHeaders.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert("Şablon adı gerekli!");
      return;
    }

    saveTemplate({
      name: name.trim(),
      description: description.trim(),
      language,
      fieldMappings: {
        metadata: metadataFields,
        tableHeaders,
      },
    });

    router.push("/dashboard/templates");
  };

  return (
    <div>
      <div className="mb-8">
        <Link href="/dashboard/templates">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Geri
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Yeni Şablon Oluştur</h1>
        <p className="text-muted-foreground mt-2">
          Fatura tipiniz için özel şablon tanımlayın
        </p>
      </div>

      <div className="grid gap-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Temel Bilgiler</CardTitle>
            <CardDescription>Şablon hakkında genel bilgiler</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Şablon Adı *</label>
              <Input
                placeholder="Örn: İnşaat Faturası, Nakliye Faturası"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Açıklama</label>
              <Input
                placeholder="Bu şablonun ne için kullanıldığını açıklayın"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Dil</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="Türkçe">Türkçe</option>
                <option value="Fransızca">Fransızca</option>
                <option value="Almanca">Almanca</option>
                <option value="İngilizce">İngilizce</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Metadata Fields */}
        <Card>
          <CardHeader>
            <CardTitle>Metadata Alanları</CardTitle>
            <CardDescription>
              Fatura bilgileri (Fatura No, Tarih, Tedarikçi vb.)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mb-4">
              {metadataFields.map((field, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input value={field} disabled className="flex-1" />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveMetadataField(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Yeni alan ekle (örn: müşteri, notlar)"
                value={newMetadataField}
                onChange={(e) => setNewMetadataField(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddMetadataField()}
              />
              <Button onClick={handleAddMetadataField}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table Headers */}
        <Card>
          <CardHeader>
            <CardTitle>Tablo Başlıkları</CardTitle>
            <CardDescription>
              Fatura tablosundaki sütun başlıkları
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mb-4">
              {tableHeaders.map((header, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input value={header} disabled className="flex-1" />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveTableHeader(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Yeni sütun ekle (örn: Miktar, Birim, Fiyat)"
                value={newTableHeader}
                onChange={(e) => setNewTableHeader(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddTableHeader()}
              />
              <Button onClick={handleAddTableHeader}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          <Link href="/dashboard/templates">
            <Button variant="outline" size="lg">
              İptal
            </Button>
          </Link>
          <Button onClick={handleSave} size="lg">
            Şablonu Kaydet
          </Button>
        </div>
      </div>
    </div>
  );
}

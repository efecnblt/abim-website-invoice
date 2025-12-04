"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getTemplates, deleteTemplate, InvoiceTemplate } from "@/lib/storage";
import { Plus, FileCode2, Trash2, Edit, Calendar } from "lucide-react";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = () => {
    setTemplates(getTemplates());
  };

  const handleDelete = (id: string) => {
    if (confirm("Bu şablonu silmek istediğinizden emin misiniz?")) {
      deleteTemplate(id);
      loadTemplates();
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fatura Şablonları</h1>
          <p className="text-muted-foreground mt-2">
            Farklı fatura tipleri için özel şablonlar oluşturun
          </p>
        </div>
        <Link href="/dashboard/templates/create">
          <Button size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Yeni Şablon
          </Button>
        </Link>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileCode2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Henüz şablon yok</h3>
            <p className="text-muted-foreground mb-6">
              Farklı fatura tipleri için özel şablonlar oluşturabilirsiniz
            </p>
            <Link href="/dashboard/templates/create">
              <Button>
                <Plus className="mr-2 h-5 w-5" />
                İlk Şablonunu Oluştur
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <FileCode2 className="h-10 w-10 text-blue-600 mb-2" />
                  <div className="flex gap-1">
                    <Link href={`/dashboard/templates/edit/${template.id}`}>
                      <Button variant="ghost" size="icon" title="Düzenle">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(template.id)}
                      title="Sil"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
                <CardTitle>{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Dil:</span>
                    <span className="font-medium">{template.language}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {new Date(template.createdAt).toLocaleDateString("tr-TR")}
                    </span>
                  </div>
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground">
                      {template.fieldMappings.tableHeaders.length} sütun tanımlı
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

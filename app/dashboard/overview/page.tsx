"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getStats } from "@/lib/storage";
import { FileText, Star, FileCode2, TrendingUp } from "lucide-react";

export default function OverviewPage() {
  const [stats, setStats] = useState({
    totalProcessed: 0,
    favorites: 0,
    totalTemplates: 0,
    supplierStats: {} as Record<string, number>,
    monthlyStats: {} as Record<string, number>,
  });

  useEffect(() => {
    setStats(getStats());
  }, []);

  const topSuppliers = Object.entries(stats.supplierStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const recentMonths = Object.entries(stats.monthlyStats)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 6);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Fatura işleme sistemine hoş geldiniz
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Toplam İşlem
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProcessed}</div>
            <p className="text-xs text-muted-foreground">
              İşlenmiş fatura sayısı
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Favoriler
            </CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.favorites}</div>
            <p className="text-xs text-muted-foreground">
              Favori olarak işaretlenmiş
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Şablonlar
            </CardTitle>
            <FileCode2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTemplates}</div>
            <p className="text-xs text-muted-foreground">
              Kayıtlı fatura şablonu
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Bu Ay
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recentMonths[0]?.[1] || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Bu ay işlenen fatura
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Suppliers */}
        <Card>
          <CardHeader>
            <CardTitle>En Çok Fatura Gelen Tedarikçiler</CardTitle>
            <CardDescription>
              Son işlemlere göre sıralanmış
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topSuppliers.length > 0 ? (
              <div className="space-y-4">
                {topSuppliers.map(([supplier, count]) => (
                  <div key={supplier} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{supplier}</p>
                      <p className="text-xs text-muted-foreground">{count} fatura</p>
                    </div>
                    <div className="h-2 w-24 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{
                          width: `${(count / stats.totalProcessed) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Henüz işlenmiş fatura yok
              </p>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Aylık İşlem Trendi</CardTitle>
            <CardDescription>
              Son 6 aylık işlem sayısı
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentMonths.length > 0 ? (
              <div className="space-y-4">
                {recentMonths.map(([month, count]) => (
                  <div key={month} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {new Date(month + "-01").toLocaleDateString("tr-TR", {
                          year: "numeric",
                          month: "long",
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">{count} fatura</p>
                    </div>
                    <div className="h-2 w-24 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-600 rounded-full"
                        style={{
                          width: `${Math.min((count / 20) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Henüz işlenmiş fatura yok
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

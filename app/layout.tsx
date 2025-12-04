import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Fatura Veri Çıkarıcı | Invoice Data Extractor",
  description: "Yapay zeka ile faturalardan otomatik veri çıkarma sistemi. İnşaat faturalarınızı yükleyin, Excel formatında alın.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className={inter.className}>{children}</body>
    </html>
  );
}

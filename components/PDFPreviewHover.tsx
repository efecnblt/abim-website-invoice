"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// Configure PDF.js worker (use jsDelivr CDN - more reliable)
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;

interface PDFPreviewHoverProps {
  pdfData?: string; // base64 PDF data
  pdfUrl?: string; // Supabase URL
  children: React.ReactNode;
}

export function PDFPreviewHover({ pdfData, pdfUrl, children }: PDFPreviewHoverProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const pdfSource = pdfUrl || (pdfData ? `data:application/pdf;base64,${pdfData}` : null);

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (!pdfSource) return;
    setIsHovering(true);
    updatePosition(e);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!pdfSource) return;
    updatePosition(e);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  const updatePosition = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({
      x: rect.right + 10,
      y: rect.top,
    });
  };

  return (
    <>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative"
      >
        {children}
      </div>

      {isHovering && pdfSource && (
        <div
          className="fixed z-50 bg-white border-2 border-gray-300 rounded-lg shadow-2xl overflow-hidden"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: '400px',
            height: '500px',
          }}
        >
          <div className="w-full h-full overflow-auto bg-gray-100 p-2">
            <Document
              file={pdfSource}
              options={{
                cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/cmaps/`,
                cMapPacked: true,
                standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/standard_fonts/`,
              }}
              loading={
                <div className="flex items-center justify-center h-full">
                  <div className="text-sm text-muted-foreground">Yükleniyor...</div>
                </div>
              }
              error={
                <div className="flex items-center justify-center h-full">
                  <div className="text-sm text-red-600">PDF yüklenemedi</div>
                </div>
              }
            >
              <Page
                pageNumber={1}
                width={380}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="shadow-sm"
              />
            </Document>
          </div>
        </div>
      )}
    </>
  );
}

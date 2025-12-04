import ExcelJS from "exceljs";
import { ExtractedInvoiceData } from "./types";

export async function generateExcel(
  invoices: ExtractedInvoiceData[],
  batchMode = false
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  if (batchMode) {
    // Batch mode: Combine all invoices into a single worksheet
    const worksheet = workbook.addWorksheet("Birleştirilmiş Faturalar");

    // Add title
    worksheet.addRow(["BİRLEŞTİRİLMİŞ FATURA VERİLERİ"]);
    const titleRow = worksheet.getRow(1);
    titleRow.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
    titleRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2E75B6" },
    };
    titleRow.alignment = { vertical: "middle", horizontal: "center" };
    titleRow.height = 30;

    worksheet.addRow([]); // Empty row

    // Collect all unique headers from all tables across all invoices
    const allHeaders = new Set<string>();
    invoices.forEach((invoice) => {
      invoice.tables.forEach((table) => {
        table.headers.forEach((header) => allHeaders.add(header));
      });
    });

    // Add special columns at the beginning
    const headers = ["Sıra No", "Fatura No", "Fatura Tarihi", ...Array.from(allHeaders)];

    // Add header row
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF70AD47" },
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 25;

    // Add borders to header
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: "medium" },
        left: { style: "medium" },
        bottom: { style: "medium" },
        right: { style: "medium" },
      };
    });

    let continuousRowNumber = 1;

    // Process all invoices
    invoices.forEach((invoice) => {
      invoice.tables.forEach((table) => {
        table.rows.forEach((row) => {
          const rowData: any[] = [
            continuousRowNumber++,
            invoice.metadata.invoiceNumber || "-",
            invoice.metadata.invoiceDate || "-",
          ];

          // Add data for each header
          Array.from(allHeaders).forEach((header) => {
            const value = row[header];
            if (value === null || value === undefined) {
              rowData.push("-");
            } else if (typeof value === "number") {
              rowData.push(value);
            } else {
              rowData.push(String(value));
            }
          });

          const dataRow = worksheet.addRow(rowData);

          // Alternate row colors for better readability
          if (continuousRowNumber % 2 === 0) {
            dataRow.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF2F2F2" },
            };
          }

          // Add borders
          dataRow.eachCell((cell) => {
            cell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };
          });
        });
      });
    });

    // Auto-fit columns with better sizing
    worksheet.columns.forEach((column, index) => {
      let maxLength = headers[index].length;

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 3) {
          // Skip title and header rows
          const cell = row.getCell(index + 1);
          const cellValue = cell.value;
          if (cellValue !== null && cellValue !== undefined) {
            const cellLength = String(cellValue).length;
            if (cellLength > maxLength) {
              maxLength = cellLength;
            }
          }
        }
      });

      column.width = Math.min(Math.max(maxLength + 3, 12), 40);
    });

    // Freeze header row
    worksheet.views = [{ state: "frozen", xSplit: 0, ySplit: 3 }];

    // Merge title cells
    worksheet.mergeCells(1, 1, 1, headers.length);
  } else {
      // Normal mode: Process each invoice as a separate worksheet
      invoices.forEach((invoice, index) => {
          const worksheetName = `${invoice.metadata.invoiceNumber || `Fatura_${index + 1}`}`.substring(0, 31);
          const worksheet = workbook.addWorksheet(worksheetName);

          // Add metadata section with improved formatting
          const metadataHeaderRow = worksheet.addRow(['FATURA BİLGİLERİ']);
          metadataHeaderRow.font = {bold: true, size: 14, color: {argb: 'FFFFFFFF'}};
          metadataHeaderRow.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: {argb: 'FF4472C4'},
          };
          metadataHeaderRow.alignment = {vertical: 'middle', horizontal: 'center'};
          metadataHeaderRow.height = 25;

          // Add metadata rows with formatting
          const metadataRows = [
              ['Dosya Adı:', invoice.metadata.fileName],
          ];

          if (invoice.metadata.invoiceNumber) {
              metadataRows.push(['Fatura No:', invoice.metadata.invoiceNumber]);
          }
          if (invoice.metadata.invoiceDate) {
              metadataRows.push(['Tarih:', invoice.metadata.invoiceDate]);
          }
          if (invoice.metadata.supplier) {
              metadataRows.push(['Tedarikçi:', invoice.metadata.supplier]);
          }
          if (invoice.metadata.customer) {
              metadataRows.push(['Müşteri:', invoice.metadata.customer]);
          }
          if (invoice.metadata.totalAmount) {
              metadataRows.push(['Toplam Tutar:', `${invoice.metadata.totalAmount} ${invoice.metadata.currency || ''}`]);
          }
          if (invoice.metadata.notes) {
              metadataRows.push(['Notlar:', invoice.metadata.notes]);
          }

          metadataRows.forEach(([label, value]) => {
              const row = worksheet.addRow([label, value]);
              row.getCell(1).font = {bold: true};
              row.getCell(1).fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: {argb: 'FFE7E6E6'},
              };
          });

          worksheet.addRow([]); // Empty row

          // Add each table from the invoice
          invoice.tables.forEach((table, tableIndex) => {
              if (tableIndex > 0) {
                  worksheet.addRow([]); // Empty row between tables
              }

              // Add table header row with improved formatting
              const headerRow = worksheet.addRow(table.headers);
              headerRow.font = {bold: true, size: 11, color: {argb: 'FFFFFFFF'}};
              headerRow.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: {argb: 'FF70AD47'},
              };
              headerRow.alignment = {vertical: 'middle', horizontal: 'center', wrapText: true};
              headerRow.height = 25;

              // Add medium borders to header
              headerRow.eachCell((cell) => {
                  cell.border = {
                      top: {style: 'medium'},
                      left: {style: 'medium'},
                      bottom: {style: 'medium'},
                      right: {style: 'medium'},
                  };
              });

              // Add data rows
              table.rows.forEach((row) => {
                  const rowData = table.headers.map(header => {
                      const value = row[header];
                      if (value === null || value === undefined) return '-';
                      if (typeof value === 'number') return value;
                      return String(value);
                  });
                  worksheet.addRow(rowData);
              });

              // Auto-fit columns with better sizing
              table.headers.forEach((header, colIndex) => {
                  const column = worksheet.getColumn(colIndex + 1);
                  let maxLength = header.length;

                  table.rows.forEach((row) => {
                      const value = row[header];
                      if (value !== null && value !== undefined) {
                          const valueLength = String(value).length;
                          if (valueLength > maxLength) {
                              maxLength = valueLength;
                          }
                      }
                  });

                  column.width = Math.min(Math.max(maxLength + 3, 12), 40);
              });

              // Add zebra striping for better readability
              const headerRowNumber = worksheet.rowCount - table.rows.length;
              table.rows.forEach((row, rowIndex) => {
                  const excelRow = worksheet.getRow(headerRowNumber + rowIndex + 1);
                  if (rowIndex % 2 === 1) {
                      excelRow.fill = {
                          type: 'pattern',
                          pattern: 'solid',
                          fgColor: {argb: 'FFF2F2F2'},
                      };
                  }
              });
          });
          // Add borders to all cells with data
          worksheet.eachRow((row, rowNumber) => {
              if (rowNumber > 1) { // Skip first metadata title row
                  row.eachCell((cell) => {
                      cell.border = {
                          top: {style: 'thin'},
                          left: {style: 'thin'},
                          bottom: {style: 'thin'},
                          right: {style: 'thin'},
                      };
                  });
              }
          });
      });
  }
  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
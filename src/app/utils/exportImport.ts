import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// تصدير إلى Excel
export function exportToExcel(data: any[], fileName: string, sheetName: string = 'Sheet1') {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // إضافة عرض تلقائي للأعمدة
    const maxWidth = data.reduce((w: any, r: any) => {
      return Object.keys(r).reduce((acc: any, key: string) => {
        const val = r[key] ? r[key].toString() : '';
        acc[key] = Math.max(acc[key] || 10, val.length);
        return acc;
      }, w);
    }, {});

    worksheet['!cols'] = Object.keys(maxWidth).map(key => ({ wch: maxWidth[key] + 2 }));

    XLSX.writeFile(workbook, `${fileName}.xlsx`);
    return { success: true, message: 'تم التصدير بنجاح' };
  } catch (error) {
    console.error('Export to Excel error:', error);
    return { success: false, message: 'فشل التصدير' };
  }
}

// تصدير إلى CSV
export function exportToCSV(data: any[], fileName: string) {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(worksheet);

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return { success: true, message: 'تم التصدير بنجاح' };
  } catch (error) {
    console.error('Export to CSV error:', error);
    return { success: false, message: 'فشل التصدير' };
  }
}

// تصدير إلى PDF مع دعم العربية
export function exportToPDF(
  data: any[],
  fileName: string,
  columns: { header: string; dataKey: string }[],
  title: string = 'تقرير'
) {
  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    // إضافة الشعار والعنوان
    doc.setFontSize(20);
    doc.text(title, doc.internal.pageSize.width / 2, 15, { align: 'center' });

    doc.setFontSize(12);
    doc.text('الجمهورية اليمنية - وزارة الشؤون الاجتماعية والعمل', doc.internal.pageSize.width / 2, 25, { align: 'center' });

    // إضافة التاريخ
    const date = new Date().toLocaleDateString('ar-YE');
    doc.setFontSize(10);
    doc.text(`التاريخ: ${date}`, 15, 35);

    // إعداد الجدول
    const tableData = data.map(row =>
      columns.map(col => row[col.dataKey] || '')
    );

    autoTable(doc, {
      head: [columns.map(col => col.header)],
      body: tableData,
      startY: 40,
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { top: 40, right: 10, bottom: 10, left: 10 },
    });

    // إضافة ترقيم الصفحات
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.text(
        `صفحة ${i} من ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    doc.save(`${fileName}.pdf`);
    return { success: true, message: 'تم التصدير بنجاح' };
  } catch (error) {
    console.error('Export to PDF error:', error);
    return { success: false, message: 'فشل التصدير' };
  }
}

// استيراد من Excel
export function importFromExcel(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // قراءة أول ورقة عمل
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('فشل قراءة الملف'));
    reader.readAsArrayBuffer(file);
  });
}

// استيراد من CSV
export function importFromCSV(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const workbook = XLSX.read(text, { type: 'string' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('فشل قراءة الملف'));
    reader.readAsText(file);
  });
}

// طباعة التقرير
export function printReport(elementId: string, title: string = 'تقرير') {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const element = document.getElementById(elementId);
  if (!element) return;

  const html = `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        body {
          font-family: 'Cairo', Arial, sans-serif;
          padding: 20px;
          direction: rtl;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #3b82f6;
          padding-bottom: 20px;
        }
        .header h1 {
          color: #1e3a8a;
          margin: 0;
        }
        .header p {
          color: #64748b;
          margin: 5px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th, td {
          border: 1px solid #e5e7eb;
          padding: 12px;
          text-align: right;
        }
        th {
          background-color: #3b82f6;
          color: white;
          font-weight: bold;
        }
        tr:nth-child(even) {
          background-color: #f9fafb;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 12px;
          color: #64748b;
        }
        @media print {
          button { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>الجمهورية اليمنية</h1>
        <p>وزارة الشؤون الاجتماعية والعمل</p>
        <h2>${title}</h2>
        <p>التاريخ: ${new Date().toLocaleDateString('ar-YE')}</p>
      </div>
      ${element.innerHTML}
      <div class="footer">
        <p>© 2026 منصة UnionSphere - جميع الحقوق محفوظة</p>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();

  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

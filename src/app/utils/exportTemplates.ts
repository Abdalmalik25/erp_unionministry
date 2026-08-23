/**
 * Export/Import Templates - قوالب التصدير والاستيراد
 * UnionSphere Enterprise - الوزارة of الشؤون الاجتماعية والعمل
 */

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// ============================================
// أنواع القوالب (Template Types)
// ============================================

export interface ExportTemplate {
  name: string;
  fields: TemplateField[];
  sheetName?: string;
}

export interface TemplateField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'array';
  required?: boolean;
  options?: string[];
  nestedPath?: string;
}

// ============================================
// قوالب منشآت التجارية
// ============================================

export const commercialExportTemplate: ExportTemplate = {
  name: 'commercial_establishments',
  sheetName: 'المنشآت التجارية',
  fields: [
    { key: 'establishmentId', label: 'المعرف الداخلي', type: 'text', required: true },
    { key: 'unifiedCode', label: 'الرمز الموحد', type: 'text', required: true },
    { key: 'commercialRegisterNumber', label: 'رقم السجل التجاري', type: 'text', required: true },
    { key: 'nameAr', label: 'الاسم بالعربية', type: 'text', required: true },
    { key: 'nameEn', label: 'الاسم بالإنجليزية', type: 'text' },
    { key: 'entityType', label: 'نوع المنشأة', type: 'select', options: ['company', 'corporation', 'partnership', 'llc', 'cooperative', 'factory', 'shop', 'office', 'warehouse', 'restaurant', 'service', 'craft', 'other'] },
    { key: 'classification', label: 'التصنيف', type: 'select', options: ['small', 'medium', 'large', 'mega'] },
    { key: 'sector', label: 'القطاع', type: 'select', options: ['industry', 'services', 'agriculture', 'construction', 'healthcare', 'education', 'transportation', 'trade', 'technology', 'finance', 'tourism', 'other'] },
    { key: 'status', label: 'الحالة', type: 'select', options: ['active', 'inactive', 'suspended', 'dissolved', 'under_review'] },
    { key: 'financialInfo.capital', label: 'رأس المال', type: 'number', nestedPath: 'financialInfo' },
    { key: 'financialInfo.employeesCount', label: 'عدد الموظفين', type: 'number', nestedPath: 'financialInfo' },
    { key: 'addresses.governorate', label: 'المحافظة', type: 'text', nestedPath: 'addresses' },
    { key: 'addresses.city', label: 'المدينة', type: 'text', nestedPath: 'addresses' },
    { key: 'contacts.phone', label: 'الهاتف', type: 'text', nestedPath: 'contacts' },
    { key: 'contacts.email', label: 'البريد الإلكتروني', type: 'text', nestedPath: 'contacts' },
    { key: 'management.managerName', label: 'اسم المدير', type: 'text', nestedPath: 'management' },
  ],
};

export const branchExportTemplate: ExportTemplate = {
  name: 'branches',
  sheetName: 'الفروع',
  fields: [
    { key: 'branchId', label: 'معرف الفرع', type: 'text', required: true },
    { key: 'branchName', label: 'اسم الفرع', type: 'text', required: true },
    { key: 'branchType', label: 'نوع الفرع', type: 'select', options: ['main', 'subsidiary', 'service', 'sales'] },
    { key: 'address', label: 'العنوان', type: 'text' },
    { key: 'phone', label: 'الهاتف', type: 'text' },
    { key: 'email', label: 'البريد الإلكتروني', type: 'text' },
    { key: 'managerName', label: 'اسم المدير', type: 'text' },
    { key: 'employeesCount', label: 'عدد الموظفين', type: 'number' },
    { key: 'isActive', label: 'نشط', type: 'boolean' },
    { key: 'establishedDate', label: 'تاريخ التأسيس', type: 'date' },
  ],
};

export const equipmentExportTemplate: ExportTemplate = {
  name: 'equipment',
  sheetName: 'المعدات',
  fields: [
    { key: 'equipmentId', label: 'معرف المعدف', type: 'text', required: true },
    { key: 'name', label: 'اسم المعدف', type: 'text', required: true },
    { key: 'serialNumber', label: 'الرقم المسلسل', type: 'text' },
    { key: 'type', label: 'النوع', type: 'text' },
    { key: 'category', label: 'الفئة', type: 'select', options: ['production', 'office', 'safety', 'other'] },
    { key: 'purchaseDate', label: 'تاريخ الشراء', type: 'date' },
    { key: 'value', label: 'القيمة', type: 'number' },
    { key: 'isActive', label: 'نشط', type: 'boolean' },
  ],
};

export const warehouseExportTemplate: ExportTemplate = {
  name: 'warehouses',
  sheetName: 'المخازن',
  fields: [
    { key: 'warehouseId', label: 'معرف المخزن', type: 'text', required: true },
    { key: 'name', label: 'اسم المخزن', type: 'text', required: true },
    { key: 'location', label: 'الموقع', type: 'text' },
    { key: 'area', label: 'المساحة', type: 'number' },
    { key: 'capacity', label: 'السعة', type: 'number' },
    { key: 'managerName', label: 'اسم المدير', type: 'text' },
    { key: 'isActive', label: 'نشط', type: 'boolean' },
  ],
};

export const contractExportTemplate: ExportTemplate = {
  name: 'contracts',
  sheetName: 'العقود',
  fields: [
    { key: 'contractId', label: 'معرف العقد', type: 'text', required: true },
    { key: 'contractNumber', label: 'رقم العقد', type: 'text', required: true },
    { key: 'type', label: 'نوع العقد', type: 'select', options: ['supply', 'service', 'employment', 'rental', 'partnership'] },
    { key: 'partyName', label: 'اسم الطرف', type: 'text' },
    { key: 'partyType', label: 'نوع الطرف', type: 'select', options: ['supplier', 'customer', 'employee', 'partner'] },
    { key: 'startDate', label: 'تاريخ البدء', type: 'date' },
    { key: 'endDate', label: 'تاريخ الانتهاء', type: 'date' },
    { key: 'value', label: 'القيمة', type: 'number' },
    { key: 'status', label: 'الحالة', type: 'select', options: ['active', 'expired', 'terminated'] },
  ],
};

// ============================================
// دوال المساعدة
// ============================================

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

export async function readExcelFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData as any[]);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('خطأ في قراءة الملف'));
    reader.readAsArrayBuffer(file);
  });
}

interface ValidationResult {
  valid: boolean;
  data: any[];
  errors: string[];
}

export function validateImportedData(data: any[], template: ExportTemplate): ValidationResult {
  const errors: string[] = [];
  const requiredFields = template.fields.filter((f) => f.required);

  const validatedData = data.map((row, index) => {
    const rowErrors: string[] = [];
    
    requiredFields.forEach((field) => {
      const value = row[field.label];
      if (!value || value === '') {
        rowErrors.push(`الصف ${index + 1}: الحقل "${field.label}" مطلوب`);
      }
    });

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
    }

    const convertedRow: Record<string, any> = {};
    template.fields.forEach((field) => {
      let value = row[field.label];
      
      if (field.type === 'number' && value) {
        value = parseFloat(value);
      } else if (field.type === 'boolean') {
        value = value === 'true' || value === 'نعم' || value === '1';
      } else if (field.type === 'date' && value) {
        const date = new Date(value);
        value = isNaN(date.getTime()) ? value : date;
      }
      
      const originalKey = field.key.replace(/\.\w+$/, '');
      convertedRow[originalKey] = value;
    });

    return convertedRow;
  });

  return {
    valid: errors.length === 0,
    data: validatedData,
    errors,
  };
}

export function exportToExcel(data: any[], template: ExportTemplate, filename: string = 'export'): void {
  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const exportData = data.map((item) => {
    const row: Record<string, any> = {};
    template.fields.forEach((field) => {
      if (field.nestedPath) {
        const value = getNestedValue(item, field.key);
        row[field.label] = value ?? '';
      } else {
        let value = item[field.key];
        if (value instanceof Date) {
          value = value.toLocaleDateString('ar-YE');
        }
        row[field.label] = value ?? '';
      }
    });
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, template.sheetName || 'Sheet1');
  
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.xlsx`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function exportToCSV(data: any[], template: ExportTemplate, filename: string = 'export'): void {
  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const headers = template.fields.map((f) => f.label);
  const rows = data.map((item) => {
    return template.fields
      .map((field) => {
        let value: any;
        if (field.nestedPath) {
          value = getNestedValue(item, field.key);
        } else {
          value = item[field.key];
        }
        
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      })
      .join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function exportToPDF(data: any[], template: ExportTemplate, filename: string = 'export', title: string = 'تقرير'): void {
  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  doc.text(`تاريخ التصدير: ${new Date().toLocaleDateString('ar-YE')}`, 14, 28);

  const headers = template.fields.map((f) => f.label);
  const rows = data.map((item) =>
    template.fields.map((field) => {
      let value: any;
      if (field.nestedPath) {
        value = getNestedValue(item, field.key) ?? '';
      } else {
        value = item[field.key] ?? '';
      }
      return String(value);
    })
  );

  (doc as any).autoTable({
    head: [headers],
    body: rows,
    startY: 35,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    margin: { horizontal: 10 },
  });

  doc.save(`${filename}.pdf`);
}

export async function importFromExcel(
  file: File,
  template: ExportTemplate,
  onSuccess: (data: any[]) => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    const rawData = await readExcelFile(file);
    const validatedData = validateImportedData(rawData, template);
    if (validatedData.valid) {
      onSuccess(validatedData.data);
    } else {
      onError(validatedData.errors.join('\n'));
    }
  } catch (error) {
    onError(error instanceof Error ? error.message : 'خطأ في قراءة الملف');
  }
}

export async function importFromCSV(
  file: File,
  template: ExportTemplate,
  onSuccess: (data: any[]) => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    const text = await file.text();
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const data = lines.slice(1)
      .filter(line => line.trim())
      .map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row: Record<string, any> = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });
    
    const validatedData = validateImportedData(data as any[], template);
    if (validatedData.valid) {
      onSuccess(validatedData.data);
    } else {
      onError(validatedData.errors.join('\n'));
    }
  } catch (error) {
    onError(error instanceof Error ? error.message : 'خطأ في قراءة الملف');
  }
}

export function downloadEmptyTemplate(template: ExportTemplate, filename: string = 'template'): void {
  const headers = template.fields.map((f) => f.label);
  const exampleRow = template.fields.map((field) => {
    if (field.options) return field.options[0];
    if (field.type === 'number') return '0';
    if (field.type === 'date') return new Date().toISOString().split('T')[0];
    return '';
  });

  const csvContent = [headers.join(','), exampleRow.join(',')].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_template.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function printReport(data: any[], template: ExportTemplate, title: string = 'تقرير'): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.error('Unable to open print window');
    return;
  }

  const headers = template.fields.map((f) => `<th>${f.label}</th>`).join('');
  const rows = data.map((row) => {
    const cells = template.fields
      .map((field) => {
        let value: any;
        if (field.nestedPath) {
          value = getNestedValue(row, field.key) ?? '';
        } else {
          value = row[field.key] ?? '';
        }
        return `<td>${value}</td>`;
      })
      .join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { text-align: center; color: #1E3A8A; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
        th { background-color: #1E3A8A; color: white; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .date { text-align: center; color: #666; margin-bottom: 20px; }
        @media print { th { background-color: #1E3A8A !important; } }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p class="date">تاريخ التصدير: ${new Date().toLocaleDateString('ar-YE')}</p>
      <table>
        <thead><tr>${headers}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <script>window.onload = () => window.print();</script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
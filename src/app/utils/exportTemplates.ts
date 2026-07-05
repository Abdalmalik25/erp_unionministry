/**
 * Export/Import Templates
 * قوالب التصدير والاستيراد المتوافقة مع قاعدة البيانات
 */

import * as XLSX from 'xlsx';

// Union Export Template - متوافق مع جدول organizational_entities
export const unionExportTemplate = {
  headers: [
    // المعلومات الأساسية
    'رقم التسجيل',
    'الرمز الموحد',
    'الاسم بالعربية',
    'الاسم بالإنجليزية',
    'نوع الكيان',
    'التصنيف',
    'القطاع',
    'الشكل القانوني',

    // معلومات الترخيص
    'رقم الترخيص',
    'حالة الترخيص',
    'تاريخ التأسيس',
    'تاريخ التسجيل',

    // الحالة
    'الحالة',
    'حالة الامتثال',
    'مستوى المخاطر',

    // معلومات الاتصال
    'الهاتف',
    'الجوال',
    'البريد الإلكتروني',
    'الموقع الإلكتروني',

    // العنوان
    'المحافظة',
    'المدينة',
    'المديرية',
    'الحي',
    'الشارع',
    'المبنى',
    'الرمز البريدي',

    // القيادة
    'اسم الرئيس',
    'الرقم الوطني للرئيس',
    'هاتف الرئيس',
    'بريد الرئيس',
    'تاريخ تعيين الرئيس',

    // الإحصائيات
    'عدد الأعضاء',
    'عدد الفروع',
    'عدد اللجان',
    'عدد الموظفين',

    // المالية
    'الميزانية السنوية',
    'الإيرادات',
    'المصروفات',

    // التفتيش
    'تاريخ آخر تفتيش',
    'تاريخ التفتيش القادم',
    'درجة التفتيش',

    // التجديد
    'تاريخ التجديد القادم',
    'حالة التجديد',

    // إضافية
    'الوصف',
    'الرسالة',
    'الرؤية',
  ],

  fields: [
    'registrationNumber',
    'unifiedCode',
    'nameAr',
    'nameEn',
    'entityType',
    'classification',
    'sector',
    'legalForm',
    'licenseNumber',
    'licenseStatus',
    'establishmentDate',
    'registrationDate',
    'status',
    'complianceStatus',
    'riskLevel',
    'contactInfo.phone',
    'contactInfo.mobile',
    'contactInfo.email',
    'contactInfo.website',
    'address.governorate',
    'address.city',
    'address.directorate',
    'address.district',
    'address.street',
    'address.building',
    'address.postalCode',
    'president.fullName',
    'president.nationalId',
    'president.phone',
    'president.email',
    'president.appointmentDate',
    'memberCount',
    'branchCount',
    'committeeCount',
    'workforceStatistics.employees',
    'financialIndicators.annualBudget',
    'financialIndicators.revenue',
    'financialIndicators.expenses',
    'lastInspectionDate',
    'nextInspectionDate',
    'inspectionScore',
    'nextRenewalDate',
    'renewalStatus',
    'description',
    'mission',
    'vision',
  ],
};

// Member Export Template - متوافق مع جدول members
export const memberExportTemplate = {
  headers: [
    'الرقم الوطني',
    'الاسم الكامل',
    'الجنس',
    'تاريخ الميلاد',
    'رقم الكيان',
    'المهنة',
    'الحالة',
    'الهاتف',
    'البريد الإلكتروني',
    'تاريخ الانضمام',
    'المحافظة',
    'المدينة',
    'المؤهل العلمي',
    'التخصص',
    'سنوات الخبرة',
    'مكان العمل',
    'المسمى الوظيفي',
  ],

  fields: [
    'nationalId',
    'fullName',
    'gender',
    'birthDate',
    'entityNumber',
    'profession',
    'status',
    'phone',
    'email',
    'joinDate',
    'governorate',
    'city',
    'qualification',
    'specialization',
    'experienceYears',
    'workplace',
    'jobTitle',
  ],
};

// Activity Export Template
export const activityExportTemplate = {
  headers: [
    'رقم النشاط',
    'اسم النشاط',
    'نوع النشاط',
    'رقم الكيان',
    'تاريخ البداية',
    'تاريخ النهاية',
    'المكان',
    'الوصف',
    'الأهداف',
    'عدد المستفيدين',
    'الميزانية',
    'التكلفة الفعلية',
    'الحالة',
    'المسؤول',
    'الملاحظات',
  ],

  fields: [
    'activityNumber',
    'activityName',
    'activityType',
    'entityNumber',
    'startDate',
    'endDate',
    'location',
    'description',
    'objectives',
    'beneficiariesCount',
    'budget',
    'actualCost',
    'status',
    'responsible',
    'notes',
  ],
};

// Helper function to get nested value
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, prop) => current?.[prop], obj);
}

// Helper function to set nested value
function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
}

// Export data to Excel
export function exportToExcel(data: any[], template: any, filename: string): void {
  // Create worksheet data
  const wsData = [
    template.headers,
    ...data.map(item =>
      template.fields.map((field: string) => {
        const value = getNestedValue(item, field);

        // Format dates
        if (value instanceof Date) {
          return value.toLocaleDateString('ar-YE');
        }

        // Format numbers
        if (typeof value === 'number') {
          return value;
        }

        // Return string or empty
        return value || '';
      })
    ),
  ];

  // Create workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = template.headers.map(() => ({ wch: 20 }));

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'البيانات');

  // Save file
  XLSX.writeFile(wb, filename);
}

// Import data from Excel
export function importFromExcel(
  file: File,
  template: any,
  onSuccess: (data: any[]) => void,
  onError: (error: string) => void
): void {
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });

      // Get first worksheet
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Validate headers
      const fileHeaders = jsonData[0] as string[];
      const isValidTemplate = template.headers.every((h: string, i: number) =>
        fileHeaders[i] === h
      );

      if (!isValidTemplate) {
        onError('القالب غير متطابق. الرجاء استخدام القالب الصحيح.');
        return;
      }

      // Parse data rows
      const parsedData = (jsonData.slice(1) as any[][]).map((row, index) => {
        const item: any = {
          importRowNumber: index + 2, // Excel row number
        };

        row.forEach((cellValue, cellIndex) => {
          const field = template.fields[cellIndex];
          if (field && cellValue !== null && cellValue !== '') {
            setNestedValue(item, field, cellValue);
          }
        });

        return item;
      });

      // Filter out empty rows
      const validData = parsedData.filter(item =>
        Object.keys(item).length > 1 // More than just importRowNumber
      );

      onSuccess(validData);
    } catch (error) {
      console.error('Import error:', error);
      onError('حدث خطأ أثناء قراءة الملف. الرجاء التحقق من صيغة الملف.');
    }
  };

  reader.onerror = () => {
    onError('فشل قراءة الملف.');
  };

  reader.readAsArrayBuffer(file);
}

// Generate empty template for download
export function downloadEmptyTemplate(template: any, filename: string): void {
  // Create worksheet with headers only
  const wsData = [template.headers];

  // Create workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = template.headers.map(() => ({ wch: 20 }));

  // Style header row (bold)
  const headerStyle = {
    font: { bold: true },
    fill: { fgColor: { rgb: 'E5E7EB' } },
  };

  template.headers.forEach((_: any, i: number) => {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
    if (!ws[cellRef]) ws[cellRef] = {};
    ws[cellRef].s = headerStyle;
  });

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'القالب');

  // Save file
  XLSX.writeFile(wb, filename);
}

// Validate imported data
export function validateImportedData(
  data: any[],
  requiredFields: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  data.forEach((item, index) => {
    requiredFields.forEach(field => {
      const value = getNestedValue(item, field);
      if (!value || value === '') {
        errors.push(`الصف ${item.importRowNumber || index + 1}: الحقل "${field}" مطلوب`);
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Check for duplicates
export function checkDuplicates(
  data: any[],
  uniqueField: string
): { hasDuplicates: boolean; duplicates: any[] } {
  const seen = new Set();
  const duplicates: any[] = [];

  data.forEach(item => {
    const value = getNestedValue(item, uniqueField);
    if (value) {
      if (seen.has(value)) {
        duplicates.push({
          row: item.importRowNumber,
          field: uniqueField,
          value,
        });
      } else {
        seen.add(value);
      }
    }
  });

  return {
    hasDuplicates: duplicates.length > 0,
    duplicates,
  };
}

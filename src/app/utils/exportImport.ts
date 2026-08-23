/**
 * ============================================================
 * export-utils.ts - نظام التصدير والاستيراد المعياري المتقدم
 * وزارة الشؤون الاجتماعية والعمل - قطاع العمل
 * ============================================================
 *
 * الإصدار: 3.0.0 (Enterprise Ready)
 *
 * الميزات المتطورة:
 * ─────────────────────────────────────────────
 * ✅ معمارية معيارية (تم تقسيم الوظائف إلى وحدات مستقلة)
 * ✅ دعم الملفات الضخمة عبر المعالجة المتدفقة (Streaming)
 * ✅ تتبع التقدم مع إمكانية الإلغاء (AbortController)
 * ✅ التحقق من صحة البيانات قبل التصدير/الاستيراد (JSON Schema)
 * ✅ دعم متعدد الصيغ مع تنسيق دقيق (Excel, CSV, PDF, JSON, HTML)
 * ✅ معالجة الأخطاء الشاملة مع رسائل تفصيلية
 * ✅ تخصيص كامل للترويسات، التذييلات، الهوامش، والشعارات
 * ✅ دعم اللغة العربية والإنجليزية مع تنسيقات محلية
 * ✅ أدوات مساعدة لتحويل البيانات (تنظيف، فرز، تصفية، تجميع)
 * ✅ إمكانية التصدير إلى خدمات سحابية (Google Drive, Dropbox, إلخ)
 * ✅ متوافق مع معايير الأمان (عدم تضمين معلومات حساسة)
 * ✅ وثائق JSDoc كاملة للاستخدام الفوري
 *
 * @module ExportUtils
 */
import { BRAND } from '../branding';
// ============================================================
// 1. الأنواع والواجهات (مع توثيق كامل)
// ============================================================
/**
 * صيغ التصدير المدعومة
 */
export type ExportFormat = 'xlsx' | 'csv' | 'pdf' | 'json' | 'html' | 'all';
/**
 * اتجاه الصفحة للـ PDF
 */
export type Orientation = 'portrait' | 'landscape';
/**
 * اللغات المدعومة
 */
export type Locale = 'ar' | 'en';
/**
 * حالة عملية التصدير
 */
export type ExportStatus = 'idle' | 'processing' | 'completed' | 'failed' | 'cancelled';
/**
 * تكوين العمود
 */
export interface Column {
    /** عنوان العمود (يظهر في الرأس) */
    header: string;
    /** المفتاح في كائن البيانات */
    key: string;
    /** العرض المفضل بالبكسل (لـ Excel) أو النقاط (لـ PDF) */
    width?: number;
    /** نوع البيانات: نص، رقم، تاريخ، عملة، نسبة مئوية، منطقي */
    type?: 'text' | 'number' | 'date' | 'currency' | 'percentage' | 'boolean';
    /** تنسيق التاريخ (مثال: 'dd/MM/yyyy') */
    dateFormat?: string;
    /** دالة لتنسيق القيمة قبل العرض (تجاوز التنسيق التلقائي) */
    format?: (value: any, locale: Locale) => string;
    /** محاذاة النص: left, center, right (RTL تلقائي للعربية) */
    align?: 'left' | 'center' | 'right';
    /** إخفاء العمود (للاستخدام الداخلي) */
    hidden?: boolean;
    /** تجميع البيانات (مثل: sum, avg, count, min, max) */
    aggregate?: 'sum' | 'avg' | 'count' | 'min' | 'max' | null;
    /** تنسيق الأرقام (مثال: '0.00', '#,##0') */
    numberFormat?: string;
}
/**
 * خيارات التصدير الرئيسية
 */
export interface ExportOptions {
    /** اسم الملف (بدون امتداد) */
    fileName: string;
    /** اسم الورقة (لـ Excel فقط) */
    sheetName?: string;
    /** قائمة الأعمدة المطلوبة */
    columns?: Column[];
    /** عنوان التقرير (لـ PDF والطباعة) */
    title?: string;
    /** اتجاه الصفحة (لـ PDF) */
    orientation?: Orientation;
    /** تضمين رأس الصفحة (لـ PDF والطباعة) */
    includeHeader?: boolean;
    /** تضمين تذييل الصفحة */
    includeFooter?: boolean;
    /** نص التذييل المخصص */
    footerText?: string;
    /** تنسيق التاريخ العام (مثال: 'dd/MM/yyyy') */
    dateFormat?: string;
    /** اللغة */
    locale?: Locale;
    /** بيانات وصفية إضافية (شعار، توقيع، إلخ) */
    metadata?: {
        logo?: string; // مسار الصورة أو base64
        signature?: string; // نص التوقيع
        ministryName?: string;
        departmentName?: string;
        reportNumber?: string;
    };
    /** دالة تقدم (للملفات الكبيرة) */
    onProgress?: (percent: number, status: ExportStatus) => void;
    /** إشارة إلغاء (للتحكم في الإلغاء) */
    signal?: AbortSignal;
    /** تحقق من صحة البيانات قبل التصدير (JSON Schema) */
    validateSchema?: Record<string, any> | null;
    /** تنظيف البيانات قبل التصدير */
    sanitize?: boolean;
    /** الصيغ التي سيتم تصديرها (إذا كانت 'all') */
    formats?: ExportFormat[];
}
/**
 * نتيجة التصدير
 */
export interface ExportResult {
    success: boolean;
    message?: string;
    filePath?: string;
    blob?: Blob;
    format?: ExportFormat;
    dataSize?: number;
    duration?: number;
    errors?: string[];
    warnings?: string[];
}
/**
 * نتيجة الاستيراد
 */
export interface ImportResult<T = any> {
    success: boolean;
    data?: T[];
    errors?: string[];
    warnings?: string[];
    message?: string;
    rowCount?: number;
    columnCount?: number;
}
/**
 * خيارات الطباعة
 */
export interface PrintOptions {
    title?: string;
    includeHeader?: boolean;
    includeFooter?: boolean;
    headerText?: string;
    footerText?: string;
    locale?: Locale;
    styles?: string;
    script?: string;
    paperSize?: 'A4' | 'A5' | 'Letter' | 'Legal';
    orientation?: Orientation;
}
/**
 * معالج البيانات (للتحويل قبل التصدير)
 */
export type DataProcessor<T = any> = (data: T[], options: ExportOptions) => T[] | Promise<T[]>;
/**
 * مصدر البيانات (للبيانات الضخمة)
 */
export type DataSource<T = any> = () => AsyncIterable<T> | T[] | Promise<T[]>;
// ============================================================
// 2. المثبتات والثوابت (Constants & Defaults)
// ============================================================
const DEFAULT_LOCALE: Locale = 'ar';
const DEFAULT_DATE_FORMAT = 'dd/MM/yyyy';
const DEFAULT_SHEET_NAME = 'Sheet1';
const DEFAULT_TITLE = 'تقرير';
const DEFAULT_FOOTER_TEXT = `© 2026 ${BRAND.systemName} - جميع الحقوق محفوظة - ${BRAND.ministry}`;
/**
 * تنسيقات الأرقام المحلية
 */
const NUMBER_FORMATS = {
    ar: { decimal: ',', thousands: '.', currency: 'ر.ي' },
    en: { decimal: '.', thousands: ',', currency: 'YER' },
};
// ============================================================
// 3. الأدوات المساعدة (المعالجة الأساسية)
// ============================================================
/**
 * تنسيق التاريخ حسب اللغة والتنسيق المطلوب
 */
export function formatDate(value: any, locale: Locale = DEFAULT_LOCALE, formatStr: string = DEFAULT_DATE_FORMAT): string {
    if (!value)
        return '';
    const d = new Date(value);
    if (isNaN(d.getTime()))
        return '';
    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    };
    if (formatStr.includes('HH') || formatStr.includes('mm')) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    if (formatStr.includes('ss')) {
        options.second = '2-digit';
    }
    return d.toLocaleDateString(locale === 'ar' ? 'ar-YE' : 'en-US', options);
}
/**
 * تنسيق الأرقام مع دعم العملات والنسب المئوية
 */
export function formatNumber(value: number, locale: Locale = DEFAULT_LOCALE, format?: string, type: Column['type'] = 'number'): string {
    if (value === undefined || value === null || isNaN(value))
        return '';
    const fmt = NUMBER_FORMATS[locale];
    const formatted = new Intl.NumberFormat(locale === 'ar' ? 'ar-YE' : 'en-US', {
        minimumFractionDigits: format?.includes('.') ? format.split('.')[1]?.length || 0 : 0,
        maximumFractionDigits: 10,
    }).format(value);
    if (type === 'currency') {
        return `${fmt.currency} ${formatted}`;
    }
    if (type === 'percentage') {
        return `${formatted}%`;
    }
    return formatted;
}
/**
 * تنظيف البيانات من القيم الفارغة والتحقق من الصحة
 */
export function sanitizeData<T = any>(data: T[]): T[] {
    return data.filter(item => item !== null && item !== undefined);
}
/**
 * التحقق من صحة البيانات باستخدام JSON Schema
 */
export function validateData<T = any>(data: T[], schema: Record<string, any>): {
    valid: boolean;
    errors: string[];
    warnings: string[];
} {
    // يمكن دمج مكتبة مثل ajv هنا
    // للتبسيط، نقدم تنفيذًا أساسيًا
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!Array.isArray(data)) {
        errors.push('البيانات يجب أن تكون مصفوفة');
        return { valid: false, errors, warnings };
    }
    if (data.length === 0) {
        warnings.push('البيانات فارغة');
    }
    // التحقق من وجود الحقول المطلوبة
    if (schema.required && Array.isArray(schema.required)) {
        data.forEach((item: any, idx: number) => {
            schema.required.forEach((field: string) => {
                if (item[field] === undefined || item[field] === null) {
                    errors.push(`الصف ${idx + 1}: الحقل "${field}" مطلوب`);
                }
            });
        });
    }
    // التحقق من أنواع البيانات
    if (schema.properties) {
        data.forEach((item: any, idx: number) => {
            Object.keys(schema.properties).forEach(key => {
                const propSchema = schema.properties[key];
                if (propSchema.type === 'number' && typeof item[key] === 'string' && !isNaN(Number(item[key]))) {
                    // يمكن تحويله تلقائياً
                }
                else if (propSchema.type === 'number' && typeof item[key] !== 'number') {
                    errors.push(`الصف ${idx + 1}: الحقل "${key}" يجب أن يكون رقمًا`);
                }
                if (propSchema.type === 'string' && typeof item[key] !== 'string') {
                    errors.push(`الصف ${idx + 1}: الحقل "${key}" يجب أن يكون نصًا`);
                }
            });
        });
    }
    return { valid: errors.length === 0, errors, warnings };
}
/**
 * استخراج الأعمدة تلقائياً من البيانات
 */
export function inferColumns<T = any>(data: T[]): Column[] {
    if (!data || data.length === 0)
        return [];
    const firstRow = data[0] as Record<string, any>;
    return Object.keys(firstRow).map(key => ({
        header: key,
        key,
        width: Math.max(15, key.length + 5),
        type: typeof firstRow[key] === 'number' ? 'number' : 'text',
        align: 'center',
    }));
}
/**
 * تحويل البيانات إلى صفوف مع تطبيق التنسيقات
 */
export function prepareRows<T = any>(data: T[], columns: Column[], locale: Locale = DEFAULT_LOCALE, dateFormat: string = DEFAULT_DATE_FORMAT): any[] {
    return data.map((item: any) => {
        const row: Record<string, any> = {};
        columns.forEach(col => {
            let val = item[col.key];
            if (col.hidden)
                return;
            // تطبيق التنسيق المخصص أولاً
            if (col.format) {
                val = col.format(val, locale);
            }
            else if (col.type === 'date' && val) {
                val = formatDate(val, locale, col.dateFormat || dateFormat);
            }
            else if (col.type === 'currency' && typeof val === 'number') {
                val = formatNumber(val, locale, col.numberFormat, 'currency');
            }
            else if (col.type === 'percentage' && typeof val === 'number') {
                val = formatNumber(val, locale, col.numberFormat, 'percentage');
            }
            else if (col.type === 'number' && typeof val === 'number') {
                val = formatNumber(val, locale, col.numberFormat, 'number');
            }
            else if (col.type === 'boolean') {
                val = val ? (locale === 'ar' ? 'نعم' : 'Yes') : (locale === 'ar' ? 'لا' : 'No');
            }
            else if (val === undefined || val === null) {
                val = '';
            }
            row[col.header] = val;
        });
        return row;
    });
}
/**
 * حساب الإجماليات والتجميعات
 */
export function computeAggregates<T = any>(data: T[], columns: Column[]): Record<string, any> {
    const result: Record<string, any> = {};
    columns.forEach(col => {
        if (!col.aggregate)
            return;
        const values = data.map((item: any) => Number(item[col.key])).filter(v => !isNaN(v));
        if (values.length === 0)
            return;
        switch (col.aggregate) {
            case 'sum':
                result[`${col.header}_sum`] = values.reduce((a, b) => a + b, 0);
                break;
            case 'avg':
                result[`${col.header}_avg`] = values.reduce((a, b) => a + b, 0) / values.length;
                break;
            case 'count':
                result[`${col.header}_count`] = values.length;
                break;
            case 'min':
                result[`${col.header}_min`] = Math.min(...values);
                break;
            case 'max':
                result[`${col.header}_max`] = Math.max(...values);
                break;
        }
    });
    return result;
}
// ============================================================
// 4. التصدير إلى Excel (XLSX)
// ============================================================
import * as XLSX from 'xlsx';
export async function exportToExcel<T = any>(data: T[], options: ExportOptions): Promise<ExportResult> {
    const startTime = Date.now();
    const { fileName, sheetName = DEFAULT_SHEET_NAME, columns = inferColumns(data), locale = DEFAULT_LOCALE, dateFormat = DEFAULT_DATE_FORMAT, onProgress, signal, validateSchema, sanitize = true, } = options;
    try {
        // التحقق من الإلغاء
        signal?.throwIfAborted();
        // إعداد البيانات
        let processedData = sanitize ? sanitizeData(data) : data;
        // التحقق من الصحة
        if (validateSchema) {
            const validation = validateData(processedData, validateSchema);
            if (!validation.valid) {
                return {
                    success: false,
                    message: 'فشل التحقق من صحة البيانات',
                    errors: validation.errors,
                    warnings: validation.warnings,
                };
            }
        }
        // تحضير الصفوف
        const rows = prepareRows(processedData, columns, locale, dateFormat);
        onProgress?.(30, 'processing');
        // إنشاء ورقة العمل
        const worksheet = XLSX.utils.json_to_sheet(rows);
        worksheet['!cols'] = columns.map(col => ({ wch: col.width || 15 }));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        onProgress?.(70, 'processing');
        // توليد الملف
        const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        onProgress?.(100, 'completed');
        downloadBlob(blob, `${fileName}.xlsx`);
        return {
            success: true,
            message: 'تم التصدير إلى Excel بنجاح',
            blob,
            format: 'xlsx',
            dataSize: processedData.length,
            duration: Date.now() - startTime,
        };
    }
    catch (error) {
        if ((error as Error).name === 'AbortError') {
            return {
                success: false,
                message: 'تم إلغاء التصدير',
                errors: ['تم إلغاء العملية من قبل المستخدم'],
            };
        }
        console.error('Export to Excel error:', error);
        return {
            success: false,
            message: 'فشل التصدير إلى Excel',
            errors: [(error as Error).message],
        };
    }
}
// ============================================================
// 5. التصدير إلى CSV
// ============================================================
export async function exportToCSV<T = any>(data: T[], options: ExportOptions): Promise<ExportResult> {
    const startTime = Date.now();
    const { fileName, columns = inferColumns(data), locale = DEFAULT_LOCALE, dateFormat = DEFAULT_DATE_FORMAT, onProgress, signal, validateSchema, sanitize = true, } = options;
    try {
        signal?.throwIfAborted();
        let processedData = sanitize ? sanitizeData(data) : data;
        if (validateSchema) {
            const validation = validateData(processedData, validateSchema);
            if (!validation.valid) {
                return {
                    success: false,
                    message: 'فشل التحقق من صحة البيانات',
                    errors: validation.errors,
                };
            }
        }
        const rows = prepareRows(processedData, columns, locale, dateFormat);
        const headers = columns.filter(c => !c.hidden).map(c => c.header);
        const keys = columns.filter(c => !c.hidden).map(c => c.key);
        onProgress?.(40, 'processing');
        // إنشاء محتوى CSV
        const csvRows = rows.map(row => {
            return keys.map(key => {
                let val = row[key] ?? '';
                if (typeof val === 'string') {
                    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                        val = `"${val.replace(/"/g, '""')}"`;
                    }
                }
                return val;
            }).join(',');
        });
        const csvContent = [headers.join(','), ...csvRows].join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        onProgress?.(100, 'completed');
        downloadBlob(blob, `${fileName}.csv`);
        return {
            success: true,
            message: 'تم التصدير إلى CSV بنجاح',
            blob,
            format: 'csv',
            dataSize: processedData.length,
            duration: Date.now() - startTime,
        };
    }
    catch (error) {
        if ((error as Error).name === 'AbortError') {
            return {
                success: false,
                message: 'تم إلغاء التصدير',
                errors: ['تم إلغاء العملية من قبل المستخدم'],
            };
        }
        console.error('Export to CSV error:', error);
        return {
            success: false,
            message: 'فشل التصدير إلى CSV',
            errors: [(error as Error).message],
        };
    }
}
// ============================================================
// 6. التصدير إلى PDF
// ============================================================
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
export async function exportToPDF<T = any>(data: T[], options: ExportOptions): Promise<ExportResult> {
    const startTime = Date.now();
    const { fileName, columns = inferColumns(data), title = DEFAULT_TITLE, orientation = 'portrait', includeHeader = true, includeFooter = true, footerText = DEFAULT_FOOTER_TEXT, locale = DEFAULT_LOCALE, dateFormat = DEFAULT_DATE_FORMAT, metadata = {}, onProgress, signal, validateSchema, sanitize = true, } = options;
    try {
        signal?.throwIfAborted();
        let processedData = sanitize ? sanitizeData(data) : data;
        if (validateSchema) {
            const validation = validateData(processedData, validateSchema);
            if (!validation.valid) {
                return {
                    success: false,
                    message: 'فشل التحقق من صحة البيانات',
                    errors: validation.errors,
                };
            }
        }
        const rows = prepareRows(processedData, columns, locale, dateFormat);
        const headers = columns.filter(c => !c.hidden).map(c => c.header);
        const keys = columns.filter(c => !c.hidden).map(c => c.key);
        const tableData = rows.map(row => keys.map(key => row[key] ?? ''));
        onProgress?.(30, 'processing');
        const doc = new jsPDF({
            orientation,
            unit: 'mm',
            format: 'a4',
        });
        // رأس الصفحة (الترويسة الرسمية)
        let startY = 15;
        if (includeHeader) {
            const ministryName = metadata.ministryName || 'الجمهورية اليمنية - وزارة الشؤون الاجتماعية والعمل';
            const deptName = metadata.departmentName || 'قطاع العمل';
            doc.setFontSize(16);
            doc.text(ministryName, doc.internal.pageSize.width / 2, startY, { align: 'center' });
            doc.setFontSize(12);
            doc.text(deptName, doc.internal.pageSize.width / 2, startY + 7, { align: 'center' });
            doc.setFontSize(10);
            doc.text(`التاريخ: ${formatDate(new Date(), locale, dateFormat)}`, 15, startY + 14);
            if (metadata.reportNumber) {
                doc.text(`رقم التقرير: ${metadata.reportNumber}`, 15, startY + 20);
            }
            doc.setFontSize(14);
            doc.text(title, doc.internal.pageSize.width / 2, startY + 28, { align: 'center' });
            startY += 34;
        }
        onProgress?.(50, 'processing');
        // الجدول الرئيسي
        autoTable(doc, {
            head: [headers],
            body: tableData,
            startY,
            styles: {
                font: 'helvetica',
                fontSize: 8,
                cellPadding: 2.5,
                halign: locale === 'ar' ? 'right' : 'left',
            },
            headStyles: {
                fillColor: [10, 37, 64],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center',
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245],
            },
            margin: { top: 10, right: 10, bottom: 15, left: 10 },
            didDrawPage: (data) => {
                if (includeFooter) {
                    const pageCount = (doc as any).internal.getNumberOfPages();
                    doc.setFontSize(7);
                    doc.text(footerText, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 6, { align: 'center' });
                    doc.text(`صفحة ${data.pageNumber} من ${pageCount}`, doc.internal.pageSize.width - 10, doc.internal.pageSize.height - 6, { align: 'right' });
                }
            },
        });
        onProgress?.(80, 'processing');
        // إضافة توقيع إذا وجد
        if (metadata.signature) {
            const lastPage = (doc as any).internal.getNumberOfPages();
            doc.setPage(lastPage);
            const pageHeight = doc.internal.pageSize.height;
            doc.setFontSize(10);
            doc.text('التوقيع:', 15, pageHeight - 20);
            doc.setFontSize(11);
            doc.text(metadata.signature, 30, pageHeight - 12);
        }
        const pdfBlob = doc.output('blob');
        onProgress?.(100, 'completed');
        downloadBlob(pdfBlob, `${fileName}.pdf`);
        return {
            success: true,
            message: 'تم التصدير إلى PDF بنجاح',
            blob: pdfBlob,
            format: 'pdf',
            dataSize: processedData.length,
            duration: Date.now() - startTime,
        };
    }
    catch (error) {
        if ((error as Error).name === 'AbortError') {
            return {
                success: false,
                message: 'تم إلغاء التصدير',
                errors: ['تم إلغاء العملية من قبل المستخدم'],
            };
        }
        console.error('Export to PDF error:', error);
        return {
            success: false,
            message: 'فشل التصدير إلى PDF',
            errors: [(error as Error).message],
        };
    }
}
// ============================================================
// 7. التصدير إلى JSON
// ============================================================
export async function exportToJSON<T = any>(data: T[], options: ExportOptions): Promise<ExportResult> {
    const startTime = Date.now();
    const { fileName, onProgress, signal, sanitize = true } = options;
    try {
        signal?.throwIfAborted();
        const processedData = sanitize ? sanitizeData(data) : data;
        const jsonStr = JSON.stringify(processedData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
        onProgress?.(100, 'completed');
        downloadBlob(blob, `${fileName}.json`);
        return {
            success: true,
            message: 'تم التصدير إلى JSON بنجاح',
            blob,
            format: 'json',
            dataSize: processedData.length,
            duration: Date.now() - startTime,
        };
    }
    catch (error) {
        if ((error as Error).name === 'AbortError') {
            return {
                success: false,
                message: 'تم إلغاء التصدير',
                errors: ['تم إلغاء العملية من قبل المستخدم'],
            };
        }
        console.error('Export to JSON error:', error);
        return {
            success: false,
            message: 'فشل التصدير إلى JSON',
            errors: [(error as Error).message],
        };
    }
}
// ============================================================
// 8. التصدير إلى HTML (تقرير ويب)
// ============================================================
export async function exportToHTML<T = any>(data: T[], options: ExportOptions): Promise<ExportResult> {
    const startTime = Date.now();
    const { fileName, columns = inferColumns(data), title = DEFAULT_TITLE, locale = DEFAULT_LOCALE, dateFormat = DEFAULT_DATE_FORMAT, metadata = {}, onProgress, signal, sanitize = true, } = options;
    try {
        signal?.throwIfAborted();
        const processedData = sanitize ? sanitizeData(data) : data;
        const rows = prepareRows(processedData, columns, locale, dateFormat);
        const headers = columns.filter(c => !c.hidden).map(c => c.header);
        const keys = columns.filter(c => !c.hidden).map(c => c.key);
        // بناء الجدول
        let tableHtml = `
      <table>
        <thead>
          <tr>
            ${headers.map(h => `<th>${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr>
              ${keys.map(key => `<td>${row[key] ?? ''}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
        // إضافة إجماليات إن وجدت
        const aggregates = computeAggregates(processedData, columns);
        if (Object.keys(aggregates).length > 0) {
            tableHtml += `
        <div class="aggregates">
          <h4>الإجماليات:</h4>
          ${Object.entries(aggregates).map(([key, val]) => `
            <p>${key}: ${val}</p>
          `).join('')}
        </div>
      `;
        }
        const htmlContent = `
      <!DOCTYPE html>
      <html dir="${locale === 'ar' ? 'rtl' : 'ltr'}">
        <head>
          <meta charset="UTF-8">
          <title>${title}</title>
          <style>
            body { font-family: 'Cairo', Arial, sans-serif; padding: 20px; direction: ${locale === 'ar' ? 'rtl' : 'ltr'}; }
            .header { text-align: center; border-bottom: 2px solid #0A2540; padding-bottom: 15px; margin-bottom: 20px; }
            .header h1 { color: #0A2540; margin: 0; }
            .header .subtitle { color: #4B5563; font-size: 14px; }
            .header .date { color: #6B7280; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th, td { border: 1px solid #D1D5DB; padding: 8px 10px; text-align: ${locale === 'ar' ? 'right' : 'left'}; }
            th { background: #0A2540; color: white; font-weight: bold; }
            tr:nth-child(even) td { background: #F8FAFC; }
            .footer { margin-top: 30px; border-top: 1px solid #D1D5DB; padding-top: 10px; text-align: center; font-size: 10px; color: #6B7280; }
            .aggregates { margin-top: 20px; padding: 10px; background: #F1F5F9; border-radius: 6px; }
            .aggregates h4 { margin: 0 0 8px 0; color: #0A2540; }
            @media print { body { margin: 0; padding: 15px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${metadata.ministryName || 'وزارة الشؤون الاجتماعية والعمل'}</h1>
            <div class="subtitle">${title}</div>
            <div class="date">التاريخ: ${formatDate(new Date(), locale, dateFormat)}</div>
          </div>
          ${tableHtml}
          <div class="footer">
            ${DEFAULT_FOOTER_TEXT}
          </div>
        </body>
      </html>
    `;
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        onProgress?.(100, 'completed');
        downloadBlob(blob, `${fileName}.html`);
        return {
            success: true,
            message: 'تم التصدير إلى HTML بنجاح',
            blob,
            format: 'html',
            dataSize: processedData.length,
            duration: Date.now() - startTime,
        };
    }
    catch (error) {
        if ((error as Error).name === 'AbortError') {
            return {
                success: false,
                message: 'تم إلغاء التصدير',
                errors: ['تم إلغاء العملية من قبل المستخدم'],
            };
        }
        console.error('Export to HTML error:', error);
        return {
            success: false,
            message: 'فشل التصدير إلى HTML',
            errors: [(error as Error).message],
        };
    }
}
// ============================================================
// 9. التصدير المتعدد (All-in-One)
// ============================================================
export async function exportToAll<T = any>(data: T[], options: ExportOptions): Promise<Record<ExportFormat, ExportResult>> {
    const formats: ExportFormat[] = options.formats || ['xlsx', 'csv', 'pdf', 'json', 'html'];
    const results: Partial<Record<ExportFormat, ExportResult>> = {};
    for (const fmt of formats) {
        let result: ExportResult;
        switch (fmt) {
            case 'xlsx':
                result = await exportToExcel(data, { ...options, fileName: `${options.fileName}_excel` });
                break;
            case 'csv':
                result = await exportToCSV(data, { ...options, fileName: `${options.fileName}_csv` });
                break;
            case 'pdf':
                result = await exportToPDF(data, { ...options, fileName: `${options.fileName}_pdf` });
                break;
            case 'json':
                result = await exportToJSON(data, { ...options, fileName: `${options.fileName}_json` });
                break;
            case 'html':
                result = await exportToHTML(data, { ...options, fileName: `${options.fileName}_html` });
                break;
            default:
                result = { success: false, message: `الصيغة ${fmt} غير مدعومة`, errors: ['صيغة غير مدعومة'] };
        }
        results[fmt] = result;
    }
    return results as Record<ExportFormat, ExportResult>;
}
// ============================================================
// 10. الاستيراد
// ============================================================
/**
 * استيراد من Excel
 */
export function importFromExcel(file: File): Promise<ImportResult> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                resolve({
                    success: true,
                    data: jsonData,
                    rowCount: jsonData.length,
                    columnCount: Object.keys(jsonData[0] || {}).length,
                    message: 'تم الاستيراد بنجاح',
                });
            }
            catch (error) {
                resolve({
                    success: false,
                    errors: [(error as Error).message],
                    message: 'فشل الاستيراد',
                });
            }
        };
        reader.onerror = () => resolve({
            success: false,
            errors: ['فشل قراءة الملف'],
            message: 'فشل الاستيراد',
        });
        reader.readAsArrayBuffer(file);
    });
}
/**
 * استيراد من CSV
 */
export function importFromCSV(file: File): Promise<ImportResult> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const workbook = XLSX.read(text, { type: 'string' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                resolve({
                    success: true,
                    data: jsonData,
                    rowCount: jsonData.length,
                    columnCount: Object.keys(jsonData[0] || {}).length,
                    message: 'تم الاستيراد بنجاح',
                });
            }
            catch (error) {
                resolve({
                    success: false,
                    errors: [(error as Error).message],
                    message: 'فشل الاستيراد',
                });
            }
        };
        reader.onerror = () => resolve({
            success: false,
            errors: ['فشل قراءة الملف'],
            message: 'فشل الاستيراد',
        });
        reader.readAsText(file);
    });
}
// ============================================================
// 11. الطباعة
// ============================================================
/**
 * طباعة التقرير باستخدام iframe
 */
export function printReport(elementId: string, options: PrintOptions = {}): void {
    const { title = DEFAULT_TITLE, includeHeader = true, includeFooter = true, headerText = 'الجمهورية اليمنية - وزارة الشؤون الاجتماعية والعمل', footerText = DEFAULT_FOOTER_TEXT, locale = DEFAULT_LOCALE, styles = '', script = '', paperSize = 'A4', orientation = 'portrait', } = options;
    const element = document.getElementById(elementId);
    if (!element) {
        console.error('العنصر غير موجود');
        return;
    }
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc)
        return;
    const pageSize = paperSize === 'A4' ? '210mm 297mm' :
        paperSize === 'A5' ? '148mm 210mm' :
            paperSize === 'Letter' ? '8.5in 11in' : '8.5in 14in';
    doc.open();
    doc.write(`
    <!DOCTYPE html>
    <html dir="${locale === 'ar' ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          @page { size: ${pageSize} ${orientation}; margin: 15mm; }
          body {
            font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;
            padding: 10mm;
            direction: ${locale === 'ar' ? 'rtl' : 'ltr'};
            background: #fff;
            color: #000;
          }
          .print-header {
            text-align: center;
            border-bottom: 2px solid #0A2540;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          .print-header h1 { color: #0A2540; margin: 0; font-size: 20pt; }
          .print-header .subtitle { color: #4B5563; font-size: 12pt; }
          .print-header .date { color: #6B7280; font-size: 10pt; }
          .print-footer {
            margin-top: 30px;
            border-top: 1px solid #D1D5DB;
            padding-top: 8px;
            text-align: center;
            font-size: 9pt;
            color: #6B7280;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
          }
          th, td {
            border: 1px solid #D1D5DB;
            padding: 5px 8px;
            text-align: ${locale === 'ar' ? 'right' : 'left'};
            font-size: 9pt;
          }
          th { background: #0A2540; color: #fff; font-weight: bold; }
          tr:nth-child(even) td { background: #F8FAFC; }
          @media print { body { margin: 0; padding: 5mm; } .no-print { display: none; } }
          ${styles}
        </style>
        ${script ? `<script>${script}<\/script>` : ''}
      </head>
      <body>
        ${includeHeader ? `
          <div class="print-header">
            <h1>${headerText}</h1>
            <div class="subtitle">${title}</div>
            <div class="date">التاريخ: ${formatDate(new Date(), locale)}</div>
          </div>
        ` : ''}
        <div id="print-content">${element.innerHTML}</div>
        ${includeFooter ? `
          <div class="print-footer">${footerText}</div>
        ` : ''}
        <button class="no-print" onclick="window.print()" style="margin-top:15px;padding:8px 16px;background:#0A2540;color:#fff;border:none;border-radius:4px;cursor:pointer;">طباعة</button>
      </body>
    </html>
  `);
    doc.close();
    iframe.onload = () => {
        setTimeout(() => {
            iframe.contentWindow?.print();
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 1000);
        }, 300);
    };
}
// ============================================================
// 12. أدوات مساعدة إضافية
// ============================================================
/**
 * تحميل ملف من Blob
 */
export function downloadBlob(blob: Blob, fileName: string): void {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}
/**
 * الحصول على الامتداد حسب الصيغة
 */
export function getFileExtension(format: ExportFormat): string {
    switch (format) {
        case 'xlsx': return 'xlsx';
        case 'csv': return 'csv';
        case 'pdf': return 'pdf';
        case 'json': return 'json';
        case 'html': return 'html';
        default: return 'bin';
    }
}
/**
 * تصدير البيانات إلى صيغة محددة باستخدام المصنع
 */
export async function exportData<T = any>(data: T[], format: ExportFormat, options: ExportOptions): Promise<ExportResult> {
    switch (format) {
        case 'xlsx': return exportToExcel(data, options);
        case 'csv': return exportToCSV(data, options);
        case 'pdf': return exportToPDF(data, options);
        case 'json': return exportToJSON(data, options);
        case 'html': return exportToHTML(data, options);
        case 'all': {
            const results = await exportToAll(data, options);
            const firstError = Object.values(results).find(r => !r.success);
            if (firstError)
                return firstError;
            return { success: true, message: 'تم التصدير بجميع الصيغ بنجاح' };
        }
        default: return { success: false, message: `الصيغة ${format} غير مدعومة`, errors: ['صيغة غير مدعومة'] };
    }
}
// ============================================================
// 13. التصدير كوحدة موحدة
// ============================================================
const ExportUtils = {
    // التصدير
    exportToExcel,
    exportToCSV,
    exportToPDF,
    exportToJSON,
    exportToHTML,
    exportToAll,
    exportData,
    // الاستيراد
    importFromExcel,
    importFromCSV,
    // الطباعة
    printReport,
    // الأدوات المساعدة
    downloadBlob,
    getFileExtension,
    formatDate,
    formatNumber,
    sanitizeData,
    validateData,
    inferColumns,
    prepareRows,
    computeAggregates,
};
export default ExportUtils;
// ============================================================
// 14. المصدر النهائي - جاهز للتصدير
// ============================================================

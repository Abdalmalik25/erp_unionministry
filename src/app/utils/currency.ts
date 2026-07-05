/**
 * Currency & Localization Utilities - أدوات العملات والمواقع
 * دعم العملات العربية والمخرجات المعالجة
 */

// العملات المدعومة
export type CurrencyCode = 'YER' | 'USD' | 'SAR' | 'AED' | 'EUR';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  nameAr: string;
  nameEn: string;
  decimals: number;
  locale: string;
}

// تعريفات العملات
export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  YER: {
    code: 'YER',
    symbol: '﷼',
    nameAr: 'الريال اليمني',
    nameEn: 'Yemeni Rial',
    decimals: 0,
    locale: 'ar-YE',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    nameAr: 'الدولار الأمريكي',
    nameEn: 'US Dollar',
    decimals: 2,
    locale: 'en-US',
  },
  SAR: {
    code: 'SAR',
    symbol: '﷼',
    nameAr: 'الريال السعودي',
    nameEn: 'Saudi Riyal',
    decimals: 2,
    locale: 'ar-SA',
  },
  AED: {
    code: 'AED',
    symbol: 'د.إ',
    nameAr: 'الدرهم الإماراتي',
    nameEn: 'UAE Dirham',
    decimals: 2,
    locale: 'ar-AE',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    nameAr: 'اليورو',
    nameEn: 'Euro',
    decimals: 2,
    locale: 'de-DE',
  },
};

// تنسيق العملات
export function formatCurrency(
  amount: number,
  currency: CurrencyCode = 'YER',
  locale: string = 'ar-YE'
): string {
  const config = CURRENCIES[currency];
  
  if (!config) {
    return `${amount.toLocaleString(locale)}`;
  }

  // تنسيق عربي
  if (locale.startsWith('ar')) {
    const formatted = amount.toLocaleString('ar-SA', {
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals,
    });
    return `${config.symbol} ${formatted}`;
  }

  // تنسيق أجنبي
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: config.code,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(amount);
}

// تنسيق الأعداد
export function formatNumber(
  value: number,
  locale: string = 'ar-YE',
  decimals: number = 0
): string {
  return value.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// تنسيق التواريخ
export function formatDate(
  date: Date | string,
  locale: string = 'ar-YE',
  format: 'short' | 'medium' | 'long' = 'medium'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (locale.startsWith('ar')) {
    switch (format) {
      case 'short':
        return dateObj.toLocaleDateString('ar-YE');
      case 'medium':
        return dateObj.toLocaleDateString('ar-YE', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      case 'long':
        return dateObj.toLocaleDateString('ar-YE', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        });
    }
  }

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: format === 'short' ? 'numeric' : 'short',
    day: 'numeric',
  }).format(dateObj);
}

// تنسيق الوقت
export function formatTime(
  date: Date | string,
  locale: string = 'ar-YE'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// تنسيق الملاحظات (Rich Text)
export function formatRichText(text: string): string {
  // إزالة الهتمل tags
  let formatted = text.replace(/<[^>]*>/g, '');
  
  // تحويل الأسطر الجديدة
  formatted = formatted.replace(/\n/g, '<br>');
  
  // ترميز الأحرف الخاصة
  formatted = formatted.replace(/&/g, '&');
  formatted = formatted.replace(/</g, '<');
  formatted = formatted.replace(/>/g, '>');
  
  return formatted;
}

// إنشاء ملف Excel مع تنسيق عربي
export function exportFormattedExcel(
  data: any[],
  columns: { header: string; field: string; type?: 'text' | 'number' | 'currency' | 'date' }[],
  filename: string,
  currency: CurrencyCode = 'YER'
): void {
  // تنسيق البيانات حسب النوع
  const formattedData = data.map(row => {
    const newRow: any = {};
    columns.forEach(col => {
      let value = row[col.field];
      
      switch (col.type) {
        case 'currency':
          value = formatCurrency(Number(value), currency);
          break;
        case 'date':
          value = formatDate(value);
          break;
        case 'number':
          value = formatNumber(Number(value));
          break;
        default:
          value = value || '';
      }
      
      newRow[col.header] = value;
    });
    return newRow;
  });

  // استخدام exportToExcel من exportImport.ts
  // XLSX.utils.json_to_sheet ثم XLSX.writeFile
}

// حساب المجموع
export function sumByCurrency(
  items: { amount: number; currency: CurrencyCode }[]
): Record<CurrencyCode, number> {
  return items.reduce((acc, item) => {
    const currency = item.currency;
    acc[currency] = (acc[currency] || 0) + Number(item.amount);
    return acc;
  }, {} as Record<CurrencyCode, number>);
}

// تحويل العملات
export function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode
): number {
  // أسعار التحويل الثابتة (يمكن استبدالها بـ API)
  const rates: Record<CurrencyCode, Record<CurrencyCode, number>> = {
    YER: { YER: 1, USD: 0.0038, SAR: 0.014, AED: 0.014, EUR: 0.0035 },
    USD: { YER: 263, SAR: 3.75, AED: 3.67, EUR: 0.92, USD: 1 },
    SAR: { YER: 71, USD: 0.27, SAR: 1, AED: 0.98, EUR: 0.25 },
    AED: { YER: 72, USD: 0.27, SAR: 1.02, AED: 1, EUR: 0.25 },
    EUR: { YER: 287, USD: 1.09, SAR: 3.98, AED: 3.94, EUR: 1 },
  };

  return amount * (rates[from][to] || 1);
}

// تنسيق حجم الملفات
export function formatFileSize(bytes: number): string {
  const units = ['بايت', 'كيلوبايت', 'ميغابايت', 'غيغابايت'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}
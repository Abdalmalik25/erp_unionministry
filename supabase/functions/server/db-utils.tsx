/**
 * Database Utilities - أدوات قاعدة البيانات المحسّنة
 * تتبع أفضل الممارسات والمعايير
 */

import * as kv from "./kv_store.tsx";
import type { AuditLog, User } from "./database-schema.tsx";

// ============================================
// Audit Logging - تسجيل التدقيق
// ============================================
export async function logAudit(params: {
  userId: string;
  userEmail: string;
  userName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'EXPORT' | 'LOGIN' | 'LOGOUT';
  table: string;
  recordId?: string;
  oldData?: any;
  newData?: any;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
}): Promise<void> {
  try {
    const auditLog: AuditLog = {
      id: crypto.randomUUID(),
      userId: params.userId,
      userEmail: params.userEmail,
      userName: params.userName,
      action: params.action,
      table: params.table,
      recordId: params.recordId,
      oldData: params.oldData,
      newData: params.newData,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      deviceFingerprint: params.deviceFingerprint,
      timestamp: new Date().toISOString(),
      metadata: {},
    };

    // حساب التغييرات
    if (params.oldData && params.newData) {
      const changes: Record<string, { old: any; new: any }> = {};
      Object.keys(params.newData).forEach((key) => {
        if (params.oldData[key] !== params.newData[key]) {
          changes[key] = {
            old: params.oldData[key],
            new: params.newData[key],
          };
        }
      });
      auditLog.changes = changes;
    }

    await kv.set(`audit:${auditLog.id}`, auditLog);
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
}

// ============================================
// Data Validation - التحقق من البيانات
// ============================================
export function validateRequired(data: any, fields: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  fields.forEach((field) => {
    if (!data[field]) {
      errors.push(`الحقل "${field}" مطلوب`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateYemeniNationalId(id: string): boolean {
  // الرقم الوطني اليمني: 11 رقم
  if (!/^[0-9]{11}$/.test(id)) {
    return false;
  }

  // التحقق من صحة الرقم
  const firstDigit = parseInt(id[0]);
  if (firstDigit !== 0 && firstDigit !== 1) {
    return false;
  }

  return true;
}

export function validateYemeniPhoneNumber(phone: string): boolean {
  // أرقام الهواتف اليمنية
  const phoneRegex = /^(967|\+967|00967)?(7[0-9]{8}|[1-7][0-9]{6})$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
}

// ============================================
// Data Sanitization - تنظيف البيانات
// ============================================
export function sanitizeString(str: string): string {
  if (!str) return '';

  return str
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // إزالة السكريبتات
    .replace(/[<>]/g, ''); // إزالة HTML tags
}

export function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const sanitized: any = {};

  Object.keys(obj).forEach((key) => {
    const value = obj[key];

    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  });

  return sanitized;
}

// ============================================
// Pagination - الترقيم
// ============================================
export function paginate<T>(
  items: T[],
  page: number = 1,
  pageSize: number = 10
): {
  data: T[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
} {
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const currentPage = Math.max(1, Math.min(page, totalPages));

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const data = items.slice(startIndex, endIndex);

  return {
    data,
    pagination: {
      currentPage,
      pageSize,
      totalItems,
      totalPages,
      hasNext: currentPage < totalPages,
      hasPrevious: currentPage > 1,
    },
  };
}

// ============================================
// Sorting - الترتيب
// ============================================
export function sortData<T>(
  items: T[],
  sortBy: keyof T,
  order: 'asc' | 'desc' = 'asc'
): T[] {
  return [...items].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];

    if (aValue === bValue) return 0;

    let comparison = 0;

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      comparison = aValue.localeCompare(bValue, 'ar');
    } else {
      comparison = aValue < bValue ? -1 : 1;
    }

    return order === 'asc' ? comparison : -comparison;
  });
}

// ============================================
// Filtering - التصفية
// ============================================
export function filterData<T>(
  items: T[],
  filters: Partial<Record<keyof T, any>>
): T[] {
  return items.filter((item) => {
    return Object.entries(filters).every(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return true;
      }

      const itemValue = item[key as keyof T];

      if (typeof itemValue === 'string' && typeof value === 'string') {
        return itemValue.includes(value);
      }

      return itemValue === value;
    });
  });
}

// ============================================
// Search - البحث
// ============================================
export function searchData<T>(
  items: T[],
  searchTerm: string,
  searchFields: (keyof T)[]
): T[] {
  if (!searchTerm) return items;

  const lowerSearchTerm = searchTerm.toLowerCase();

  return items.filter((item) => {
    return searchFields.some((field) => {
      const value = item[field];

      if (typeof value === 'string') {
        return value.toLowerCase().includes(lowerSearchTerm);
      }

      return false;
    });
  });
}

// ============================================
// UUID Generation - توليد معرّف فريد
// ============================================
export function generateUUID(): string {
  return crypto.randomUUID();
}

// ============================================
// Date Utilities - أدوات التاريخ
// ============================================
export function formatDate(date: string | Date, format: 'full' | 'short' = 'full'): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (format === 'short') {
    return d.toLocaleDateString('ar-YE');
  }

  return d.toLocaleString('ar-YE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isDateInRange(date: string, startDate: string, endDate: string): boolean {
  const d = new Date(date);
  const start = new Date(startDate);
  const end = new Date(endDate);

  return d >= start && d <= end;
}

// ============================================
// Error Handling - معالجة الأخطاء
// ============================================
export function createErrorResponse(message: string, code?: string, details?: any) {
  return {
    error: {
      message,
      code: code || 'UNKNOWN_ERROR',
      details,
      timestamp: new Date().toISOString(),
    },
  };
}

export function createSuccessResponse(data: any, message?: string) {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
}

// ============================================
// Rate Limiting - تحديد معدل الطلبات
// ============================================
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetAt) {
    const resetAt = now + windowMs;
    rateLimitStore.set(identifier, { count: 1, resetAt });

    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt,
    };
  }

  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetAt,
    };
  }

  record.count++;

  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetAt: record.resetAt,
  };
}

// ============================================
// Data Versioning - إدارة الإصدارات
// ============================================
export function incrementVersion(currentVersion: number = 0): number {
  return currentVersion + 1;
}

export async function saveVersionHistory(
  table: string,
  recordId: string,
  data: any,
  userId: string
): Promise<void> {
  const versionId = generateUUID();
  const version = {
    id: versionId,
    table,
    recordId,
    data,
    createdBy: userId,
    createdAt: new Date().toISOString(),
  };

  await kv.set(`version:${table}:${recordId}:${versionId}`, version);
}

/**
 * Database Schema Design - قاعدة البيانات المحسّنة
 * تصميم يتبع أفضل الممارسات والمعايير الدولية
 */

// ============================================
// 1. جدول المستخدمين (Users)
// ============================================
export interface User {
  id: string; // UUID
  email: string;
  name: string;
  role: string; // وكيل الوزارة | مدير إدارة | موظف | رئيس نقابة
  userType: 'ministry' | 'organization';
  organizationId?: string;
  phoneNumber?: string;
  nationalId?: string;
  isActive: boolean;
  lastLogin?: string;
  deviceFingerprint?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// ============================================
// 2. جدول النقابات (Unions)
// ============================================
export interface Union {
  id: string; // UUID
  unionNumber: string; // YE-2024-XXX (unique)
  nameAr: string;
  nameEn: string;
  type: 'عمالية' | 'مهنية' | 'أصحاب أعمال';
  structure: 'نقابة' | 'اتحاد' | 'جمعية';
  establishDate: string;
  province: string;
  district?: string;
  status: 'نشط' | 'موقف' | 'محذوف';

  // معلومات الاتصال
  phone?: string;
  email?: string;
  address?: string;
  website?: string;

  // معلومات إضافية
  description?: string;
  objectives?: string;
  totalMembers?: number;
  licenseNumber?: string;
  licenseDate?: string;

  // تدقيق
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  deletedAt?: string;
  deletedBy?: string;

  // البيانات الوصفية
  metadata?: Record<string, any>;
  version: number;
}

// ============================================
// 3. جدول الأعضاء (Members)
// ============================================
export interface Member {
  id: string; // UUID
  nationalId: string; // unique
  fullName: string;
  gender: 'ذكر' | 'أنثى';
  birthDate?: string;
  unionId: string; // FK to Unions
  unionNumber: string;
  profession: string;
  status: 'نشط' | 'موقف' | 'مفصول' | 'متوفى';

  // معلومات الاتصال
  phone?: string;
  email?: string;
  address?: string;

  // معلومات العضوية
  joinDate: string;
  membershipNumber?: string;
  membershipType?: 'عادي' | 'مؤسس' | 'فخري';

  // تدقيق
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;

  metadata?: Record<string, any>;
  version: number;
}

// ============================================
// 4. جدول الأنشطة (Activities)
// ============================================
export interface Activity {
  id: string;
  unionId: string;
  title: string;
  type: 'ندوة' | 'مؤتمر' | 'ورشة عمل' | 'دورة تدريبية' | 'نشاط اجتماعي';
  description?: string;
  startDate: string;
  endDate: string;
  location?: string;
  beneficiaries?: number;
  budget?: number;
  status: 'مخطط' | 'جاري' | 'منتهي' | 'ملغي';

  createdAt: string;
  updatedAt: string;
  createdBy: string;
  version: number;
}

// ============================================
// 5. جدول الوثائق (Documents)
// ============================================
export interface Document {
  id: string;
  unionId: string;
  title: string;
  type: 'لائحة داخلية' | 'قرار' | 'تقرير' | 'محضر اجتماع' | 'مراسلة';
  fileUrl?: string;
  description?: string;
  status: 'مسودة' | 'قيد المراجعة' | 'معتمدة' | 'مرفوضة';

  // سير العمل
  submittedBy?: string;
  submittedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;

  createdAt: string;
  updatedAt: string;
  version: number;
}

// ============================================
// 6. جدول طلبات الخدمات (Service Requests)
// ============================================
export interface ServiceRequest {
  id: string;
  unionId: string;
  serviceType: string;
  requestDate: string;
  status: 'جديد' | 'قيد المعالجة' | 'مكتمل' | 'مرفوض' | 'معلق';
  priority: 'عادي' | 'عاجل' | 'طارئ';

  // التفاصيل
  description?: string;
  attachments?: string[];

  // المعالجة
  assignedTo?: string;
  assignedAt?: string;
  completedAt?: string;
  completionNotes?: string;

  createdAt: string;
  updatedAt: string;
  createdBy: string;
  version: number;
}

// ============================================
// 7. جدول المخالفات (Violations)
// ============================================
export interface Violation {
  id: string;
  unionId: string;
  violationType: string;
  description: string;
  severity: 'بسيطة' | 'متوسطة' | 'خطيرة';
  date: string;
  status: 'نشط' | 'تم المعالجة' | 'ملغي';

  penalty?: string;
  resolutionDate?: string;
  resolutionNotes?: string;

  createdAt: string;
  updatedAt: string;
  createdBy: string;
  version: number;
}

// ============================================
// 8. جدول سجل التدقيق (Audit Log)
// ============================================
export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'EXPORT' | 'LOGIN' | 'LOGOUT';
  table: string;
  recordId?: string;

  // التفاصيل
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  changes?: Record<string, { old: any; new: any }>;

  // البيئة
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;

  timestamp: string;
  metadata?: Record<string, any>;
}

// ============================================
// 9. جدول الجلسات (Sessions)
// ============================================
export interface Session {
  id: string;
  userId: string;
  token: string;
  deviceFingerprint: string;
  ipAddress?: string;
  userAgent?: string;

  isActive: boolean;
  lastActivity: string;

  createdAt: string;
  expiresAt: string;
}

// ============================================
// 10. جدول الإعدادات (Settings)
// ============================================
export interface SystemSettings {
  id: string;
  key: string; // unique
  value: any;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  category: string;
  description?: string;

  isPublic: boolean; // يمكن للمستخدمين العاديين الوصول إليه

  updatedAt: string;
  updatedBy: string;
}

// ============================================
// 11. جدول الإشعارات (Notifications)
// ============================================
export interface Notification {
  id: string;
  userId: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  link?: string;

  isRead: boolean;
  readAt?: string;

  createdAt: string;
  expiresAt?: string;
}

// ============================================
// 12. جدول النسخ الاحتياطية (Backups)
// ============================================
export interface Backup {
  id: string;
  type: 'full' | 'incremental';
  tables: string[];
  fileUrl?: string;
  size: number; // bytes

  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  errorMessage?: string;

  createdAt: string;
  createdBy: string;
  completedAt?: string;
}

// ============================================
// Database Indexes - الفهارس
// ============================================
export const DatabaseIndexes = {
  users: ['email', 'nationalId', 'userType', 'isActive'],
  unions: ['unionNumber', 'type', 'province', 'status'],
  members: ['nationalId', 'unionId', 'status'],
  activities: ['unionId', 'startDate', 'status'],
  documents: ['unionId', 'status', 'type'],
  serviceRequests: ['unionId', 'status', 'assignedTo'],
  violations: ['unionId', 'status', 'severity'],
  auditLog: ['userId', 'action', 'table', 'timestamp'],
  sessions: ['userId', 'token', 'isActive'],
  notifications: ['userId', 'isRead', 'createdAt'],
};

// ============================================
// Database Constraints - القيود
// ============================================
export const DatabaseConstraints = {
  // Unique constraints
  unique: {
    users: ['email', 'nationalId'],
    unions: ['unionNumber'],
    members: ['nationalId'],
    sessions: ['token'],
    settings: ['key'],
  },

  // Foreign keys
  foreignKeys: {
    members: [{ field: 'unionId', references: 'unions.id' }],
    activities: [{ field: 'unionId', references: 'unions.id' }],
    documents: [{ field: 'unionId', references: 'unions.id' }],
    serviceRequests: [{ field: 'unionId', references: 'unions.id' }],
    violations: [{ field: 'unionId', references: 'unions.id' }],
    sessions: [{ field: 'userId', references: 'users.id' }],
    notifications: [{ field: 'userId', references: 'users.id' }],
  },

  // Not null constraints
  notNull: {
    users: ['email', 'name', 'role', 'userType', 'isActive', 'createdAt'],
    unions: ['unionNumber', 'nameAr', 'type', 'structure', 'status', 'createdAt', 'createdBy'],
    members: ['nationalId', 'fullName', 'gender', 'unionId', 'status', 'createdAt'],
  },
};

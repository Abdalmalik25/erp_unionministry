// نظام تحقق شامل من البيانات

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  min?: number;
  max?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  custom?: (value: any) => string | null;
}

export interface ValidationSchema {
  [field: string]: ValidationRule;
}

export interface ValidationErrors {
  [field: string]: string;
}

// التحقق من البيانات
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validate(data: Record<string, any>, schema: ValidationSchema): ValidationErrors {
  const errors: ValidationErrors = {};

  Object.keys(schema).forEach((field) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (data as any)[field];
    const rules = schema[field];

    // Required
    if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
      errors[field] = 'هذا الحقل مطلوب';
      return;
    }

    // Skip other validations if value is empty and not required
    if (!value) return;

    // Min Length
    if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
      errors[field] = `الحد الأدنى ${rules.minLength} أحرف`;
      return;
    }

    // Max Length
    if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
      errors[field] = `الحد الأقصى ${rules.maxLength} حرف`;
      return;
    }

    // Pattern
    if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
      errors[field] = 'صيغة غير صحيحة';
      return;
    }

    // Min Value
    if (rules.min !== undefined && Number(value) < rules.min) {
      errors[field] = `القيمة يجب أن تكون ${rules.min} على الأقل`;
      return;
    }

    // Max Value
    if (rules.max !== undefined && Number(value) > rules.max) {
      errors[field] = `القيمة يجب أن تكون ${rules.max} على الأكثر`;
      return;
    }

    // Custom Validation
    if (rules.custom) {
      const error = rules.custom(value);
      if (error) {
        errors[field] = error;
        return;
      }
    }
  });

  return errors;
}

// Validation Schemas للكيانات المختلفة

export const unionValidationSchema: ValidationSchema = {
  unionNumber: {
    required: true,
    pattern: /^YE-\d{4}-\d{3}$/,
    custom: (value) => {
      if (!value.startsWith('YE-')) return 'رقم المنظمة يجب أن يبدأ بـ YE-';
      return null;
    },
  },
  nameAr: {
    required: true,
    minLength: 3,
    maxLength: 200,
  },
  nameEn: {
    required: true,
    minLength: 3,
    maxLength: 200,
    pattern: /^[a-zA-Z\s]+$/,
  },
  type: {
    required: true,
  },
  structure: {
    required: true,
  },
  establishDate: {
    required: true,
    custom: (value) => {
      const date = new Date(value);
      const now = new Date();
      if (date > now) return 'تاريخ التأسيس لا يمكن أن يكون في المستقبل';
      if (date.getFullYear() < 1900) return 'تاريخ غير صحيح';
      return null;
    },
  },
  province: {
    required: true,
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  phone: {
    pattern: /^[0-9]{9}$/,
  },
};

export const memberValidationSchema: ValidationSchema = {
  nationalId: {
    required: true,
    pattern: /^[0-9]{11}$/,
  },
  fullName: {
    required: true,
    minLength: 5,
    maxLength: 100,
  },
  gender: {
    required: true,
  },
  birthDate: {
    required: true,
    custom: (value) => {
      const date = new Date(value);
      const now = new Date();
      const age = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365);
      if (date > now) return 'تاريخ الميلاد لا يمكن أن يكون في المستقبل';
      if (age < 18) return 'يجب أن يكون العمر 18 سنة على الأقل';
      if (age > 100) return 'تاريخ ميلاد غير صحيح';
      return null;
    },
  },
  unionNumber: {
    required: true,
  },
  profession: {
    required: true,
    minLength: 3,
    maxLength: 100,
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  phone: {
    pattern: /^[0-9]{9}$/,
  },
};

export const activityValidationSchema: ValidationSchema = {
  name: {
    required: true,
    minLength: 5,
    maxLength: 200,
  },
  unionNumber: {
    required: true,
  },
  date: {
    required: true,
  },
  location: {
    required: true,
    minLength: 3,
    maxLength: 200,
  },
  participants: {
    required: true,
    min: 1,
    max: 10000,
  },
  cost: {
    required: true,
    min: 0,
    max: 1000000000,
  },
};

// تنظيف البيانات قبل الإرسال
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sanitizeData(data: Record<string, any>): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sanitized: Record<string, any> = {};

  Object.keys(data).forEach((key) => {
    const value = data[key];

    if (value === null || value === undefined) return;

    if (typeof value === 'string') {
      sanitized[key] = value.trim();
    } else {
      sanitized[key] = value;
    }
  });

  return sanitized;
}

// التحقق من الرقم الوطني اليمني
export function validateYemeniNationalId(id: string): boolean {
  if (!/^[0-9]{11}$/.test(id)) return false;

  // التحقق من رقم المحافظة (أول رقمين)
  const provinceCode = parseInt(id.substring(0, 2));
  if (provinceCode < 1 || provinceCode > 22) return false;

  return true;
}

// التحقق من رقم الهاتف اليمني
export function validateYemeniPhone(phone: string): boolean {
  // أرقام الهواتف اليمنية تبدأ بـ 7 وتتكون من 9 أرقام
  return /^7[0-9]{8}$/.test(phone);
}

// التحقق من قوة كلمة المرور
export function validatePasswordStrength(password: string): {
  isStrong: boolean;
  message: string;
} {
  if (password.length < 8) {
    return { isStrong: false, message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' };
  }

  if (!/[a-z]/.test(password)) {
    return { isStrong: false, message: 'يجب أن تحتوي على حرف صغير واحد على الأقل' };
  }

  if (!/[A-Z]/.test(password)) {
    return { isStrong: false, message: 'يجب أن تحتوي على حرف كبير واحد على الأقل' };
  }

  if (!/[0-9]/.test(password)) {
    return { isStrong: false, message: 'يجب أن تحتوي على رقم واحد على الأقل' };
  }

  return { isStrong: true, message: 'كلمة مرور قوية' };
}

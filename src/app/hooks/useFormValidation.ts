/**
 * useFormValidation — نظام التحقق الموحد للنماذج
 * Real-time validation · Arabic error messages · Sanitization
 */

import { useState, useCallback, useRef } from 'react';
import { sanitizeObject } from '../utils/security';

// ============================================================
// الأنواع
// ============================================================

type FieldRule = {
  required?: boolean | string;
  minLength?: number | { value: number; message: string };
  maxLength?: number | { value: number; message: string };
  pattern?: RegExp | { value: RegExp; message: string };
  min?: number | { value: number; message: string };
  max?: number | { value: number; message: string };
  validate?: (value: any, formValues: Record<string, any>) => string | true;
};

type Schema<T extends Record<string, any>> = {
  [K in keyof T]?: FieldRule;
};

type Errors<T> = Partial<Record<keyof T, string>>;
type Touched<T> = Partial<Record<keyof T, boolean>>;

// ============================================================
// دالة التحقق من حقل واحد
// ============================================================

function validateField(value: any, rule: FieldRule, allValues: Record<string, any>): string {
  if (rule.required) {
    const empty = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
    if (empty) {
      return typeof rule.required === 'string' ? rule.required : 'هذا الحقل مطلوب';
    }
  }

  if (value === '' || value == null) return '';

  const strVal = String(value);

  if (rule.minLength !== undefined) {
    const { value: min, message } = typeof rule.minLength === 'object'
      ? rule.minLength
      : { value: rule.minLength, message: `الحد الأدنى ${rule.minLength} أحرف` };
    if (strVal.length < min) return message;
  }

  if (rule.maxLength !== undefined) {
    const { value: max, message } = typeof rule.maxLength === 'object'
      ? rule.maxLength
      : { value: rule.maxLength, message: `الحد الأقصى ${rule.maxLength} حرفاً` };
    if (strVal.length > max) return message;
  }

  if (rule.pattern !== undefined) {
    const { value: pattern, message } = rule.pattern instanceof RegExp
      ? { value: rule.pattern, message: 'صيغة غير صالحة' }
      : rule.pattern;
    if (!pattern.test(strVal)) return message;
  }

  if (rule.min !== undefined) {
    const { value: min, message } = typeof rule.min === 'object'
      ? rule.min
      : { value: rule.min, message: `القيمة الدنيا ${rule.min}` };
    if (Number(value) < min) return message;
  }

  if (rule.max !== undefined) {
    const { value: max, message } = typeof rule.max === 'object'
      ? rule.max
      : { value: rule.max, message: `القيمة القصوى ${rule.max}` };
    if (Number(value) > max) return message;
  }

  if (rule.validate) {
    const result = rule.validate(value, allValues);
    if (result !== true) return result;
  }

  return '';
}

// ============================================================
// الـ Hook
// ============================================================

export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  schema: Schema<T> = {}
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Errors<T>>({});
  const [touched, setTouched] = useState<Touched<T>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitCountRef = useRef(0);

  // تحقق من حقل واحد
  const validateSingleField = useCallback((name: keyof T, value: any): string => {
    const rule = schema[name];
    if (!rule) return '';
    return validateField(value, rule, values);
  }, [schema, values]);

  // تحديث قيمة حقل
  const setValue = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateSingleField(name, value);
    setErrors(prev => ({ ...prev, [name]: error || undefined }));
  }, [validateSingleField]);

  // معالج التغيير المباشر
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setValue(name as keyof T, finalValue);
  }, [setValue]);

  // معالج الخروج من الحقل
  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const name = e.target.name as keyof T;
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateSingleField(name, values[name]);
    setErrors(prev => ({ ...prev, [name]: error || undefined }));
  }, [validateSingleField, values]);

  // تحقق من جميع الحقول
  const validateAll = useCallback((): boolean => {
    const newErrors: Errors<T> = {};
    const newTouched: Touched<T> = {};
    let isValid = true;

    for (const key of Object.keys(schema) as (keyof T)[]) {
      const error = validateField(values[key], schema[key]!, values);
      newTouched[key] = true;
      if (error) {
        newErrors[key] = error;
        isValid = false;
      }
    }

    setErrors(newErrors);
    setTouched(newTouched);
    return isValid;
  }, [schema, values]);

  // إرسال النموذج
  const handleSubmit = useCallback((
    onValid: (data: T) => void | Promise<void>,
    onInvalid?: (errors: Errors<T>) => void
  ) => async (e?: React.FormEvent) => {
    e?.preventDefault();
    submitCountRef.current++;

    const isValid = validateAll();
    if (!isValid) {
      onInvalid?.(errors);
      // التمرير إلى أول خطأ
      const firstErrorEl = document.querySelector('[data-field-error]');
      firstErrorEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);
    try {
      const sanitized = sanitizeObject(values);
      await onValid(sanitized);
    } finally {
      setIsSubmitting(false);
    }
  }, [validateAll, errors, values]);

  // إعادة ضبط النموذج
  const reset = useCallback((newValues?: Partial<T>) => {
    setValues(newValues ? { ...initialValues, ...newValues } : initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  // الحصول على خصائص حقل (للاستخدام مع input spread)
  const getFieldProps = useCallback((name: keyof T) => ({
    name: name as string,
    value: values[name] ?? '',
    onChange: handleChange,
    onBlur: handleBlur,
  }), [values, handleChange, handleBlur]);

  const hasError = useCallback((name: keyof T): boolean => {
    return !!(touched[name] && errors[name]);
  }, [touched, errors]);

  const getError = useCallback((name: keyof T): string => {
    return (touched[name] && errors[name]) ? errors[name]! : '';
  }, [touched, errors]);

  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);
  const isValid = Object.keys(errors).every(k => !errors[k as keyof T]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isDirty,
    isValid,
    setValue,
    setValues,
    handleChange,
    handleBlur,
    handleSubmit,
    validateAll,
    reset,
    getFieldProps,
    hasError,
    getError,
  };
}

// ============================================================
// قواعد شائعة جاهزة
// ============================================================

export const Rules = {
  required: (msg?: string) => ({ required: msg || 'هذا الحقل مطلوب' }),

  email: {
    required: 'البريد الإلكتروني مطلوب',
    pattern: {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'بريد إلكتروني غير صالح',
    },
  },

  yemeniPhone: {
    pattern: {
      value: /^7[0-9]{8}$/,
      message: 'رقم هاتف يمني غير صالح (يبدأ بـ 7)',
    },
  },

  yemeniNationalId: {
    required: 'الرقم الوطني مطلوب',
    pattern: {
      value: /^\d{11}$/,
      message: 'الرقم الوطني يجب أن يكون 11 رقماً',
    },
  },

  password: {
    required: 'كلمة المرور مطلوبة',
    minLength: { value: 8, message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' },
  },

  positiveNumber: {
    validate: (v: any) => (!v || Number(v) >= 0) ? true : 'يجب أن تكون قيمة موجبة',
  },
} as const;

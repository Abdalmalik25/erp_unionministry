// Frontend mirror of server/lib/dynamicFieldsValidation.mjs (keep logic in sync).
// Pure, no IO. Used by DynamicFieldRenderer and forms.

export const ALLOWED_DATA_TYPES = [
  'text', 'textarea', 'integer', 'decimal', 'boolean', 'date', 'datetime',
  'time', 'select', 'multiselect', 'reference', 'currency', 'percentage',
  'email', 'phone', 'url', 'file',
] as const;

export const DATA_TYPE_LABELS: Record<string, string> = {
  text: 'نص',
  textarea: 'نص طويل',
  integer: 'رقم صحيح',
  decimal: 'رقم عشري',
  boolean: 'نعم/لا',
  date: 'تاريخ',
  datetime: 'تاريخ ووقت',
  time: 'وقت',
  select: 'قائمة منسدلة',
  multiselect: 'قائمة متعددة',
  reference: 'مرجع لكيان',
  currency: 'مبلغ مالي',
  percentage: 'نسبة مئوية',
  email: 'بريد إلكتروني',
  phone: 'رقم هاتف',
  url: 'رابط',
  file: 'ملف مرفق',
};

export const FIELD_KEY_RE = /^[a-z][a-z0-9_]*$/;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9\s\-()]{6,20}$/;
const URL_RE = /^https?:\/\/[^\s]+$/i;

function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
}

function optionValues(options: any): string[] {
  if (!Array.isArray(options)) return [];
  return options
    .map((o: any) => (o && typeof o === 'object' ? o.value : o))
    .filter((v: any) => v !== undefined && v !== null && v !== '');
}

export function validateFieldDefinition(input: any = {}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const entityType = input.entity_type ?? input.entityType;
  const fieldKey = input.field_key ?? input.fieldKey;
  const label = input.label;
  const dataType = input.data_type ?? input.dataType;
  const scope = input.scope || 'global';
  const entityId = input.entity_id ?? input.entityId;
  const options = input.options;
  const referenceEntity = input.reference_entity ?? input.referenceEntity;
  const validationRules = (input.validation_rules ?? input.validationRules) || {};

  if (entityType !== undefined) {
    if (typeof entityType !== 'string' || !entityType.trim()) errors.entity_type = 'نوع الجهة مطلوب';
  }
  if (fieldKey !== undefined) {
    if (typeof fieldKey !== 'string' || !FIELD_KEY_RE.test(fieldKey)) {
      errors.field_key = 'مفتاح الحقل يجب أن يكون بحروف صغيرة وأرقام و _ فقط';
    }
  }
  if (label !== undefined) {
    if (typeof label !== 'string' || !label.trim()) errors.label = 'اسم الحقل المعروض مطلوب';
  }
  if (dataType !== undefined) {
    if (!(ALLOWED_DATA_TYPES as readonly string[]).includes(dataType)) errors.data_type = 'نوع الحقل غير صالح';
  }
  if (dataType === 'select' || dataType === 'multiselect') {
    if (!Array.isArray(options) || options.length === 0) errors.options = 'الحقول من نوع اختيار تتطلب قائمة خيارات';
  }
  if (dataType === 'reference' && referenceEntity !== undefined) {
    if (typeof referenceEntity !== 'string' || !referenceEntity.trim()) errors.reference_entity = 'حقل المرجع يتطلب الجهة المرجعي';
  }
  if (scope === 'entity' && entityId !== undefined) {
    if (!entityId) errors.entity_id = 'تعريف على مستوى المنشأة يتطلب معرّف المنشأة';
  }
  if (validationRules && validationRules.pattern) {
    try { new RegExp(validationRules.pattern); } catch { errors.validation_rules = 'صيغة التحقق غير صالحة'; }
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateFieldValues(definitions: any[] = [], values: Record<string, any> = {}): {
  valid: boolean; errors: Record<string, string>; normalized: Record<string, any>;
} {
  const errors: Record<string, string> = {};
  const normalized: Record<string, any> = {};
  const vals = values || {};

  for (const def of definitions) {
    if (def.active === false) continue;
    const key = def.field_key ?? def.fieldKey;
    const dataType = def.data_type ?? def.dataType;
    const required = def.required === true;
    const rules = (def.validation_rules ?? def.validationRules) || {};
    const raw = vals[key];

    if (isEmpty(raw)) {
      if (required) errors[key] = 'هذا الحقل مطلوب';
      continue;
    }

    if (dataType === 'integer') {
      const n = Number(raw);
      if (!Number.isInteger(n)) errors[key] = 'يجب أن يكون عددًا صحيحًا';
      else {
        if (rules.min !== undefined && n < rules.min) errors[key] = `الحد الأدنى ${rules.min}`;
        if (rules.max !== undefined && n > rules.max) errors[key] = `الحد الأقصى ${rules.max}`;
        if (!errors[key]) normalized[key] = n;
      }
      continue;
    }
    if (dataType === 'decimal' || dataType === 'currency' || dataType === 'percentage') {
      const n = Number(raw);
      if (Number.isNaN(n)) errors[key] = 'يجب أن يكون رقمًا';
      else {
        if (rules.min !== undefined && n < rules.min) errors[key] = `الحد الأدنى ${rules.min}`;
        if (rules.max !== undefined && n > rules.max) errors[key] = `الحد الأقصى ${rules.max}`;
        if (!errors[key]) normalized[key] = n;
      }
      continue;
    }
    if (dataType === 'boolean') {
      normalized[key] = raw === true || raw === 'true' || raw === 1 || raw === '1';
      continue;
    }
    if (dataType === 'email') {
      if (!EMAIL_RE.test(String(raw))) errors[key] = 'بريد إلكتروني غير صالح';
      else normalized[key] = String(raw);
      continue;
    }
    if (dataType === 'phone') {
      if (!PHONE_RE.test(String(raw))) errors[key] = 'رقم هاتف غير صالح';
      else normalized[key] = String(raw);
      continue;
    }
    if (dataType === 'url') {
      if (!URL_RE.test(String(raw))) errors[key] = 'رابط غير صالح';
      else normalized[key] = String(raw);
      continue;
    }
    if (dataType === 'select') {
      const opts = optionValues(def.options);
      if (!opts.includes(raw)) errors[key] = 'القيمة المحددة غير متاحة';
      else normalized[key] = raw;
      continue;
    }
    if (dataType === 'multiselect') {
      const opts = optionValues(def.options);
      const arr = Array.isArray(raw) ? raw : [raw];
      if (arr.filter((v: any) => !opts.includes(v)).length) errors[key] = 'بعض القيم غير متاحة';
      else normalized[key] = arr;
      continue;
    }
    if (dataType === 'reference') {
      if (typeof raw !== 'string' || !raw.trim()) errors[key] = 'مرجع غير صالح';
      else normalized[key] = raw;
      continue;
    }
    const s = String(raw);
    if (rules.maxLength !== undefined && s.length > rules.maxLength) errors[key] = `الحد الأقصى ${rules.maxLength}`;
    else if (rules.pattern && !new RegExp(rules.pattern).test(s)) errors[key] = 'القيمة غير مطابقة';
    else normalized[key] = s;
  }

  return { valid: Object.keys(errors).length === 0, errors, normalized };
}

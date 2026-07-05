/**
 * Dynamic Entity Form Component
 * نموذج ديناميكي للكيانات المؤسسية
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Save, X, Building2, MapPin, User, FileText, Calendar, AlertCircle } from 'lucide-react';
import {
  EntityType,
  Classification,
  Sector,
  GovernanceLevel,
  GeographicScope,
  LegalForm,
  OrganizationalEntity,
  EntityTypeLabels,
  ClassificationLabels,
  SectorLabels,
} from '../../types/entity';

interface DynamicEntityFormProps {
  entityType: EntityType;
  classification: Classification;
  mode: 'create' | 'edit';
  initialData?: Partial<OrganizationalEntity>;
  onSubmit: (data: Partial<OrganizationalEntity>) => void;
  onCancel?: () => void;
}

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'date' | 'select' | 'textarea';
  required: boolean;
  visible: boolean;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  validation?: any;
}

export function DynamicEntityForm({
  entityType,
  classification,
  mode,
  initialData,
  onSubmit,
  onCancel,
}: DynamicEntityFormProps) {
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm({
    defaultValues: initialData || {},
  });

  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get dynamic fields based on entity type and classification
  useEffect(() => {
    const fields = getFormFields(entityType, classification);
    setFormFields(fields);
  }, [entityType, classification]);

  const getFormFields = (type: EntityType, classification: Classification): FormField[] => {
    // Base fields (always visible)
    const baseFields: FormField[] = [
      {
        name: 'nameAr',
        label: 'الاسم بالعربية',
        type: 'text',
        required: true,
        visible: true,
        placeholder: 'أدخل اسم الكيان',
      },
      {
        name: 'nameEn',
        label: 'الاسم بالإنجليزية',
        type: 'text',
        required: false,
        visible: true,
        placeholder: 'Enter entity name',
      },
      {
        name: 'registrationNumber',
        label: 'رقم التسجيل',
        type: 'text',
        required: true,
        visible: true,
        placeholder: 'REG-001',
      },
      {
        name: 'unifiedCode',
        label: 'الرمز الموحد',
        type: 'text',
        required: true,
        visible: true,
        placeholder: 'YE-MOL-001',
      },
    ];

    // Classification-specific fields
    const classificationFields: FormField[] = [];

    if (classification === 'labor' || classification === 'professional') {
      classificationFields.push({
        name: 'sector',
        label: 'القطاع',
        type: 'select',
        required: true,
        visible: true,
        options: Object.entries(SectorLabels).map(([value, label]) => ({
          value,
          label,
        })),
      });
    }

    // Entity type-specific fields
    const entityTypeFields: FormField[] = [];

    if (type === 'union' || type === 'federation') {
      entityTypeFields.push(
        {
          name: 'licenseNumber',
          label: 'رقم الترخيص',
          type: 'text',
          required: true,
          visible: true,
          placeholder: 'LIC-001',
        },
        {
          name: 'establishmentDate',
          label: 'تاريخ التأسيس',
          type: 'date',
          required: true,
          visible: true,
        }
      );
    }

    if (type === 'branch') {
      entityTypeFields.push({
        name: 'parentEntityId',
        label: 'الكيان الأم',
        type: 'select',
        required: true,
        visible: true,
        options: [
          { value: '1', label: 'الاتحاد العام لنقابات العمال' },
          { value: '2', label: 'نقابة عمال البناء' },
        ],
      });
    }

    // Contact fields
    const contactFields: FormField[] = [
      {
        name: 'contactInfo.phone',
        label: 'رقم الهاتف',
        type: 'tel',
        required: true,
        visible: true,
        placeholder: '+967-1-234567',
      },
      {
        name: 'contactInfo.email',
        label: 'البريد الإلكتروني',
        type: 'email',
        required: true,
        visible: true,
        placeholder: 'info@example.ye',
      },
    ];

    // Address fields
    const addressFields: FormField[] = [
      {
        name: 'address.governorate',
        label: 'المحافظة',
        type: 'select',
        required: true,
        visible: true,
        options: [
          { value: 'أمانة العاصمة', label: 'أمانة العاصمة' },
          { value: 'عدن', label: 'عدن' },
          { value: 'تعز', label: 'تعز' },
          { value: 'حضرموت', label: 'حضرموت' },
          { value: 'إب', label: 'إب' },
        ],
      },
      {
        name: 'address.city',
        label: 'المدينة',
        type: 'text',
        required: true,
        visible: true,
        placeholder: 'صنعاء',
      },
      {
        name: 'address.directorate',
        label: 'المديرية',
        type: 'text',
        required: false,
        visible: true,
        placeholder: 'التحرير',
      },
    ];

    // Leadership fields
    const leadershipFields: FormField[] = [
      {
        name: 'president.fullName',
        label: 'اسم الرئيس',
        type: 'text',
        required: true,
        visible: true,
        placeholder: 'أحمد محمد علي',
      },
      {
        name: 'president.nationalId',
        label: 'الرقم الوطني للرئيس',
        type: 'text',
        required: true,
        visible: true,
        placeholder: '01011234567',
      },
      {
        name: 'president.phone',
        label: 'هاتف الرئيس',
        type: 'tel',
        required: false,
        visible: true,
        placeholder: '+967-777-123456',
      },
    ];

    // Statistics fields
    const statisticsFields: FormField[] = [
      {
        name: 'memberCount',
        label: 'عدد الأعضاء',
        type: 'number',
        required: true,
        visible: true,
        placeholder: '1000',
      },
    ];

    if (type === 'union' || type === 'federation') {
      statisticsFields.push(
        {
          name: 'branchCount',
          label: 'عدد الفروع',
          type: 'number',
          required: false,
          visible: true,
          placeholder: '5',
        },
        {
          name: 'committeeCount',
          label: 'عدد اللجان',
          type: 'number',
          required: false,
          visible: true,
          placeholder: '3',
        }
      );
    }

    // Additional info fields
    const additionalFields: FormField[] = [
      {
        name: 'description',
        label: 'الوصف',
        type: 'textarea',
        required: false,
        visible: true,
        placeholder: 'وصف مختصر عن الكيان',
      },
      {
        name: 'mission',
        label: 'الرسالة',
        type: 'textarea',
        required: false,
        visible: type === 'union' || type === 'federation',
        placeholder: 'رسالة الكيان',
      },
      {
        name: 'vision',
        label: 'الرؤية',
        type: 'textarea',
        required: false,
        visible: type === 'union' || type === 'federation',
        placeholder: 'رؤية الكيان',
      },
    ];

    return [
      ...baseFields,
      ...classificationFields,
      ...entityTypeFields,
      ...contactFields,
      ...addressFields,
      ...leadershipFields,
      ...statisticsFields,
      ...additionalFields,
    ];
  };

  const onSubmitForm = async (data: any) => {
    setIsSubmitting(true);
    try {
      // Process nested fields
      const processedData = {
        ...data,
        entityType,
        classification,
        status: 'active',
        complianceStatus: 'compliant',
        riskLevel: 'low',
        legalForm: 'syndicate' as LegalForm,
        registrationDate: new Date(),
        nextRenewalDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        renewalStatus: 'current',
        documents: [],
        licenses: [],
        createdAt: mode === 'create' ? new Date() : initialData?.createdAt,
        createdBy: mode === 'create' ? 'current-user' : initialData?.createdBy,
        updatedAt: new Date(),
        updatedBy: 'current-user',
        version: (initialData?.version || 0) + 1,
      };

      await onSubmit(processedData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    if (!field.visible) return null;

    const error = errors[field.name as keyof typeof errors];

    return (
      <div key={field.name} className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {field.label}
          {field.required && <span className="text-red-500 mr-1">*</span>}
        </label>

        {field.type === 'select' ? (
          <select
            {...register(field.name, { required: field.required })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">اختر...</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : field.type === 'textarea' ? (
          <textarea
            {...register(field.name, { required: field.required })}
            rows={3}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        ) : (
          <input
            type={field.type}
            {...register(field.name, { required: field.required })}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        )}

        {error && (
          <div className="flex items-center gap-1 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>هذا الحقل مطلوب</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {mode === 'create' ? 'إضافة كيان جديد' : 'تعديل الكيان'}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            النوع: {EntityTypeLabels[entityType]} • التصنيف: {ClassificationLabels[classification]}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Form Sections */}
      <div className="space-y-6">
        {/* Basic Information */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-blue-600" />
            <h4 className="font-semibold text-gray-900">المعلومات الأساسية</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formFields
              .filter((f) => ['nameAr', 'nameEn', 'registrationNumber', 'unifiedCode', 'sector', 'licenseNumber', 'establishmentDate', 'parentEntityId'].includes(f.name))
              .map(renderField)}
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-blue-600" />
            <h4 className="font-semibold text-gray-900">معلومات الاتصال</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formFields
              .filter((f) => f.name.startsWith('contactInfo.') || f.name.startsWith('address.'))
              .map(renderField)}
          </div>
        </div>

        {/* Leadership */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-blue-600" />
            <h4 className="font-semibold text-gray-900">القيادة</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formFields
              .filter((f) => f.name.startsWith('president.'))
              .map(renderField)}
          </div>
        </div>

        {/* Statistics */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-blue-600" />
            <h4 className="font-semibold text-gray-900">الإحصائيات</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {formFields
              .filter((f) => ['memberCount', 'branchCount', 'committeeCount'].includes(f.name))
              .map(renderField)}
          </div>
        </div>

        {/* Additional Information */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-blue-600" />
            <h4 className="font-semibold text-gray-900">معلومات إضافية</h4>
          </div>
          <div className="space-y-4">
            {formFields
              .filter((f) => ['description', 'mission', 'vision'].includes(f.name))
              .map(renderField)}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          إلغاء
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4" />
          <span>{isSubmitting ? 'جاري الحفظ...' : mode === 'create' ? 'إنشاء' : 'حفظ التعديلات'}</span>
        </button>
      </div>
    </form>
  );
}

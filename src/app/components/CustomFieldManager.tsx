import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ALLOWED_DATA_TYPES, DATA_TYPE_LABELS } from '../utils/dynamicFieldValidation';

interface Props {
  entityType: string;
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
}

interface Def {
  id: string;
  field_key: string;
  label: string;
  data_type: string;
  required: boolean;
  options: any;
  reference_entity?: string;
  visible_in_form: boolean;
  visible_in_list: boolean;
  active: boolean;
  display_order: number;
}

export default function CustomFieldManager({ entityType, open, onClose, onChanged }: Props) {
  const [defs, setDefs] = useState<Def[]>([]);
  const [form, setForm] = useState<any>({ field_key: '', label: '', data_type: 'text', required: false, optionsText: '', reference_entity: '', visible_in_form: true, visible_in_list: false });

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/custom-field-definitions?entity_type=${encodeURIComponent(entityType)}`);
      if (r.ok) { const d = await r.json(); setDefs(d.data || []); }
    } catch { toast.error('فشل تحميل تعريفات الحقول'); }
  }, [entityType]);

  useEffect(() => { if (open) load(); }, [open, load]);

  if (!open) return null;

  const save = async () => {
    const options = ['select', 'multiselect'].includes(form.data_type)
      ? form.optionsText.split(',').map((s: string) => s.trim()).filter(Boolean).map((v: string) => ({ value: v, label: v }))
      : null;
    const payload: any = {
      entity_type: entityType,
      field_key: form.field_key.trim(),
      label: form.label.trim(),
      data_type: form.data_type,
      required: !!form.required,
      visible_in_form: !!form.visible_in_form,
      visible_in_list: !!form.visible_in_list,
      active: true,
    };
    if (options) payload.options = options;
    if (form.data_type === 'reference') payload.reference_entity = form.reference_entity.trim();

    try {
      const r = await fetch('/api/custom-field-definitions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (r.ok) { toast.success('تمت إضافة الحقل المخصص'); setForm({ field_key: '', label: '', data_type: 'text', required: false, optionsText: '', reference_entity: '', visible_in_form: true, visible_in_list: false }); load(); onChanged?.(); }
      else { const d = await r.json().catch(() => ({})); toast.error(d.error || 'فشل الحفظ'); }
    } catch { toast.error('خطأ في الاتصال'); }
  };

  const toggleActive = async (d: Def) => {
    try {
      const r = await fetch(`/api/custom-field-definitions/${d.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !d.active }),
      });
      if (r.ok) { load(); onChanged?.(); } else toast.error('فشل التحديث');
    } catch { toast.error('خطأ'); }
  };

  const remove = async (id: string) => {
    try {
      const r = await fetch(`/api/custom-field-definitions/${id}`, { method: 'DELETE' });
      if (r.ok) { load(); onChanged?.(); } else toast.error('فشل الحذف');
    } catch { toast.error('خطأ'); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl max-w-2xl w-full p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-heading">إدارة الحقول المخصصة</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <div className="bg-muted/30 rounded-lg p-4 space-y-3 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-heading">مفتاح الحقل (انجليزي)</label>
              <input className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card" value={form.field_key} onChange={e => setForm({ ...form, field_key: e.target.value })} placeholder="مثال: عدد_ساعات_التدريب" />
            </div>
            <div>
              <label className="block text-xs mb-1 text-heading">الاسم المعروض</label>
              <input className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1 text-heading">النوع</label>
              <select className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card" value={form.data_type} onChange={e => setForm({ ...form, data_type: e.target.value })}>
                {ALLOWED_DATA_TYPES.map(t => <option key={t} value={t}>{DATA_TYPE_LABELS[t] || t}</option>)}
              </select>
            </div>
            {['select', 'multiselect'].includes(form.data_type) && (
              <div>
                <label className="block text-xs mb-1 text-heading">الخيارات (مفصولة بفاصلة)</label>
                <input className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card" value={form.optionsText} onChange={e => setForm({ ...form, optionsText: e.target.value })} placeholder="أ، ب، ج" />
              </div>
            )}
            {form.data_type === 'reference' && (
              <div>
                <label className="block text-xs mb-1 text-heading">النقابة أو المنظمة المرجعي</label>
                <input className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card" value={form.reference_entity} onChange={e => setForm({ ...form, reference_entity: e.target.value })} />
              </div>
            )}
          </div>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.required} onChange={e => setForm({ ...form, required: e.target.checked })} /> مطلوب</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.visible_in_form} onChange={e => setForm({ ...form, visible_in_form: e.target.checked })} /> في النموذج</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.visible_in_list} onChange={e => setForm({ ...form, visible_in_list: e.target.checked })} /> في القائمة</label>
          </div>
          <button onClick={save} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm"><Plus className="w-4 h-4" /> إضافة حقل</button>
        </div>

        <div className="space-y-2">
          {defs.length === 0 && <div className="text-sm text-muted-foreground text-center py-4">لا توجد حقول مخصصة بعد</div>}
          {defs.map(d => (
            <div key={d.id} className="flex items-center justify-between border border-border rounded-lg px-3 py-2">
              <div>
                <div className="text-sm font-medium text-heading">{d.label} <span className="text-xs text-muted-foreground">({d.field_key})</span></div>
                <div className="text-xs text-muted-foreground">{DATA_TYPE_LABELS[d.data_type] || d.data_type}{d.required ? ' • مطلوب' : ''}</div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => toggleActive(d)} className={`text-xs px-2 py-1 rounded ${d.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{d.active ? 'مفعل' : 'معطل'}</button>
                <button onClick={() => remove(d.id)} className="p-1.5 hover:bg-destructive/10 rounded text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export interface FieldDefinition {
  id?: string;
  entity_type: string;
  field_key: string;
  label: string;
  description?: string;
  data_type: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }> | string[];
  validation_rules?: { min?: number; max?: number; maxLength?: number; pattern?: string };
  reference_entity?: string;
  visible_in_form?: boolean;
  visible_in_list?: boolean;
  active?: boolean;
  display_order?: number;
}

interface Props {
  definitions: FieldDefinition[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  errors?: Record<string, string>;
}

function optionList(options: any): Array<{ value: string; label: string }> {
  if (!Array.isArray(options)) return [];
  return options.map((o: any) => (o && typeof o === 'object' ? { value: o.value, label: o.label ?? o.value } : { value: o, label: o }));
}

export default function DynamicFieldRenderer({ definitions, values, onChange, errors = {} }: Props) {
  const visible = (definitions || []).filter(d => d.active !== false && d.visible_in_form !== false);

  if (visible.length === 0) return null;

  return (
    <div className="space-y-4">
      {visible.map(def => {
        const key = def.field_key;
        const value = values?.[key];
        const err = errors[key];
        const label = def.label || def.field_key;
        const common = 'w-full border border-border rounded-lg px-3 py-2 text-sm bg-card text-heading';
        const opts = optionList(def.options);

        return (
          <div key={key}>
            <label className="block text-sm font-medium mb-1 text-heading">
              {label}{def.required ? ' *' : ''}
            </label>
            {def.data_type === 'textarea' && (
              <textarea className={common} rows={2} value={value ?? ''} onChange={e => onChange(key, e.target.value)} />
            )}
            {def.data_type === 'text' && (
              <input className={common} value={value ?? ''} onChange={e => onChange(key, e.target.value)} />
            )}
            {(def.data_type === 'email' || def.data_type === 'phone' || def.data_type === 'url') && (
              <input className={common} value={value ?? ''} onChange={e => onChange(key, e.target.value)} />
            )}
            {(def.data_type === 'integer' || def.data_type === 'decimal' || def.data_type === 'currency' || def.data_type === 'percentage') && (
              <input type="number" className={common} value={value ?? ''} onChange={e => onChange(key, e.target.value === '' ? '' : Number(e.target.value))} />
            )}
            {def.data_type === 'boolean' && (
              <input type="checkbox" checked={!!value} onChange={e => onChange(key, e.target.checked)} />
            )}
            {def.data_type === 'date' && (
              <input type="date" className={common} value={value ?? ''} onChange={e => onChange(key, e.target.value)} />
            )}
            {def.data_type === 'datetime' && (
              <input type="datetime-local" className={common} value={value ?? ''} onChange={e => onChange(key, e.target.value)} />
            )}
            {def.data_type === 'time' && (
              <input type="time" className={common} value={value ?? ''} onChange={e => onChange(key, e.target.value)} />
            )}
            {def.data_type === 'select' && (
              <select className={common} value={value ?? ''} onChange={e => onChange(key, e.target.value)}>
                <option value="">—</option>
                {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            )}
            {def.data_type === 'multiselect' && (
              <div className="space-y-1">
                {opts.map(o => (
                  <label key={o.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Array.isArray(value) ? value.includes(o.value) : false}
                      onChange={e => {
                        const arr = Array.isArray(value) ? [...value] : [];
                        if (e.target.checked) arr.push(o.value);
                        else { const i = arr.indexOf(o.value); if (i >= 0) arr.splice(i, 1); }
                        onChange(key, arr);
                      }}
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            )}
            {def.data_type === 'reference' && (
              <input className={common} placeholder={def.reference_entity ? `معرف ${def.reference_entity}` : 'معرف المرجع'} value={value ?? ''} onChange={e => onChange(key, e.target.value)} />
            )}
            {def.data_type === 'file' && (
              <input className={common} placeholder="مسار/رابط الملف" value={value ?? ''} onChange={e => onChange(key, e.target.value)} />
            )}
            {err && <div className="text-xs text-red-600 mt-1">{err}</div>}
          </div>
        );
      })}
    </div>
  );
}

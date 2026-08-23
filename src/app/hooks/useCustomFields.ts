import { useState, useEffect, useCallback } from 'react';
import { validateFieldValues } from '../utils/dynamicFieldValidation';

/**
 * Reusable loader/validator for the Hybrid Typed Extensibility registry.
 * Any work screen can call this with its entity_type to render and persist
 * custom fields consistently (no duplicated logic, no EAV in the UI).
 */
export function useCustomFields(entityType: string) {
  const [definitions, setDefinitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/custom-field-definitions?entity_type=${encodeURIComponent(entityType)}&active=true`);
      if (r.ok) {
        const d = await r.json();
        setDefinitions(d.data || []);
      }
    } catch {
      /* non-fatal: custom fields are optional */
    }
    setLoading(false);
  }, [entityType]);

  useEffect(() => { load(); }, [load]);

  const validate = useCallback(
    (values: Record<string, any>) => validateFieldValues(definitions, values),
    [definitions],
  );

  return { definitions, loading, load, validate };
}

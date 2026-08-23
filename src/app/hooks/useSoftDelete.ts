import { useState, useCallback } from 'react';

interface UseSoftDeleteOptions {
  apiEndpoint: string;
  onSuccess?: () => void;
}

export function useSoftDelete({ apiEndpoint, onSuccess }: UseSoftDeleteOptions) {
  const [showDeleted, setShowDeleted] = useState(false);

  const handleDelete = useCallback(async (id: string, confirmFn?: () => Promise<boolean>) => {
    if (confirmFn) {
      const confirmed = await confirmFn();
      if (!confirmed) return;
    }
    try {
      const res = await fetch(`${apiEndpoint}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      onSuccess?.();
      return true;
    } catch (err) {
      console.error('Delete error:', err);
      return false;
    }
  }, [apiEndpoint, onSuccess]);

  const handleRestore = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${apiEndpoint}/${id}/restore`, { method: 'PUT' });
      if (!res.ok) throw new Error('Failed to restore');
      onSuccess?.();
      return true;
    } catch (err) {
      console.error('Restore error:', err);
      return false;
    }
  }, [apiEndpoint, onSuccess]);

  const buildUrl = useCallback((baseUrl: string) => {
    const url = new URL(baseUrl, window.location.origin);
    if (showDeleted) url.searchParams.set('include_deleted', 'true');
    return url.pathname + url.search;
  }, [showDeleted]);

  return { showDeleted, setShowDeleted, handleDelete, handleRestore, buildUrl };
}

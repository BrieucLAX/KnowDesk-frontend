import { useCallback, useEffect, useState } from 'react';
import { apiClient, ApiError } from '../../../shared/lib/apiClient';
import { bulkDeleteInChunks }   from '../../../shared/lib/bulkDelete';
import { useToast }     from '../../../shared/lib/useToast';
import { faqsApi }      from '../api/faqsApi';
import type { FaqListItem, FaqListFilters } from '../types';

export function useFaqs(initialFilters: FaqListFilters = {}) {
  const [items,   setItems]   = useState<FaqListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FaqListFilters>(initialFilters);
  const toast = useToast();

  const reload = useCallback(async (next?: FaqListFilters) => {
    const f = next ?? filters;
    setLoading(true);
    try {
      const data = await faqsApi.listAll(f);
      setItems(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Impossible de charger les FAQs.');
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => {
    let alive = true;
    faqsApi.listAll(filters)
      .then(data => { if (alive) setItems(data); })
      .catch(err => {
        if (alive) toast.error(err instanceof ApiError ? err.message : 'Impossible de charger les FAQs.');
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [filters, toast]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    try {
      await faqsApi.delete(id);
      setItems(prev => prev.filter(f => f.id !== id));
      toast.success('FAQ supprimée.');
      return true;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Suppression impossible.');
      return false;
    }
  }, [toast]);

  // Bulk delete : partitionne deleted/blocked côté backend, on retire les
  // supprimés du state local et on toast un récap. Chunké en lots de 100
  // pour gérer les gros nettoyages sans saturer le backend.
  const bulkRemove = useCallback(async (ids: string[]): Promise<{ deleted: number; blocked: number }> => {
    try {
      const res = await bulkDeleteInChunks('/faqs/bulk-delete', ids);
      const deletedSet = new Set(res.deleted);
      setItems(prev => prev.filter(f => !deletedSet.has(f.id)));
      if (res.deleted.length > 0 && res.blocked.length === 0) {
        toast.success(`${res.deleted.length} FAQ${res.deleted.length > 1 ? 's' : ''} supprimée${res.deleted.length > 1 ? 's' : ''}.`);
      } else if (res.deleted.length > 0 && res.blocked.length > 0) {
        toast.success(`${res.deleted.length} supprimée${res.deleted.length > 1 ? 's' : ''}. ${res.blocked.length} bloquée${res.blocked.length > 1 ? 's' : ''} (utilisée${res.blocked.length > 1 ? 's' : ''} dans des parcours de formation).`);
      } else {
        toast.error(`Aucune FAQ supprimée : ${res.blocked.length} bloquée${res.blocked.length > 1 ? 's' : ''} par des parcours de formation.`);
      }
      // Refetch : la liste affichée doit refléter ce que le back a vraiment
      // supprimé (les FAQs bloquées par Learning restent).
      if (res.deleted.length > 0) {
        try { await reload(); } catch { /* déjà toasté côté reload */ }
      }
      return { deleted: res.deleted.length, blocked: res.blocked.length };
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Suppression en masse impossible.');
      return { deleted: 0, blocked: 0 };
    }
  }, [toast, reload]);

  return { items, loading, filters, setFilters, reload, remove, bulkRemove };
}

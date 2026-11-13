import { useCallback, useEffect, useState } from 'react';
import { apiClient, ApiError } from '../../../shared/lib/apiClient';
import { useToast } from '../../../shared/lib/useToast';
import type { Synonym } from '../types';

export function useSynonyms() {
  const [items, setItems]     = useState<Synonym[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    let alive = true;
    apiClient.get<Synonym[]>('/synonyms')
      .then(data => { if (alive) setItems(data); })
      .catch(err => { if (alive) setError(err instanceof ApiError ? err.message : 'Les synonymes n\'ont pas pu être chargés. Rechargez la page.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const create = useCallback(async (term: string, synonyms: string[]): Promise<boolean> => {
    try {
      const created = await apiClient.post<Synonym>('/synonyms', { term, synonyms });
      setItems(prev => [created, ...prev].sort((a, b) => a.term.localeCompare(b.term)));
      toast.success('Synonyme créé.');
      return true;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Le synonyme n\'a pas été créé. Réessayez.');
      return false;
    }
  }, [toast]);

  const update = useCallback(async (id: string, synonyms: string[]): Promise<boolean> => {
    try {
      const updated = await apiClient.patch<Synonym>(`/synonyms/${id}`, { synonyms });
      setItems(prev => prev.map(s => (s.id === id ? updated : s)));
      toast.success('Synonyme mis à jour.');
      return true;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Le synonyme n\'a pas été mis à jour. Réessayez.');
      return false;
    }
  }, [toast]);

  const remove = useCallback(async (id: string): Promise<void> => {
    const previous = items;
    setItems(items.filter(s => s.id !== id));
    try {
      await apiClient.delete(`/synonyms/${id}`);
      toast.success('Synonyme supprimé.');
    } catch (err) {
      setItems(previous);
      toast.error(err instanceof ApiError ? err.message : 'Le synonyme n\'a pas été supprimé. Réessayez.');
    }
  }, [items, toast]);

  return { items, loading, error, create, update, remove };
}

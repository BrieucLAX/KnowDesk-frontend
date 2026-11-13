import { useCallback, useEffect, useState } from 'react';
import { ApiError }     from '../../../shared/lib/apiClient';
import { useToast }     from '../../../shared/lib/useToast';
import { tagsApi, type OrgTag } from '../../articles/api/tagsApi';

export function useTags() {
  const [items, setItems]     = useState<OrgTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    let alive = true;
    tagsApi.list()
      .then(data => { if (alive) setItems(data); })
      .catch(err => { if (alive) setError(err instanceof ApiError ? err.message : 'Les tags n\'ont pas pu être chargés. Rechargez la page.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const rename = useCallback(async (id: string, displayName: string): Promise<boolean> => {
    try {
      const updated = await tagsApi.rename(id, displayName);
      setItems(prev => prev
        // Cas fusion : le rename peut renvoyer l'id d'un autre tag (cible) — on retire l'orphelin éventuel.
        .filter(t => t.id !== id || t.id === updated.id)
        .map(t => t.id === updated.id ? { ...t, name: updated.name, display_name: updated.display_name } : t)
        .sort((a, b) => a.display_name.localeCompare(b.display_name))
      );
      toast.success('Tag renommé.');
      return true;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Le tag n\'a pas été renommé. Réessayez.');
      return false;
    }
  }, [toast]);

  const remove = useCallback(async (id: string): Promise<void> => {
    const previous = items;
    setItems(items.filter(t => t.id !== id));
    try {
      await tagsApi.remove(id);
      toast.success('Tag supprimé.');
    } catch (err) {
      setItems(previous);
      toast.error(err instanceof ApiError ? err.message : 'Le tag n\'a pas été supprimé. Réessayez.');
    }
  }, [items, toast]);

  return { items, loading, error, rename, remove };
}

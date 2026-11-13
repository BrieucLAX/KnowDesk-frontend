import { useState, useCallback } from 'react';
import { apiClient } from '../../../shared/lib/apiClient';
import { useToast }  from '../../../shared/lib/useToast';

export interface ArticleVersion {
  id:         string;
  article_id: string;
  version:    number;
  title:      string;
  content:    { html: string } | null;
  author_id:  string | null;
  summary:    string | null;
  created_at: string;
}

export function useArticleVersions(articleId: string) {
  const [versions, setVersions] = useState<ArticleVersion[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [open,     setOpen]     = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<ArticleVersion[]>(`/articles/${articleId}/versions`);
      setVersions(data);
    } catch {
      toast.error('Impossible de charger l\'historique des versions. Rechargez la page.');
    } finally {
      setLoading(false);
    }
  }, [articleId, toast]);

  const toggle = useCallback(async () => {
    if (!open) await load();
    setOpen(o => !o);
  }, [open, load]);

  const restore = useCallback(async (version: number): Promise<{ html: string } | null> => {
    try {
      const article = await apiClient.post<any>(
        `/articles/${articleId}/versions/${version}/restore`, {}
      );
      toast.success(`Version ${version} restaurée.`);
      setOpen(false);
      return article.content ?? null;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Restauration impossible. Réessayez dans un instant.');
      return null;
    }
  }, [articleId, toast]);

  return { versions, loading, open, toggle, restore };
}

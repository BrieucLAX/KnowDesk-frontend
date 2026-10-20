import { apiClient } from '../../../shared/lib/apiClient';
import type { ArticleStatus } from '../types';

/** Ce que le back rend d'un article après un changement de statut. */
export interface ArchivedArticle { id: string; status: ArticleStatus }

/**
 * Archiver retire l'article de la recherche et des listes publiées ; désarchiver le remet en
 * brouillon (409 s'il n'est pas archivé, 403 si la limite d'articles est atteinte).
 */
export const archiveApi = {
  archive:   (id: string) => apiClient.put<ArchivedArticle>(`/articles/${id}/archive`),
  unarchive: (id: string) => apiClient.put<ArchivedArticle>(`/articles/${id}/unarchive`),
};

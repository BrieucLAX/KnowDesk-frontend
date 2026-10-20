import { apiClient } from '../../../shared/lib/apiClient';
import { fetchAllPages } from '../../../shared/lib/fetchAllPages';
import type { FaqDetail, FaqListItem, FaqListFilters, FaqInput, FaqHistory } from '../types';

function buildQuery(filters: FaqListFilters): string {
  const p = new URLSearchParams();
  if (filters.status)            p.set('status',     filters.status);
  if (filters.categoryId)        p.set('categoryId', filters.categoryId);
  if (filters.includeSubcategories) p.set('includeSubcategories', 'true');
  if (filters.q?.trim())         p.set('q',          filters.q.trim());
  if (filters.staleOnly)         p.set('staleOnly',  '1');
  if (filters.tags?.length)      p.set('tags',       filters.tags.join(','));
  if (filters.sortBy)            p.set('sortBy',     filters.sortBy);
  if (filters.sortDir)           p.set('sortDir',    filters.sortDir);
  if (filters.page    !== undefined) p.set('page',    String(filters.page));
  if (filters.perPage !== undefined) p.set('perPage', String(filters.perPage));
  const qs = p.toString();
  return qs ? `?${qs}` : '';
}

export const faqsApi = {
  list: (filters: FaqListFilters = {}) =>
    apiClient.get<FaqListItem[]>(`/faqs${buildQuery(filters)}`),

  /** Toutes les FAQ qui répondent aux filtres, page après page (le back en rend 100 au plus par page). */
  listAll: (filters: Omit<FaqListFilters, 'page' | 'perPage'> = {}) =>
    fetchAllPages<FaqListItem>('/faqs', new URLSearchParams(buildQuery(filters).slice(1)), 100),

  get: (id: string, opts?: { noTrack?: boolean }) =>
    apiClient.get<FaqDetail>(`/faqs/${id}${opts?.noTrack ? '?noTrack=1' : ''}`),

  create: (data: FaqInput) =>
    apiClient.post<FaqDetail>('/faqs', data),

  update: (id: string, data: Partial<FaqInput>) =>
    apiClient.patch<FaqDetail>(`/faqs/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<{ message: string }>(`/faqs/${id}`),

  setTags: (id: string, tags: string[]) =>
    apiClient.put<{ tags: string[] }>(`/faqs/${id}/tags`, { tags }),

  vote: (id: string, vote: 'yes' | 'no', undo?: boolean) =>
    apiClient.post<{ helpful_yes: number; helpful_no: number }>(`/faqs/${id}/helpful`, { vote, undo }),

  markReviewed: (id: string) =>
    apiClient.post<FaqDetail>(`/faqs/${id}/mark-reviewed`, {}),

  getHistory: (id: string) =>
    apiClient.get<FaqHistory>(`/faqs/${id}/history`),
};

import { apiClient } from './apiClient';

/** Au-delà, on s'arrête : 50 pages de 200, c'est 10 000 éléments. */
const MAX_PAGES = 50;

/**
 * Lit une liste paginée du back page après page, jusqu'à `meta.total`, et rend tous ses
 * éléments. Le back plafonne `perPage` (200 pour les articles, 100 pour les FAQ) : une seule
 * page n'en montrait qu'une partie, sans le dire (plan-articles-v1, lot 0).
 *
 * `query` ne doit contenir ni `page` ni `perPage`.
 */
export async function fetchAllPages<T>(path: string, query: URLSearchParams, perPage: number): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const params = new URLSearchParams(query);
    params.set('perPage', String(perPage));
    params.set('page', String(page));
    const { data, meta } = await apiClient.getWithMeta<T[], { total?: number }>(`${path}?${params.toString()}`);
    items.push(...data);
    // Sans total, seule une page incomplète dit que la liste est finie.
    const total = meta?.total;
    if (data.length < perPage || (total !== undefined && items.length >= Number(total))) break;
  }
  return items;
}

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./apiClient', () => ({ apiClient: { getWithMeta: vi.fn() } }));

import { apiClient } from './apiClient';
import { fetchAllPages } from './fetchAllPages';
import { respond } from './fixtures/lot0Responses';

const getWithMeta = vi.mocked(apiClient.getWithMeta);

describe('fetchAllPages (réponses réelles du back)', () => {
  beforeEach(() => {
    getWithMeta.mockReset();
    getWithMeta.mockImplementation(async (path: string) => respond(path) as never);
  });

  it('lit les 205 articles en deux pages de 200, puis s\'arrête', async () => {
    const items = await fetchAllPages<{ id: string }>('/articles', new URLSearchParams({ sort: 'updated' }), 200);
    expect(items).toHaveLength(205);
    expect(new Set(items.map(a => a.id)).size).toBe(205);
    expect(getWithMeta.mock.calls.map(c => c[0])).toEqual([
      '/articles?sort=updated&perPage=200&page=1',
      '/articles?sort=updated&perPage=200&page=2',
    ]);
  });

  it('lit les 105 FAQ en pages de 100', async () => {
    const items = await fetchAllPages<{ id: string }>('/faqs', new URLSearchParams(), 100);
    expect(items).toHaveLength(105);
    expect(getWithMeta).toHaveBeenCalledTimes(2);
  });

  it('une liste qui tient en une page ne demande pas la suivante', async () => {
    getWithMeta.mockImplementation(async () => ({ data: [{ id: 'a' }], meta: { total: 1 } }) as never);
    expect(await fetchAllPages('/articles', new URLSearchParams(), 200)).toHaveLength(1);
    expect(getWithMeta).toHaveBeenCalledTimes(1);
  });

  it('s\'arrête sur une page incomplète même si total est absent', async () => {
    getWithMeta.mockImplementation(async (path: string) => ({
      data: path.includes('page=1') ? Array.from({ length: 200 }, (_, i) => ({ id: `a${i}` })) : [{ id: 'z' }],
      meta: {},
    }) as never);
    expect(await fetchAllPages('/articles', new URLSearchParams(), 200)).toHaveLength(201);
    expect(getWithMeta).toHaveBeenCalledTimes(2);
  });
});

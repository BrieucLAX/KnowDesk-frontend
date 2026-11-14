import { vi } from 'vitest';

/**
 * Simule window.matchMedia pour une largeur de fenêtre donnée (jsdom n'en a
 * pas). Gère les requêtes `(max-width: Npx)` et `(min-width: Npx)`.
 * Renvoie une fonction qui retire la simulation.
 */
export function mockViewportWidth(width: number): () => void {
  const original = window.matchMedia;
  window.matchMedia = vi.fn((query: string) => {
    const max = /max-width:\s*([\d.]+)px/.exec(query);
    const min = /min-width:\s*([\d.]+)px/.exec(query);
    const matches = (!max || width <= Number(max[1])) && (!min || width >= Number(min[1]));
    return {
      matches, media: query, onchange: null,
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
      addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList;
  });
  return () => { window.matchMedia = original; };
}

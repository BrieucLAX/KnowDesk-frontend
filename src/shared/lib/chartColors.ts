/**
 * Couleurs des séries de graphiques, dans l'ordre du design system CX.
 * Ce sont des `var(--x)` : recharts les pose en attribut SVG, où le
 * navigateur les résout. Six séries au plus sans répétition ; au-delà, voir
 * `chartSeriesStyle`.
 */
export const CHART_SERIES = [
  'var(--primary)',
  'var(--accent)',
  'var(--info)',
  'var(--success)',
  'var(--warning)',
  'var(--ink-muted)',
] as const;

/** Grille, axes et graduations des graphiques. */
export const CHART_GRID = 'var(--line)';
export const CHART_AXIS = 'var(--ink-muted)';

/** Motifs de trait : 6 séries en plein, les 6 suivantes en pointillés, puis en tirets. */
const SERIES_DASHES = [undefined, '2 4', '8 4'] as const;

/**
 * Couleur et motif de la série n° `index` (à partir de 0) : les six couleurs
 * de CHART_SERIES, reprises en pointillés au-delà de 6 séries, puis en tirets
 * au-delà de 12. Aucune nouvelle couleur.
 */
export function chartSeriesStyle(index: number): { color: string; dash?: string } {
  const n = CHART_SERIES.length;
  return {
    color: CHART_SERIES[index % n],
    dash:  SERIES_DASHES[Math.floor(index / n) % SERIES_DASHES.length],
  };
}

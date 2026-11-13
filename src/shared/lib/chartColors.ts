/**
 * Couleurs des séries de graphiques, dans l'ordre du design system CX.
 * Ce sont des `var(--x)` : recharts les pose en attribut SVG, où le
 * navigateur les résout. Six séries au plus sans répétition.
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

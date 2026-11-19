/**
 * Le public d'un article du plan et de la rédaction (retours de l'experte, 2026-11-18, décisions
 * du porteur Q1 a et Q2 a). Le pipeline écrit une valeur d'une liste fermée dans `audience`
 * (plan 0.1.0 et construction 0.1.0, chaîne libre inchangée) : « particuliers », « professionnels »
 * ou « tous ». Une valeur plus ancienne, libre (« Particuliers », « conseillers »…) ou absente,
 * s'affiche comme avant (« Public : … ») et n'est jamais classée.
 */
export type Audience = 'particuliers' | 'professionnels' | 'tous';

export const AUDIENCE_LABEL: Readonly<Record<Audience, string>> = {
  particuliers:   'Particuliers',
  professionnels: 'Professionnels',
  tous:           'Particuliers et professionnels',
};

const AUDIENCES = Object.keys(AUDIENCE_LABEL) as Audience[];

/** La valeur de la liste fermée, ou null (valeur libre d'un plan plus ancien, ou absente). */
export function audienceOf(value: string | null): Audience | null {
  return value !== null && (AUDIENCES as string[]).includes(value) ? (value as Audience) : null;
}

/** Filtre par public : un article « Particuliers et professionnels » concerne les deux. */
export type AudienceFilter = 'all' | 'particuliers' | 'professionnels';

export const AUDIENCE_FILTERS: ReadonlyArray<{ id: AudienceFilter; label: string }> = [
  { id: 'all',            label: 'Tous les publics' },
  { id: 'particuliers',   label: 'Particuliers' },
  { id: 'professionnels', label: 'Professionnels' },
];

/** Un article reste affiché sous le filtre : son public, ou les deux publics. Une valeur libre
 * ou absente ne s'affiche que sans filtre. */
export function matchesAudience(value: string | null, filter: AudienceFilter): boolean {
  if (filter === 'all') return true;
  const a = audienceOf(value);
  return a === filter || a === 'tous';
}

/** Le filtre n'apparaît que si au moins un article porte un public de la liste fermée. */
export const hasAudiences = (values: ReadonlyArray<string | null>): boolean =>
  values.some(v => audienceOf(v) !== null);

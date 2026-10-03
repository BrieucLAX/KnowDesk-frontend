import type { SourceRef } from './audit';

/**
 * Libellés français des valeurs de l'audit. Une valeur inconnue (version
 * suivante du pipeline) reçoit un libellé de repli, jamais une erreur.
 */

const has = (table: Readonly<Record<string, string>>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(table, key);

const label = (table: Readonly<Record<string, string>>, value: string, fallback: string): string =>
  (has(table, value) ? table[value] : fallback);

const QUESTION_TYPES: Readonly<Record<string, string>> = {
  genuine_conflict:  'Contradiction',
  source_authority:  'Source qui fait foi',
  validity:          'Période de validité',
  range_vs_value:    'Fourchette ou valeur',
  condition_missing: 'Condition manquante',
};
export const questionTypeLabel = (t: string) => label(QUESTION_TYPES, t, 'Écart');

const IMPACTS: Readonly<Record<string, string>> = { high: 'Impact fort', medium: 'Impact moyen', low: 'Impact faible' };
export const impactLabel = (level: string) => label(IMPACTS, level, 'Impact non précisé');

const DISCARD_REASONS: Readonly<Record<string, string>> = {
  distinct_cases:              'Deux cas distincts',
  grid_cell:                   'Cellules d\'un même tableau',
  restated_fact:               'Même fait, reformulé',
  distinct_notions:            'Notions différentes',
  ceiling_and_stricter:        'Plafond et règle plus stricte',
  illustrative_case:           'Exemple illustratif',
  bounded_without_replacement: 'Borne sans valeur de remplacement',
  complementary:               'Textes complémentaires',
  vision_only:                 'Lu par vision seulement',
};
export const discardReasonLabel = (r: string) => label(DISCARD_REASONS, r, 'Autre raison');

const UNPAIRED_REASONS: Readonly<Record<string, string>> = { different_audience: 'Publics différents' };
export const unpairedReasonLabel = (r: string) => label(UNPAIRED_REASONS, r, 'Autre raison');

const ZONES: Readonly<Record<string, string>> = { table: 'tableau', notes: 'notes', image: 'image' };

/**
 * Emplacement d'un extrait dans son document : page (pdf), diapositive
 * (pptx), titres et bloc (docx, et Markdown repéré de la même façon), puis
 * zone et cellule de tableau.
 */
export function sourceLocation(s: SourceRef): string {
  const parts: string[] = [];
  if (s.format === 'pdf' && s.page !== null) parts.push(`page ${s.page}`);
  else if (s.format === 'pptx' && s.slide !== null) parts.push(`diapositive ${s.slide}`);
  else if (s.format === 'docx' || s.format === 'md') {
    if (s.headingPath.length > 0) parts.push(s.headingPath.join(' › '));
    if (s.blockIndex !== null) parts.push(`${s.blockKind === 'table' ? 'tableau' : 'paragraphe'} ${s.blockIndex + 1}`);
  }
  if (parts.length === 0) parts.push('emplacement non précisé');
  const sectioned = s.format === 'docx' || s.format === 'md';
  if (has(ZONES, s.zone) && !(sectioned && s.zone === 'table' && s.blockKind === 'table')) {
    parts.push(ZONES[s.zone]);
  }
  if (s.tableCell) parts.push(`ligne ${s.tableCell.row + 1}, colonne ${s.tableCell.column + 1}`);
  return parts.join(', ');
}

export const VISION_NOTE = 'Extrait transcrit par vision, non vérifié';

const DETECTIONS: Readonly<Record<string, string>> = {
  undefined_references: 'Références non définies',
  obsolescence_hints:   'Indices d\'obsolescence',
};
export const detectionLabel = (d: string) => label(DETECTIONS, d, d);

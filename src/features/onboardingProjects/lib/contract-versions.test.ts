import { describe, it, expect } from 'vitest';
import { SUPPORTED_AUDIT_SCHEMAS } from './audit';
import {
  CORRECTABLE_AUDIT_SCHEMAS, PENDING_REASONS, REASON_LABEL, SUPPORTED_CORRECTION_SCHEMAS, TO_VERIFY_REASONS, UNDO_REASONS,
  type BaseCorrection,
} from './correction';
import BASE_PILOTE_03 from '../components/base/fixtures/base-0.3.0-pilote.response.json';
import BASE_BANC_04 from '../components/base/fixtures/base-0.4.0-banc-v5-g1.response.json';
import { READING_AUDIT_SCHEMAS } from './reading';
import VERSIONS from './contract-versions.json';

/**
 * `contract-versions.json` est la copie, à l'identique, du fichier du back
 * (`KnowDesk/src/modules/onboarding/contract-versions.json`) : les versions d'audit et de correction
 * qu'il accepte. Chacune doit avoir son affichage ici. Rejeu « Base de co 2026 v4 » (2026-10-10) :
 * le back acceptait l'audit 0.10.0, l'écran disait « format que cette version de l'application ne
 * sait pas afficher » (#30).
 *
 * Une nouvelle version se déclare dans le pipeline, le back et le front, dans la même série de PR.
 */
/** Le fichier du back voisin (`../KnowDesk`), comme dans le poste de développement ; absent ailleurs. */
const BACK = Object.values(import.meta.glob<unknown>(
  '../../../../../KnowDesk/src/modules/onboarding/contract-versions.json', { eager: true, import: 'default' },
))[0];

/** Les copies consignées des schémas de correction du back voisin ; absentes ailleurs. */
const BACK_CORRECTIONS = import.meta.glob<unknown>(
  '../../../../../KnowDesk/src/modules/onboarding/schemas/correction-*.schema.json', { eager: true, import: 'default' },
);

type Node = { properties?: Record<string, Node>; enum?: string[]; const?: string; anyOf?: Node[]; oneOf?: Node[] };

/** Les valeurs (`enum`, `const`, y compris dans `anyOf` et `oneOf`) d'un nœud de schéma. */
const valuesOf = (n: Node): string[] => [
  ...(n.enum ?? []), ...(n.const ? [n.const] : []), ...[...(n.anyOf ?? []), ...(n.oneOf ?? [])].flatMap(valuesOf),
];

/** Les valeurs d'un champ, partout où il est déclaré, dans tous les schémas de correction du back. */
function backValues(field: string): string[] {
  const out = new Set<string>();
  const walk = (n: unknown): void => {
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n === null || typeof n !== 'object') return;
    const prop = (n as Node).properties?.[field];
    if (prop) valuesOf(prop).forEach(v => out.add(v));
    Object.values(n).forEach(walk);
  };
  Object.values(BACK_CORRECTIONS).forEach(walk);
  return [...out].sort();
}

describe('Versions de contrat acceptées par le back', () => {
  it('chaque audit accepté s\'affiche : les anciens en décisions, les autres en cartes', () => {
    expect([...SUPPORTED_AUDIT_SCHEMAS, ...READING_AUDIT_SCHEMAS].sort()).toEqual([...VERSIONS.audits.accepted].sort());
    expect([...READING_AUDIT_SCHEMAS]).toEqual(VERSIONS.audits.reading);
  });

  it('chaque audit corrigeable propose « Préparer la nouvelle base »', () => {
    expect([...CORRECTABLE_AUDIT_SCHEMAS]).toEqual(VERSIONS.audits.correctable);
  });

  it('chaque base corrigée acceptée s\'affiche dans « Nouvelle base »', () => {
    expect([...SUPPORTED_CORRECTION_SCHEMAS]).toEqual(VERSIONS.corrections.accepted);
  });

  // Sans le dépôt du back à côté de celui-ci, le test ne peut rien comparer : il est sauté.
  it.skipIf(BACK === undefined)('la copie est celle du back voisin (../KnowDesk)', () => {
    expect(VERSIONS).toEqual(BACK);
  });
});

describe('Raisons de la base corrigée : listes fermées, un libellé par valeur', () => {
  it('chaque raison d\'annulation a son libellé, jamais un code affiché', () => {
    for (const r of UNDO_REASONS) expect(REASON_LABEL[r]).toMatch(/\S/);
    expect(Object.keys(REASON_LABEL).sort()).toEqual([...UNDO_REASONS, 'no_change_kept'].sort());
  });

  it('la note d\'image se lit mot pour mot', () => {
    expect(REASON_LABEL.image_note).toBe(
      'L\'IA signale que l\'image ou le schéma ci-dessus devrait être mis à jour. Elle ne peut pas modifier une image : à vous de le faire si besoin.',
    );
  });

  it.each([['0.3.0 réelle du pilote', BASE_PILOTE_03], ['0.4.0 du banc v5', BASE_BANC_04]])('la base %s n\'emploie que des raisons connues de l\'écran', (_, response) => {
    const base = (response as unknown as { base: BaseCorrection }).base;
    const changes = base.sheets.flatMap(s => s.sections.flatMap(x => x.changes ?? []));
    for (const r of changes.map(c => c.undo_reason).filter((r): r is string => Boolean(r))) expect(UNDO_REASONS).toContain(r);
    for (const c of changes) if (c.to_verify) expect(TO_VERIFY_REASONS).toContain(c.to_verify.reason);
    for (const p of base.pending ?? []) expect(PENDING_REASONS).toContain(p.reason);
  });

  // Une raison que le contrat du back déclare et que l'écran ne connaît pas fait échouer ce test.
  it.skipIf(Object.keys(BACK_CORRECTIONS).length === 0)('mêmes listes que les schémas consignés du back voisin (../KnowDesk)', () => {
    expect(backValues('undo_reason')).toEqual([...UNDO_REASONS].sort());
    // `reason` : celle d'une information en attente, et (0.4.0) celle d'une ligne « À vérifier ».
    expect(backValues('reason')).toEqual([...PENDING_REASONS, ...TO_VERIFY_REASONS].sort());
  });
});

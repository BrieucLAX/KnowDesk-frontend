import { describe, it, expect } from 'vitest';
import { SUPPORTED_AUDIT_SCHEMAS } from './audit';
import { CORRECTABLE_AUDIT_SCHEMAS, SUPPORTED_CORRECTION_SCHEMAS } from './correction';
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

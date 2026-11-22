import { describe, it, expect } from 'vitest';
import { readPlan } from './plan';
import { describeEdit, editCountLabel, mergedAudience, moveChapterBy, moveSubjectBy, type PlanEditsState } from './planEdits';
import STATE from '../components/base/fixtures/plan-edits-elyra-2026-11-19.response.json';
import PROPOSED from '../components/base/fixtures/plan-0.1.0-elyra-2026-11-19.json';

/**
 * Modification du plan (étape 4, décisions du porteur du 2026-11-22). La réponse est celle du back
 * pour le scénario de l'experte joué sur le plan réel d'Elyra du 19/11 (premier tirage).
 */
const S = STATE as unknown as PlanEditsState;

describe('« Vos modifications » : chaque modification en une phrase', () => {
  it('le scénario de l\'experte, dit avec les titres', () => {
    expect(S.edits.map(describeEdit)).toEqual([
      'Catégorie « Fonctionnement du secteur de l\'énergie » créée, avec « Acteurs du marché de l\'énergie »',
      '« Ouverture des marchés de l\'énergie » déplacé de « Marché de l\'énergie » vers « Fonctionnement du secteur de l\'énergie »',
      '« Tarif réglementé (TRVE) vs offres de marché » déplacé de « Marché de l\'énergie » vers « Fonctionnement du secteur de l\'énergie »',
      'Catégorie « Fonctionnement du secteur de l\'énergie » placée à un autre rang',
      '« Prix repère de la CRE » réuni dans « Elyra Gaz Indexé », qui devient « Particuliers et professionnels »',
      '« Points de vigilance qualité en souscription » réuni dans « Souscription d\'un contrat »',
      '« Droit de rétractation (particuliers) » placé à un autre rang dans « Souscription et contrat »',
      '« Droit de rétractation (professionnels) » placé à un autre rang dans « Souscription et contrat »',
      '« Décisions du Comité Offres & Prix de septembre 2026 » retiré du plan',
      'Catégorie « Marché de l\'énergie » renommée « Le marché de l\'énergie »',
    ]);
    expect(describeEdit({ kind: 'rename_subject', names: { from: 'A', to: 'B' } })).toBe('Article « A » renommé « B »');
    expect(editCountLabel(1)).toBe('1 modification');
    expect(editCountLabel(10)).toBe('10 modifications');
  });

  it('le plan modifié se lit comme un plan : 31 articles, la nouvelle catégorie en premier', () => {
    const plan = readPlan(S.plan)!;
    expect(plan.subjectCount).toBe(31);
    expect(plan.chapters[0].title).toBe('Fonctionnement du secteur de l\'énergie');
    expect(readPlan(PROPOSED)!.subjectCount).toBe(34);
  });
});

describe('Monter, descendre, réunir', () => {
  const plan = readPlan(PROPOSED)!;
  const contract = plan.chapters.find(c => c.title === 'Souscription et contrat')!;

  it('monter ou descendre un article dans sa catégorie ; rien en bout de catégorie', () => {
    const [first, second, third] = contract.subjects.map(s => s.id);
    expect(moveSubjectBy(contract, first, 1)).toEqual({ kind: 'move_subject', subjectId: first, chapterId: contract.id, afterSubjectId: second });
    expect(moveSubjectBy(contract, third, -1)).toEqual({ kind: 'move_subject', subjectId: third, chapterId: contract.id, afterSubjectId: first });
    expect(moveSubjectBy(contract, second, -1)).toEqual({ kind: 'move_subject', subjectId: second, chapterId: contract.id, afterSubjectId: null });
    expect(moveSubjectBy(contract, first, -1)).toBeNull();
    expect(moveSubjectBy(contract, contract.subjects[contract.subjects.length - 1].id, 1)).toBeNull();
  });

  it('monter ou descendre une catégorie ; rien en bout de plan', () => {
    const ids = plan.chapters.map(c => c.id);
    expect(moveChapterBy(plan, ids[1], -1)).toEqual({ kind: 'move_chapter', chapterId: ids[1], afterChapterId: null });
    expect(moveChapterBy(plan, ids[1], 1)).toEqual({ kind: 'move_chapter', chapterId: ids[1], afterChapterId: ids[2] });
    expect(moveChapterBy(plan, ids[0], -1)).toBeNull();
    expect(moveChapterBy(plan, ids[ids.length - 1], 1)).toBeNull();
  });

  it('le public après une réunion : le même reste, des publics différents donnent « tous »', () => {
    expect(mergedAudience({ audience: 'particuliers' }, { audience: 'particuliers' })).toBe('particuliers');
    expect(mergedAudience({ audience: 'particuliers' }, { audience: 'tous' })).toBe('tous');
    expect(mergedAudience({ audience: 'particuliers' }, { audience: 'professionnels' })).toBe('tous');
    expect(mergedAudience({ audience: null }, { audience: null })).toBeNull();
  });
});

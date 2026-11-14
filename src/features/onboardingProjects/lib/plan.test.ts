import { describe, it, expect } from 'vitest';
import {
  hasPlan, PLAN_STEPS, planFailureMessage, planStepStates, planSummary, readPlan, UNCOVERED_REASON_LABEL,
} from './plan';
import PLAN_ELYRA from '../components/base/fixtures/plan-0.1.0-elyra.response.json';

const RAW = PLAN_ELYRA.plan;

describe('Plan 0.1.0, lu pour l\'écran (lot B)', () => {
  it('chapitres dans l\'ordre, sujets, sources vérifiées, cartes liées', () => {
    const plan = readPlan(RAW)!;
    expect(plan.chapters.map(c => c.title)).toEqual(['Offres et prix', 'Souscription et résiliation', 'Service client']);
    const subject = plan.chapters[1].subjects[0];
    expect(subject).toMatchObject({ title: 'Frais de résiliation', audience: 'particuliers', fromComplement: false });
    expect(subject.sources).toHaveLength(3);
    expect(subject.sources[0].excerpt).toMatch(/\S/);
    expect(plan.chapters[2].subjects[0]).toMatchObject({ audience: null, fromComplement: true });
    expect(planSummary(plan)).toBe('3 chapitres · 3 sujets · 10 passages couverts sur 12');
  });

  it('points d\'attention : document remplacé, passages sans sujet en clair, sujets réunis', () => {
    const plan = readPlan(RAW)!;
    expect(plan.retired).toEqual([{
      documentPath: 'Grille_Tarifaire_Particuliers_v1_2025-08-01.pdf',
      replacedByPath: 'Grille_Tarifaire_Particuliers_v2_2026-09-01.pdf',
      cardId: 'card_24fcb03db294f6f6',
    }]);
    expect(plan.uncovered.map(u => [u.documentPath, u.where, u.reason])).toEqual([
      ['CR_Comite_Offres_2026-09-22.docx', 'Ordre du jour', UNCOVERED_REASON_LABEL.internal],
      ['2026-01-15_Formation_Onboarding_Conseillers_Energie.pptx', 'diapositive 1', UNCOVERED_REASON_LABEL.no_content],
    ]);
    expect(plan.merged).toEqual([{ subjectId: 'sub_resiliation', titles: ['Frais de résiliation', 'Résilier un contrat particulier'] }]);
    expect(plan.unverifiedQuotes).toBe(1);
  });

  it('lecture v1 : les documents remplacés sont « non disponible » (null), jamais une liste vide', () => {
    const raw = { ...RAW, attention: { ...RAW.attention, retired_documents_detection: 'unavailable', retired_documents: [] } };
    expect(readPlan(raw)!.retired).toBeNull();
  });

  it('une raison inconnue se dit « autre raison », jamais par son code', () => {
    const raw = { ...RAW, attention: { ...RAW.attention, uncovered_units: [{ ...RAW.attention.uncovered_units[0], reason: 'nouvelle' }] } };
    expect(readPlan(raw)!.uncovered[0].reason).toBe('autre raison');
    expect(readPlan(null)).toBeNull();
  });

  it('le plan ne vaut qu\'en mode construire, sur un audit 0.16.0', () => {
    const build = { mode: 'build' as const, reason: 'none' as const, documentIds: [], briefingExcerpt: null };
    expect(hasPlan('0.16.0', build)).toBe(true);
    expect(hasPlan('0.15.0', build)).toBe(false);
    expect(hasPlan('0.16.0', { ...build, mode: 'correct' })).toBe(false);
    expect(hasPlan('0.16.0', null)).toBe(false);
  });

  it('étapes : lecture, proposition, rattachement, couverture, enregistrement ; une étape inconnue compte comme la lecture', () => {
    expect(PLAN_STEPS.map(s => s.label)).toEqual([
      'Lecture de vos documents', 'Proposition des chapitres et des sujets', 'Rattachement des passages restants',
      'Contrôle de la couverture', 'Enregistrement du plan',
    ]);
    expect(planStepStates({ status: 'running', stage: 'complement' })).toEqual(['done', 'done', 'current', 'pending', 'pending']);
    expect(planStepStates({ status: 'running', stage: 'inconnue' })[0]).toBe('current');
    expect(planStepStates({ status: 'succeeded', stage: 'storing' })).toEqual(PLAN_STEPS.map(() => 'done'));
  });

  it('le pipeline qui ne connaît pas encore la tâche : un message clair, sans code', () => {
    const text = planFailureMessage('plan_not_supported');
    expect(text).toMatch(/ne sait pas encore préparer un plan/);
    expect(text).toMatch(/Nous sommes prévenus/);
    expect(text).not.toMatch(/plan_not_supported/);
    expect(planFailureMessage('plan_invalid')).toMatch(/problème de notre côté/);
    expect(planFailureMessage(null)).toMatch(/vous pouvez la relancer/);
  });
});

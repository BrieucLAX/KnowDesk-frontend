import { describe, it, expect } from 'vitest';
import { currentStepOf, nextStep, stepStates, STEPS } from './steps';

/** Parcours cible, lot 1 « Socle » : cinq étapes, statut de chaque étape lu dans le statut du projet. */
describe('étapes du parcours', () => {
  it('cinq étapes dans l\'ordre de la cible ; l\'analyse n\'en est pas une', () => {
    expect(STEPS.map(s => s.label)).toEqual(['Documents', 'Contexte métier', 'Questions', 'Plan', 'Relecture et publication']);
    expect(STEPS.map(s => s.title)).toEqual([
      'Importez vos documents', 'Votre contexte métier', 'Questions', 'Le plan de votre base', 'Relisez vos articles',
    ]);
    expect(STEPS.some(s => /analyse/i.test(s.label))).toBe(false);
  });

  it('chaque étape mène à la suivante (« Continuer vers … »), la dernière à rien', () => {
    expect(STEPS.map(s => nextStep(s.id)?.towards ?? null)).toEqual(
      ['le contexte métier', 'les questions', 'le plan', 'la relecture', null],
    );
  });

  it('statut de chaque étape lu dans `currentStep` et `completedSteps`', () => {
    expect(stepStates({ currentStep: 1, completedSteps: 0 })).toEqual({
      documents: 'current', cadrage: 'upcoming', audit: 'upcoming', plan: 'upcoming', relecture: 'upcoming',
    });
    expect(stepStates({ currentStep: 3, completedSteps: 2 })).toEqual({
      documents: 'done', cadrage: 'done', audit: 'current', plan: 'upcoming', relecture: 'upcoming',
    });
    expect(stepStates({ currentStep: 5, completedSteps: 5 })).toEqual({
      documents: 'done', cadrage: 'done', audit: 'done', plan: 'done', relecture: 'done',
    });
  });

  it('back sans statut (avant sa migration 65) : l\'étape 1 en cours, rien de terminé', () => {
    expect(stepStates({ currentStep: null, completedSteps: null }).documents).toBe('current');
    expect(currentStepOf({ currentStep: null })).toBe('documents');
    expect(currentStepOf({})).toBe('documents');
  });

  it('étape en cours de chaque numéro', () => {
    expect(([1, 2, 3, 4, 5] as const).map(n => currentStepOf({ currentStep: n }))).toEqual(
      ['documents', 'cadrage', 'audit', 'plan', 'relecture'],
    );
  });
});

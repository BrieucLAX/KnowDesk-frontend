import { describe, it, expect } from 'vitest';
import {
  ANALYSIS_STEPS, analysisFailureMessage, analysisFailureNote, elapsedMs, formatElapsed, isAnalysisActive, stepStates,
} from './analysisStatus';

describe('analysisStatus', () => {
  it('une analyse est active en file ou en cours', () => {
    expect(isAnalysisActive({ status: 'queued' })).toBe(true);
    expect(isAnalysisActive({ status: 'running' })).toBe(true);
    expect(isAnalysisActive({ status: 'succeeded' })).toBe(false);
    expect(isAnalysisActive({ status: 'failed' })).toBe(false);
  });

  it('états des étapes selon l\'étape en cours', () => {
    expect(stepStates({ status: 'queued', stage: null })).toEqual(ANALYSIS_STEPS.map(() => 'pending'));
    expect(stepStates({ status: 'running', stage: 'download' })[0]).toBe('current');
    expect(stepStates({ status: 'running', stage: 'extraction' }))
      .toEqual(['done', 'done', 'current', 'pending', 'pending', 'pending']);
    expect(stepStates({ status: 'succeeded', stage: 'storing' }).every(s => s === 'done')).toBe(true);
    // Échec pendant le croisement : l'étape atteinte n'est pas marquée terminée.
    expect(stepStates({ status: 'failed', stage: 'detection' }))
      .toEqual(['done', 'done', 'done', 'pending', 'pending', 'pending']);
  });

  it('formate la durée', () => {
    expect(formatElapsed(0)).toBe('0 s');
    expect(formatElapsed(45_400)).toBe('45 s');
    expect(formatElapsed((12 * 60 + 5) * 1000)).toBe('12 min 05 s');
    expect(formatElapsed((62 * 60 + 30) * 1000)).toBe('1 h 02 min');
  });

  it('le temps écoulé se fige à la fin', () => {
    const createdAt = '2026-09-27T10:00:00Z';
    const now = new Date('2026-09-27T10:30:00Z').getTime();
    expect(elapsedMs({ createdAt, finishedAt: null }, now)).toBe(30 * 60 * 1000);
    expect(elapsedMs({ createdAt, finishedAt: '2026-09-27T10:20:00Z' }, now)).toBe(20 * 60 * 1000);
  });

  it('message d\'échec par code, générique sinon', () => {
    expect(analysisFailureMessage('time_limit_exceeded')).toContain('une heure');
    expect(analysisFailureMessage('internal_error')).toBe('L\'analyse a échoué.');
    expect(analysisFailureMessage(null)).toBe('L\'analyse a échoué.');
    expect(analysisFailureMessage('constructor')).toBe('L\'analyse a échoué.');
    expect(analysisFailureMessage('provider_auth')).toContain('configuration de notre côté');
    expect(analysisFailureMessage('provider_error')).toContain('indisponible');
    expect(analysisFailureMessage('pipeline_invalid_error_code')).toContain('problème de notre côté');
  });

  it('relancer n\'est proposé que si cela peut servir', () => {
    expect(analysisFailureNote('provider_auth')).toBe('Elle ne compte pas dans votre quota. Nous sommes prévenus.');
    expect(analysisFailureNote('pipeline_invalid_error_code')).toBe('Elle ne compte pas dans votre quota. Nous sommes prévenus.');
    expect(analysisFailureNote('provider_error')).toContain('vous pouvez la relancer');
    expect(analysisFailureNote(null)).toContain('vous pouvez la relancer');
  });
});

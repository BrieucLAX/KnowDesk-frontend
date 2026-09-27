import { describe, it, expect } from 'vitest';
import type { Question } from './audit';
import {
  buildChoose, buildDistinctCases, buildWriteVersion, describeDecision, firstOpenStep, progress, stepStatus,
  type Decision, type DecisionAction,
} from './decisions';

const question = (id: string, options: string[][], groupId: string | null = null): Question => ({
  id, type: 'genuine_conflict', question: `Question ${id}`, subject: 's', conflictIds: ['c1'], groupId,
  options: options.map((ids, i) => ({ label: `${'ABC'[i]} — v${i}`, document: 'd.pdf', value: `v${i}`, scope: null, assertionIds: ids, readByVision: false })),
  impact: { level: 'high', score: 1 }, blocking: true, rationale: null,
});

const decision = (questionId: string, action: DecisionAction): Decision => ({
  id: `d-${questionId}`, questionId, groupId: null, conflictIds: ['c1'], action, supersedesId: null,
  decidedBy: { id: 'u1', name: 'Camille' }, decidedAt: '2026-09-27T10:00:00Z', cancelledAt: null, cancelledBy: null,
});

describe('construction des actions', () => {
  it('A ou B : la première assertion de l\'option est gardée, toutes celles des autres options écartées', () => {
    const q = question('q1', [['a1', 'a1b'], ['a2'], ['a3', 'a4']]);
    expect(buildChoose(q, 0)).toEqual({ ok: true, action: { type: 'choose', kept_assertion_id: 'a1', discarded_assertion_ids: ['a2', 'a3', 'a4'] } });
    // Les autres assertions de l'option gardée ne sont ni gardées ni écartées.
    expect(buildChoose(q, 1)).toEqual({ ok: true, action: { type: 'choose', kept_assertion_id: 'a2', discarded_assertion_ids: ['a1', 'a1b', 'a3', 'a4'] } });
  });

  it('A ou B : refusé si l\'option ne cite rien, ou s\'il n\'y a rien à écarter', () => {
    expect(buildChoose(question('q', [[], ['a2']]), 0).ok).toBe(false);
    expect(buildChoose(question('q', [['a1'], ['a1']]), 0).ok).toBe(false);
  });

  it('version C : refusée vide ; condition facultative', () => {
    expect(buildWriteVersion('   ', 'x')).toEqual({ ok: false, error: 'Rédigez la version à retenir.' });
    expect(buildWriteVersion(' Cinq jours ', '')).toEqual({ ok: true, action: { type: 'write_version', text: 'Cinq jours', condition: null } });
    expect(buildWriteVersion('Cinq jours', ' hors Corse ')).toEqual({
      ok: true, action: { type: 'write_version', text: 'Cinq jours', condition: { text: 'hors Corse' } },
    });
  });

  it('deux cas distincts : refusés tant qu\'une condition manque, une condition par option sinon', () => {
    const q = question('q1', [['a1', 'a1b'], ['a2']]);
    expect(buildDistinctCases(q, ['particuliers', ''])).toEqual({ ok: false, error: 'Précisez le cas où l\'option B s\'applique.' });
    expect(buildDistinctCases(q, ['particuliers'])).toMatchObject({ ok: false });
    expect(buildDistinctCases(q, [' particuliers ', 'professionnels'])).toEqual({
      ok: true,
      action: { type: 'distinct_cases', cases: [
        { assertion_id: 'a1', condition: { text: 'particuliers' } },
        { assertion_id: 'a2', condition: { text: 'professionnels' } },
      ] },
    });
  });
});

describe('progression par étape', () => {
  const q1 = question('q1', [['a1'], ['a2']], 'g1');
  const q2 = question('q2', [['a3'], ['a4']], 'g1');
  const q3 = question('q3', [['a5'], ['a6']], 'g2');
  const steps = [[q1, q2], [q3]];
  const choose: DecisionAction = { type: 'choose', kept_assertion_id: 'a1', discarded_assertion_ids: ['a2'] };

  it('un groupe à deux questions n\'est fait qu\'une fois les deux tranchées', () => {
    const one = new Map([['q1', decision('q1', choose)]]);
    expect(stepStatus([q1, q2], one)).toBe('todo');
    expect(progress(steps, one)).toEqual({ done: 0, total: 2 });

    const both = new Map([...one, ['q2', decision('q2', { type: 'skip' })]]);
    expect(stepStatus([q1, q2], both)).toBe('decided');
    expect(progress(steps, both)).toEqual({ done: 1, total: 2 });
  });

  it('« plus tard » reste à faire ; « passer » compte comme fait', () => {
    const later = new Map([['q3', decision('q3', { type: 'later' })]]);
    expect(stepStatus([q3], later)).toBe('later');
    expect(progress(steps, later).done).toBe(0);

    const skipped = new Map([['q3', decision('q3', { type: 'skip' })]]);
    expect(stepStatus([q3], skipped)).toBe('skipped');
    expect(progress(steps, skipped).done).toBe(1);
  });

  it('reprise : première étape encore à faire, « plus tard » compris', () => {
    const current = new Map([
      ['q1', decision('q1', choose)], ['q2', decision('q2', choose)], ['q3', decision('q3', { type: 'later' })],
    ]);
    expect(firstOpenStep(steps, current)).toBe(1);
    current.set('q3', decision('q3', { type: 'skip' }));
    expect(firstOpenStep(steps, current)).toBe(0);
  });
});

describe('décision en clair', () => {
  const q = question('q1', [['a1'], ['a2']]);
  it('désigne les options par leur lettre', () => {
    expect(describeDecision({ type: 'choose', kept_assertion_id: 'a2', discarded_assertion_ids: ['a1'] }, q)).toBe('Option B retenue');
    expect(describeDecision({ type: 'distinct_cases', cases: [
      { assertion_id: 'a1', condition: { text: 'particuliers' } }, { assertion_id: 'a2', condition: { text: 'pros' } },
    ] }, q)).toBe('Cas distincts : A si particuliers ; B si pros');
    expect(describeDecision({ type: 'write_version', text: '5 jours', condition: { text: 'hors Corse' } }, q))
      .toBe('Version C : « 5 jours », si hors Corse');
    expect(describeDecision({ type: 'skip' }, q)).toBe('Passée (non applicable)');
  });
});

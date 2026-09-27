import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('../../api/onboardingApi', () => ({
  onboardingApi: {
    listAnalyses: vi.fn(), getAudit: vi.fn(), getAuditImage: vi.fn(),
    listDecisions: vi.fn(), questionHistory: vi.fn(), decide: vi.fn(), cancelDecision: vi.fn(),
  },
}));

import { onboardingApi } from '../../api/onboardingApi';
import { ApiError } from '../../../../shared/lib/apiClient';
import { AuditTab } from './AuditTab';
import type { Decision, DecisionAction, DecisionsState } from '../../lib/decisions';
import type { OnboardingAnalysis, OnboardingProject } from '../../types';

const MB = 1024 * 1024;
const project: OnboardingProject = {
  id: 'p1', name: 'Base SAV', createdAt: '', updatedAt: '', documentsCount: 2, totalBytes: 2 * MB, cadrageVersion: 3,
  limits: { maxFileBytes: 50 * MB, maxDocumentsPerProject: 50, maxProjectBytes: 300 * MB, maxFilesPerUpload: 10 },
};

const analysis = (id: string): OnboardingAnalysis => ({
  id, status: 'succeeded', stage: 'storing', done: 0, total: 0, llmCalls: 12, llmRetries: 0, cadrageVersion: 3,
  documents: [{ id: 'd1', filename: 'cgv.pdf' }], errorCode: null, pipelineVersion: null,
  createdAt: '2026-09-27T10:00:00Z', createdBy: 'u1', submittedAt: null,
  finishedAt: '2026-09-27T10:20:00Z', deadlineAt: '2026-09-27T11:00:00Z',
});

const pdf = (excerpt: string) => ({ format: 'pdf', document_id: 'd1', excerpt, page: 1 });
const opt = (letter: string, value: string, ids: string[]) =>
  ({ label: `${letter} — ${value}`, document: 'cgv.pdf', value, assertion_ids: ids });
const q = (id: string, extra: object) => ({
  id, type: 'genuine_conflict', question: `Question ${id} ?`, subject: `sujet ${id}`, conflict_ids: [`c-${id}`],
  impact: { level: 'high', score: 70 }, blocking: true,
  options: [opt('A', '5 €', ['a1']), opt('B', 'gratuit', ['a2'])], ...extra,
});

/** Deux décisions annoncées (la première en deux questions d'un même groupe), un cas à confirmer. */
const AUDIT = {
  schema_version: '0.6.0', generated_at: '2026-09-27T10:19:00Z',
  inventory: [{ document_id: 'd1', path: 'cgv.pdf', format: 'pdf' }],
  decisions: { count: 2, conflict_count: 4, auto_resolved_count: 0, to_confirm_count: 1, by_impact: { high: 2 } },
  estimated_duration: { minutes: 4, method: 'x' },
  assertions: [
    { id: 'a1', subject: 's', source: pdf('Frais : 5 €'), condition: { text: 'En Corse', clauses: [{ dimension: 'zone', operator: 'eq', value: 'Corse' }] } },
    { id: 'a2', subject: 's', source: pdf('Retour gratuit'), condition: { text: 'France métropolitaine', clauses: [{ dimension: 'zone', operator: 'eq', value: 'Métropole' }] } },
  ],
  conflicts: [
    { id: 'c-q1', status: 'open' }, { id: 'c-q2', status: 'open' }, { id: 'c-q3', status: 'open' },
    { id: 'c-q4', status: 'to_confirm', proposed_condition: { text: 'zone : Corse / Métropole', clauses: [{ dimension: 'zone', operator: 'in', value: ['Corse', 'Métropole'] }] } },
  ],
  questions: [
    q('q1', { group_id: 'g1' }),
    q('q2', { group_id: 'g1' }),
    q('q3', { group_id: 'g2' }),
    q('q4', { group_id: 'g4', blocking: false }),
  ],
};

let seq = 0;
const decision = (questionId: string, action: DecisionAction, extra: Partial<Decision> = {}): Decision => ({
  id: `d${++seq}`, questionId, groupId: null, conflictIds: [`c-${questionId}`], action, supersedesId: null,
  decidedBy: { id: 'u1', name: 'Camille Martin' }, decidedAt: '2026-09-27T12:00:00Z', cancelledAt: null, cancelledBy: null,
  ...extra,
});

const state = (decisions: Decision[], arbitrable = true): DecisionsState => ({
  decisions, counts: { decided: 0, later: 0, skipped: 0 }, arbitrable,
});

const choose = (kept: string, discarded: string): DecisionAction =>
  ({ type: 'choose', kept_assertion_id: kept, discarded_assertion_ids: [discarded] });

async function startSession() {
  render(<AuditTab project={project} onGoToAnalysis={() => {}} />);
  fireEvent.click(await screen.findByRole('button', { name: /(Commencer|Reprendre) l'arbitrage/ }));
  return screen.findByRole('article', { name: /sur/ });
}

/** Bloc d'actions de la question `id` dans l'étape affichée. */
const questionBlock = (id: string) => screen.getByText(`Question ${id} ?`).closest('section')!;

describe('Arbitrage (F-F3b)', () => {
  let toast: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    seq = 0;
    vi.mocked(onboardingApi.listAnalyses).mockReset().mockResolvedValue({ data: [analysis('an1')], meta: { quota: { used: 1, max: 5 } } });
    vi.mocked(onboardingApi.getAudit).mockReset().mockResolvedValue({ analysisId: 'an1', schemaVersion: '0.6.0', audit: AUDIT, imageIds: [] });
    vi.mocked(onboardingApi.listDecisions).mockReset().mockResolvedValue(state([]));
    vi.mocked(onboardingApi.questionHistory).mockReset().mockResolvedValue([]);
    vi.mocked(onboardingApi.decide).mockReset();
    vi.mocked(onboardingApi.cancelDecision).mockReset();
    toast = vi.spyOn(window.__toastBus!, 'add');
  });
  afterEach(() => { vi.restoreAllMocks(); });

  // ── Entrée ────────────────────────────────────────────────
  it('sous l\'annonce : « Commencer l\'arbitrage », et 0 sur 2 décisions prises', async () => {
    render(<AuditTab project={project} onGoToAnalysis={() => {}} />);
    expect(await screen.findByRole('button', { name: 'Commencer l\'arbitrage' })).toBeInTheDocument();
    expect(screen.getByText('0 sur 2 décisions prises')).toBeInTheDocument();
    expect(onboardingApi.listDecisions).toHaveBeenCalledWith('p1', 'an1');
  });

  it('avec des décisions : « Reprendre », et chaque décision se lit sur sa question', async () => {
    vi.mocked(onboardingApi.listDecisions).mockResolvedValue(state([decision('q3', choose('a2', 'a1'))]));
    render(<AuditTab project={project} onGoToAnalysis={() => {}} />);
    expect(await screen.findByRole('button', { name: 'Reprendre l\'arbitrage' })).toBeInTheDocument();
    expect(screen.getByText('1 sur 2 décisions prises')).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Décision 2' })).toHaveTextContent('Option B retenue — Camille Martin');
  });

  it('audit d\'une analyse précédente (Q2) : décisions en lecture, aucun bouton d\'arbitrage', async () => {
    vi.mocked(onboardingApi.listDecisions).mockResolvedValue(state([decision('q3', { type: 'later' })], false));
    render(<AuditTab project={project} onGoToAnalysis={() => {}} />);
    expect(await screen.findByText(/ses décisions restent consultables/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /arbitrage/ })).not.toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Décision 2' })).toHaveTextContent('Plus tard');
  });

  // ── Session ───────────────────────────────────────────────
  it('A ou B : l\'autre option est écartée, la décision s\'affiche, « Annuler » est proposé', async () => {
    vi.mocked(onboardingApi.decide).mockImplementation(async (_p, _a, body) => decision(body.questionId, body.action));
    const step = await startSession();
    expect(step).toHaveAccessibleName('Décision 1 sur 2');
    expect(step).toHaveTextContent('Question q1 ?');
    expect(step).toHaveTextContent('Question q2 ?');   // même groupe : une seule étape

    fireEvent.click(within(questionBlock('q1')).getByRole('button', { name: 'Retenir B' }));
    await waitFor(() => expect(onboardingApi.decide).toHaveBeenCalledWith('p1', 'an1', {
      questionId: 'q1', expectedCurrentId: null, action: choose('a2', 'a1'),
    }));
    expect(await within(questionBlock('q1')).findByText('Option B retenue')).toBeInTheDocument();
    expect(within(questionBlock('q1')).getByRole('button', { name: 'Annuler' })).toBeInTheDocument();
  });

  it('progression par groupe : l\'étape n\'est faite qu\'une fois ses deux questions tranchées ; « plus tard » reste à faire', async () => {
    vi.mocked(onboardingApi.decide).mockImplementation(async (_p, _a, body) => decision(body.questionId, body.action));
    await startSession();
    const overview = screen.getByRole('navigation', { name: 'Vue d\'ensemble' });
    expect(screen.getByText(/sur 2/, { selector: 'strong' })).toHaveTextContent('0 sur 2');

    fireEvent.click(within(questionBlock('q1')).getByRole('button', { name: 'Retenir A' }));
    await within(questionBlock('q1')).findByText('Option A retenue');
    expect(within(overview).getAllByRole('listitem')[0]).toHaveTextContent('À faire');

    fireEvent.click(within(questionBlock('q2')).getByRole('button', { name: 'Plus tard' }));
    await within(questionBlock('q2')).findByText('Plus tard', { selector: '.obp-decision__badge' });
    expect(within(overview).getAllByRole('listitem')[0]).toHaveTextContent('Plus tard');
    expect(screen.getByText(/sur 2/, { selector: 'strong' })).toHaveTextContent('0 sur 2');

    fireEvent.click(within(questionBlock('q2')).getByRole('button', { name: 'Changer' }));
    fireEvent.click(within(questionBlock('q2')).getByRole('button', { name: 'Retenir B' }));
    await within(questionBlock('q2')).findByText('Option B retenue');
    expect(within(overview).getAllByRole('listitem')[0]).toHaveTextContent('Décidée');
    expect(screen.getByText(/sur 2/, { selector: 'strong' })).toHaveTextContent('1 sur 2');
    // Changer envoie la décision courante affichée.
    expect(vi.mocked(onboardingApi.decide).mock.calls[2][2].expectedCurrentId).toBe('d2');
  });

  it('« Annuler » : retour à la décision précédente, puis question ouverte (Q1)', async () => {
    const first  = decision('q3', { type: 'later' });
    const second = decision('q3', { type: 'skip' }, { supersedesId: first.id });
    vi.mocked(onboardingApi.listDecisions).mockResolvedValue(state([second]));
    vi.mocked(onboardingApi.cancelDecision)
      .mockResolvedValueOnce({ cancelled: { ...second, cancelledAt: 'x', cancelledBy: { id: 'u1', name: 'C' } }, current: first })
      .mockResolvedValueOnce({ cancelled: { ...first, cancelledAt: 'x', cancelledBy: { id: 'u1', name: 'C' } }, current: null });
    await startSession();
    fireEvent.click(screen.getByRole('button', { name: /Décision 2/ }));

    expect(within(questionBlock('q3')).getByText('Passée (non applicable)')).toBeInTheDocument();
    fireEvent.click(within(questionBlock('q3')).getByRole('button', { name: 'Annuler' }));
    expect(await within(questionBlock('q3')).findByText('Plus tard', { selector: '.obp-decision__badge' })).toBeInTheDocument();
    expect(onboardingApi.cancelDecision).toHaveBeenLastCalledWith('p1', 'an1', second.id);

    fireEvent.click(within(questionBlock('q3')).getByRole('button', { name: 'Annuler' }));
    expect(await within(questionBlock('q3')).findByRole('button', { name: 'Retenir A' })).toBeInTheDocument();
    expect(onboardingApi.cancelDecision).toHaveBeenLastCalledWith('p1', 'an1', first.id);
  });

  it('409 DECISION_CONFLICT : message, puis rechargement de l\'état', async () => {
    vi.mocked(onboardingApi.decide).mockRejectedValue(new ApiError('DECISION_CONFLICT', 'x', 409));
    await startSession();
    vi.mocked(onboardingApi.listDecisions).mockResolvedValue(state([decision('q1', { type: 'skip' })]));

    fireEvent.click(within(questionBlock('q1')).getByRole('button', { name: 'Retenir A' }));
    expect(await within(questionBlock('q1')).findByText('Passée (non applicable)')).toBeInTheDocument();
    expect(toast).toHaveBeenCalledWith('Cette question a été modifiée entre-temps.', 'error', expect.anything());
    expect(onboardingApi.listDecisions).toHaveBeenCalledTimes(2);
  });

  it('version C : refusée vide, envoyée avec sa condition', async () => {
    vi.mocked(onboardingApi.decide).mockImplementation(async (_p, _a, body) => decision(body.questionId, body.action));
    await startSession();
    const block = questionBlock('q1');
    fireEvent.click(within(block).getByRole('button', { name: 'Version C' }));
    fireEvent.click(within(block).getByRole('button', { name: 'Enregistrer la version C' }));
    expect(await within(block).findByRole('alert')).toHaveTextContent('Rédigez la version à retenir.');
    expect(onboardingApi.decide).not.toHaveBeenCalled();

    fireEvent.change(within(block).getByLabelText('Version à retenir'), { target: { value: 'Frais : 6 €' } });
    fireEvent.change(within(block).getByLabelText('Condition (facultative)'), { target: { value: 'hors Corse' } });
    fireEvent.click(within(block).getByRole('button', { name: 'Enregistrer la version C' }));
    await waitFor(() => expect(onboardingApi.decide).toHaveBeenCalledWith('p1', 'an1', {
      questionId: 'q1', expectedCurrentId: null,
      action: { type: 'write_version', text: 'Frais : 6 €', condition: { text: 'hors Corse' } },
    }));
  });

  it('cas à confirmer : deux cas distincts préremplis, refusés tant qu\'une condition manque', async () => {
    vi.mocked(onboardingApi.decide).mockImplementation(async (_p, _a, body) => decision(body.questionId, body.action));
    await startSession();
    fireEvent.click(screen.getByRole('tab', { name: /Cas à confirmer/ }));
    const block = questionBlock('q4');
    expect(block.closest('article')).toHaveTextContent('Condition qui séparerait les cas : zone : Corse / Métropole');

    fireEvent.click(within(block).getByRole('button', { name: 'Deux cas distincts' }));
    const caseA = within(block).getByLabelText(/Cas où A s'applique/);
    const caseB = within(block).getByLabelText(/Cas où B s'applique/);
    expect(caseA).toHaveValue('zone : Corse');
    expect(caseB).toHaveValue('zone : Métropole');

    fireEvent.change(caseB, { target: { value: ' ' } });
    fireEvent.click(within(block).getByRole('button', { name: 'Enregistrer les cas' }));
    expect(await within(block).findByRole('alert')).toHaveTextContent('Précisez le cas où l\'option B s\'applique.');
    expect(onboardingApi.decide).not.toHaveBeenCalled();

    fireEvent.change(caseB, { target: { value: 'Métropole' } });
    fireEvent.click(within(block).getByRole('button', { name: 'Enregistrer les cas' }));
    await waitFor(() => expect(onboardingApi.decide).toHaveBeenCalledWith('p1', 'an1', expect.objectContaining({
      questionId: 'q4',
      action: { type: 'distinct_cases', cases: [
        { assertion_id: 'a1', condition: { text: 'zone : Corse' } },
        { assertion_id: 'a2', condition: { text: 'Métropole' } },
      ] },
    })));
  });

  it('« Passer » demande confirmation (jamais window.confirm), puis enregistre « non applicable »', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    vi.mocked(onboardingApi.decide).mockImplementation(async (_p, _a, body) => decision(body.questionId, body.action));
    await startSession();
    fireEvent.click(within(questionBlock('q1')).getByRole('button', { name: 'Passer' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Rien n\'est supprimé');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Passer' }));
    await waitFor(() => expect(onboardingApi.decide).toHaveBeenCalledWith('p1', 'an1', expect.objectContaining({ action: { type: 'skip' } })));
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('historique d\'une question : chaque décision, son auteur, annulée ou non', async () => {
    vi.mocked(onboardingApi.questionHistory).mockResolvedValue([
      decision('q1', { type: 'later' }, { cancelledAt: '2026-09-27T12:05:00Z', cancelledBy: { id: 'u2', name: 'Alex' } }),
      decision('q1', choose('a1', 'a2'), { decidedBy: { id: 'u2', name: 'Alex' } }),
    ]);
    await startSession();
    fireEvent.click(within(questionBlock('q1')).getByText('Historique'));
    await waitFor(() => expect(onboardingApi.questionHistory).toHaveBeenCalledWith('p1', 'an1', 'q1'));
    const list = await within(questionBlock('q1')).findByRole('list', { name: 'Historique de la question' });
    const history = within(list).getAllByRole('listitem');
    expect(history).toHaveLength(2);
    expect(history[0]).toHaveTextContent('Plus tard — Camille Martin');
    expect(history[0]).toHaveTextContent('annulée par Alex');
    expect(history[1]).toHaveTextContent('Option A retenue — Alex');
  });
});

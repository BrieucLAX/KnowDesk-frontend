import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

vi.mock('../../api/onboardingApi', () => ({
  onboardingApi: {
    listAnalyses: vi.fn(), getAudit: vi.fn(), getAuditImage: vi.fn(), listDecisions: vi.fn(),
    cardHistory: vi.fn(), answerCard: vi.fn(), cancelDecision: vi.fn(),
    cardCommentHistory: vi.fn(), commentCard: vi.fn(), cancelCardComment: vi.fn(),
  },
}));

import { onboardingApi } from '../../api/onboardingApi';
import { AuditTab } from '../audit/AuditTab';
import type { AuditResponse } from '../../lib/audit';
import { answersLabel, orderedCards, settledQuestions } from '../../lib/reading';
import { STEPS } from '../../lib/steps';
import type { Decision, DecisionsState } from '../../lib/decisions';
import type { OnboardingAnalysis, OnboardingProject } from '../../types';
import ELYRA_LECTURE from './fixtures/audit-0.16.0-elyra-v2-lecture-4.response.json';

/**
 * Étape « Questions » (lot étape A, US 3.1) sur la lecture réelle d'Elyra (audit 0.16.0) : 20 questions
 * qui attendent une réponse, 3 réglées par KnowDesk (cartes rangées sous une carte de versions).
 */
const RESPONSE = ELYRA_LECTURE as unknown as AuditResponse;
const cards = RESPONSE.reading!.cards;
const ordered = orderedCards(cards);
const [first, second] = ordered.filter(c => c.nature === 'contradiction');

const MB = 1024 * 1024;
const project: OnboardingProject = {
  id: 'p1', name: 'Elyra', createdAt: '', updatedAt: '', documentsCount: 39, totalBytes: 4 * MB, cadrageVersion: 1,
  limits: { maxFileBytes: 50 * MB, maxDocumentsPerProject: 50, maxProjectBytes: 300 * MB, maxFilesPerUpload: 10 },
};
const analysis: OnboardingAnalysis = {
  id: 'a1', status: 'succeeded', stage: 'storing', done: 0, total: 0, llmCalls: 3, llmRetries: 0, cadrageVersion: 1,
  documents: [{ id: 'd1', filename: 'elyra.zip' }], errorCode: null, pipelineVersion: null, createdAt: '2026-11-13T09:00:00Z', createdBy: 'u1',
  submittedAt: null, finishedAt: '2026-11-13T09:10:00Z', deadlineAt: '2026-11-13T10:00:00Z',
};
const answer = (cardId: string, action: Decision['action']): Decision => ({
  id: `d-${cardId}`, questionId: cardId, cardId, groupId: null, conflictIds: null, action, supersedesId: null,
  decidedBy: { id: 'u1', name: 'Camille Martin' }, decidedAt: '2026-11-13T11:00:00Z', cancelledAt: null, cancelledBy: null,
});
const state = (decisions: Decision[]): DecisionsState => ({
  decisions, counts: { decided: decisions.length, later: 0, skipped: 0, cards: cards.length }, arbitrable: true,
});

function mock(decisions: Decision[]) {
  vi.mocked(onboardingApi.listAnalyses).mockResolvedValue({ data: [analysis], meta: { quota: { used: 1, max: 5 } } });
  vi.mocked(onboardingApi.getAudit).mockResolvedValue(RESPONSE);
  vi.mocked(onboardingApi.listDecisions).mockResolvedValue(state(decisions));
  vi.mocked(onboardingApi.cardHistory).mockResolvedValue([]);
  vi.mocked(onboardingApi.cardCommentHistory).mockResolvedValue([]);
}

async function openSession() {
  render(<AuditTab project={project} onGoToAnalysis={() => {}} />);
  fireEvent.click(await screen.findByRole('button', { name: /^(Commencer|Reprendre)$/ }));
  await screen.findByRole('article', { name: /^Question \d+ sur 20/ });
  return screen.getByRole('navigation', { name: 'Liste des questions' });
}

beforeEach(() => { mock([]); });
afterEach(() => { vi.clearAllMocks(); });

describe('« N réponses sur M » : seules les questions qui attendent une réponse comptent', () => {
  it('singulier jusqu\'à 1, pluriel au-delà ; l\'exemple de l\'US : 19 questions dont 7 réglées → « 0 réponse sur 12 »', () => {
    expect(answersLabel(0, 12)).toBe('0 réponse sur 12');
    expect(answersLabel(1, 12)).toBe('1 réponse sur 12');
    expect(answersLabel(2, 12)).toBe('2 réponses sur 12');
    expect(answersLabel(12, 12)).toBe('12 réponses sur 12');
  });

  it('les questions réglées par KnowDesk sont les cartes rangées, une fois chacune, avec la carte qui les règle', () => {
    const settled = settledQuestions(cards);
    expect(settled.map(s => s.ranged.subject)).toEqual([
      'Grille tarifaire Particuliers (remplacement de la version v1 par la v2)',
      'Prix de l\'offre Elyra Fixe 2 ans dans la grille tarifaire v1',
      'Mention du tarif réglementé du gaz dans la formation onboarding',
    ]);
    expect(new Set(settled.map(s => s.ranged.cardId)).size).toBe(3);
    for (const s of settled) expect(cards.find(c => c.id === s.byCardId)?.nature).toMatch(/version/);
    // Aucune n'est une question qui attend une réponse : elles n'entrent pas dans M.
    expect(settled.some(s => cards.some(c => c.id === s.ranged.cardId))).toBe(false);
  });

  it('la session : « 2 réponses sur 20 » ; les réglées par KnowDesk n\'entrent pas dans le compte', async () => {
    mock([answer(first.id, { type: 'accept_side', side: 'A' }), answer(second.id, { type: 'accept_side', side: 'B' })]);
    await openSession();
    expect(screen.getByText('2 réponses sur 20')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Réponses données' })).toHaveAttribute('max', '20');
  });

  it('la vue d\'ensemble : « 0 réponse sur 20 » au départ', async () => {
    render(<AuditTab project={project} onGoToAnalysis={() => {}} />);
    expect(await screen.findByRole('heading', { name: '20 questions attendent votre réponse' })).toBeInTheDocument();
    expect(screen.getByText('0 réponse sur 20')).toBeInTheDocument();
  });
});

describe('Liste des questions : deux blocs, un cercle coché à droite du libellé', () => {
  it('« À vous de répondre · 20 » puis « Réglées par KnowDesk · 3 », en prune avec la mention KnowDesk', async () => {
    const nav = await openSession();
    expect(within(nav).getByRole('heading', { name: 'À vous de répondre · 20' })).toBeInTheDocument();
    const settled = within(nav).getByRole('heading', { name: 'Réglées par KnowDesk · 3' });
    expect(settled.querySelector('.kd-mention')).not.toBeNull();
    expect(within(nav).getAllByRole('heading').map(h => h.textContent)).toEqual(['À vous de répondre · 20', 'Réglées par KnowDesk · 3']);
  });

  it('une question répondue porte le cercle vert « Répondu », une question en attente rien ; jamais de picto à gauche', async () => {
    mock([answer(first.id, { type: 'accept_side', side: 'A' }), answer(ordered[0].id, { type: 'later' })]);
    const nav = await openSession();
    const answered = within(nav).getByRole('button', { name: new RegExp(`^${first.analysis.subject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) });
    const icon = within(answered).getByRole('img', { name: 'Répondu' });
    expect(icon).toHaveClass('obp-q-check');
    expect(answered.lastElementChild).toBe(icon);
    expect(answered.firstElementChild).toHaveClass('obp-clarify-nav__title');
    // « Plus tard » n'est pas une réponse : rien.
    const later = within(nav).getAllByRole('button')[0];
    expect(later).toHaveTextContent(ordered[0].analysis.subject);
    expect(within(later).queryByRole('img')).not.toBeInTheDocument();
    // Les questions qui attendent n'ont aucun picto.
    const todo = within(nav).getAllByRole('button').filter(b => b.querySelector('.obp-q-check'));
    expect(todo).toHaveLength(1);
  });

  it('une question réglée par KnowDesk porte le cercle prune « Réglée par KnowDesk » et ouvre la carte qui la règle', async () => {
    const nav = await openSession();
    const settledBlock = within(nav).getByRole('heading', { name: 'Réglées par KnowDesk · 3' }).closest('section')!;
    const items = within(settledBlock).getAllByRole('button');
    expect(items).toHaveLength(3);
    for (const item of items) {
      const icon = within(item).getByRole('img', { name: 'Réglée par KnowDesk' });
      expect(icon).toHaveClass('kd-check');
      expect(item.lastElementChild).toBe(icon);
    }
    fireEvent.click(items[2]);
    const reuse = settledQuestions(cards)[2].byCardId;
    expect(await screen.findByRole('article', { name: new RegExp(`^Question ${ordered.findIndex(c => c.id === reuse) + 1} sur 20`) })).toBeInTheDocument();
  });

  it('navigation : « Question suivante », et le mot « trancher » n\'apparaît nulle part', async () => {
    await openSession();
    expect(screen.getByRole('button', { name: 'Question suivante' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Suivante$|Point suivant/ })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/tranch/i);
  });
});

describe('Étape « Questions » : le nom de l\'étape', () => {
  it('le stepper dit « Questions », plus « À clarifier » ni « Points à trancher » ; l\'URL reste `audit`', () => {
    const step = STEPS.find(s => s.id === 'audit')!;
    expect(step.label).toBe('Questions');
    expect(step.lead).not.toMatch(/carte|tranch/i);
    expect(STEPS.map(s => s.label)).not.toContain('À clarifier');
  });

  it('la vue d\'ensemble ne dit jamais « trancher »', async () => {
    render(<AuditTab project={project} onGoToAnalysis={() => {}} />);
    await screen.findByRole('heading', { name: '20 questions attendent votre réponse' });
    expect(document.body.textContent).not.toMatch(/tranch/i);
    expect(screen.getByRole('heading', { name: 'Réglées par KnowDesk · 3' })).toBeInTheDocument();
  });
});

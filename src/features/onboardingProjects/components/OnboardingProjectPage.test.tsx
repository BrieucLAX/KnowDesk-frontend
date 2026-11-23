import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('../api/onboardingApi', () => ({
  onboardingApi: {
    getProject: vi.fn(), renameProject: vi.fn(),
    getNotice: vi.fn(), listDocuments: vi.fn(), deleteDocument: vi.fn(), uploadDocuments: vi.fn(),
    getCadrage: vi.fn(), listCadrages: vi.fn(), saveCadrage: vi.fn(), saveFreeCadrage: vi.fn(),
    listAnalyses: vi.fn(), getAnalysis: vi.fn(), launchAnalysis: vi.fn(),
    getAudit: vi.fn(), getAuditImage: vi.fn(), listAuditImages: vi.fn(), listDecisions: vi.fn(), listCorrections: vi.fn(),
  },
}));

import { onboardingApi } from '../api/onboardingApi';
import { ApiError } from '../../../shared/lib/apiClient';
import { mockViewportWidth } from '../../../test/matchMedia';
import { OnboardingProjectPage, type ProjectTab } from './OnboardingProjectPage';
import { NATURES } from '../lib/reading';
import type { AuditResponse } from '../lib/audit';
import type { Decision, DecisionsState } from '../lib/decisions';
import type { OnboardingAnalysis, OnboardingProject } from '../types';
import PILOTE_2 from './clarify/fixtures/audit-0.8.0-pilote-2.response.json';

const MB = 1024 * 1024;
const project = (extra: Partial<OnboardingProject> = {}): OnboardingProject => ({
  id: 'p1', name: 'Base SAV', createdAt: '', updatedAt: '', documentsCount: 2, totalBytes: 2 * MB, cadrageVersion: null,
  limits: { maxFileBytes: 50 * MB, maxDocumentsPerProject: 50, maxProjectBytes: 300 * MB, maxFilesPerUpload: 10 },
  ...extra,
});
const analysis = (extra: Partial<OnboardingAnalysis> = {}): OnboardingAnalysis => ({
  id: 'a1', status: 'succeeded', stage: 'storing', done: 0, total: 0, llmCalls: 3, llmRetries: 0, cadrageVersion: 1,
  documents: [{ id: 'd1', filename: 'notion.zip' }], errorCode: null, pipelineVersion: null, createdAt: '2026-10-02T10:00:00Z',
  createdBy: 'u1', submittedAt: null, finishedAt: '2026-10-02T10:04:00Z', deadlineAt: '2026-10-02T11:00:00Z', ...extra,
});
const RESPONSE_2 = PILOTE_2 as unknown as AuditResponse;
const cards = RESPONSE_2.reading!.cards;
const state = (decisions: Decision[]): DecisionsState => ({
  decisions, counts: { decided: decisions.length, later: 0, skipped: 0, cards: cards.length }, arbitrable: true,
});
const answer = (cardId: string): Decision => ({
  id: `d-${cardId}`, questionId: cardId, cardId, groupId: null, conflictIds: null, action: { type: 'same_meaning' }, supersedesId: null,
  decidedBy: { id: 'u1', name: 'Camille Martin' }, decidedAt: '2026-10-02T11:00:00Z', cancelledAt: null, cancelledBy: null,
});

function renderPage(tab: ProjectTab, extra: Partial<React.ComponentProps<typeof OnboardingProjectPage>> = {}) {
  const onTabChange = vi.fn();
  const utils = render(<OnboardingProjectPage projectId="p1" tab={tab} onTabChange={onTabChange} onBack={() => {}} {...extra} />);
  return { ...utils, onTabChange };
}
const steps = () => screen.getByRole('navigation', { name: 'Étapes du projet' });
const step = (name: string | RegExp) => within(steps()).getByRole('button', { name });
const bar = async () => screen.findByRole('region', { name: 'Action de l\'étape' });

let restore: () => void = () => {};
beforeEach(() => {
  restore = mockViewportWidth(1440);
  vi.mocked(onboardingApi.getProject).mockReset().mockResolvedValue(project());
  vi.mocked(onboardingApi.getNotice).mockResolvedValue({ version: 'v', text: 'Texte', sha256: 'h', acceptedAt: '2026-09-27T08:00:00Z' });
  vi.mocked(onboardingApi.listDocuments).mockResolvedValue([]);
  vi.mocked(onboardingApi.getCadrage).mockRejectedValue(new ApiError('NOT_FOUND', 'Aucun cadrage.', 404));
  vi.mocked(onboardingApi.listCadrages).mockResolvedValue([]);
  vi.mocked(onboardingApi.listAnalyses).mockReset().mockResolvedValue({ data: [], meta: { quota: { used: 0, max: 5 } } });
  vi.mocked(onboardingApi.listDecisions).mockReset().mockResolvedValue(state([]));
  vi.mocked(onboardingApi.getAudit).mockReset().mockResolvedValue(RESPONSE_2);
  vi.mocked(onboardingApi.listCorrections).mockReset().mockResolvedValue({ data: [], meta: { quota: { used: 0, max: 5 } } });
  vi.mocked(onboardingApi.listAuditImages).mockResolvedValue([]);
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});
afterEach(() => restore());

describe('Page projet : bandeau et étapes (lot 7b)', () => {
  it('le bandeau dit le projet et l\'étape ; « Renommer le projet » en un clic, hors du bandeau', async () => {
    renderPage('cadrage');
    expect(await screen.findByText('Base SAV')).toBeInTheDocument();
    const banner = screen.getByRole('banner');
    expect(within(banner).getByRole('heading', { level: 1, name: 'Fiche de cadrage' })).toBeInTheDocument();
    expect(within(banner).getByRole('button', { name: 'Tous les projets' })).toBeInTheDocument();
    // Aucun autre bouton dans le bandeau.
    expect(within(banner).getAllByRole('button')).toHaveLength(1);
    expect(step('Fiche de cadrage')).toHaveAttribute('aria-current', 'step');
    fireEvent.click(screen.getByRole('button', { name: 'Renommer le projet' }));
    expect(await screen.findByRole('dialog', { name: 'Renommer le projet' })).toBeInTheDocument();
  });

  it('les étapes s\'ouvrent dans n\'importe quel ordre', async () => {
    const { onTabChange } = renderPage('documents');
    await screen.findByText('Base SAV');
    fireEvent.click(step('Nouvelle base'));
    fireEvent.click(step('Analyse'));
    expect(onTabChange.mock.calls).toEqual([['base'], ['analysis']]);
  });

  it('garde-fou : la fiche modifiée et non enregistrée, une autre étape demande « Quitter sans enregistrer ? »', async () => {
    const { onTabChange } = renderPage('cadrage');
    fireEvent.change(await screen.findByLabelText(/Texte de la fiche/), { target: { value: 'Nos offres' } });
    fireEvent.click(step('Analyse'));
    const dialog = await screen.findByRole('dialog', { name: 'Quitter sans enregistrer ?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Rester' }));
    expect(onTabChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Texte de la fiche/)).toHaveValue('Nos offres');

    fireEvent.click(step('Analyse'));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Quitter sans enregistrer' }));
    expect(onTabChange).toHaveBeenCalledWith('analysis');
  });
});

describe('Page projet : barre d\'action (lot 7b)', () => {
  it('Fiche de cadrage : « Enregistrer une nouvelle version » est dans la barre, grisé tant que rien ne change', async () => {
    renderPage('cadrage');
    const save = await within(await bar()).findByRole('button', { name: 'Enregistrer une nouvelle version' });
    expect(save).toBeDisabled();
    expect(within(await bar()).getByText('Aucune modification à enregistrer.')).toBeInTheDocument();
    // Le seul bouton d'enregistrement de l'écran.
    expect(screen.getAllByRole('button', { name: 'Enregistrer une nouvelle version' })).toHaveLength(1);
    fireEvent.change(screen.getByLabelText(/Texte de la fiche/), { target: { value: 'Nos offres' } });
    expect(save).toBeEnabled();
    // Hors du formulaire dans le DOM, il l'envoie quand même.
    vi.mocked(onboardingApi.saveFreeCadrage).mockResolvedValue({
      version: 1, kind: 'free', sourceFilename: null, createdAt: '2026-11-22T10:00:00Z', createdBy: 'u1', markdown: 'Nos offres', form: null, missingDocuments: [],
    });
    fireEvent.click(save);
    await waitFor(() => expect(onboardingApi.saveFreeCadrage).toHaveBeenCalledWith('p1', 'Nos offres', null));
  });

  it('Analyse : « Lancer l\'analyse » est dans la barre, grisé avec le même message qu\'avant', async () => {
    vi.mocked(onboardingApi.getProject).mockResolvedValue(project({ cadrageVersion: null }));
    renderPage('analysis');
    const launch = await within(await bar()).findByRole('button', { name: 'Lancer l\'analyse' });
    expect(launch).toBeDisabled();
    expect(within(await bar()).getByText('Enregistrez la fiche de cadrage pour lancer l\'analyse.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Lancer l\'analyse' })).toHaveLength(1);
  });

  it('Analyse : sans blocage, le bouton est actif et la note dit ce qui va se passer', async () => {
    vi.mocked(onboardingApi.getProject).mockResolvedValue(project({ cadrageVersion: 2 }));
    renderPage('analysis');
    expect(await within(await bar()).findByRole('button', { name: 'Lancer l\'analyse' })).toBeEnabled();
    expect(within(await bar()).getByText(/seront figés/)).toBeInTheDocument();
  });

  it('Documents : sans action principale, « Continuer : Fiche de cadrage »', async () => {
    const { onTabChange } = renderPage('documents');
    fireEvent.click(await within(await bar()).findByRole('button', { name: /Continuer : Fiche de cadrage/ }));
    expect(onTabChange).toHaveBeenCalledWith('cadrage');
  });
});

describe('Page projet : étapes terminées (lot 7b)', () => {
  const doneNames = () => within(steps()).getAllByRole('button').map(b => b.getAttribute('aria-label')).filter(Boolean);

  it('rien de connu : toutes les étapes restent neutres', async () => {
    vi.mocked(onboardingApi.getProject).mockResolvedValue(project({ documentsCount: 0, cadrageVersion: null }));
    renderPage('documents');
    await screen.findByText('Base SAV');
    expect(doneNames()).toEqual([]);
  });

  it('un document et une fiche enregistrée : Documents et Fiche de cadrage terminées ; l\'analyse, pas encore lue, reste neutre', async () => {
    vi.mocked(onboardingApi.getProject).mockResolvedValue(project({ documentsCount: 1, cadrageVersion: 1 }));
    renderPage('documents');
    await screen.findByText('Base SAV');
    expect(doneNames()).toEqual(['Documents (terminée)', 'Fiche de cadrage (terminée)']);
  });

  it('une analyse réussie, lue par « Analyse » : Analyse terminée ; une analyse en échec seule, non', async () => {
    vi.mocked(onboardingApi.listAnalyses).mockResolvedValue({ data: [analysis({ status: 'failed', errorCode: 'TIMEOUT' })], meta: { quota: { used: 1, max: 5 } } });
    const { unmount } = renderPage('analysis');
    await screen.findByText('Analyse interrompue');
    expect(doneNames()).not.toContain('Analyse (terminée)');
    unmount();

    vi.mocked(onboardingApi.listAnalyses).mockResolvedValue({ data: [analysis()], meta: { quota: { used: 1, max: 5 } } });
    renderPage('analysis');
    await waitFor(() => expect(step('Analyse (terminée)')).toBeInTheDocument());
  });

  it('À clarifier : terminée quand aucune carte bloquante n\'est sans réponse, neutre sinon', async () => {
    vi.mocked(onboardingApi.listAnalyses).mockResolvedValue({ data: [analysis()], meta: { quota: { used: 1, max: 5 } } });
    const blocking = cards.filter(c => NATURES[c.nature].blocking);
    expect(blocking.length).toBeGreaterThan(1);
    // Une carte bloquante sans réponse.
    vi.mocked(onboardingApi.listDecisions).mockResolvedValue(state(blocking.slice(1).map(c => answer(c.id))));
    const { unmount } = renderPage('audit');
    await waitFor(() => expect(step('Analyse (terminée)')).toBeInTheDocument());
    await screen.findByRole('button', { name: 'Reprendre' });
    expect(step('À clarifier')).toBeInTheDocument();
    unmount();

    vi.mocked(onboardingApi.listDecisions).mockResolvedValue(state(blocking.map(c => answer(c.id))));
    renderPage('audit');
    await waitFor(() => expect(step('À clarifier (terminée)')).toBeInTheDocument());
  });

  it('« Nouvelle base » dit aussi ce qu\'elle a lu : l\'analyse réussie et les cartes bloquantes toutes répondues', async () => {
    vi.mocked(onboardingApi.listAnalyses).mockResolvedValue({ data: [analysis()], meta: { quota: { used: 1, max: 5 } } });
    vi.mocked(onboardingApi.listDecisions).mockResolvedValue(state(cards.filter(c => NATURES[c.nature].blocking).map(c => answer(c.id))));
    renderPage('base');
    await waitFor(() => expect(step('À clarifier (terminée)')).toBeInTheDocument());
    expect(step('Analyse (terminée)')).toBeInTheDocument();
    expect(step('Nouvelle base')).toHaveAttribute('aria-current', 'step');
  });
});

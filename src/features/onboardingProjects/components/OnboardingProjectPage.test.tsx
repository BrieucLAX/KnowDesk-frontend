import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('../api/onboardingApi', () => ({
  onboardingApi: {
    getProject: vi.fn(), renameProject: vi.fn(),
    getNotice: vi.fn(), listDocuments: vi.fn(), deleteDocument: vi.fn(), uploadDocuments: vi.fn(), listDocumentTypes: vi.fn(), updateDocument: vi.fn(),
    getCadrage: vi.fn(), listCadrages: vi.fn(), saveCadrage: vi.fn(), saveFreeCadrage: vi.fn(),
    listAnalyses: vi.fn(), getAnalysis: vi.fn(), launchAnalysis: vi.fn(),
    getAudit: vi.fn(), getAuditImage: vi.fn(), listAuditImages: vi.fn(), listDecisions: vi.fn(), listCorrections: vi.fn(),
  },
}));

import { onboardingApi } from '../api/onboardingApi';
import { ApiError } from '../../../shared/lib/apiClient';
import { mockViewportWidth } from '../../../test/matchMedia';
import { OnboardingProjectPage, type ProjectTab } from './OnboardingProjectPage';
import type { AuditResponse } from '../lib/audit';
import type { Decision, DecisionsState } from '../lib/decisions';
import type { ProjectStatus } from '../types';
import type { OnboardingAnalysis, OnboardingProject } from '../types';
import PILOTE_2 from './clarify/fixtures/audit-0.8.0-pilote-2.response.json';
import { useAuthStore } from '../../../store/authStore';
import type { AuthSession } from '../../auth/types';

const MB = 1024 * 1024;
const project = (extra: Partial<OnboardingProject> = {}): OnboardingProject => ({
  id: 'p1', name: 'Base SAV', createdAt: '', updatedAt: '', documentsCount: 2, totalBytes: 2 * MB, cadrageVersion: null,
  status: 'contexte', currentStep: 2, completedSteps: 1, publishedAt: null,
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
const session: AuthSession = {
  user:         { id: 'u1', email: 'admin@fixtures.local', role: 'admin', onboardingDone: true, emailVerified: true },
  organization: { id: 'o1', name: 'Elyra Énergie', slug: 'elyra', plan: 'free', enabledModules: ['onboarding'] },
};

/** Le statut et l'étape en cours tels que le back les rend (`onboarding.projectStatus`). */
const AT: Record<ProjectStatus, Pick<OnboardingProject, 'status' | 'currentStep' | 'completedSteps'>> = {
  documents:          { status: 'documents',          currentStep: 1, completedSteps: 0 },
  contexte:           { status: 'contexte',           currentStep: 2, completedSteps: 1 },
  analyse_en_cours:   { status: 'analyse_en_cours',   currentStep: 3, completedSteps: 2 },
  questions:          { status: 'questions',          currentStep: 3, completedSteps: 2 },
  plan:               { status: 'plan',               currentStep: 4, completedSteps: 3 },
  redaction_en_cours: { status: 'redaction_en_cours', currentStep: 5, completedSteps: 4 },
  relecture:          { status: 'relecture',          currentStep: 5, completedSteps: 4 },
  publie:             { status: 'publie',             currentStep: 5, completedSteps: 5 },
};

function renderPage(tab: ProjectTab | null, extra: Partial<React.ComponentProps<typeof OnboardingProjectPage>> = {}) {
  const onTabChange = vi.fn();
  const utils = render(<OnboardingProjectPage projectId="p1" tab={tab} onTabChange={onTabChange} onBack={() => {}} {...extra} />);
  return { ...utils, onTabChange };
}
const steps = () => screen.getByRole('navigation', { name: 'Étapes du projet' });
const step = (name: string | RegExp) => within(steps()).getByRole('button', { name });
const bar = async () => screen.findByRole('region', { name: 'Action de l\'étape' });
const stepClasses = () => [...steps().querySelectorAll('li')].map(li =>
  ['done', 'current', 'upcoming'].find(s => li.classList.contains(`parcours-stepper__step--${s}`)));

let restore: () => void = () => {};
beforeEach(() => {
  restore = mockViewportWidth(1440);
  useAuthStore.setState({ session, isLoaded: true, onboardingDone: true, sessionEndedReason: null, impersonating: null });
  vi.mocked(onboardingApi.getProject).mockReset().mockResolvedValue(project());
  vi.mocked(onboardingApi.getNotice).mockResolvedValue({ version: 'v', text: 'Texte', sha256: 'h', acceptedAt: '2026-09-27T08:00:00Z' });
  vi.mocked(onboardingApi.listDocuments).mockResolvedValue([]);
  vi.mocked(onboardingApi.listDocumentTypes).mockResolvedValue([]);
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

describe('Page projet : structure d\'écran (lot 1 « Socle », règles transverses 1 et 2)', () => {
  it('en-tête « ORGANISATION · BASE DE CONNAISSANCE », titre et phrase de la maquette, retour « Mes projets », aucun autre bouton', async () => {
    renderPage('cadrage');
    await screen.findByText('Elyra Énergie · Base de connaissance');
    const banner = screen.getByRole('banner');
    expect(within(banner).getByText('Elyra Énergie · Base de connaissance')).toBeInTheDocument();
    expect(within(banner).getByRole('heading', { level: 1, name: 'Votre contexte métier' })).toBeInTheDocument();
    expect(within(banner).getByRole('button', { name: 'Mes projets' })).toBeInTheDocument();
    expect(within(banner).getAllByRole('button')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Renommer le projet' }));
    expect(await screen.findByRole('dialog', { name: 'Renommer le projet' })).toBeInTheDocument();
  });

  it('les titres des cinq écrans sont ceux des maquettes', async () => {
    const titles: Array<[ProjectTab, string]> = [
      ['documents', 'Importez vos documents'], ['cadrage', 'Votre contexte métier'], ['audit', 'Questions'],
      ['plan', 'Le plan de votre base'], ['relecture', 'Relisez vos articles'],
    ];
    for (const [tab, title] of titles) {
      const { unmount } = renderPage(tab);
      await screen.findByText('Elyra Énergie · Base de connaissance');
      expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
      unmount();
    }
  });

  it('cinq étapes, l\'analyse n\'en est pas une ; elles s\'ouvrent dans n\'importe quel ordre', async () => {
    const { onTabChange } = renderPage('documents');
    await screen.findByText('Elyra Énergie · Base de connaissance');
    const labels = within(steps()).getAllByRole('button').map(b => b.textContent);
    expect(labels).toEqual(['Documents', 'Contexte métier', 'Questions', 'Plan', 'Relecture et publication']);
    fireEvent.click(step(/^Relecture et publication/));
    fireEvent.click(step(/^Questions/));
    expect(onTabChange.mock.calls).toEqual([['relecture'], ['audit']]);
  });

  it('garde-fou : la fiche modifiée et non enregistrée, une autre étape demande « Quitter sans enregistrer ? »', async () => {
    const { onTabChange } = renderPage('cadrage');
    fireEvent.change(await screen.findByLabelText(/Texte de la fiche/), { target: { value: 'Nos offres' } });
    fireEvent.click(step(/^Questions/));
    const dialog = await screen.findByRole('dialog', { name: 'Quitter sans enregistrer ?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Rester' }));
    expect(onTabChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Texte de la fiche/)).toHaveValue('Nos offres');

    fireEvent.click(step(/^Questions/));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Quitter sans enregistrer' }));
    expect(onTabChange).toHaveBeenCalledWith('audit');
  });
});

describe('Page projet : stepper lu dans le statut du projet (lot 1 « Socle »)', () => {
  it('projet vide : il s\'ouvre sur l\'étape 1, en cours, les autres à venir', async () => {
    vi.mocked(onboardingApi.getProject).mockResolvedValue(project({ documentsCount: 0, ...AT.documents }));
    const { onTabChange } = renderPage(null);
    await waitFor(() => expect(onTabChange).toHaveBeenCalledWith('documents'));
    expect(await screen.findByRole('heading', { level: 1, name: 'Importez vos documents' })).toBeInTheDocument();
    expect(step('Documents (en cours)')).toHaveAttribute('aria-current', 'step');
    expect(stepClasses()).toEqual(['current', 'upcoming', 'upcoming', 'upcoming', 'upcoming']);
    fireEvent.click(await within(await bar()).findByRole('button', { name: /Continuer vers le contexte métier/ }));
    expect(onTabChange).toHaveBeenLastCalledWith('cadrage');
  });

  it('sans étape demandée, le projet s\'ouvre sur son étape en cours', async () => {
    vi.mocked(onboardingApi.getProject).mockResolvedValue(project(AT.plan));
    const { onTabChange } = renderPage(null);
    await waitFor(() => expect(onTabChange).toHaveBeenCalledWith('plan'));
  });

  it('chaque statut : terminées en vert, en cours en pétrole, à venir en gris ; rien n\'est déduit des écrans', async () => {
    const expected: Array<[ProjectStatus, string[]]> = [
      ['contexte',           ['done', 'current', 'upcoming', 'upcoming', 'upcoming']],
      ['analyse_en_cours',   ['done', 'done', 'current', 'upcoming', 'upcoming']],
      ['questions',          ['done', 'done', 'current', 'upcoming', 'upcoming']],
      ['plan',               ['done', 'done', 'done', 'current', 'upcoming']],
      ['redaction_en_cours', ['done', 'done', 'done', 'done', 'current']],
      ['relecture',          ['done', 'done', 'done', 'done', 'current']],
      ['publie',             ['done', 'done', 'done', 'done', 'done']],
    ];
    for (const [status, classes] of expected) {
      vi.mocked(onboardingApi.getProject).mockResolvedValue(project(AT[status]));
      const { unmount } = renderPage('documents');
      await screen.findByText('Elyra Énergie · Base de connaissance');
      expect([status, stepClasses()]).toEqual([status, classes]);
      unmount();
    }
    // Une fiche enregistrée et des documents ne suffisent pas : le statut du back fait foi.
    vi.mocked(onboardingApi.getProject).mockResolvedValue(project({ documentsCount: 3, cadrageVersion: 2, ...AT.documents }));
    renderPage('documents');
    await screen.findByText('Elyra Énergie · Base de connaissance');
    expect(stepClasses()).toEqual(['current', 'upcoming', 'upcoming', 'upcoming', 'upcoming']);
  });

  it('back d\'avant la migration (statut null) : l\'étape 1 en cours, rien de terminé', async () => {
    vi.mocked(onboardingApi.getProject).mockResolvedValue(project({ status: null, currentStep: null, completedSteps: null }));
    renderPage('documents');
    await screen.findByText('Elyra Énergie · Base de connaissance');
    expect(stepClasses()).toEqual(['current', 'upcoming', 'upcoming', 'upcoming', 'upcoming']);
  });
});

describe('Page projet : une seule action principale, qui mène à l\'étape suivante', () => {
  it('Contexte métier : « Valider et lancer l\'analyse », grisé avec le même message qu\'avant ; note sur la durée et l\'e-mail', async () => {
    vi.mocked(onboardingApi.getProject).mockResolvedValue(project({ cadrageVersion: null }));
    renderPage('cadrage');
    const launch = await within(await bar()).findByRole('button', { name: /Valider et lancer l'analyse/ });
    expect(launch).toBeDisabled();
    expect(within(await bar()).getByText('Enregistrez la fiche de cadrage pour lancer l\'analyse.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Valider et lancer l'analyse/ })).toHaveLength(1);
  });

  it('Contexte métier : la fiche enregistrée, l\'analyse se lance avec la confirmation existante, puis l\'étape 3 s\'ouvre', async () => {
    vi.mocked(onboardingApi.getProject).mockResolvedValue(project({ cadrageVersion: 2 }));
    vi.mocked(onboardingApi.launchAnalysis).mockResolvedValue(analysis({ status: 'queued' }));
    const { onTabChange } = renderPage('cadrage');
    await waitFor(async () => expect(await within(await bar()).findByRole('button', { name: /Valider et lancer l'analyse/ })).toBeEnabled());
    expect(within(await bar()).getByText('L\'analyse prend jusqu\'à une heure. Nous vous prévenons par e-mail.')).toBeInTheDocument();
    fireEvent.click(within(await bar()).getByRole('button', { name: /Valider et lancer l'analyse/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Lancer l\'analyse ?' });
    expect(dialog).toHaveTextContent('seront figés');
    expect(dialog).not.toHaveTextContent(/version|restera/i);   // ni « version N », ni quota
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lancer l\'analyse' }));
    await waitFor(() => expect(onboardingApi.launchAnalysis).toHaveBeenCalledWith('p1'));
    await waitFor(() => expect(onTabChange).toHaveBeenCalledWith('audit'));
  });

  it('Contexte métier : la fiche modifiée, l\'action principale devient « Enregistrer la fiche » (une seule à la fois)', async () => {
    vi.mocked(onboardingApi.getProject).mockResolvedValue(project({ cadrageVersion: 2 }));
    renderPage('cadrage');
    fireEvent.change(await screen.findByLabelText(/Texte de la fiche/), { target: { value: 'Nos offres' } });
    const save = await within(await bar()).findByRole('button', { name: 'Enregistrer la fiche' });
    expect(within(await bar()).queryByRole('button', { name: /Valider et lancer l'analyse/ })).toBeNull();
    vi.mocked(onboardingApi.saveFreeCadrage).mockResolvedValue({
      version: 3, kind: 'free', sourceFilename: null, createdAt: '2026-11-22T10:00:00Z', createdBy: 'u1', markdown: 'Nos offres', form: null, missingDocuments: [],
    });
    fireEvent.click(save);
    await waitFor(() => expect(onboardingApi.saveFreeCadrage).toHaveBeenCalledWith('p1', 'Nos offres', null));
  });

  it('Contexte métier : ni « Version N » ni historique des versions', async () => {
    vi.mocked(onboardingApi.getProject).mockResolvedValue(project({ cadrageVersion: 2 }));
    renderPage('cadrage');
    await screen.findByLabelText(/Texte de la fiche/);
    expect(screen.queryByText(/Version \d/)).toBeNull();
    expect(screen.queryByText(/Historique/)).toBeNull();
  });

  it('Questions pendant l\'analyse : une attente simple, sans chiffre technique, et pas de barre', async () => {
    vi.mocked(onboardingApi.getProject).mockResolvedValue(project({ cadrageVersion: 1, ...AT.analyse_en_cours }));
    vi.mocked(onboardingApi.listAnalyses).mockResolvedValue({ data: [analysis({ status: 'running', llmCalls: 120 })], meta: { quota: { used: 1, max: 5 } } });
    renderPage('audit');
    const waiting = await screen.findByRole('status');
    expect(waiting).toHaveTextContent('L\'analyse de vos documents est en cours');
    expect(waiting).toHaveTextContent('nous vous prévenons par e-mail');
    expect(screen.queryByText(/120|appels|IA/)).toBeNull();
    expect(onboardingApi.getAudit).not.toHaveBeenCalled();
    expect(document.querySelector('[aria-label="Action de l\'étape"]')).toHaveAttribute('hidden');
  });

  it('Documents : « Continuer vers le contexte métier → »', async () => {
    const { onTabChange } = renderPage('documents');
    fireEvent.click(await within(await bar()).findByRole('button', { name: /Continuer vers le contexte métier/ }));
    expect(onTabChange).toHaveBeenCalledWith('cadrage');
  });
});

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';

vi.mock('../api/onboardingApi', () => ({
  onboardingApi: { listAnalyses: vi.fn(), getAnalysis: vi.fn(), launchAnalysis: vi.fn(), listDecisions: vi.fn() },
}));

import { onboardingApi } from '../api/onboardingApi';
import { ApiError } from '../../../shared/lib/apiClient';
import { AnalysisTab } from './AnalysisTab';
import type { OnboardingAnalysis, OnboardingProject } from '../types';

const MB = 1024 * 1024;
const project = (extra: Partial<OnboardingProject> = {}): OnboardingProject => ({
  id: 'p1', name: 'Base SAV', createdAt: '', updatedAt: '', documentsCount: 2, totalBytes: 2 * MB, cadrageVersion: 3,
  limits: { maxFileBytes: 50 * MB, maxDocumentsPerProject: 50, maxProjectBytes: 300 * MB, maxFilesPerUpload: 10 },
  ...extra,
});

const analysis = (extra: Partial<OnboardingAnalysis> = {}): OnboardingAnalysis => ({
  id: 'a1', status: 'queued', stage: null, done: 0, total: 0, llmCalls: 0, llmRetries: 0, cadrageVersion: 3,
  documents: [{ id: 'd1', filename: 'cgv.pdf' }, { id: 'd2', filename: 'fiche.pdf' }], errorCode: null,
  pipelineVersion: null, createdAt: new Date().toISOString(), createdBy: 'u1', submittedAt: null, finishedAt: null,
  deadlineAt: new Date(Date.now() + 3600_000).toISOString(), ...extra,
});

const listed = (data: OnboardingAnalysis[], used = data.length) => ({ data, meta: { quota: { used, max: 5 } } });

describe('AnalysisTab', () => {
  beforeEach(() => {
    vi.mocked(onboardingApi.listAnalyses).mockReset().mockResolvedValue(listed([]));
    vi.mocked(onboardingApi.getAnalysis).mockReset();
    vi.mocked(onboardingApi.launchAnalysis).mockReset();
    vi.mocked(onboardingApi.listDecisions).mockReset();
  });
  afterEach(() => { vi.useRealTimers(); });

  it('lance l\'analyse après confirmation, puis affiche sa progression', async () => {
    vi.mocked(onboardingApi.launchAnalysis).mockResolvedValue(analysis());
    const onChanged = vi.fn();
    render(<AnalysisTab project={project()} onChanged={onChanged} onOpenAudit={() => {}} />);

    expect(await screen.findByText('Analyses restantes : 5 sur 5')).toBeInTheDocument();
    expect(screen.getByText('Fiche de cadrage : version 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lancer l\'analyse' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Les 2 documents du projet et la version 3');
    expect(dialog).toHaveTextContent('vous ne pourrez plus retirer ces documents');
    expect(dialog).toHaveTextContent('Il vous restera 4 analyses.');
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Lancer l\'analyse' }));

    expect(await screen.findByRole('heading', { name: 'Analyse en attente de démarrage' })).toBeInTheDocument();
    expect(onboardingApi.launchAnalysis).toHaveBeenCalledWith('p1');
    expect(onChanged).toHaveBeenCalled();
    // Pas de second lancement pendant qu'une analyse est active.
    expect(screen.queryByRole('button', { name: 'Lancer l\'analyse' })).not.toBeInTheDocument();
  });

  it('bloque le lancement sans document, sans fiche, ou quota atteint', async () => {
    const { unmount } = render(<AnalysisTab project={project({ documentsCount: 0 })} onChanged={() => {}} onOpenAudit={() => {}} />);
    expect(await screen.findByText(/Importez au moins un document/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lancer l\'analyse' })).toBeDisabled();
    unmount();

    const second = render(<AnalysisTab project={project({ cadrageVersion: null })} onChanged={() => {}} onOpenAudit={() => {}} />);
    expect(await screen.findByText(/Enregistrez la fiche de cadrage/)).toBeInTheDocument();
    second.unmount();

    vi.mocked(onboardingApi.listAnalyses).mockResolvedValue(listed([analysis({ status: 'succeeded', finishedAt: new Date().toISOString() })], 5));
    render(<AnalysisTab project={project()} onChanged={() => {}} onOpenAudit={() => {}} />);
    expect(await screen.findByText(/a atteint son nombre d'analyses \(5\)/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lancer l\'analyse' })).toBeDisabled();
  });

  it('refus du back : message affiché, rien d\'ajouté', async () => {
    vi.mocked(onboardingApi.launchAnalysis).mockRejectedValue(
      new ApiError('ANALYSIS_QUOTA_EXCEEDED', 'Votre espace a atteint son nombre d\'analyses (5).', 409),
    );
    render(<AnalysisTab project={project()} onChanged={() => {}} onOpenAudit={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Lancer l\'analyse' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Lancer l\'analyse' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: /Analyse en/ })).not.toBeInTheDocument();
  });

  it('relit l\'analyse active toutes les 5 s et s\'arrête à la fin', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(onboardingApi.listAnalyses).mockResolvedValue(listed([analysis({ status: 'running', stage: 'parsing', done: 1, total: 2 })]));
    vi.mocked(onboardingApi.getAnalysis)
      .mockResolvedValueOnce(analysis({ status: 'running', stage: 'extraction', done: 2, total: 2, llmCalls: 17 }))
      .mockResolvedValueOnce(analysis({ status: 'succeeded', stage: 'storing', llmCalls: 60, finishedAt: new Date().toISOString() }));
    render(<AnalysisTab project={project()} onChanged={() => {}} onOpenAudit={() => {}} />);

    expect(await screen.findByRole('heading', { name: 'Analyse en cours' })).toBeInTheDocument();
    expect(screen.getByText('Lecture des documents').closest('li')).toHaveTextContent('1 / 2');

    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(screen.getByText('Extraction des informations').closest('li')).toHaveTextContent('2 / 2');
    expect(screen.getByText('17')).toBeInTheDocument();

    vi.mocked(onboardingApi.listAnalyses).mockResolvedValue(listed([analysis({ status: 'succeeded', llmCalls: 60, finishedAt: new Date().toISOString() })]));
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(await screen.findByRole('heading', { name: 'Analyse terminée' })).toBeInTheDocument();
    expect(onboardingApi.getAnalysis).toHaveBeenCalledWith('p1', 'a1');

    await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
    expect(onboardingApi.getAnalysis).toHaveBeenCalledTimes(2);
    // Terminée : on peut en relancer une.
    expect(screen.getByRole('heading', { name: 'Lancer une nouvelle analyse' })).toBeInTheDocument();
  });

  describe('nouvelle analyse sur un audit déjà arbitré (Q2)', () => {
    const decided = (n: number) => ({
      decisions: Array.from({ length: n }, (_, i) => ({ id: `d${i}` })), counts: { decided: n, later: 0, skipped: 0 }, arbitrable: true,
    }) as unknown as Awaited<ReturnType<typeof onboardingApi.listDecisions>>;
    const done = () => analysis({ id: 'a-done', status: 'succeeded', finishedAt: new Date().toISOString() });

    it('des décisions sur l\'audit courant : la confirmation dit qu\'elles ne seront pas reportées', async () => {
      vi.mocked(onboardingApi.listAnalyses).mockResolvedValue(listed([done()]));
      vi.mocked(onboardingApi.listDecisions).mockResolvedValue(decided(3));
      render(<AnalysisTab project={project()} onChanged={() => {}} onOpenAudit={vi.fn()} />);
      fireEvent.click(await screen.findByRole('button', { name: 'Lancer l\'analyse' }));
      const dialog = await screen.findByRole('dialog');
      expect(onboardingApi.listDecisions).toHaveBeenCalledWith('p1', 'a-done');
      expect(dialog).toHaveTextContent('Vos 3 décisions restent consultables avec l\'audit actuel, mais ne seront pas reportées sur le nouvel audit.');
    });

    it('aucune décision : la confirmation habituelle, sans mention des décisions', async () => {
      vi.mocked(onboardingApi.listAnalyses).mockResolvedValue(listed([done()]));
      vi.mocked(onboardingApi.listDecisions).mockResolvedValue(decided(0));
      render(<AnalysisTab project={project()} onChanged={() => {}} onOpenAudit={vi.fn()} />);
      fireEvent.click(await screen.findByRole('button', { name: 'Lancer l\'analyse' }));
      const dialog = await screen.findByRole('dialog');
      expect(dialog).toHaveTextContent('Les 2 documents du projet');
      expect(dialog).not.toHaveTextContent(/décision/);
    });

    it('aucun audit encore : les décisions ne sont pas demandées', async () => {
      render(<AnalysisTab project={project()} onChanged={() => {}} onOpenAudit={vi.fn()} />);
      fireEvent.click(await screen.findByRole('button', { name: 'Lancer l\'analyse' }));
      expect(await screen.findByRole('dialog')).not.toHaveTextContent(/décision/);
      expect(onboardingApi.listDecisions).not.toHaveBeenCalled();
    });

    it('décisions illisibles : la confirmation le signale sans chiffre', async () => {
      vi.mocked(onboardingApi.listAnalyses).mockResolvedValue(listed([done()]));
      vi.mocked(onboardingApi.listDecisions).mockRejectedValue(new Error('réseau'));
      render(<AnalysisTab project={project()} onChanged={() => {}} onOpenAudit={vi.fn()} />);
      fireEvent.click(await screen.findByRole('button', { name: 'Lancer l\'analyse' }));
      expect(await screen.findByRole('dialog')).toHaveTextContent('Les décisions éventuelles de l\'audit actuel');
    });
  });

  it('liste les analyses précédentes, avec le motif d\'un échec', async () => {
    vi.mocked(onboardingApi.listAnalyses).mockResolvedValue(listed([
      analysis({ id: 'a2', status: 'succeeded', finishedAt: new Date().toISOString() }),
      analysis({ id: 'a1', status: 'failed', errorCode: 'pipeline_restarted', cadrageVersion: 1, finishedAt: new Date().toISOString() }),
    ], 1));
    render(<AnalysisTab project={project()} onChanged={() => {}} onOpenAudit={() => {}} />);
    expect(await screen.findByRole('heading', { name: 'Analyses précédentes' })).toBeInTheDocument();
    expect(screen.getByText('Interrompue')).toBeInTheDocument();
    expect(screen.getByText('fiche version 1, 2 documents')).toBeInTheDocument();
    expect(screen.getByText(/redémarré pendant l'analyse/)).toBeInTheDocument();
  });
});

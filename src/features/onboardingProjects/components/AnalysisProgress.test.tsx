import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { AnalysisProgress } from './AnalysisProgress';
import type { OnboardingAnalysis } from '../types';

const START = new Date('2026-09-27T10:00:00Z').getTime();

const analysis = (extra: Partial<OnboardingAnalysis> = {}): OnboardingAnalysis => ({
  id: 'a1', status: 'running', stage: 'extraction', done: 3, total: 10, llmCalls: 42, llmRetries: 0,
  cadrageVersion: 2, documents: [{ id: 'd1', filename: 'cgv.pdf' }, { id: 'd2', filename: 'fiche.pdf' }],
  errorCode: null, pipelineVersion: null, createdAt: new Date(START).toISOString(), createdBy: 'u1',
  submittedAt: new Date(START + 5000).toISOString(), finishedAt: null,
  deadlineAt: new Date(START + 3600_000).toISOString(), ...extra,
});

afterEach(() => { vi.useRealTimers(); });

describe('AnalysisProgress', () => {
  it('en cours : étapes, avancement i/n, appels, temps qui avance, « vous pouvez fermer »', async () => {
    vi.useFakeTimers({ now: START + (12 * 60 + 5) * 1000 });
    render(<AnalysisProgress analysis={analysis()} onOpenAudit={() => {}} />);

    expect(screen.getByRole('heading', { name: 'Analyse en cours' })).toBeInTheDocument();
    const current = screen.getByText('Extraction des informations').closest('li')!;
    expect(current).toHaveAttribute('aria-current', 'step');
    expect(current).toHaveTextContent('3 / 10');
    expect(screen.getByText('Lecture des documents').closest('li')).toHaveTextContent('terminée');
    expect(screen.getByText('Croisement des documents').closest('li')).toHaveTextContent('à venir');
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('version 2')).toBeInTheDocument();
    expect(screen.getByText('12 min 05 s')).toBeInTheDocument();
    expect(screen.getByText(/Vous pouvez fermer cette page/)).toBeInTheDocument();

    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(screen.getByText('12 min 08 s')).toBeInTheDocument();
  });

  it('en file : attend que le service soit libre, aucune étape commencée', () => {
    render(<AnalysisProgress analysis={analysis({ status: 'queued', stage: null, done: 0, total: 0, llmCalls: 0 })} onOpenAudit={() => {}} />);
    expect(screen.getByRole('heading', { name: 'Analyse en attente de démarrage' })).toBeInTheDocument();
    expect(screen.getByText(/traite une analyse à la fois/)).toBeInTheDocument();
    expect(screen.queryByRole('listitem', { current: 'step' })).not.toBeInTheDocument();
  });

  it('échec : message du code, temps figé, pas de « vous pouvez fermer »', () => {
    render(<AnalysisProgress analysis={analysis({
      status: 'failed', stage: 'detection', errorCode: 'time_limit_exceeded',
      finishedAt: new Date(START + 3600_000).toISOString(),
    })} onOpenAudit={() => {}} />);
    expect(screen.getByRole('alert')).toHaveTextContent('durée maximale d\'une heure');
    expect(screen.getByRole('alert')).toHaveTextContent('ne compte pas dans votre quota : vous pouvez la relancer');
    expect(screen.getByText('1 h 00 min')).toBeInTheDocument();
    expect(screen.queryByText(/Vous pouvez fermer/)).not.toBeInTheDocument();
  });

  it('identifiants refusés par le fournisseur : problème de notre côté, pas d\'invitation à relancer', () => {
    render(<AnalysisProgress analysis={analysis({
      status: 'failed', stage: 'cadrage', errorCode: 'provider_auth', finishedAt: new Date(START + 5_000).toISOString(),
    })} onOpenAudit={() => {}} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('problème de configuration de notre côté');
    expect(alert).toHaveTextContent('ne compte pas dans votre quota. Nous sommes prévenus.');
    expect(alert).not.toHaveTextContent(/relancer|indisponible/);
  });

  it('code d\'erreur hors contrat : problème de notre côté, pas d\'invitation à relancer', () => {
    render(<AnalysisProgress analysis={analysis({
      status: 'failed', stage: 'extraction', errorCode: 'pipeline_invalid_error_code', finishedAt: new Date(START + 5_000).toISOString(),
    })} onOpenAudit={() => {}} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('problème de notre côté');
    expect(alert).toHaveTextContent('ne compte pas dans votre quota. Nous sommes prévenus.');
    expect(alert).not.toHaveTextContent(/relancer/);
  });

  it('réussite : toutes les étapes terminées', () => {
    render(<AnalysisProgress analysis={analysis({ status: 'succeeded', stage: 'storing', finishedAt: new Date(START + 1500_000).toISOString() })} onOpenAudit={() => {}} />);
    expect(screen.getByRole('heading', { name: 'Analyse terminée' })).toBeInTheDocument();
    expect(screen.getAllByText(': terminée', { exact: false })).toHaveLength(6);
    expect(screen.getByText('25 min 00 s')).toBeInTheDocument();
  });

  it('réussite : l\'audit est prêt, le lien ouvre l\'onglet « Audit », plus de « prochaine version »', () => {
    const onOpenAudit = vi.fn();
    render(<AnalysisProgress
      analysis={analysis({ status: 'succeeded', stage: 'storing', finishedAt: new Date(START + 1500_000).toISOString() })}
      onOpenAudit={onOpenAudit}
    />);
    expect(screen.getByText(/L'audit est prêt/)).toBeInTheDocument();
    expect(screen.queryByText(/prochaine version/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Consulter l\'audit →' }));
    expect(onOpenAudit).toHaveBeenCalledOnce();
  });

  it('en cours ou en échec : pas de lien vers l\'audit', () => {
    const { unmount } = render(<AnalysisProgress analysis={analysis()} onOpenAudit={() => {}} />);
    expect(screen.queryByRole('button', { name: /Consulter l'audit/ })).not.toBeInTheDocument();
    unmount();
    render(<AnalysisProgress analysis={analysis({ status: 'failed', errorCode: 'time_limit_exceeded', finishedAt: new Date(START + 60_000).toISOString() })} onOpenAudit={() => {}} />);
    expect(screen.queryByRole('button', { name: /Consulter l'audit/ })).not.toBeInTheDocument();
  });
});

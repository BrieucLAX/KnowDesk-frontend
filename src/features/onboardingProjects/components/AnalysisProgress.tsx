import React, { useState } from 'react';
import { usePolling } from '../../../shared/lib/usePolling';
import {
  analysisFailureMessage, analysisSteps, analysisFailureNote, elapsedMs, formatElapsed, isAnalysisActive, stepStates,
} from '../lib/analysisStatus';
import type { OnboardingAnalysis } from '../types';

interface AnalysisProgressProps {
  analysis:    OnboardingAnalysis;
  /** Ouvre l'onglet « À clarifier », qui montre l'audit de la dernière analyse réussie. */
  onOpenAudit: () => void;
}

const STEP_STATE_LABEL = { done: 'terminée', current: 'en cours', pending: 'à venir' } as const;

/**
 * Progression d'une analyse : étapes, avancement i/n, appels à l'IA, temps
 * écoulé. Le temps avance chaque seconde côté navigateur ; le reste vient
 * des relectures du parent.
 */
export function AnalysisProgress({ analysis, onOpenAudit }: AnalysisProgressProps) {
  const active = isAnalysisActive(analysis);
  const [now, setNow] = useState(() => Date.now());
  usePolling(() => setNow(Date.now()), 1000, active);

  const steps = analysisSteps(analysis);
  const states = stepStates(analysis);
  const waiting = analysis.status === 'queued';

  return (
    <section className="obp-analysis" aria-labelledby="obp-analysis-title">
      <div className="obp-analysis__head">
        <h2 id="obp-analysis-title" className="obp-section-title">
          {waiting && 'Analyse en attente de démarrage'}
          {analysis.status === 'running' && 'Analyse en cours'}
          {analysis.status === 'succeeded' && 'Analyse terminée'}
          {analysis.status === 'failed' && 'Analyse interrompue'}
        </h2>
        <dl className="obp-analysis__stats">
          <div><dt>Temps écoulé</dt><dd>{formatElapsed(elapsedMs(analysis, now))}</dd></div>
          <div><dt>Appels à l'IA</dt><dd>{analysis.llmCalls}</dd></div>
          <div><dt>Fiche</dt><dd>version {analysis.cadrageVersion}</dd></div>
          <div><dt>Documents</dt><dd>{analysis.documents.length}</dd></div>
        </dl>
      </div>

      {waiting && (
        <p className="obp-muted">
          Le service d'analyse traite une analyse à la fois : la vôtre démarre dès qu'il est libre.
        </p>
      )}

      <ol className="obp-steps" aria-live="polite">
        {steps.map((step, i) => {
          const state = states[i];
          const showCounts = step.counts && state === 'current' && analysis.total > 0;
          return (
            <li key={step.label} className={`obp-step obp-step--${state}`} aria-current={state === 'current' ? 'step' : undefined}>
              <span className="obp-step__marker" aria-hidden="true" />
              <span className="obp-step__label">{step.label}</span>
              {showCounts && <span className="obp-step__count">{analysis.done} / {analysis.total}</span>}
              <span className="sr-only"> : {STEP_STATE_LABEL[state]}</span>
            </li>
          );
        })}
      </ol>

      {active && (
        <p className="obp-analysis__note">
          Vous pouvez fermer cette page : l'analyse continue, et vous la retrouverez ici.
          Elle est arrêtée au bout d'une heure.
        </p>
      )}
      {analysis.status === 'failed' && (
        <p className="obp-analysis__error" role="alert">
          {analysisFailureMessage(analysis.errorCode)} {analysisFailureNote(analysis.errorCode)}
        </p>
      )}
      {analysis.status === 'succeeded' && (
        <p className="obp-muted">
          L'audit est prêt.{' '}
          <button type="button" className="obp-link" onClick={onOpenAudit}>Consulter l'audit →</button>
        </p>
      )}
    </section>
  );
}

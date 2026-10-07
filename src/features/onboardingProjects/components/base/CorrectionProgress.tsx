import React from 'react';
import { Button } from '../../../../shared/components/ui/Button';
import {
  CORRECTION_STEPS, correctionFailureMessage, correctionStepStates, isCorrectionActive, type OnboardingCorrection,
} from '../../lib/correction';

const STEP_STATE_LABEL = { done: 'terminée', current: 'en cours', pending: 'à venir' } as const;

interface CorrectionProgressProps {
  correction: OnboardingCorrection;
  /** Relancer après un échec ; absent si ce n'est pas possible ici. */
  onRetry?:   () => void;
  retrying?:  boolean;
}

/** Préparation de la nouvelle base : étapes, avancement i/n, ou l'échec en clair. */
export function CorrectionProgress({ correction, onRetry, retrying }: CorrectionProgressProps) {
  const states = correctionStepStates(correction);
  const active = isCorrectionActive(correction);
  return (
    <section className="obp-analysis" aria-labelledby="obp-correction-title">
      <h2 id="obp-correction-title" className="obp-section-title">
        {correction.status === 'queued' && 'Nouvelle base en attente de démarrage'}
        {correction.status === 'running' && 'Nouvelle base en préparation'}
        {correction.status === 'succeeded' && 'Nouvelle base prête'}
        {correction.status === 'failed' && 'Préparation interrompue'}
      </h2>
      {correction.status === 'queued' && (
        <p className="obp-muted">Le service traite un travail à la fois : la préparation démarre dès qu'il est libre.</p>
      )}
      <ol className="obp-steps" aria-live="polite">
        {CORRECTION_STEPS.map((step, i) => {
          const state = states[i];
          const showCounts = step.counts && state === 'current' && correction.total > 0;
          return (
            <li key={step.label} className={`obp-step obp-step--${state}`} aria-current={state === 'current' ? 'step' : undefined}>
              <span className="obp-step__marker" aria-hidden="true" />
              <span className="obp-step__label">{step.label}</span>
              {showCounts && <span className="obp-step__count">{correction.done} / {correction.total}</span>}
              <span className="sr-only"> : {STEP_STATE_LABEL[state]}</span>
            </li>
          );
        })}
      </ol>
      {active && (
        <p className="obp-analysis__note">
          Vous pouvez fermer cette page : la préparation continue, et vous la retrouverez ici.
        </p>
      )}
      {correction.status === 'failed' && (
        <>
          <p className="obp-analysis__error" role="alert">{correctionFailureMessage(correction.errorCode)}</p>
          {onRetry && <Button variant="primary" size="md" loading={retrying} onClick={onRetry}>Relancer la préparation</Button>}
        </>
      )}
    </section>
  );
}

import React, { useCallback } from 'react';
import { useOnboarding }  from '../hooks/useOnboarding';
import '../onboarding.css';
import { Input }          from '../../../shared/components/ui/Input';
import { Button }         from '../../../shared/components/ui/Button';
import { STEPS }          from '../types';
import type { OnboardingData } from '../types';
import { useAuthStore }   from '../../../store/authStore';
import { ArrowLeft, ArrowRight, Check, Clock, X } from 'lucide-react';

interface OnboardingPageProps {
  onComplete: () => void;
}

/**
 * OnboardingPage — 3-step wizard for new admin accounts.
 * Shown once, immediately after registration.
 *
 * Steps: 1. Name the org → 2. Invite team (optional) → 3. First category (optional)
 */
export function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const user = useAuthStore(s => s.session?.user);

  const handleComplete = useCallback((_data: OnboardingData) => {
    onComplete();
  }, [onComplete]);

  const {
    stepIndex, totalSteps, currentStep, data, errors,
    isLastStep, isSubmitting,
    updateField, goNext, goBack, skip, submit,
  } = useOnboarding(handleComplete);

  // Les 2 étapes (team + content) sont optionnelles — bouton « Passer » dispo partout.
  const isOptional = true;

  return (
    <div className="onboarding">

      {/* Brand strip — petit cercle K avec couleur brand */}
      <div className="onboarding__brand" aria-hidden="true">
        <span className="onboarding__logo-mark">K</span>
      </div>

      <div className="onboarding__card">

        {/* Progress stepper */}
        <div className="stepper" role="group" aria-label="Progression de la configuration">
          {STEPS.map((step, i) => {
            const isDone   = i < stepIndex;
            const isCurrent = i === stepIndex;
            return (
              <React.Fragment key={step.id}>
                <div
                  className={`stepper__dot ${isDone ? 'stepper__dot--done' : ''} ${isCurrent ? 'stepper__dot--active' : ''}`}
                  aria-label={`Étape ${i + 1} : ${step.title}${isDone ? ' — terminée' : isCurrent ? ' — en cours' : ''}`}
                  role="img"
                >
                  {isDone ? <Check size={16} aria-hidden="true" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`stepper__line ${isDone ? 'stepper__line--done' : ''}`} aria-hidden="true" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step header */}
        <header className="onboarding__header">
          <p className="onboarding__step-count">Étape {stepIndex + 1} sur {totalSteps}</p>
          <h1 className="onboarding__title">{currentStep.title}</h1>
          <p className="onboarding__desc">{currentStep.description}</p>
        </header>

        {/* Step content */}
        <div className="onboarding__body">
          {stepIndex === 0 && (
            <StepTeam
              emails={data.inviteEmails}
              error={errors.inviteEmails}
              onChange={emails => updateField('inviteEmails', emails)}
              userName={user?.firstName}
            />
          )}
          {currentStep.id === 'content' && (
            <StepContent
              value={data.firstCategory}
              error={errors.firstCategory}
              onChange={v => updateField('firstCategory', v)}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="onboarding__actions">
          <div className="onboarding__actions-left">
            {stepIndex > 0 && (
              <Button variant="ghost" size="md" onClick={goBack} disabled={isSubmitting} leftIcon={<ArrowLeft size={20} />}>
                Retour
              </Button>
            )}
          </div>
          <div className="onboarding__actions-right">
            {isOptional && (
              <Button variant="ghost" size="md" onClick={skip} disabled={isSubmitting}>
                Passer cette étape
              </Button>
            )}
            {isLastStep ? (
              <Button variant="primary" size="md" loading={isSubmitting} onClick={submit}>
                Terminer la configuration
              </Button>
            ) : (
              <Button variant="primary" size="md" onClick={goNext}>
                Continuer<ArrowRight size={20} />
              </Button>
            )}
          </div>
        </div>

      </div>

      {/* Estimated time */}
      <p className="onboarding__estimate" aria-live="polite">
        <Clock size={16} className="icon-inline" /> Environ {Math.max(1, (totalSteps - stepIndex - 1))} minute{totalSteps - stepIndex - 1 > 1 ? 's' : ''} restante{totalSteps - stepIndex - 1 > 1 ? 's' : ''}
      </p>
    </div>
  );
}

// ─── Step sub-components ──────────────────────────────────────────────────

function StepTeam({ emails, error, onChange, userName }: {
  emails:   string[];
  error?:   string;
  onChange: (emails: string[]) => void;
  userName?: string;
}) {
  const [inputVal, setInputVal] = React.useState('');

  const addEmail = (raw: string) => {
    const list = raw.split(/[,;\s]+/).map(e => e.trim()).filter(Boolean);
    const valid = list.filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    if (valid.length > 0) {
      onChange([...new Set([...emails, ...valid])]);
      setInputVal('');
    }
  };

  return (
    <div className="onboarding__step">
      {userName && (
        <p className="onboarding__welcome">Bienvenue, {userName}.</p>
      )}
      <div className="field">
        <label htmlFor="invite-emails" className="field-label">
          Adresses e-mail de vos collègues
        </label>
        <input
          id="invite-emails"
          type="text"
          className="field-input"
          placeholder="prenom@entreprise.fr, autre@entreprise.fr"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addEmail(inputVal); } }}
          onBlur={() => inputVal && addEmail(inputVal)}
          aria-describedby="invite-hint"
        />
        <p id="invite-hint" className="field-helper">
          Séparez les adresses par une virgule ou appuyez sur Entrée.
        </p>
        {error && <p className="field-error" role="alert">{error}</p>}
      </div>

      {emails.length > 0 && (
        <div className="email-tags" aria-label={`${emails.length} invitation${emails.length > 1 ? 's' : ''} en attente`}>
          {emails.map(email => (
            <span key={email} className="email-tag">
              {email}
              <button
                type="button"
                className="email-tag__remove"
                onClick={() => onChange(emails.filter(e => e !== email))}
                aria-label={`Retirer ${email}`}
              >
                <X size={16} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function StepContent({ value, error, onChange }: {
  value:    string;
  error?:   string;
  onChange: (v: string) => void;
}) {
  const SUGGESTIONS = ['Livraisons', 'Remboursements', 'Abonnements', 'Facturation', 'Litiges'];

  return (
    <div className="onboarding__step">
      <Input
        id="first-category"
        label="Nom de la première catégorie"
        placeholder="ex. Livraisons"
        autoFocus
        value={value}
        error={error}
        helperText="Vous pourrez en créer d'autres depuis la base de connaissance."
        onChange={e => onChange(e.target.value)}
      />
      <div className="onboarding__suggestions" aria-label="Suggestions de catégories">
        <p className="onboarding__suggestions-label">Suggestions :</p>
        <div className="onboarding__suggestion-chips">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              type="button"
              className={`suggestion-chip ${value === s ? 'suggestion-chip--active' : ''}`}
              onClick={() => onChange(s)}
              aria-pressed={value === s}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

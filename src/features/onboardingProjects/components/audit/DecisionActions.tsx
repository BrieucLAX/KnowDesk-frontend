import React, { useState } from 'react';
import { Button } from '../../../../shared/components/ui/Button';
import { Input }  from '../../../../shared/components/ui/Input';
import { ConfirmDialog } from '../../../../shared/components/ui/ConfirmDialog';
import { formatFull } from '../../../../shared/lib/formatDate';
import { TextArea } from '../TextArea';
import type { Question } from '../../lib/audit';
import {
  buildChoose, buildDistinctCases, buildWriteVersion, describeDecision, optionLetter,
  type Built, type Decision, type DecisionAction,
} from '../../lib/decisions';

interface DecisionActionsProps {
  question:   Question;
  current:    Decision | undefined;
  /** Faux pour l'audit d'une analyse précédente : la décision se lit, sans action. */
  arbitrable: boolean;
  busy:       boolean;
  /** Conditions préremplies de « deux cas distincts » (cas à confirmer), une par option. */
  proposedCases?: string[];
  onDecide:   (action: DecisionAction) => Promise<boolean>;
  onCancel:   () => Promise<boolean>;
}

type Mode = 'menu' | 'version' | 'cases';

/** Décision courante d'une question, en clair : ce qui a été décidé, par qui, quand. */
export function CurrentDecision({ question, current }: { question: Question; current: Decision }) {
  return (
    <p className="obp-decision__current">
      <span className={`obp-decision__badge obp-decision__badge--${current.action.type}`}>{describeDecision(current.action, question)}</span>
      <span className="obp-muted"> — {current.decidedBy.name}, {formatFull(current.decidedAt)}</span>
    </p>
  );
}

/**
 * Les cinq actions sur une question (plan §5.1, F-F3b) : garder une option
 * (les autres sont écartées), rédiger une version C, déclarer deux cas
 * distincts (une condition par option, toutes obligatoires), plus tard,
 * passer (« non applicable », rien n'est supprimé, après confirmation).
 * Une question décidée montre sa décision, « Annuler » (retour à la
 * décision précédente, Q1) et « Changer ».
 */
export function DecisionActions({
  question, current, arbitrable, busy, proposedCases, onDecide, onCancel,
}: DecisionActionsProps) {
  const [editing,  setEditing]  = useState(false);
  const [mode,     setMode]     = useState<Mode>('menu');
  const [error,    setError]    = useState<string | null>(null);
  const [text,     setText]     = useState('');
  const [versionCondition, setVersionCondition] = useState('');
  const [cases,    setCases]    = useState<string[]>([]);
  const [skipping, setSkipping] = useState(false);

  const reset = () => { setMode('menu'); setError(null); setEditing(false); };

  const submit = async (built: Built) => {
    if ('error' in built) { setError(built.error); return; }
    setError(null);
    if (await onDecide(built.action)) reset();
  };

  const openCases = () => {
    setCases(question.options.map((_, i) => proposedCases?.[i] ?? ''));
    setError(null);
    setMode('cases');
  };

  if (!arbitrable) {
    return current
      ? <CurrentDecision question={question} current={current} />
      : <p className="obp-muted">Aucune décision.</p>;
  }

  if (current && !editing) {
    return (
      <div className="obp-decision">
        <CurrentDecision question={question} current={current} />
        <div className="obp-decision__actions">
          <Button variant="ghost" size="sm" loading={busy} onClick={() => void onCancel()}>Annuler</Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => setEditing(true)}>Changer</Button>
        </div>
      </div>
    );
  }

  const idBase = `obp-decision-${question.id}`;

  return (
    <div className="obp-decision">
      {current && <CurrentDecision question={question} current={current} />}

      {mode === 'menu' && (
        <div className="obp-decision__actions" role="group" aria-label="Trancher la question">
          {question.options.map((o, i) => (
            <Button key={i} variant="secondary" size="sm" disabled={busy}
              title={o.label} onClick={() => void submit(buildChoose(question, i))}>
              Retenir {optionLetter(i)}
            </Button>
          ))}
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => { setError(null); setMode('version'); }}>
            Version C
          </Button>
          <Button variant="secondary" size="sm" disabled={busy} onClick={openCases}>Deux cas distincts</Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => void submit({ ok: true, action: { type: 'later' } })}>
            Plus tard
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => setSkipping(true)}>Passer</Button>
          {current && <Button variant="ghost" size="sm" disabled={busy} onClick={reset}>Garder la décision actuelle</Button>}
        </div>
      )}

      {mode === 'version' && (
        <form className="obp-decision__form" onSubmit={e => { e.preventDefault(); void submit(buildWriteVersion(text, versionCondition)); }}>
          <TextArea id={`${idBase}-text`} label="Version à retenir" value={text} rows={3}
            onChange={e => setText(e.target.value)} maxLength={5000} />
          <Input id={`${idBase}-condition`} label="Condition (facultative)" value={versionCondition}
            onChange={e => setVersionCondition(e.target.value)} maxLength={2000}
            helperText="Le cas où cette version s'applique, s'il y en a un." />
          {error && <p className="field-error" role="alert">{error}</p>}
          <div className="obp-decision__actions">
            <Button type="submit" variant="primary" size="sm" loading={busy}>Enregistrer la version C</Button>
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => { setError(null); setMode('menu'); }}>Retour</Button>
          </div>
        </form>
      )}

      {mode === 'cases' && (
        <form className="obp-decision__form" onSubmit={e => { e.preventDefault(); void submit(buildDistinctCases(question, cases)); }}>
          <p className="obp-muted">Chaque option s'applique à un cas différent : précisez lequel, pour chacune.</p>
          {question.options.map((o, i) => (
            <Input key={i} id={`${idBase}-case-${i}`} label={`Cas où ${optionLetter(i)} s'applique (${o.value || o.label})`}
              value={cases[i] ?? ''} maxLength={2000}
              onChange={e => setCases(cs => cs.map((c, j) => (j === i ? e.target.value : c)))} />
          ))}
          {error && <p className="field-error" role="alert">{error}</p>}
          <div className="obp-decision__actions">
            <Button type="submit" variant="primary" size="sm" loading={busy}>Enregistrer les cas</Button>
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => { setError(null); setMode('menu'); }}>Retour</Button>
          </div>
        </form>
      )}

      {error && mode === 'menu' && <p className="field-error" role="alert">{error}</p>}

      {skipping && (
        <ConfirmDialog
          title="Passer cette question ?"
          description="Elle sera enregistrée comme « non applicable ». Rien n'est supprimé, et vous pourrez annuler."
          confirmLabel="Passer"
          variant="primary"
          loading={busy}
          onConfirm={async () => { await submit({ ok: true, action: { type: 'skip' } }); setSkipping(false); }}
          onCancel={() => setSkipping(false)}
        />
      )}
    </div>
  );
}

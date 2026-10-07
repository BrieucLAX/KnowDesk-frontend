import React, { useEffect, useId, useRef, useState } from 'react';
import { formatFull } from '../../../../shared/lib/formatDate';
import type { Review, Verdict } from '../../lib/correction';
import type { ReviewDraft, SaveState } from '../../hooks/useBaseReview';

const VERDICTS: ReadonlyArray<{ verdict: Verdict; label: string }> = [
  { verdict: 'accept', label: 'Accepter' },
  { verdict: 'fix', label: 'Corriger' },
  { verdict: 'refuse', label: 'Refuser' },
];

export const VERDICT_LABEL: Record<Verdict, string> = { accept: 'Acceptée', fix: 'Corrigée', refuse: 'Refusée' };

const SAVE_LABEL: Record<SaveState, string> = { saving: 'Enregistrement…', saved: 'Enregistré', error: 'Non enregistré' };

export function SaveStatus({ state }: { state: SaveState | undefined }) {
  return (
    <span className={`obp-base-save${state ? ` obp-base-save--${state}` : ''}`} role="status" aria-live="polite">
      {state ? SAVE_LABEL[state] : ''}
    </span>
  );
}

interface ReviewCardProps {
  /** Ancre de la carte, pour les renvois des sections suivantes. */
  anchor:     string;
  title:      string;
  /** Ce que dit la carte : origine, consigne, suite. */
  children:   React.ReactNode;
  /** Accepter / Corriger / Refuser : une modification appliquée, ou une convention. */
  withVerdict: boolean;
  /** Relecture de la dernière correction réussie ; sinon, lecture seule. */
  editable:   boolean;
  current:    Review | undefined;
  save:       SaveState | undefined;
  /** Le texte proposé, en point de départ de « Corriger ». */
  proposed:   string;
  onSave:     (draft: ReviewDraft) => void;
}

/**
 * Une modification (ou une convention) et l'avis de l'expert : Accepter, Corriger (avec le texte
 * tel qu'il l'écrirait) ou Refuser, et un commentaire facultatif. Le verdict s'enregistre au clic,
 * les textes quand on quitte le champ.
 */
export function ReviewCard({ anchor, title, children, withVerdict, editable, current, save, proposed, onSave }: ReviewCardProps) {
  const id = useId();
  const [verdict, setVerdict] = useState<Verdict | null>(current?.verdict ?? null);
  const [fixText, setFixText] = useState(current?.correctedText ?? proposed);
  const [comment, setComment] = useState(current?.comment ?? '');

  /** Le dernier avis envoyé d'ici : son retour ne doit pas effacer ce qui a été tapé depuis. */
  const sent = useRef<ReviewDraft | null>(null);

  // Avis venu d'ailleurs (conflit relu, autre onglet) : on repart de lui.
  useEffect(() => {
    const mine = sent.current !== null && current !== undefined && current.verdict === sent.current.verdict;
    if (mine) return;
    setVerdict(current?.verdict ?? null);
    setFixText(current?.correctedText ?? proposed);
    setComment(current?.comment ?? '');
  }, [current, proposed]);

  const send = (d: ReviewDraft) => { sent.current = d; onSave(d); };

  const draft = (patch: Partial<ReviewDraft>): ReviewDraft => ({
    verdict, correctedText: verdict === 'fix' ? fixText : null, comment, ...patch,
  });

  const choose = (v: Verdict) => {
    if (v === verdict) return;
    setVerdict(v);
    // « Corriger » sans texte attend qu'il soit écrit.
    if (v === 'fix' && !fixText.trim()) return;
    send(draft({ verdict: v, correctedText: v === 'fix' ? fixText : null }));
  };

  return (
    <article id={anchor} className={`obp-base-card${current?.verdict ? ' obp-base-card--done' : ''}`} aria-label={title}>
      <h4 className="obp-base-card__title">{title}</h4>
      {children}

      {editable && withVerdict && (
        <div className="obp-base-verdicts" role="group" aria-label={`Votre avis sur ${title}`}>
          {VERDICTS.map(v => (
            <button key={v.verdict} type="button" aria-pressed={verdict === v.verdict}
              className={`obp-base-verdict obp-base-verdict--${v.verdict}`} onClick={() => choose(v.verdict)}>
              {v.label}
            </button>
          ))}
        </div>
      )}
      {editable && verdict === 'fix' && (
        <>
          <label htmlFor={`${id}-fix`} className="obp-base-label">Le texte tel que vous l'écririez</label>
          <textarea id={`${id}-fix`} className="obp-base-textarea" rows={5} value={fixText}
            onChange={e => setFixText(e.target.value)}
            onBlur={() => { if (fixText.trim()) send(draft({ correctedText: fixText })); }} />
        </>
      )}
      {editable && (
        <>
          <label htmlFor={`${id}-comment`} className="obp-base-label">Un commentaire ? (facultatif)</label>
          <textarea id={`${id}-comment`} className="obp-base-textarea" rows={2} value={comment}
            onChange={e => setComment(e.target.value)}
            onBlur={() => send(draft({ comment }))} />
          <SaveStatus state={save} />
        </>
      )}

      {!editable && current && (
        <div className="obp-base-card__readonly">
          {current.verdict && <p><strong>Avis : {VERDICT_LABEL[current.verdict]}</strong></p>}
          {current.correctedText && <p className="obp-base-quote">« {current.correctedText} »</p>}
          {current.comment && <p>Commentaire : {current.comment}</p>}
        </div>
      )}
      {current && (
        <p className="obp-muted obp-base-card__author">
          {current.authorName ? `Avis de ${current.authorName}, le ` : 'Avis du '}{formatFull(current.createdAt)}
        </p>
      )}
    </article>
  );
}

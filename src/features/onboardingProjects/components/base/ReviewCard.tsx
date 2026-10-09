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

/** Une section que la modification touche : son titre, et les lignes qu'elle y propose. */
export interface FixSection { key: string; title: string; proposed: string }

interface ReviewCardProps {
  /** Ancre de la carte, pour les renvois des sections suivantes. */
  anchor:     string;
  title:      string;
  /** Ce que dit la carte : origine, consigne, suite. */
  children:   React.ReactNode;
  /** Un avis : une modification appliquée, ou une convention. */
  withVerdict: boolean;
  /** « Corriger » : une modification (une convention s'accepte ou se refuse). */
  fixable:    boolean;
  /** Relecture de la dernière correction réussie ; sinon, lecture seule. */
  editable:   boolean;
  current:    Review | undefined;
  save:       SaveState | undefined;
  /** Les sections touchées, chacune avec son texte proposé, en point de départ de « Corriger ». */
  sections:   FixSection[];
  onSave:     (draft: ReviewDraft) => void;
}

/** Les textes de « Corriger » au départ : ceux de l'avis, l'ancien texte unique dans la première section, sinon les lignes proposées. */
function initialTexts(current: Review | undefined, sections: FixSection[]): Record<string, string> {
  return Object.fromEntries(sections.map((s, i) => [
    s.key,
    current?.correctedTexts?.[s.key]
      ?? (i === 0 && current?.correctedText ? current.correctedText : null)
      ?? s.proposed,
  ]));
}

/**
 * Une modification (ou une convention) et l'avis de l'expert : Accepter, Corriger (un texte par
 * section touchée, tel qu'il l'écrirait) ou Refuser, et un commentaire facultatif. Une convention
 * s'accepte ou se refuse. Le verdict s'enregistre au clic, les textes quand on quitte le champ.
 */
export function ReviewCard({ anchor, title, children, withVerdict, fixable, editable, current, save, sections, onSave }: ReviewCardProps) {
  const id = useId();
  const [verdict, setVerdict] = useState<Verdict | null>(current?.verdict ?? null);
  const [fixTexts, setFixTexts] = useState<Record<string, string>>(() => initialTexts(current, sections));
  const [comment, setComment] = useState(current?.comment ?? '');

  /** Le dernier avis envoyé d'ici : son retour ne doit pas effacer ce qui a été tapé depuis. */
  const sent = useRef<ReviewDraft | null>(null);

  // Avis venu d'ailleurs (conflit relu, autre onglet) : on repart de lui.
  useEffect(() => {
    const mine = sent.current !== null && current !== undefined && current.verdict === sent.current.verdict;
    if (mine) return;
    setVerdict(current?.verdict ?? null);
    setFixTexts(initialTexts(current, sections));
    setComment(current?.comment ?? '');
  }, [current, sections]);

  const send = (d: ReviewDraft) => { sent.current = d; onSave(d); };
  const written = (texts: Record<string, string>) => Object.values(texts).some(t => t.trim());
  const draft = (patch: Partial<ReviewDraft>): ReviewDraft => ({
    verdict, correctedTexts: verdict === 'fix' ? fixTexts : null, comment, ...patch,
  });

  const choose = (v: Verdict) => {
    if (v === verdict) return;
    setVerdict(v);
    // « Corriger » sans texte attend qu'il soit écrit.
    if (v === 'fix' && !written(fixTexts)) return;
    send(draft({ verdict: v, correctedTexts: v === 'fix' ? fixTexts : null }));
  };

  const verdicts = VERDICTS.filter(v => fixable || v.verdict !== 'fix');
  // Un ancien « Corriger » sur une convention vaut refus.
  const shown = !fixable && verdict === 'fix' ? 'refuse' : verdict;

  return (
    <article id={anchor} className={`obp-base-card${current?.verdict ? ' obp-base-card--done' : ''}`} aria-label={title}>
      <h4 className="obp-base-card__title">{title}</h4>
      {children}

      {editable && withVerdict && (
        <div className={`obp-base-verdicts${fixable ? '' : ' obp-base-verdicts--two'}`} role="group" aria-label={`Votre avis sur ${title}`}>
          {verdicts.map(v => (
            <button key={v.verdict} type="button" aria-pressed={shown === v.verdict}
              className={`obp-base-verdict obp-base-verdict--${v.verdict}`} onClick={() => choose(v.verdict)}>
              {v.label}
            </button>
          ))}
        </div>
      )}
      {editable && fixable && verdict === 'fix' && sections.map(section => (
        <React.Fragment key={section.key}>
          <label htmlFor={`${id}-fix-${section.key}`} className="obp-base-label">
            {sections.length > 1 ? `« ${section.title} » : le texte tel que vous l'écririez` : 'Le texte tel que vous l\'écririez'}
          </label>
          <textarea id={`${id}-fix-${section.key}`} className="obp-base-textarea" rows={5} value={fixTexts[section.key] ?? ''}
            onChange={e => setFixTexts(t => ({ ...t, [section.key]: e.target.value }))}
            onBlur={() => { if (written(fixTexts)) send(draft({ correctedTexts: fixTexts })); }} />
        </React.Fragment>
      ))}
      {editable && fixable && verdict === 'fix' && sections.length > 1 && (
        <p className="obp-muted">
          Une section laissée vide garde son texte d'origine : pour déplacer un ajout, videz-le ici et écrivez-le dans la section où il doit aller.
        </p>
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
          {shown && <p><strong>Avis : {VERDICT_LABEL[shown]}</strong></p>}
          {fixable && current.correctedText && <p className="obp-base-quote">« {current.correctedText} »</p>}
          {fixable && Object.entries(current.correctedTexts ?? {}).map(([key, text]) => (
            <p key={key} className="obp-base-quote">« {text} »</p>
          ))}
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

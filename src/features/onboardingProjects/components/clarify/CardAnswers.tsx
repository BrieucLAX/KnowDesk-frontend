import React, { useState } from 'react';
import { Button } from '../../../../shared/components/ui/Button';
import { formatFull } from '../../../../shared/lib/formatDate';
import { TextArea } from '../TextArea';
import type { Decision } from '../../lib/decisions';
import {
  ANSWERS, describeCardAnswer, isBriefingOnly, missingSide, NATURES, sideDocuments, sidesQuestion, substantiveAnswers,
  toQuotes, TYPED_ANSWERS, type CardAction, type ReadingCard, type TypedAnswer,
} from '../../lib/reading';

interface CardAnswersProps {
  card:       ReadingCard;
  current:    Decision | undefined;
  /** Faux pour l'audit d'une analyse précédente : la réponse se lit, sans action. */
  arbitrable: boolean;
  busy:       boolean;
  /** Nom de fichier d'un document. */
  name:       (documentId: string) => string;
  onAnswer:   (action: CardAction) => Promise<boolean>;
  onCancel:   () => Promise<boolean>;
}

const isTyped = (a: string): a is TypedAnswer => (TYPED_ANSWERS as readonly string[]).includes(a);

/** Réponse courante d'une carte, en clair : la réponse, qui l'a donnée, quand. Un texte saisi est « saisi par X le Y ». */
export function CurrentAnswer({ card, current, name }: { card: ReadingCard | undefined; current: Decision; name: (id: string) => string }) {
  const typed = 'text' in current.action;
  return (
    <p className="obp-decision__current">
      <span className={`obp-decision__badge obp-decision__badge--${current.action.type}`}>
        {describeCardAnswer(current.action, card, name)}
      </span>
      <span className="obp-muted">
        {typed ? ` — saisi par ${current.decidedBy.name} le ${formatFull(current.decidedAt)}` : ` — ${current.decidedBy.name}, ${formatFull(current.decidedAt)}`}
      </span>
    </p>
  );
}

/**
 * Les réponses d'une carte, celles de sa nature seulement (§3.4) : un côté à retenir (« Retenir
 * A : fichiers », le libellé de la nature en sous-titre), les réponses de fond, « Autre réponse »
 * et « Plus tard » ; « Ce sujet n'a pas sa place dans la base » dans un menu secondaire. Un côté
 * qui ne cite que la fiche se retient comme « votre fiche de cadrage ». Si l'un des deux côtés
 * n'a pas été retrouvé, la question porte sur le seul passage vérifié (« Oui, ce passage est
 * juste »), sans les réponses qui comparent deux côtés. Une
 * carte répondue montre sa réponse, « Annuler » (retour à la précédente) et « Changer ».
 */
export function CardAnswers({ card, current, arbitrable, busy, name, onAnswer, onCancel }: CardAnswersProps) {
  const [editing, setEditing] = useState(false);
  const [typing,  setTyping]  = useState<TypedAnswer | null>(null);
  const [text,    setText]    = useState('');
  const [error,   setError]   = useState<string | null>(null);
  const [more,    setMore]    = useState(false);

  const reset = () => { setTyping(null); setText(''); setError(null); setEditing(false); };
  const submit = async (action: CardAction) => { if (await onAnswer(action)) reset(); };

  if (!arbitrable) {
    return current
      ? <CurrentAnswer card={card} current={current} name={name} />
      : <p className="obp-muted">Aucune réponse.</p>;
  }

  if (current && !editing) {
    return (
      <div className="obp-decision">
        <CurrentAnswer card={card} current={current} name={name} />
        <div className="obp-decision__actions">
          <Button variant="ghost" size="sm" loading={busy} onClick={() => void onCancel()}>Annuler</Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => setEditing(true)}>Changer</Button>
        </div>
      </div>
    );
  }

  if (typing) {
    const field = ANSWERS[typing];
    return (
      <form className="obp-decision__form" onSubmit={e => {
        e.preventDefault();
        const t = text.trim();
        if (!t) { setError('Saisissez votre réponse.'); return; }
        void submit({ type: typing, text: t });
      }}>
        <p className="obp-clarify-answer__chosen">{field.label}</p>
        <TextArea id={`obp-card-${card.id}-text`} label={field.field ?? 'Votre réponse'} value={text} rows={3}
          maxLength={5000} onChange={e => setText(e.target.value)} />
        <p className="obp-muted">Votre texte est enregistré tel quel, « saisi par » vous, avec la date.</p>
        {error && <p className="field-error" role="alert">{error}</p>}
        <div className="obp-decision__actions">
          <Button type="submit" variant="primary" size="sm" loading={busy}>Enregistrer</Button>
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => { setTyping(null); setError(null); }}>Retour</Button>
        </div>
      </form>
    );
  }

  const choose = (a: keyof typeof ANSWERS) => {
    if (isTyped(a)) { setText(''); setError(null); setTyping(a); return; }
    void submit({ type: a } as CardAction);
  };

  const sides = card.answers.includes('accept_side') ? card.sides : [];
  const oneSided = missingSide(card) !== null;
  const retain = (s: ReadingCard['sides'][number]) => {
    const quotes = toQuotes(s.quotes);
    if (oneSided) return 'Oui, ce passage est juste';
    if (isBriefingOnly(quotes)) return 'Retenir votre fiche de cadrage';
    return `Retenir ${s.label} : ${sideDocuments(quotes, name).join(', ')}`;
  };

  return (
    <div className="obp-decision">
      {current && <CurrentAnswer card={card} current={current} name={name} />}

      {sides.length > 0 && (
        <div className="obp-clarify-answer__group" role="group" aria-label="Retenir un côté">
          <p className="obp-clarify-answer__subtitle">{NATURES[card.nature].label} : {sidesQuestion(card)}</p>
          <div className="obp-decision__actions">
            {sides.map(s => (
              <Button key={s.label} variant="secondary" size="sm" disabled={busy}
                onClick={() => void submit({ type: 'accept_side', side: s.label })}>
                {retain(s)}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="obp-decision__actions" role="group" aria-label="Répondre à la carte">
        {substantiveAnswers(card).map(a => (
          <Button key={a} variant="secondary" size="sm" disabled={busy} onClick={() => choose(a)}>{ANSWERS[a].label}</Button>
        ))}
        {card.answers.includes('other_answer') && (
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => choose('other_answer')}>{ANSWERS.other_answer.label}</Button>
        )}
        {card.answers.includes('later') && (
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => choose('later')}>{ANSWERS.later.label}</Button>
        )}
        {card.answers.includes('out_of_scope') && (
          <Button variant="ghost" size="sm" disabled={busy} aria-expanded={more} onClick={() => setMore(m => !m)}>
            {more ? 'Moins de réponses' : 'Autres réponses…'}
          </Button>
        )}
        {current && <Button variant="ghost" size="sm" disabled={busy} onClick={reset}>Garder la réponse actuelle</Button>}
      </div>
      {more && (
        <div className="obp-decision__actions obp-clarify-answer__more" role="group" aria-label="Autres réponses">
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => choose('out_of_scope')}>{ANSWERS.out_of_scope.label}</Button>
        </div>
      )}
    </div>
  );
}

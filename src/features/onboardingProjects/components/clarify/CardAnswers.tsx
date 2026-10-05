import React, { useState } from 'react';
import { Button } from '../../../../shared/components/ui/Button';
import { formatFull } from '../../../../shared/lib/formatDate';
import { TextArea } from '../TextArea';
import { namedLabel, type DocNaming } from '../../lib/audit';
import type { Decision } from '../../lib/decisions';
import {
  ANSWERS, describeCardAnswer, FOLLOW_RECOMMENDATION_LABEL, isBriefingOnly, missingSide, NATURES, recommendationOutcome,
  sideDocuments, sidesQuestion, substantiveAnswers, toQuotes, TYPED_ANSWERS, type CardAction, type ReadingCard,
  type TypedAnswer,
} from '../../lib/reading';

interface CardAnswersProps {
  card:       ReadingCard;
  current:    Decision | undefined;
  /** Faux pour l'audit d'une analyse précédente : la réponse se lit, sans action. */
  arbitrable: boolean;
  busy:       boolean;
  /** Nom de fichier d'un document, et son chemin pour l'infobulle. */
  docs:       DocNaming;
  onAnswer:   (action: CardAction) => Promise<boolean>;
  onCancel:   () => Promise<boolean>;
}

const isTyped = (a: string): a is TypedAnswer => (TYPED_ANSWERS as readonly string[]).includes(a);

/** Réponse courante d'une carte, en clair : la réponse, qui l'a donnée, quand. Un texte saisi est « saisi par X le Y ». */
export function CurrentAnswer({ card, current, docs }: { card: ReadingCard | undefined; current: Decision; docs: DocNaming }) {
  const typed = 'text' in current.action;
  const { label, title } = namedLabel(docs, name => describeCardAnswer(current.action, card, name));
  return (
    <p className="obp-decision__current">
      <span className={`obp-decision__badge obp-decision__badge--${current.action.type}`} title={title}>
        {label}
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
export function CardAnswers({ card, current, arbitrable, busy, docs, onAnswer, onCancel }: CardAnswersProps) {
  const [editing, setEditing] = useState(false);
  const [typing,  setTyping]  = useState<TypedAnswer | null>(null);
  const [text,    setText]    = useState('');
  const [error,   setError]   = useState<string | null>(null);
  const [more,    setMore]    = useState(false);
  const [following, setFollowing] = useState(false);

  const reset = () => { setTyping(null); setText(''); setError(null); setEditing(false); setFollowing(false); };
  const submit = async (action: CardAction) => { if (await onAnswer(action)) reset(); };

  if (!arbitrable) {
    return current
      ? <CurrentAnswer card={card} current={current} docs={docs} />
      : <p className="obp-muted">Aucune réponse.</p>;
  }

  if (current && !editing) {
    return (
      <div className="obp-decision">
        <CurrentAnswer card={card} current={current} docs={docs} />
        <div className="obp-decision__actions">
          <Button variant="ghost" size="sm" loading={busy} onClick={() => void onCancel()}>Annuler</Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => setEditing(true)}>Changer</Button>
        </div>
      </div>
    );
  }

  if (following && card.recommendation) {
    return (
      <form className="obp-decision__form" onSubmit={e => {
        e.preventDefault();
        void submit({ type: 'follow_recommendation', precisions: text.trim() || null });
      }}>
        <p className="obp-clarify-answer__chosen">{FOLLOW_RECOMMENDATION_LABEL}</p>
        <blockquote className="obp-clarify-reco__text">{card.recommendation.text}</blockquote>
        <div className="obp-clarify-reco__outcome" role="note">
          <p className="obp-clarify-reco__outcome-title">Ce que cela fera dans la base</p>
          <p>{recommendationOutcome(card, docs.name)}</p>
          <p className="obp-muted">
            Le texte de la recommandation n'est jamais recopié tel quel dans la base : il guide sa rédaction.
          </p>
        </div>
        <TextArea id={`obp-card-${card.id}-precision`} label="Ajouter une précision (facultatif)" value={text} rows={3}
          maxLength={5000} onChange={e => setText(e.target.value)} />
        <p className="obp-muted">Votre précision est enregistrée telle quelle, avec votre nom et la date ; elle prime sur la recommandation.</p>
        <div className="obp-decision__actions">
          <Button type="submit" variant="primary" size="sm" loading={busy}>Confirmer</Button>
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => { setFollowing(false); setText(''); }}>Retour</Button>
        </div>
      </form>
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
  const retain = (s: ReadingCard['sides'][number]): { label: string; title?: string } => {
    const quotes = toQuotes(s.quotes);
    if (oneSided) return { label: 'Oui, ce passage est juste' };
    if (isBriefingOnly(quotes)) return { label: 'Retenir votre fiche de cadrage' };
    return namedLabel(docs, name => `Retenir ${s.label} : ${sideDocuments(quotes, name).join(', ')}`);
  };

  return (
    <div className="obp-decision">
      {current && <CurrentAnswer card={card} current={current} docs={docs} />}

      {card.recommendation && (
        <div className="obp-clarify-reco" role="group" aria-label="Recommandation de l'IA">
          <p className="obp-clarify-answer__subtitle">Recommandation de l'IA</p>
          <blockquote className="obp-clarify-reco__text">{card.recommendation.text}</blockquote>
          <div className="obp-decision__actions">
            <Button variant="primary" size="sm" disabled={busy} onClick={() => { setText(''); setFollowing(true); }}>
              {FOLLOW_RECOMMENDATION_LABEL}
            </Button>
          </div>
          <p className="obp-clarify-answer__subtitle">Ou répondez vous-même :</p>
        </div>
      )}

      {sides.length > 0 && (
        <div className="obp-clarify-answer__group" role="group" aria-label="Retenir un côté">
          <p className="obp-clarify-answer__subtitle">{NATURES[card.nature].label} : {sidesQuestion(card)}</p>
          <div className="obp-decision__actions">
            {sides.map(s => {
              const { label, title } = retain(s);
              return (
                <Button key={s.label} variant="secondary" size="sm" disabled={busy} title={title}
                  onClick={() => void submit({ type: 'accept_side', side: s.label })}>
                  {label}
                </Button>
              );
            })}
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

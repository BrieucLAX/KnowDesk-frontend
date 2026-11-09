import React, { useState } from 'react';
import { Button } from '../../../../shared/components/ui/Button';
import { formatFull } from '../../../../shared/lib/formatDate';
import { TextArea } from '../TextArea';
import { namedLabel, type DocNaming } from '../../lib/audit';
import type { Decision } from '../../lib/decisions';
import {
  answerLabel, cardAnswers, cardLabel, codeCheck, describeCardAnswer, FOLLOW_BLOCKED_REASON, FOLLOW_WARNING,
  followBlocked, followLabel, followWarned, isBriefingOnly, isCodeCard, isCodeRecommendation, isVersionCard, missingSide, recommendationOutcome, retainValueLabel,
  sideDocuments, sidesQuestion, sideValue, substantiveAnswers, toQuotes, TYPED_ANSWERS, valueGroups, type CardAction, type PlainAnswerCode, type ReadingCard,
  type TypedAnswer,
} from '../../lib/reading';

interface CardAnswersProps {
  card:       ReadingCard;
  current:    Decision | undefined;
  /** Faux pour l'audit d'une analyse précédente : la réponse se lit, sans action. */
  arbitrable: boolean;
  /** Audit 0.16.0 et plus : le texte saisi est un arbitrage qui entre dans la base (2026-11-09). */
  arbitrage?: boolean;
  busy:       boolean;
  /** Nom de fichier d'un document, et son chemin pour l'infobulle. */
  docs:       DocNaming;
  onAnswer:   (action: CardAction) => Promise<boolean>;
  onCancel:   () => Promise<boolean>;
}

const isTyped = (a: string): a is TypedAnswer => (TYPED_ANSWERS as readonly string[]).includes(a);

/**
 * Sous la précision et sous une réponse saisie (lot Elyra v2, F1) : ce texte part dans la
 * préparation de la base comme consigne de rédaction. Une remarque sur la carte va dans le
 * commentaire sur la carte (`CardCommentBox`), que le back garde seul.
 */
export const PRECISION_WARNING = 'Ce texte sera repris dans la base comme consigne de rédaction. '
  + 'Une remarque sur la carte elle-même (doublon, côtés mal classés, question sur l\'analyse) va dans le '
  + 'commentaire sur la carte, plus bas : il n\'entre jamais dans la base.';

/**
 * Sur toute carte d'un audit 0.16.0 et plus (décision du porteur du 2026-11-09) : le texte écrit
 * dans « Autre réponse » ou dans la précision est un arbitrage ; il entre dans la base pour le
 * sujet de la carte, « saisi par l'expert le … ». Une remarque pour l'équipe va dans le commentaire.
 */
export const ARBITRAGE_WARNING = 'Ce texte est votre arbitrage : il entre dans la base, pour le sujet de cette carte seulement, '
  + 'avec la mention « saisi par l\'expert le … ». Une remarque pour l\'équipe (doublon, côtés mal classés, question '
  + 'sur l\'analyse) va dans le champ « Commentaire », plus bas : il n\'entre jamais dans la base.';

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
export function CardAnswers({ card, current, arbitrable, arbitrage = false, busy, docs, onAnswer, onCancel }: CardAnswersProps) {
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

  // Une carte du code n'a jamais de recommandation, même si un back en rendait une.
  const recommendation = isCodeCard(card) ? null : card.recommendation ?? null;
  const answers = cardAnswers(card);
  const groups = valueGroups(card);
  const version = isVersionCard(card);
  // L'effet sur les sources ne s'affiche jamais dans « À clarifier » sur une carte à valeurs (D1).
  const warning = arbitrage ? ARBITRAGE_WARNING : PRECISION_WARNING;

  if (following && recommendation) {
    return (
      <form className="obp-decision__form" onSubmit={e => {
        e.preventDefault();
        void submit({ type: 'follow_recommendation', precisions: text.trim() || null });
      }}>
        <p className="obp-clarify-answer__chosen">{followLabel(card)}</p>
        <blockquote className="obp-clarify-reco__text">{recommendation.text}</blockquote>
        {groups.length === 0 && (
          <div className="obp-clarify-reco__outcome" role="note">
            <p className="obp-clarify-reco__outcome-title">Ce que cela fera dans la base</p>
            <p>{recommendationOutcome(card, docs.name)}</p>
            <p className="obp-muted">
              Le texte de la recommandation n'est jamais recopié tel quel dans la base : il guide sa rédaction.
            </p>
          </div>
        )}
        <TextArea id={`obp-card-${card.id}-precision`} label="Ajouter une précision (facultatif)" value={text} rows={3}
          maxLength={5000} onChange={e => setText(e.target.value)} />
        <p className="obp-muted">Votre précision est enregistrée telle quelle, avec votre nom et la date ; elle prime sur la recommandation.</p>
        <p className="obp-warning obp-clarify-precision__warning">{warning}</p>
        <div className="obp-decision__actions">
          <Button type="submit" variant="primary" size="sm" loading={busy}>Confirmer</Button>
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => { setFollowing(false); setText(''); }}>Retour</Button>
        </div>
      </form>
    );
  }

  if (typing) {
    const field = answerLabel(card, typing);
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
        <p className="obp-warning obp-clarify-precision__warning">{warning}</p>
        {error && <p className="field-error" role="alert">{error}</p>}
        <div className="obp-decision__actions">
          <Button type="submit" variant="primary" size="sm" loading={busy}>Enregistrer</Button>
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => { setTyping(null); setError(null); }}>Retour</Button>
        </div>
      </form>
    );
  }

  const choose = (a: PlainAnswerCode) => {
    if (isTyped(a)) { setText(''); setError(null); setTyping(a); return; }
    void submit({ type: a } as CardAction);
  };

  const sides = answers.includes('accept_side') ? card.sides : [];
  const oneSided = missingSide(card) !== null;
  const retain = (s: ReadingCard['sides'][number]): { label: string; title?: string } => {
    const quotes = toQuotes(s.quotes);
    if (oneSided) return { label: 'Oui, ce passage est juste' };
    if (isBriefingOnly(quotes)) return { label: 'Retenir votre fiche de cadrage' };
    const value = sideValue(card, s.label);
    return namedLabel(docs, name => `Retenir ${s.label} : ${value ? `${value}, ` : ''}${sideDocuments(quotes, name).join(', ')}`);
  };

  return (
    <div className="obp-decision">
      {current && <CurrentAnswer card={card} current={current} docs={docs} />}

      {recommendation && (
        <div className="obp-clarify-reco" role="group" aria-label={isCodeRecommendation(card) ? 'Recommandation' : 'Recommandation de l\'IA'}>
          <p className="obp-clarify-answer__subtitle">{isCodeRecommendation(card) ? 'Recommandation, écrite à partir de vos documents' : 'Recommandation de l\'IA'}</p>
          <blockquote className="obp-clarify-reco__text">{recommendation.text}</blockquote>
          <div className="obp-decision__actions">
            <Button variant="primary" size="sm" disabled={busy || followBlocked(card)} onClick={() => { setText(''); setFollowing(true); }}>
              {followLabel(card)}
            </Button>
          </div>
          {followBlocked(card) && <p className="obp-muted obp-clarify-reco__blocked">{FOLLOW_BLOCKED_REASON}</p>}
          {followWarned(card) && <p className="obp-warning obp-clarify-reco__warning" role="note">{FOLLOW_WARNING}</p>}
          <p className="obp-clarify-answer__subtitle">Ou répondez vous-même :</p>
        </div>
      )}

      {sides.length > 0 && (
        <div className="obp-clarify-answer__group" role="group" aria-label="Retenir un côté">
          <p className="obp-clarify-answer__subtitle">{cardLabel(card)} : {sidesQuestion(card)}</p>
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

      {groups.length > 0 && (
        <div className="obp-clarify-answer__group" role="group" aria-label="Retenir une valeur">
          <p className="obp-clarify-answer__subtitle">{cardLabel(card)} : {sidesQuestion(card)}</p>
          <div className="obp-decision__actions">
            {groups.map(g => (
              <Button key={g.id} variant="secondary" size="sm" disabled={busy} onClick={() => void submit({ type: 'retain_value', group: g.id })}>
                {retainValueLabel(g)}
              </Button>
            ))}
          </div>
        </div>
      )}

      {sides.length === 0 && groups.length === 0 && (codeCheck(card) || version) && (
        <p className="obp-clarify-answer__subtitle">{sidesQuestion(card)}</p>
      )}
      <div className="obp-decision__actions" role="group" aria-label="Répondre à la carte">
        {substantiveAnswers(card).map(a => (
          <Button key={a} variant="secondary" size="sm" disabled={busy} onClick={() => choose(a)}>{answerLabel(card, a).label}</Button>
        ))}
        {answers.includes('other_answer') && (
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => choose('other_answer')}>{answerLabel(card, 'other_answer').label}</Button>
        )}
        {answers.includes('later') && (
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => choose('later')}>{answerLabel(card, 'later').label}</Button>
        )}
        {answers.includes('out_of_scope') && (
          <Button variant="ghost" size="sm" disabled={busy} aria-expanded={more} onClick={() => setMore(m => !m)}>
            {more ? 'Moins de réponses' : 'Autres réponses…'}
          </Button>
        )}
        {current && <Button variant="ghost" size="sm" disabled={busy} onClick={reset}>Garder la réponse actuelle</Button>}
      </div>
      {more && (
        <div className="obp-decision__actions obp-clarify-answer__more" role="group" aria-label="Autres réponses">
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => choose('out_of_scope')}>{answerLabel(card, 'out_of_scope').label}</Button>
        </div>
      )}
    </div>
  );
}

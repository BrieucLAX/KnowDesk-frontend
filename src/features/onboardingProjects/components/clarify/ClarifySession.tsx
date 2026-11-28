import React, { useMemo, useState } from 'react';
import { Button } from '../../../../shared/components/ui/Button';
import { docNaming, type Audit } from '../../lib/audit';
import {
  answersLabel, ARBITRAGE_AUDIT_SCHEMAS, cardProgress, cardStatus, cardTitle, firstOpenCard, groupByNature, NATURES, orderedCards,
  settledQuestions, type Reading,
} from '../../lib/reading';
import type { Arbitration } from '../../hooks/useArbitration';
import { ReadingCardView } from './ReadingCardView';
import { CardAnswers } from './CardAnswers';
import { CardHistory } from './CardHistory';
import { CardCommentBox } from './CardCommentBox';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { AnsweredCheck } from './QuestionCheck';
import { KnowDeskCheck, KnowDeskMention } from '../../../../shared/components/ui/Origin';

interface ClarifySessionProps {
  audit:       Audit;
  reading:     Reading;
  /** Version de l'audit : à partir de 0.16.0, le texte saisi est un arbitrage (2026-11-09). */
  schemaVersion?: string;
  projectId:   string;
  analysisId:  string;
  arbitration: Arbitration;
  /** Carte ouverte d'abord ; sinon la première encore à traiter. */
  startCardId: string | null;
  onExit:      () => void;
}

/**
 * Session « Questions » (US 3.1) : une question à la fois, dans l'ordre des natures (celles qui
 * bloquent la publication d'abord) puis du modèle. À gauche, deux blocs : « À vous de répondre · N »
 * (par nature) et « Réglées par KnowDesk · N » (les cartes rangées sous une carte de versions) ;
 * un cercle coché à droite du libellé, vert si vous avez répondu, prune si KnowDesk l'a réglée,
 * rien si la question attend. « N réponses sur M » ne compte que les questions qui vous attendent.
 */
export function ClarifySession({ audit, reading, schemaVersion = '', projectId, analysisId, arbitration, startCardId, onExit }: ClarifySessionProps) {
  const ordered = useMemo(() => orderedCards(reading.cards), [reading.cards]);
  const groups  = useMemo(() => groupByNature(reading.cards), [reading.cards]);
  const settled = useMemo(() => settledQuestions(reading.cards), [reading.cards]);
  const current = arbitration.state.status === 'ready' ? arbitration.state.current : new Map();
  const arbitrable = arbitration.state.status === 'ready' && arbitration.state.arbitrable;
  const docs = useMemo(() => docNaming(audit), [audit]);

  const [index, setIndex] = useState(() => {
    const start = startCardId === null ? -1 : ordered.findIndex(c => c.id === startCardId);
    return start >= 0 ? start : firstOpenCard(ordered, current);
  });

  if (ordered.length === 0) {
    return (
      <div className="obp-arb">
        <p className="obp-muted">Aucune question dans cet audit.</p>
        <Button variant="ghost" size="sm" onClick={onExit}>Revenir à la vue d'ensemble</Button>
      </div>
    );
  }

  const i = Math.min(index, ordered.length - 1);
  const card = ordered[i];
  const decision = current.get(card.id);
  const p = cardProgress(reading.cards, current);

  return (
    <div className="obp-arb">
      <div className="obp-arb__head">
        <div>
          <h3 className="obp-section-title">Questions</h3>
          <p className="obp-arb__progress">
            <strong>{answersLabel(p.answered, p.total)}</strong>
            <progress max={p.total} value={p.answered} aria-label="Réponses données" />
            {p.later > 0 && <span className="obp-muted">{p.later} pour plus tard</span>}
          </p>
          {arbitrable
            ? <p className="obp-muted">« Plus tard » laisse la question en attente. Chaque réponse s'annule ou se change, rien n'est effacé.</p>
            : <p className="obp-muted">Audit d'une analyse précédente : ses réponses se consultent, sans modification.</p>}
        </div>
        <Button variant="ghost" size="sm" onClick={onExit}>Revenir à la vue d'ensemble</Button>
      </div>

      <div className="obp-arb__body">
        <nav className="obp-arb__overview" aria-label="Liste des questions">
          <section className="obp-q-block" aria-labelledby="obp-q-todo">
            <h4 id="obp-q-todo" className="obp-q-block__title">À vous de répondre · {ordered.length}</h4>
            {groups.map(g => (
              <div key={g.nature} className="obp-clarify-nav-group">
                <p className="obp-clarify-nav-group__title">{NATURES[g.nature].plural}</p>
                <ol>
                  {g.cards.map(c => {
                    const at = ordered.indexOf(c);
                    return (
                      <li key={c.id}>
                        <button type="button" className={`obp-arb__overview-item${at === i ? ' is-current' : ''}`}
                          aria-current={at === i ? 'step' : undefined} onClick={() => setIndex(at)}>
                          <span className="obp-clarify-nav__title">{cardTitle(c, at + 1)}</span>
                          {cardStatus(current.get(c.id)) === 'answered' && <AnsweredCheck />}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </section>
          {settled.length > 0 && (
            <section className="obp-q-block" aria-labelledby="obp-q-settled">
              <h4 id="obp-q-settled" className="obp-q-block__title"><KnowDeskMention>{`Réglées par KnowDesk · ${settled.length}`}</KnowDeskMention></h4>
              <ol>
                {settled.map(({ ranged, byCardId }) => {
                  const at = ordered.findIndex(c => c.id === byCardId);
                  return (
                    <li key={ranged.cardId}>
                      {/* Une question réglée se lit sous la carte de versions qui la règle. */}
                      <button type="button" className="obp-arb__overview-item" onClick={() => setIndex(at)}>
                        <span className="obp-clarify-nav__title">{ranged.subject}</span>
                        <KnowDeskCheck />
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}
        </nav>

        <div className="obp-arb__step">
          <ReadingCardView key={card.id} audit={audit} card={card} title={cardTitle(card, i + 1)}
            position={`Question ${i + 1} sur ${ordered.length}`} />
          <div className="obp-decision-block">
            <CardAnswers
              key={card.id}
              card={card}
              current={decision}
              arbitrable={arbitrable}
              arbitrage={ARBITRAGE_AUDIT_SCHEMAS.includes(schemaVersion)}
              busy={arbitration.pending === card.id}
              docs={docs}
              onAnswer={action => arbitration.answer(card.id, action)}
              onCancel={() => arbitration.cancel({ id: card.id })}
            />
            <CardHistory projectId={projectId} analysisId={analysisId} card={card} docs={docs} currentId={decision?.id ?? null} />
            <CardCommentBox key={`comment-${card.id}`} projectId={projectId} analysisId={analysisId} cardId={card.id} editable={arbitrable} />
          </div>
          <div className="obp-arb__nav">
            <Button variant="ghost" size="sm" disabled={i === 0} onClick={() => setIndex(i - 1)} leftIcon={<ArrowLeft size={16} />}>Précédente</Button>
            <Button variant={cardStatus(decision) === 'answered' ? 'primary' : 'secondary'} size="sm"
              disabled={i === ordered.length - 1} onClick={() => setIndex(i + 1)}>
              Question suivante<ArrowRight size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

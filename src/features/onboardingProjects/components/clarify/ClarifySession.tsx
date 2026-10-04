import React, { useMemo, useState } from 'react';
import { Button } from '../../../../shared/components/ui/Button';
import { docNaming, type Audit } from '../../lib/audit';
import {
  CARD_STATUS_LABEL, cardProgress, cardStatus, cardTitle, firstOpenCard, groupByNature, NATURES, orderedCards, type Reading,
} from '../../lib/reading';
import type { Arbitration } from '../../hooks/useArbitration';
import { ReadingCardView } from './ReadingCardView';
import { CardAnswers } from './CardAnswers';
import { CardHistory } from './CardHistory';

interface ClarifySessionProps {
  audit:       Audit;
  reading:     Reading;
  projectId:   string;
  analysisId:  string;
  arbitration: Arbitration;
  /** Carte ouverte d'abord ; sinon la première encore à traiter. */
  startCardId: string | null;
  onExit:      () => void;
}

const STATUS_CLASS = { open: 'todo', answered: 'decided', later: 'later' } as const;

/**
 * Session « À clarifier » : une carte à la fois, dans l'ordre des natures (celles qui bloquent
 * la publication d'abord) puis du modèle ; vue d'ensemble par nature ; précédente / suivante.
 */
export function ClarifySession({ audit, reading, projectId, analysisId, arbitration, startCardId, onExit }: ClarifySessionProps) {
  const ordered = useMemo(() => orderedCards(reading.cards), [reading.cards]);
  const groups  = useMemo(() => groupByNature(reading.cards), [reading.cards]);
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
        <p className="obp-muted">Aucune carte à clarifier dans cet audit.</p>
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
          <h3 className="obp-section-title">À clarifier</h3>
          <p className="obp-arb__progress">
            <strong>{p.answered} sur {p.total}</strong> {p.total > 1 ? 'cartes répondues' : 'carte répondue'}
            <progress max={p.total} value={p.answered} aria-label="Cartes répondues" />
            {p.later > 0 && <span className="obp-muted">{p.later} pour plus tard</span>}
          </p>
          {arbitrable
            ? <p className="obp-muted">« Plus tard » laisse la carte à traiter. Chaque réponse s'annule ou se change, rien n'est effacé.</p>
            : <p className="obp-muted">Audit d'une analyse précédente : ses réponses se consultent, sans modification.</p>}
        </div>
        <Button variant="ghost" size="sm" onClick={onExit}>Revenir à la vue d'ensemble</Button>
      </div>

      <div className="obp-arb__body">
        <nav className="obp-arb__overview" aria-label="Vue d'ensemble des cartes">
          {groups.map(g => (
            <div key={g.nature} className="obp-clarify-nav-group">
              <p className="obp-clarify-nav-group__title">{NATURES[g.nature].plural}</p>
              <ol>
                {g.cards.map(c => {
                  const at = ordered.indexOf(c);
                  const st = cardStatus(current.get(c.id));
                  return (
                    <li key={c.id}>
                      <button type="button" className={`obp-arb__overview-item${at === i ? ' is-current' : ''}`}
                        aria-current={at === i ? 'step' : undefined} onClick={() => setIndex(at)}>
                        <span className="obp-clarify-nav__title">{cardTitle(c, at + 1)}</span>
                        <span className={`obp-arb__status obp-arb__status--${STATUS_CLASS[st]}`}>{CARD_STATUS_LABEL[st]}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </nav>

        <div className="obp-arb__step">
          <ReadingCardView key={card.id} audit={audit} card={card} title={cardTitle(card, i + 1)}
            position={`Carte ${i + 1} sur ${ordered.length}`} />
          <div className="obp-decision-block">
            <CardAnswers
              key={card.id}
              card={card}
              current={decision}
              arbitrable={arbitrable}
              busy={arbitration.pending === card.id}
              docs={docs}
              onAnswer={action => arbitration.answer(card.id, action)}
              onCancel={() => arbitration.cancel({ id: card.id })}
            />
            <CardHistory projectId={projectId} analysisId={analysisId} card={card} docs={docs} currentId={decision?.id ?? null} />
          </div>
          <div className="obp-arb__nav">
            <Button variant="ghost" size="sm" disabled={i === 0} onClick={() => setIndex(i - 1)}>← Précédente</Button>
            <Button variant={cardStatus(decision) === 'answered' ? 'primary' : 'secondary'} size="sm"
              disabled={i === ordered.length - 1} onClick={() => setIndex(i + 1)}>
              Suivante →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

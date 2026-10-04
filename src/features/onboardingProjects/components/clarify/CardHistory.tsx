import React, { useEffect, useState } from 'react';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';
import { useToast } from '../../../../shared/lib/useToast';
import { formatFull } from '../../../../shared/lib/formatDate';
import { onboardingApi } from '../../api/onboardingApi';
import { namedLabel, type DocNaming } from '../../lib/audit';
import type { Decision } from '../../lib/decisions';
import { describeCardAnswer, type ReadingCard } from '../../lib/reading';

interface CardHistoryProps {
  projectId:  string;
  analysisId: string;
  card:       ReadingCard;
  docs:       DocNaming;
  /** Réponse courante : l'historique se relit quand elle change. */
  currentId:  string | null;
}

/**
 * Historique d'une carte : chaque réponse, son auteur, sa date, annulée ou non. Rien n'est
 * jamais effacé : une réponse s'annule par une nouvelle ligne. Chargé à l'ouverture.
 */
export function CardHistory({ projectId, analysisId, card, docs, currentId }: CardHistoryProps) {
  const toast = useToast();
  const [open,  setOpen]  = useState(false);
  const [items, setItems] = useState<Decision[] | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setItems(null);
    onboardingApi.cardHistory(projectId, analysisId, card.id)
      .then(data => { if (!cancelled) setItems(data); })
      .catch(err => {
        if (cancelled) return;
        setItems([]);
        toast.error(err instanceof Error ? err.message : 'Impossible de charger l\'historique.');
      });
    return () => { cancelled = true; };
  }, [open, currentId, projectId, analysisId, card.id, toast]);

  return (
    <details className="obp-decision-history" onToggle={e => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary>Historique</summary>
      {items === null ? <Skeleton className="obp-decision-history__loading" /> : items.length === 0 ? (
        <p className="obp-muted">Aucune réponse pour l'instant.</p>
      ) : (
        <ol className="obp-decision-history__list" aria-label="Historique de la carte">
          {items.map(d => {
            const { label, title } = namedLabel(docs, name => describeCardAnswer(d.action, card, name));
            return (
              <li key={d.id} className={d.cancelledAt ? 'obp-decision-history__item--cancelled' : undefined}>
                <span title={title}>{label}</span>
                <span className="obp-muted">
                  {'text' in d.action ? ` — saisi par ${d.decidedBy.name} le ${formatFull(d.decidedAt)}` : ` — ${d.decidedBy.name}, ${formatFull(d.decidedAt)}`}
                </span>
                {d.cancelledAt && (
                  <span className="obp-muted"> · annulée par {d.cancelledBy?.name ?? '—'}, {formatFull(d.cancelledAt)}</span>
                )}
                {d.id === currentId && <span className="obp-decision-history__current"> · réponse courante</span>}
              </li>
            );
          })}
        </ol>
      )}
    </details>
  );
}

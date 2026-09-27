import React, { useEffect, useState } from 'react';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';
import { useToast } from '../../../../shared/lib/useToast';
import { formatFull } from '../../../../shared/lib/formatDate';
import { onboardingApi } from '../../api/onboardingApi';
import type { Question } from '../../lib/audit';
import { describeDecision, type Decision } from '../../lib/decisions';

interface DecisionHistoryProps {
  projectId:  string;
  analysisId: string;
  question:   Question;
  /** Décision courante : l'historique se relit quand elle change. */
  currentId:  string | null;
}

/**
 * Historique d'une question : chaque décision, son auteur, sa date, annulée
 * ou non. Rien n'est jamais effacé. Chargé à l'ouverture.
 */
export function DecisionHistory({ projectId, analysisId, question, currentId }: DecisionHistoryProps) {
  const toast = useToast();
  const [open,  setOpen]  = useState(false);
  const [items, setItems] = useState<Decision[] | null>(null);

  // Relu à l'ouverture, puis à chaque changement de la décision courante tant qu'il est ouvert.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setItems(null);
    onboardingApi.questionHistory(projectId, analysisId, question.id)
      .then(data => { if (!cancelled) setItems(data); })
      .catch(err => {
        if (cancelled) return;
        setItems([]);
        toast.error(err instanceof Error ? err.message : 'Impossible de charger l\'historique.');
      });
    return () => { cancelled = true; };
  }, [open, currentId, projectId, analysisId, question.id, toast]);

  return (
    <details
      className="obp-decision-history"
      onToggle={e => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary>Historique</summary>
      {items === null ? <Skeleton className="obp-decision-history__loading" /> : items.length === 0 ? (
        <p className="obp-muted">Aucune décision pour l'instant.</p>
      ) : (
        <ol className="obp-decision-history__list" aria-label="Historique de la question">
          {items.map(d => (
            <li key={d.id} className={d.cancelledAt ? 'obp-decision-history__item--cancelled' : undefined}>
              <span>{describeDecision(d.action, question)}</span>
              <span className="obp-muted"> — {d.decidedBy.name}, {formatFull(d.decidedAt)}</span>
              {d.cancelledAt && (
                <span className="obp-muted"> · annulée par {d.cancelledBy?.name ?? '—'}, {formatFull(d.cancelledAt)}</span>
              )}
              {d.id === currentId && <span className="obp-decision-history__current"> · décision courante</span>}
            </li>
          ))}
        </ol>
      )}
    </details>
  );
}

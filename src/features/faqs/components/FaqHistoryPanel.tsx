import React, { useEffect, useState } from 'react';
import { Skeleton }      from '../../../shared/components/ui/Skeleton';
import { faqsApi }       from '../api/faqsApi';
import { ApiError }      from '../../../shared/lib/apiClient';
import { useToast }      from '../../../shared/lib/useToast';
import { formatRelative } from '../../../shared/lib/formatDate';
import type { FaqHistory, FaqHistoryActor } from '../types';
import { Pencil, Plus, Trash2 } from 'lucide-react';

interface FaqHistoryPanelProps {
  faqId: string;
}

function actorLabel(actor: FaqHistoryActor | null, fallback: string): string {
  if (!actor) return fallback;
  if (actor.firstName && actor.lastName) return `${actor.firstName} ${actor.lastName}`;
  if (actor.firstName) return actor.firstName;
  if (actor.email) return actor.email;
  return fallback;
}

function actionLabel(action: 'faq.updated' | 'faq.deleted'): { icon: React.ReactNode; text: string } {
  switch (action) {
    case 'faq.updated': return { icon: <Pencil size={16} />, text: 'a modifié la FAQ' };
    case 'faq.deleted': return { icon: <Trash2 size={16} />, text: 'a supprimé la FAQ' };
  }
}

/**
 * Historique des modifications d'une FAQ. Pliable (details/summary natifs).
 * Visible uniquement en mode édition (faqId présent).
 *
 * Limites assumées :
 * - La création n'apparaît pas dans audit_logs (le middleware tourne avant
 *   le handler donc resource_id=null sur faq.created). On la synthétise
 *   depuis created_at + created_by_id de la FAQ.
 * - On ne stocke pas le diff des modifications — juste « Marie a modifié
 *   la FAQ il y a 3 jours ». Pour le diff, il faudrait un système de
 *   versioning à la articles.
 */
export function FaqHistoryPanel({ faqId }: FaqHistoryPanelProps) {
  const [history, setHistory] = useState<FaqHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [opened,  setOpened]  = useState(false);
  const toast = useToast();

  // Lazy-load : on charge seulement quand le panneau est ouvert pour la 1re fois
  useEffect(() => {
    if (!opened || history || loading) return;
    let alive = true;
    setLoading(true);
    faqsApi.getHistory(faqId)
      .then(data => { if (alive) setHistory(data); })
      .catch(err => {
        if (alive) toast.error(err instanceof ApiError ? err.message : 'Impossible de charger l\'historique. Réessayez dans un instant.');
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [opened, faqId, history, loading, toast]);

  return (
    <details className="faq-history" onToggle={(e) => setOpened((e.currentTarget as HTMLDetailsElement).open)}>
      <summary className="faq-history__summary">
        Historique des modifications
        {history && history.entries.length > 0 && (
          <span className="faq-history__count">({history.entries.length})</span>
        )}
      </summary>

      <div className="faq-history__body">
        {loading && (
          <div className="faq-history__loading">
            <Skeleton className="sk-p" />
            <Skeleton className="sk-p" />
          </div>
        )}

        {history && (
          <ul className="faq-history__list" role="list">
            {history.entries.map(entry => {
              const { icon, text } = actionLabel(entry.action);
              return (
                <li key={entry.id} className="faq-history__entry">
                  <span className="faq-history__icon" aria-hidden="true">{icon}</span>
                  <span className="faq-history__text">
                    <strong>{actorLabel(entry.actor, 'Quelqu\'un')}</strong> {text} —{' '}
                    <time dateTime={entry.createdAt}>{formatRelative(entry.createdAt)}</time>
                  </span>
                </li>
              );
            })}
            {/* Entrée synthétique de création — toujours en bas (la plus ancienne) */}
            <li className="faq-history__entry faq-history__entry--creation">
              <span className="faq-history__icon" aria-hidden="true"><Plus size={16} /></span>
              <span className="faq-history__text">
                FAQ créée — <time dateTime={history.creation.createdAt}>{formatRelative(history.creation.createdAt)}</time>
              </span>
            </li>
          </ul>
        )}
      </div>
    </details>
  );
}

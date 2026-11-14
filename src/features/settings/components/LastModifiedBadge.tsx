import React, { useEffect, useState } from 'react';
import { auditApi, type AuditAction, type AuditLogItem } from '../../audit/api/auditApi';
import { formatRelative } from '../../../shared/lib/formatDate';

interface LastModifiedBadgeProps {
  /** Liste d'actions audit à interroger. Si plusieurs, on prend la
   *  plus récente parmi toutes. */
  actions: AuditAction[];
}

/**
 * Affiche "Dernière modification : Brieuc Langlois, il y a 3 jours"
 * sous le header d'une section settings.
 *
 * Fait un fetch parallèle pour chaque action passée (l'API audit ne
 * supporte qu'un seul filtre action à la fois). Garde la plus récente.
 *
 * Silencieux : si aucune entrée ou si l'API échoue, n'affiche rien.
 */
export function LastModifiedBadge({ actions }: LastModifiedBadgeProps) {
  const [item, setItem] = useState<AuditLogItem | null>(null);

  // Memoization simple sur le tableau d'actions (les actions sont
  // typiquement des string literals constants par section).
  const key = actions.join(',');

  useEffect(() => {
    let cancelled = false;
    Promise.all(actions.map(a => auditApi.list({ action: a, perPage: 1 })))
      .then(responses => {
        if (cancelled) return;
        const latest = responses
          .map(r => r.items[0])
          .filter((x): x is AuditLogItem => Boolean(x))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
        setItem(latest ?? null);
      })
      .catch(() => { /* silent — pas critique */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!item) return null;

  const userName = item.user?.firstName
    ? `${item.user.firstName} ${item.user.lastName ?? ''}`.trim()
    : item.user?.email ?? 'Membre inconnu';

  return (
    <p className="settings-section__last-modified" aria-live="polite">
      Dernière modification : <strong>{userName}</strong>, {formatRelative(item.createdAt)}
    </p>
  );
}

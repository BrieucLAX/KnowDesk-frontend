import React from 'react';
import { Button }   from '../../../shared/components/ui/Button';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { formatFull } from '../../../shared/lib/formatDate';
import type { ArticleVersion } from '../hooks/useArticleVersions';
import { X } from 'lucide-react';

interface VersionsPanelProps {
  versions:  ArticleVersion[];
  loading:   boolean;
  onClose:   () => void;
  onRestore: (version: number) => void;
  currentVersion?: number;
}

export function VersionsPanel({
  versions, loading, onClose, onRestore, currentVersion,
}: VersionsPanelProps) {
  return (
    <div className="versions-panel" role="complementary" aria-label="Historique des versions">
      <div className="versions-panel__header">
        <h2 className="versions-panel__title">Historique</h2>
        <button
          type="button"
          className="versions-panel__close"
          onClick={onClose}
          aria-label="Fermer l'historique"
        ><X size={16} /></button>
      </div>

      <div className="versions-panel__body">
        {loading ? (
          <>
            {[1,2,3].map(i => <Skeleton key={i} className="sk-version" />)}
          </>
        ) : versions.length === 0 ? (
          <p className="versions-panel__empty">Aucune version enregistrée.</p>
        ) : (
          <ul className="versions-list" role="list">
            {versions.map(v => (
              <li
                key={v.id}
                className={`version-item ${v.version === currentVersion ? 'version-item--current' : ''}`}
              >
                <div className="version-item__info">
                  <span className="version-item__num">v{v.version}</span>
                  <span className="version-item__title">{v.title}</span>
                  {v.summary && (
                    <span className="version-item__summary">{v.summary}</span>
                  )}
                  <time className="version-item__date">
                    {formatFull(v.created_at)}
                  </time>
                </div>
                {v.version !== currentVersion && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRestore(v.version)}
                  >
                    Restaurer
                  </Button>
                )}
                {v.version === currentVersion && (
                  <span className="version-item__badge">Actuelle</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

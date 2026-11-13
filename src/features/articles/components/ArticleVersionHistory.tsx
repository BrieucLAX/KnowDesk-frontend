import React, { useState } from 'react';
import { formatRelative } from '../../../shared/lib/formatDate';
import '../articles.css';
import type { ArticleVersion } from '../types';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ArticleVersionHistoryProps {
  versions:       ArticleVersion[];
  currentVersion: number;
  onRestore?:     (version: number) => void;
  canRestore:     boolean;
}

export function ArticleVersionHistory({
  versions, currentVersion, onRestore, canRestore,
}: ArticleVersionHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const safeVersions = versions ?? [];

  if (safeVersions.length === 0) return null;

  return (
    <div className="version-history">
      <button
        className="version-history__toggle"
        onClick={() => setIsOpen(o => !o)}
        aria-expanded={isOpen}
        aria-controls="version-list"
      >
        <span>Historique des versions</span>
        <span className="version-history__count">({safeVersions.length})</span>
        <span className="version-history__chevron" aria-hidden="true">
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {isOpen && (
        <ol id="version-list" className="version-history__list" reversed>
          {safeVersions.map(v => (
            <li key={v.version} className="version-history__item">
              <div className="version-history__item-main">
                <span className={`version-history__badge ${v.version === currentVersion ? 'version-history__badge--current' : ''}`}>
                  v{v.version}{v.version === currentVersion && ' (actuelle)'}
                </span>
                <span className="version-history__author">{v.authorName}</span>
                <time className="version-history__date" dateTime={v.updatedAt}>
                  {formatRelative(v.updatedAt)}
                </time>
              </div>
              {v.summary && (
                <p className="version-history__summary">{v.summary}</p>
              )}
              {canRestore && v.version !== currentVersion && onRestore && (
                <button
                  className="version-history__restore"
                  onClick={() => onRestore(v.version)}
                  aria-label={`Restaurer la version ${v.version}`}
                >
                  Restaurer
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

import React from 'react';
import { cn }             from '../../../shared/lib/cn';
import { formatRelative } from '../../../shared/lib/formatDate';
import { sanitizeHighlight } from '../../../shared/lib/sanitize';
import type { SearchResult } from '../types';

const TYPE_CONFIG = {
  // Type de contenu : variante primary de la fiche Badge (pas une couleur d'état).
  article: { label: 'Article',  className: 'badge badge--primary' },
  faq:     { label: 'FAQ',      className: 'badge badge--primary' },
  tree:    { label: 'Processus', className: 'badge badge--primary' },
} as const;

interface SearchResultItemProps {
  result:    SearchResult;
  isActive:  boolean;
  onClick:   (result: SearchResult) => void;
  id:        string;  // for aria-activedescendant
}

export function SearchResultItem({ result, isActive, onClick, id }: SearchResultItemProps) {
  const { label, className } = TYPE_CONFIG[result.type];

  return (
    <li
      id={id}
      role="option"
      aria-selected={isActive}
      className={cn('search-result', isActive && 'search-result--active')}
      onClick={() => onClick(result)}
      // Mouse enter syncs keyboard-active index visually
      onMouseEnter={e => (e.currentTarget as HTMLElement).closest('ul')?.setAttribute('data-mouse', 'true')}
    >
      <div className="search-result__main">
        {/* title/excerpt contain <mark> tags from Meilisearch highlighting.
            Meilisearch already HTML-escapes user content before inserting them,
            but we sanitize here as a defense-in-depth — only <mark> survives. */}
        <span
          className="search-result__title"
          dangerouslySetInnerHTML={{ __html: sanitizeHighlight(result.title) }}
        />
        <p
          className="search-result__excerpt"
          dangerouslySetInnerHTML={{ __html: sanitizeHighlight(result.excerpt) }}
        />
      </div>
      <div className="search-result__meta">
        <span className={className}>{label}</span>
        <span className="search-result__category">{result.category}</span>
        <time className="search-result__time" dateTime={result.updatedAt}>
          {formatRelative(result.updatedAt)}
        </time>
      </div>
    </li>
  );
}

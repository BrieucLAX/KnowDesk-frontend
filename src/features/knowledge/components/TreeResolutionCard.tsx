import React, { useCallback } from 'react';
import type { TreeResolution } from '../types';

interface TreeResolutionCardProps {
  resolution:    TreeResolution;
  onViewArticle: (articleId: string) => void;
  onCopy:        (text: string) => void;
  onRestart:     () => void;
  onBack:        () => void;
}

/**
 * Shown when the advisor has navigated to a terminal answer.
 * Two variants:
 *   - 'article' → links to the full article
 *   - 'answer'  → shows the answer inline with a copy button
 */
export function TreeResolutionCard({
  resolution, onViewArticle, onCopy, onRestart, onBack,
}: TreeResolutionCardProps) {

  const handleCopy = useCallback(() => {
    if (resolution.type === 'answer') onCopy(resolution.answer);
  }, [resolution, onCopy]);

  return (
    <div className="tree-resolution" role="region" aria-label="Réponse trouvée" aria-live="polite">

      <div className="tree-resolution__icon" aria-hidden="true">
        <CheckIcon />
      </div>

      <h2 className="tree-resolution__title">Réponse trouvée</h2>

      {resolution.type === 'answer' && (
        <>
          <p className="tree-resolution__answer">{resolution.answer}</p>
          <button
            className="tree-resolution__copy"
            onClick={handleCopy}
            aria-label="Copier la réponse dans le presse-papiers"
          >
            <CopyIcon /> Copier la réponse
          </button>
        </>
      )}

      {resolution.type === 'article' && (
        <div className="tree-resolution__article-link">
          <p className="tree-resolution__article-hint">
            Consultez l'article complet pour les détails de traitement :
          </p>
          <button
            className="tree-resolution__view-article"
            onClick={() => onViewArticle(resolution.articleId)}
          >
            {resolution.articleTitle}
            <ArrowIcon />
          </button>
        </div>
      )}

      <div className="tree-resolution__actions">
        <button className="tree-resolution__back" onClick={onBack}>
          ← Question précédente
        </button>
        <button className="tree-resolution__restart" onClick={onRestart}>
          Recommencer depuis le début
        </button>
      </div>

    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="var(--success-soft)" stroke="var(--success)" strokeWidth="1.5"/>
      <path d="M7 12.5l3.5 3.5 6.5-7" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M9 4V2.5A1.5 1.5 0 007.5 1H2.5A1.5 1.5 0 001 2.5v5A1.5 1.5 0 002.5 9H4" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

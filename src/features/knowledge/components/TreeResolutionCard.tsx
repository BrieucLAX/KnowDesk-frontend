import React, { useCallback } from 'react';
import type { TreeResolution } from '../types';
import { ArrowLeft, ArrowRight, CircleCheck, Copy } from 'lucide-react';

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
        <CircleCheck className="tree-resolution__check" size={24} />
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
            <Copy size={16} /> Copier la réponse
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
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      <div className="tree-resolution__actions">
        <button className="tree-resolution__back" onClick={onBack}>
          <ArrowLeft size={16} />Question précédente
        </button>
        <button className="tree-resolution__restart" onClick={onRestart}>
          Recommencer depuis le début
        </button>
      </div>

    </div>
  );
}




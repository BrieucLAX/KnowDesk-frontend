import React, { useCallback, useEffect, useState } from 'react';
import { Button }   from '../../../shared/components/ui/Button';
import { useToast } from '../../../shared/lib/useToast';
import { ApiError } from '../../../shared/lib/apiClient';
import { formatRelative } from '../../../shared/lib/formatDate';
import {
  articleQualityApi,
  ALL_DIMENSIONS, DIMENSION_LABEL, DIMENSION_HELP,
  type QualityDimension, type QualityForArticle,
} from '../api/articleQualityApi';
import './ArticleQualityPanel.css';
import { ChevronRight, CircleCheck, RotateCw, Sparkles, TriangleAlert } from 'lucide-react';

interface ArticleQualityPanelProps {
  articleId: string;
  /** Désactive l'affichage si user n'est pas admin/manager. */
  visible:   boolean;
}

/**
 * Panneau « ✨ Suggestions IA » dans l'éditeur — visible uniquement
 * pour admin/manager. Affiche le scoring des 6 dimensions, les
 * messages d'amélioration et permet de :
 *   - Relancer un scoring manuellement
 *   - Marquer une dimension comme « OK » (dismiss)
 *
 * Pliable par défaut. Le bouton « ✨ Réévaluer » bloque ~5-15 s.
 */
export function ArticleQualityPanel({ articleId, visible }: ArticleQualityPanelProps) {
  const toast = useToast();
  const [data,    setData]    = useState<QualityForArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [recheck, setRecheck] = useState(false);
  const [open,    setOpen]    = useState(true);

  const fetchData = useCallback(async () => {
    if (!articleId) return;
    setLoading(true);
    try {
      const d = await articleQualityApi.getForArticle(articleId);
      setData(d);
    } catch (err) {
      // Silent — pas critique si le scoring n'a pas encore tourné
      // (worker en attente, Mistral indisponible, etc.)
      if (err instanceof ApiError && err.status !== 404) {
        toast.error(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [articleId, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRecheck = useCallback(async () => {
    setRecheck(true);
    try {
      const result = await articleQualityApi.recheck(articleId);
      // Re-fetch full state pour avoir le bon `dismissed` + `stale`
      await fetchData();
      const flagged = ALL_DIMENSIONS.filter(d => result.dimensions[d] === 'flagged').length;
      toast.success(flagged === 0
        ? 'Aucun problème détecté.'
        : `${flagged} dimension${flagged > 1 ? 's' : ''} à revoir.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "L'évaluation par l'IA a échoué. Réessayez dans quelques instants.");
    } finally {
      setRecheck(false);
    }
  }, [articleId, toast, fetchData]);

  const handleDismiss = useCallback(async (dim: QualityDimension) => {
    try {
      const { dismissed } = await articleQualityApi.dismissDimension(articleId, dim);
      setData(prev => prev ? { ...prev, dismissed } : prev);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "La dimension n'a pas pu être marquée comme conforme. Réessayez.");
    }
  }, [articleId, toast]);

  if (!visible) return null;

  // Pas encore scoré OU score perdu — on affiche un bouton "lancer le scoring"
  if (!loading && (!data || !data.quality)) {
    return (
      <section className="article-quality">
        <header className="article-quality__header">
          <h3 className="article-quality__title icon-label"><Sparkles size={16} />Suggestions IA</h3>
        </header>
        <div className="article-quality__empty">
          <p>Cet article n'a pas encore été évalué.</p>
          <Button variant="ghost" size="sm" onClick={handleRecheck} loading={recheck}>
            Lancer l'évaluation
          </Button>
        </div>
      </section>
    );
  }

  if (loading || !data?.quality) {
    return (
      <section className="article-quality article-quality--loading">
        <header className="article-quality__header">
          <h3 className="article-quality__title icon-label"><Sparkles size={16} />Suggestions IA</h3>
        </header>
        <p className="article-quality__loading">Chargement…</p>
      </section>
    );
  }

  const { quality, dismissed, stale, checkedAt } = data;
  const visibleFlagged = ALL_DIMENSIONS.filter(d =>
    quality.dimensions[d] === 'flagged' && !dismissed[d],
  );
  const allOk = visibleFlagged.length === 0;

  return (
    <section className={`article-quality ${allOk ? 'article-quality--ok' : 'article-quality--issues'}`}>
      <header className="article-quality__header">
        <button
          type="button"
          className="article-quality__toggle"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
        >
          <span className={`article-quality__chevron ${open ? 'is-open' : ''}`} aria-hidden="true"><ChevronRight size={16} /></span>
          <h3 className="article-quality__title icon-label">
            <Sparkles size={16} />Suggestions IA
            {allOk
              ? <span className="article-quality__badge article-quality__badge--ok">Rien à revoir</span>
              : <span className="article-quality__badge article-quality__badge--flag">{visibleFlagged.length} à revoir</span>}
          </h3>
        </button>
        <div className="article-quality__head-actions">
          {stale && <span className="article-quality__stale" title="L'article a été modifié depuis la dernière évaluation">Modifié depuis</span>}
          <Button variant="ghost" size="sm" onClick={handleRecheck} loading={recheck}>
            <RotateCw size={16} />Réévaluer
          </Button>
        </div>
      </header>

      {open && (
        <>
          <p className="article-quality__meta">
            Dernière évaluation : {checkedAt ? formatRelative(checkedAt) : '—'}
            {' · '}
            <span className="article-quality__score">{quality.score}/6 dimensions conformes</span>
          </p>

          <ul className="article-quality__list">
            {ALL_DIMENSIONS.map(d => {
              const status = quality.dimensions[d];
              const isDismissed = !!dismissed[d];
              const issue = quality.issues.find(i => i.dimension === d);
              return (
                <li
                  key={d}
                  className={`article-quality__item article-quality__item--${status === 'flagged' && !isDismissed ? 'flagged' : 'ok'}`}
                >
                  <div className="article-quality__item-head">
                    <span className="article-quality__item-status" aria-hidden="true">
                      {status === 'flagged' && !isDismissed ? <TriangleAlert size={16} /> : <CircleCheck size={16} />}
                    </span>
                    <span className="article-quality__item-name">{DIMENSION_LABEL[d]}</span>
                    {isDismissed && <span className="article-quality__dismissed">marquée conforme</span>}
                  </div>
                  {status === 'flagged' && !isDismissed && (
                    <>
                      <p className="article-quality__item-message">
                        {issue?.message ?? 'Dimension à revoir.'}
                      </p>
                      {issue?.excerpt && (
                        <blockquote className="article-quality__item-excerpt">« {issue.excerpt} »</blockquote>
                      )}
                      <div className="article-quality__item-actions">
                        <button
                          type="button"
                          className="article-quality__dismiss-btn"
                          onClick={() => handleDismiss(d)}
                          title={DIMENSION_HELP[d]}
                        >
                          Marquer comme conforme
                        </button>
                      </div>
                    </>
                  )}
                  {status === 'ok' && !isDismissed && (
                    <p className="article-quality__item-help">{DIMENSION_HELP[d]}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

import React, { useCallback, useEffect, useState } from 'react';
import { InfoTooltip } from '../../../shared/components/ui/Tooltip';
import { formatRelative } from '../../../shared/lib/formatDate';
import {
  articleQualityApi,
  type ArticleToRework, type QualityStats, type QualityTier,
  DIMENSION_LABEL,
} from '../api/articleQualityApi';
import './ArticlesToReworkCard.css';
import { StatusIcon, type StatusTone } from '../../../shared/components/ui/StatusIcon';

interface ArticlesToReworkCardProps {
  /** Callback ouverture d'un article (depuis la liste dépliée). */
  onOpen: (articleId: string) => void;
}

/**
 * Carte « KB Health Score IA » — auditeur qualité IA en 3 paliers.
 *
 * États :
 *   - chargement → skeleton
 *   - aucun article publié → composant masqué (return null)
 *   - aucun article scoré → message d'amorçage (pointe vers Settings)
 *   - sinon → 3 paliers cliquables (Parfaits / Bons / À retravailler)
 *     dépliables avec lazy-load de la liste par tier.
 *
 * Composant standalone, utilisé sur Analytics ET sur le Dashboard.
 */
export function ArticlesToReworkCard({ onOpen }: ArticlesToReworkCardProps) {
  const [stats,   setStats]   = useState<QualityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [expandedTier, setExpandedTier] = useState<QualityTier | null>(null);
  const [tierItems, setTierItems] = useState<Record<QualityTier, ArticleToRework[]>>({
    perfect: [], good: [], toRework: [],
  });
  const [tierLoading, setTierLoading] = useState<QualityTier | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    articleQualityApi.stats()
      .then(st => { if (alive) setStats(st); })
      .catch(err => { if (alive) setError(err?.message ?? 'Erreur de chargement.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const handleTierClick = useCallback(async (tier: QualityTier, count: number) => {
    if (count === 0) return;
    if (expandedTier === tier) { setExpandedTier(null); return; }
    setExpandedTier(tier);
    if (tierItems[tier].length === 0) {
      setTierLoading(tier);
      try {
        const r = await articleQualityApi.listToRework(tier);
        setTierItems(prev => ({ ...prev, [tier]: r.items }));
      } finally {
        setTierLoading(null);
      }
    }
  }, [expandedTier, tierItems]);

  if (loading) {
    return (
      <section className="article-rework-card article-rework-card--loading">
        <h2 className="article-rework-card__title">KB Health Score IA</h2>
        <p className="article-rework-card__desc">Chargement de l'analyse IA…</p>
      </section>
    );
  }

  // Aucun article publié → on masque
  if (stats && stats.published === 0) return null;

  // Aucun article scoré → message d'amorçage
  if (stats && stats.scored === 0) {
    return (
      <section className="article-rework-card article-rework-card--empty">
        <h2 className="article-rework-card__title">KB Health Score IA</h2>
        <p className="article-rework-card__desc">
          Aucun article scoré pour l'instant. Le scoring IA tourne automatiquement à
          chaque modif d'article + 1× par semaine.
          {' '}
          Pour ne pas attendre, lance un scoring complet depuis
          {' '}
          <strong>Settings → Intelligence artificielle → Auditeur qualité</strong>.
        </p>
      </section>
    );
  }

  if (error || !stats) {
    return (
      <section className="article-rework-card">
        <h2 className="article-rework-card__title">KB Health Score IA</h2>
        <p className="article-rework-card__desc">{error ?? 'Erreur de chargement.'}</p>
      </section>
    );
  }

  const tiers: Array<{ id: QualityTier; label: string; tone: StatusTone; count: number; modifier: string }> = [
    { id: 'perfect',  label: 'Parfaits',       tone: 'success', count: stats.perfect,  modifier: 'perfect'  },
    { id: 'good',     label: 'Bons',           tone: 'warning', count: stats.good,     modifier: 'good'     },
    { id: 'toRework', label: 'À retravailler', tone: 'danger',  count: stats.toRework, modifier: 'rework'   },
  ];

  return (
    <section className="article-rework-card">
      <header className="article-rework-card__header">
        <h2 className="article-rework-card__title">
          KB Health Score IA
          <InfoTooltip
            title="Auditeur qualité IA"
            rows={[
              { label: 'Quoi',    text: 'l\'IA score chaque article publié sur 6 dimensions : Clarté, Actionnable, Titre↔contenu, Structure, Fraîcheur, Vocabulaire.' },
              { label: 'Paliers', text: '✓ Parfaits = 0 dimension à revoir · ⚠️ Bons = 1-2 dimensions à revoir · ❌ À retravailler = 3 dimensions ou plus à revoir.' },
              { label: 'Action',  text: 'cliquez sur un palier pour voir la liste des articles concernés. Cliquez sur un article pour ouvrir l\'éditeur et voir le détail dimension par dimension.' },
              { label: 'Scoring', text: 'tourne au PATCH article (30 s après save) + cron hebdo. Pour rescorer maintenant : Settings → IA → Auditeur qualité → « Scorer tous les articles publiés ».' },
            ]}
          />
        </h2>
        <p className="article-rework-card__desc">
          {stats.scored} / {stats.published} articles publiés analysés par l'IA.
        </p>
      </header>

      <div className="article-rework-card__tiers">
        {tiers.map(t => {
          const isExpanded = expandedTier === t.id;
          const isClickable = t.count > 0;
          return (
            <button
              key={t.id}
              type="button"
              className={`article-rework-card__tier article-rework-card__tier--${t.modifier} ${isExpanded ? 'is-expanded' : ''}`}
              onClick={() => handleTierClick(t.id, t.count)}
              disabled={!isClickable}
              aria-expanded={isExpanded}
            >
              <StatusIcon tone={t.tone} size={20} className="article-rework-card__tier-emoji" />
              <span className="article-rework-card__tier-count">{t.count}</span>
              <span className="article-rework-card__tier-label">{t.label}</span>
            </button>
          );
        })}
      </div>

      {expandedTier && (
        <div className="article-rework-card__expanded" role="region" aria-label={`Articles ${tiers.find(t => t.id === expandedTier)?.label}`}>
          {tierLoading === expandedTier ? (
            <p className="article-rework-card__loading">Chargement…</p>
          ) : tierItems[expandedTier].length === 0 ? (
            <p className="article-rework-card__loading">Aucun article dans ce palier.</p>
          ) : (
            <ul className="article-rework-card__list">
              {tierItems[expandedTier].map(a => (
                <li key={a.id} className="article-rework-card__item">
                  <button
                    type="button"
                    className="article-rework-card__btn"
                    onClick={() => onOpen(a.id)}
                  >
                    <span className="article-rework-card__main">
                      <span className="article-rework-card__name">{a.title}</span>
                      <span className="article-rework-card__meta">
                        {a.categoryName ?? 'Sans catégorie'} · {a.authorName}
                        {a.checkedAt && <> · scoré {formatRelative(a.checkedAt)}</>}
                      </span>
                    </span>
                    {a.flaggedDimensions.length > 0 && (
                      <span className="article-rework-card__dims">
                        {a.flaggedDimensions.map(d => (
                          <span key={d} className="article-rework-card__chip">{DIMENSION_LABEL[d]}</span>
                        ))}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

import React, { useCallback } from 'react';
import { StatCard }            from './StatCard';
import '../dashboard.css';
import { ArticleRow }          from './ArticleRow';
import { ActivationChecklist } from './ActivationChecklist';
import { Skeleton }            from '../../../shared/components/ui/Skeleton';
import { EmptyState }          from '../../../shared/components/ui/EmptyState';
import { Button }              from '../../../shared/components/ui/Button';
import { PageHeader }          from '../../../shared/components/layout/PageHeader';
import { KbScoreCard }         from '../../kbscore/components/KbScoreCard';
import { ArticlesToReworkCard } from '../../articleQuality/components/ArticlesToReworkCard';
import { useDashboard }        from '../hooks/useDashboard';
import { useAuthStore, selectUser, selectUserRole } from '../../../store/authStore';
import { formatRelative }      from '../../../shared/lib/formatDate';
import { Plus } from 'lucide-react';

/**
 * DashboardPage — first screen after login.
 *
 * Shows:
 *   - Personalized greeting
 *   - Stat cards (articles, FAQs, team)
 *   - Activation checklist (admin only, until complete)
 *   - Recent articles
 *   - Recent activity feed
 */
interface DashboardPageProps {
  onArticleClick?: (id: string) => void;
  onNewArticle?:   () => void;
}

export function DashboardPage({ onArticleClick, onNewArticle }: DashboardPageProps) {
  const user     = useAuthStore(selectUser);
  const role     = useAuthStore(selectUserRole);
  const token    = useAuthStore(s => s.session?.accessToken);
  const { state, refetch } = useDashboard();

  const isLoading  = state.status === 'loading' || state.status === 'idle';
  const isError    = state.status === 'error';
  const data       = state.status === 'success' ? state.data : null;
  const isAdmin    = role === 'admin' || role === 'manager';

  const handleArticleClick = useCallback((id: string) => {
    onArticleClick?.(id);
    // Wire to router: navigate(`/articles/${id}`)
  }, []);

  const greeting = getGreeting(user?.firstName);

  return (
    <div className="dashboard">

      <PageHeader
        title={greeting}
        subtitle={isAdmin
          ? 'Voici l\'état de votre base de connaissance.'
          : 'Recherchez un processus ou parcourez les catégories.'}
        actions={isAdmin && (
          <Button variant="primary" size="md" onClick={onNewArticle}>
            <Plus size={20} />Nouvel article
          </Button>
        )}
      />

      {/* ── Error state ── */}
      {isError && (
        <div className="dashboard__error" role="alert">
          <p>Le tableau de bord n'a pas pu être chargé. Vérifiez votre connexion, puis réessayez.</p>
          <button className="dashboard__retry" onClick={refetch}>Réessayer</button>
        </div>
      )}

      {/* ── Cartes IA — KbScoreCard puis Auditeur qualité (admin/manager) ── */}
      {isAdmin && (
        <>
          <KbScoreCard />
          <ArticlesToReworkCard onOpen={handleArticleClick} />
        </>
      )}

      {/* ── Stats row ── */}
      <div className="dashboard__stats" role="region" aria-label="Statistiques">
        <StatCard label="Articles publiés" value={data?.stats.publishedArticles ?? 0} loading={isLoading} />
        <StatCard label="Articles au total"  value={data?.stats.totalArticles     ?? 0} loading={isLoading} />
        <StatCard label="FAQ créées"        value={data?.stats.totalFaqs         ?? 0} loading={isLoading} />
        <StatCard label="Membres actifs"    value={data?.stats.teamMembers       ?? 0} loading={isLoading} />
      </div>

      {/* ── Main content: two columns ── */}
      <div className="dashboard__grid">

        {/* Left: checklist + articles */}
        <div className="dashboard__main">

          {/* Activation checklist — admin only */}
          {isAdmin && data?.checklist && data.checklist.length > 0 && (
            <ActivationChecklist items={data.checklist} />
          )}

          {/* Recent articles */}
          <section aria-label="Articles récents">
            <h2 className="dashboard__section-title">Mis à jour récemment</h2>

            {isLoading && (
              <ul className="article-list" aria-busy="true" aria-label="Chargement des articles">
                {Array.from({ length: 4 }).map((_, i) => (
                  <li key={i} className="article-row article-row--skeleton">
                    <Skeleton className="article-row__skeleton-title" />
                    <Skeleton className="article-row__skeleton-meta" />
                  </li>
                ))}
              </ul>
            )}

            {!isLoading && data?.recentItems.length === 0 && (
              <EmptyState
                title="Aucun article pour l'instant"
                description={isAdmin
                  ? 'Créez votre premier article pour démarrer.'
                  : 'Votre équipe prépare le contenu. Revenez bientôt.'}
                ctaLabel={isAdmin ? 'Créer un article' : undefined}
                onCta={isAdmin ? onNewArticle : undefined}
              />
            )}

            {!isLoading && data && data.recentItems.length > 0 && (
              <ul className="article-list">
                {data.recentItems.map(article => (
                  <ArticleRow
                    key={article.id}
                    article={article}
                    onClick={handleArticleClick}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Right: activity feed */}
        <aside className="dashboard__sidebar" aria-label="Activité récente">
          <h2 className="dashboard__section-title">Activité</h2>

          {isLoading && (
            <div aria-busy="true" aria-label="Chargement de l'activité">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="activity-item activity-item--skeleton">
                  <Skeleton className="activity-item__avatar-sk" />
                  <Skeleton className="activity-item__text-sk" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && data?.activity.length === 0 && (
            <p className="dashboard__empty-activity">Aucune activité pour l'instant.</p>
          )}

          {!isLoading && data && (
            <ol className="activity-feed" reversed>
              {data.activity.map(item => (
                <li key={item.id} className="activity-item">
                  <div className="activity-item__avatar" aria-hidden="true">
                    {item.authorName.charAt(0)}
                  </div>
                  <div className="activity-item__body">
                    <p className="activity-item__text">
                      <strong>{item.authorName}</strong> {item.message}
                    </p>
                    <time className="activity-item__time" dateTime={item.timestamp}>
                      {formatRelative(item.timestamp)}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </aside>

      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function getGreeting(firstName?: string): string {
  const hour = new Date().getHours();
  const name = firstName ? `, ${firstName}` : '';

  if (hour < 12) return `Bonjour${name}`;
  if (hour < 18) return `Bon après-midi${name}`;
  return `Bonsoir${name}`;
}

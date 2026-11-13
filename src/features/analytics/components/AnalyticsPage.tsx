import React, { useCallback, useEffect, useState } from 'react';
import { Skeleton }       from '../../../shared/components/ui/Skeleton';
import { PageHeader }     from '../../../shared/components/layout/PageHeader';
import '../analytics.css';
// Suggesteur "Créer une FAQ" et stats helpful : classes vivent dans faqs.css
import '../../faqs/faqs.css';
import { Button }          from '../../../shared/components/ui/Button';
import { formatRelative }  from '../../../shared/lib/formatDate';
import { apiClient }       from '../../../shared/lib/apiClient';
import { useAnalytics }    from '../hooks/useAnalytics';
import { ArticlesToReworkCard } from '../../articleQuality/components/ArticlesToReworkCard';
import { analyticsApi, type FaqSuggestion } from '../api/analyticsApi';
import { KbScoreCard } from '../../kbscore/components/KbScoreCard';
import { InfoTooltip } from '../../../shared/components/ui/Tooltip';
import type {
  AnalyticsOverview, ArticleSummary, TopContributor,
  CategoryCoverage, TopTag, UnusedTag,
  ViewedArticle, LowViewedArticle, SearchQueryStat,
} from '../types';
import { CircleHelp, Cloud, MessageCircle, Sparkles, Star, ThumbsDown, ThumbsUp } from 'lucide-react';

interface AnalyticsPageProps {
  onOpenArticle: (articleId: string) => void;
  /** Optional — appelé quand l'admin clique « Créer une FAQ » sur une suggestion */
  onCreateFaq?: (initialQuestion: string) => void;
}

export function AnalyticsPage({ onOpenArticle, onCreateFaq }: AnalyticsPageProps) {
  const { data, loading, error } = useAnalytics();

  if (loading) {
    return (
      <div className="analytics-page">
        <PageHeader
          title="Analyse"
          subtitle="Vue d'ensemble de la santé éditoriale de votre base de connaissance."
        />
        <div className="analytics-grid">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="sk-card" />)}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="analytics-page">
        <PageHeader
          title="Analyse"
          subtitle="Vue d'ensemble de la santé éditoriale de votre base de connaissance."
        />
        <p className="field-error" role="alert">{error ?? 'Impossible de charger les analytics.'}</p>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <PageHeader
        title="Analyse"
        subtitle="Vue d'ensemble de la santé éditoriale de votre base de connaissance."
      />

      <KbScoreCard />

      <InventoryRow inventory={data.inventory} />

      <AiAnswerStatsBanner onCreateFaq={onCreateFaq} />
      <ChatStatsBanner />
      <ChatWordCloud />

      {onCreateFaq && <FaqsToCreateBanner onCreate={onCreateFaq} />}

      <ArticlesToReworkCard onOpen={onOpenArticle} />

      <div className="analytics-grid">
        <TopViewedCard          items={data.topViewedArticles}   windowDays={data.windowDays} onOpen={onOpenArticle} />
        <LowViewedCard          items={data.lowViewedArticles}   windowDays={data.windowDays} onOpen={onOpenArticle} />
        <TopSearchesCard        items={data.topSearchQueries}    windowDays={data.windowDays} />
        <ZeroResultsCard        items={data.zeroResultsSearches} windowDays={data.windowDays} />
        <ArticlesToReviewCard   items={data.articlesToReview}    onOpen={onOpenArticle} />
        <OrphanDraftsCard       items={data.orphanDrafts}        onOpen={onOpenArticle} />
        <NoTagsCard             items={data.articlesWithoutTags} onOpen={onOpenArticle} />
        <TopContributorsCard    items={data.topContributors}     />
        <CoverageCard           items={data.coverageByCategory}  />
        <TopTagsCard            items={data.topTags}             />
        <UnusedTagsCard         items={data.unusedTags}          />
      </div>
    </div>
  );
}

// ── Inventory : la rangée du haut ──────────────────────────────

function InventoryRow({ inventory }: { inventory: AnalyticsOverview['inventory'] }) {
  const stats = [
    { label: 'Articles publiés', value: inventory.articlesPublished },
    { label: 'Brouillons',       value: inventory.articlesDraft     },
    { label: 'Archivés',         value: inventory.articlesArchived  },
    { label: 'Tags',             value: inventory.tagsCount         },
    { label: 'Processus guidés', value: inventory.treesCount        },
  ];
  return (
    <div className="analytics-stats">
      {stats.map(s => (
        <div key={s.label} className="analytics-stat">
          <span className="analytics-stat__value">{s.value}</span>
          <span className="analytics-stat__label">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Card générique ────────────────────────────────────────────

function AnalyticsCard({
  title, description, count, emptyHint, children,
}: {
  title:        string;
  description?: string;
  count?:       number;
  emptyHint:    string;
  children:     React.ReactNode;
}) {
  const isEmpty = count === 0;
  return (
    <section className="analytics-card">
      <header className="analytics-card__header">
        <h2 className="analytics-card__title">
          {title}
          {count !== undefined && !isEmpty && (
            <span className="analytics-card__badge">{count}</span>
          )}
        </h2>
        {description && <p className="analytics-card__desc">{description}</p>}
      </header>
      <div className="analytics-card__body">
        {isEmpty ? <p className="analytics-card__empty">{emptyHint}</p> : children}
      </div>
    </section>
  );
}

// ── Cards ─────────────────────────────────────────────────────

function ArticleListItem({ a, onOpen }: { a: ArticleSummary; onOpen: (id: string) => void }) {
  return (
    <li className="analytics-list__item">
      <button type="button" className="analytics-list__btn" onClick={() => onOpen(a.id)}>
        <span className="analytics-list__title">{a.title}</span>
        <span className="analytics-list__meta">
          {a.categoryName ?? 'Sans catégorie'} · {formatRelative(a.lastUpdated)}
        </span>
      </button>
    </li>
  );
}

function ArticlesToReviewCard({ items, onOpen }: { items: ArticleSummary[]; onOpen: (id: string) => void }) {
  return (
    <AnalyticsCard
      title="Articles à vérifier"
      description="Publiés, non mis à jour depuis plus de 90 jours."
      count={items.length}
      emptyHint="Tous les articles publiés ont été mis à jour récemment."
    >
      <ul className="analytics-list">
        {items.map(a => <ArticleListItem key={a.id} a={a} onOpen={onOpen} />)}
      </ul>
    </AnalyticsCard>
  );
}

function OrphanDraftsCard({ items, onOpen }: { items: ArticleSummary[]; onOpen: (id: string) => void }) {
  return (
    <AnalyticsCard
      title="Brouillons orphelins"
      description="Brouillons sans modification depuis plus de 30 jours."
      count={items.length}
      emptyHint="Aucun brouillon ne dort dans votre base."
    >
      <ul className="analytics-list">
        {items.map(a => <ArticleListItem key={a.id} a={a} onOpen={onOpen} />)}
      </ul>
    </AnalyticsCard>
  );
}

function NoTagsCard({ items, onOpen }: { items: ArticleSummary[]; onOpen: (id: string) => void }) {
  return (
    <AnalyticsCard
      title="Articles sans tag"
      description="Articles publiés qui ne portent aucun tag."
      count={items.length}
      emptyHint="Tous les articles publiés ont au moins un tag."
    >
      <ul className="analytics-list">
        {items.map(a => <ArticleListItem key={a.id} a={a} onOpen={onOpen} />)}
      </ul>
    </AnalyticsCard>
  );
}

function TopContributorsCard({ items }: { items: TopContributor[] }) {
  return (
    <AnalyticsCard
      title="Top contributeurs"
      description="Auteurs les plus actifs (count = total ; (X) = 30 derniers jours)."
      count={items.length}
      emptyHint="Aucun article publié pour l'instant."
    >
      <ul className="analytics-list">
        {items.map(c => (
          <li key={c.userId} className="analytics-list__item analytics-list__item--row">
            <span className="analytics-list__title">{c.email}</span>
            <span className="analytics-list__counter">
              {c.count}
              {c.recentCount > 0 && <span className="analytics-list__counter-recent"> ({c.recentCount} récents)</span>}
            </span>
          </li>
        ))}
      </ul>
    </AnalyticsCard>
  );
}

function CoverageCard({ items }: { items: CategoryCoverage[] }) {
  const max = Math.max(1, ...items.map(c => c.count));
  return (
    <AnalyticsCard
      title="Couverture par catégorie"
      description="Nombre d'articles publiés par catégorie."
      count={items.length}
      emptyHint="Aucune catégorie pour l'instant."
    >
      <ul className="analytics-bars">
        {items.map(c => (
          <li key={c.categoryId} className="analytics-bar">
            <div className="analytics-bar__label">
              <span>{c.name}</span>
              <span className="analytics-bar__count">{c.count}</span>
            </div>
            <div className="analytics-bar__track">
              <div
                className="analytics-bar__fill"
                style={{ width: `${(c.count / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </AnalyticsCard>
  );
}

function TopTagsCard({ items }: { items: TopTag[] }) {
  return (
    <AnalyticsCard
      title="Tags les plus utilisés"
      description="Top 10 des tags par nombre d'articles."
      count={items.length}
      emptyHint="Aucun tag utilisé pour l'instant."
    >
      <ul className="analytics-chips">
        {items.map(t => (
          <li key={t.id}>
            <span className="chip chip--readonly">
              {t.displayName} <span className="chip__count">{t.count}</span>
            </span>
          </li>
        ))}
      </ul>
    </AnalyticsCard>
  );
}

function UnusedTagsCard({ items }: { items: UnusedTag[] }) {
  return (
    <AnalyticsCard
      title="Tags inutilisés"
      description="Présents en base mais qu'aucun article ne porte."
      count={items.length}
      emptyHint="Tous les tags sont utilisés. Bien joué."
    >
      <ul className="analytics-chips">
        {items.map(t => (
          <li key={t.id}>
            <span className="chip chip--readonly">{t.displayName}</span>
          </li>
        ))}
      </ul>
    </AnalyticsCard>
  );
}

// ── Phase 2 cards (vues + recherches) ─────────────────────────

function TopViewedCard({ items, windowDays, onOpen }: { items: ViewedArticle[]; windowDays: number; onOpen: (id: string) => void }) {
  return (
    <AnalyticsCard
      title="Articles les plus consultés"
      description={`Top 10 sur ${windowDays} jours.`}
      count={items.length}
      emptyHint="Pas encore assez de vues — revenez après quelques jours d'activité."
    >
      <ul className="analytics-list">
        {items.map(a => (
          <li key={a.id} className="analytics-list__item">
            <button type="button" className="analytics-list__btn" onClick={() => onOpen(a.id)}>
              <span className="analytics-list__title">{a.title}</span>
              <span className="analytics-list__meta">
                {a.categoryName ?? 'Sans catégorie'} · {a.views} vue{a.views > 1 ? 's' : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </AnalyticsCard>
  );
}

function LowViewedCard({ items, windowDays, onOpen }: { items: LowViewedArticle[]; windowDays: number; onOpen: (id: string) => void }) {
  return (
    <AnalyticsCard
      title="Articles peu consultés"
      description={`Publiés depuis plus de ${windowDays} jours et lus au plus une fois sur la fenêtre.`}
      count={items.length}
      emptyHint="Tous vos articles publiés trouvent leur lecteur."
    >
      <ul className="analytics-list">
        {items.map(a => (
          <li key={a.id} className="analytics-list__item">
            <button type="button" className="analytics-list__btn" onClick={() => onOpen(a.id)}>
              <span className="analytics-list__title">{a.title}</span>
              <span className="analytics-list__meta">
                {a.categoryName ?? 'Sans catégorie'} · {a.views} vue · MAJ {formatRelative(a.lastUpdated)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </AnalyticsCard>
  );
}

function TopSearchesCard({ items, windowDays }: { items: SearchQueryStat[]; windowDays: number }) {
  return (
    <AnalyticsCard
      title="Top recherches"
      description={`Requêtes les plus fréquentes sur ${windowDays} jours.`}
      count={items.length}
      emptyHint="Pas encore de recherches enregistrées."
    >
      <ul className="analytics-list">
        {items.map(s => (
          <li key={s.query} className="analytics-list__item analytics-list__item--row">
            <span className="analytics-list__title">{s.query}</span>
            <span className="analytics-list__counter">{s.count}</span>
          </li>
        ))}
      </ul>
    </AnalyticsCard>
  );
}

function ZeroResultsCard({ items, windowDays }: { items: SearchQueryStat[]; windowDays: number }) {
  return (
    <AnalyticsCard
      title="Recherches sans résultat"
      description={`Requêtes qui n'ont rien retourné sur ${windowDays} jours — opportunités éditoriales.`}
      count={items.length}
      emptyHint="Aucune recherche infructueuse — votre base couvre bien le besoin."
    >
      <ul className="analytics-list">
        {items.map(s => (
          <li key={s.query} className="analytics-list__item analytics-list__item--row">
            <span className="analytics-list__title">{s.query}</span>
            <span className="analytics-list__counter">{s.count}</span>
          </li>
        ))}
      </ul>
    </AnalyticsCard>
  );
}

// ── Réponse IA — usage + qualité ─────────────────────────────

interface AiAnswerStats {
  windowDays:    number;
  totalShown:    number;
  doneCount:     number;
  unsureCount:   number;
  helpfulYes:    number;
  helpfulNo:     number;
  helpfulRatio:  number | null;
  topQueries:    Array<{ query: string; count: number }>;
  unsureQueries: Array<{ query: string; count: number }>;
}

function AiAnswerStatsBanner({ onCreateFaq }: { onCreateFaq?: (q: string) => void }) {
  const [stats,   setStats]   = useState<AiAnswerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    apiClient.get<AiAnswerStats>('/analytics/ai-answer')
      .then(d => { if (alive) setStats(d); })
      .catch(() => { /* silencieux : pas critique */ })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  if (loading) return null;
  if (!stats || stats.totalShown === 0) return null;

  const helpfulPct = stats.helpfulRatio !== null
    ? Math.round(stats.helpfulRatio * 100)
    : null;
  // Taux à viser : précises / total et sans-réponse / total. Affichés en
  // métrique principale (% sur les vignettes), avec le détail "X sur Y" en
  // sublabel. Cohérent avec ce que vise l'admin (un ratio, pas un volume).
  const precisePct = stats.totalShown > 0 ? Math.round((stats.doneCount   / stats.totalShown) * 100) : null;
  const unsurePct  = stats.totalShown > 0 ? Math.round((stats.unsureCount / stats.totalShown) * 100) : null;

  return (
    <section className="ai-stats" aria-labelledby="ai-stats-title">
      <header className="ai-stats__header">
        <h2 id="ai-stats-title" className="ai-stats__title icon-label"><Sparkles size={20} />Réponse IA — {stats.windowDays} derniers jours</h2>
      </header>
      <div className="ai-stats__row">
        <div className="ai-stats__metric">
          <span className="ai-stats__metric-value">{stats.totalShown}</span>
          <span className="ai-stats__metric-label">
            Réponses générées par IA
            <InfoTooltip
              title="Réponses générées par IA"
              rows={[
                { label: 'Quoi',   text: 'nombre total de réponses IA produites par la barre Cmd+K (conseillers internes) sur 30 jours, qu\'elles aient abouti ou non.' },
                { label: 'Calcul', text: 'appels à l\'IA agrégés sur 30 jours, après déduplication des frappes intermédiaires (une recherche tapée en plusieurs étapes compte 1, pas N).' },
                { label: 'Action', text: 'ce n\'est pas un objectif chiffré en soi — c\'est un volume d\'usage. Il sert de dénominateur aux KPI suivants (Réponses précises / Sans réponse / Utiles). Si très bas par rapport au nombre de conseillers actifs, la fonction IA est sous-utilisée — fais une démo Cmd+K en réunion.' },
              ]}
            />
          </span>
        </div>
        <div className="ai-stats__metric">
          <span className="ai-stats__metric-value">{precisePct !== null ? `${precisePct}%` : '—'}</span>
          <span className="ai-stats__metric-label">
            Réponses précises
            <InfoTooltip
              title="Réponses précises"
              rows={[
                { label: 'Quoi',   text: 'pourcentage de fois où l\'IA a réussi à produire une vraie réponse adossée à ta base (avec sources affichées), sur 30 jours.' },
                { label: 'Calcul', text: 'nombre de réponses précises sur nombre total de réponses générées par IA. Dédup préfixes appliquée : une recherche tapée en plusieurs étapes compte 1.' },
                { label: 'Action', text: 'viser ≥ 70%. Si plus bas, l\'IA tombe souvent dans le vide — consulte la carte « Recherches sans résultat » plus bas et crée les FAQs manquantes.' },
              ]}
            />
            <span className="ai-stats__metric-sublabel">{stats.doneCount} sur {stats.totalShown}</span>
          </span>
        </div>
        <div className="ai-stats__metric">
          <span className="ai-stats__metric-value">{unsurePct !== null ? `${unsurePct}%` : '—'}</span>
          <span className="ai-stats__metric-label">
            Sans réponse
            <InfoTooltip
              title="Sans réponse"
              rows={[
                { label: 'Quoi',   text: 'pourcentage de cas où l\'IA n\'a pas pu répondre, car le contenu de ta base ne couvre pas le sujet posé.' },
                { label: 'Calcul', text: 'nombre de cas où l\'IA n\'a pas pu répondre sur nombre total de réponses générées par IA. Dédup préfixes appliquée : une recherche tapée en plusieurs étapes compte 1.' },
                { label: 'Action', text: 'viser ≤ 30%. Si plus haut, va dans la carte « Recherches sans résultat » plus bas et crée les FAQs manquantes — c\'est le KPI le plus actionnable du bandeau.' },
              ]}
            />
            <span className="ai-stats__metric-sublabel">{stats.unsureCount} sur {stats.totalShown}</span>
          </span>
        </div>
        <div className="ai-stats__metric">
          <span className="ai-stats__metric-value">
            {helpfulPct !== null ? `${helpfulPct}%` : '—'}
          </span>
          <span className="ai-stats__metric-label">
            Satisfaction
            <InfoTooltip
              title="Satisfaction"
              rows={[
                { label: 'Quoi',   text: 'pourcentage de réponses IA jugées utiles par les collaborateurs via les boutons 👍 / 👎 de la carte de réponse, sur 30 jours.' },
                { label: 'Calcul', text: 'nombre de votes 👍 sur nombre total de votes (👍 + 👎). Affiché « — » sous 2 votes au total. Les réponses sans vote ne comptent ni au numérateur ni au dénominateur.' },
                { label: 'Action', text: 'viser ≥ 70%. Si plus bas, ajuste les réglages dans Paramètres → ✨ IA recherche (secteur, tonalité, glossaire) pour mieux cadrer l\'IA, et regarde « Top questions » plus bas pour identifier les sujets où l\'IA répond mal.' },
              ]}
            />
            <span className="ai-stats__metric-sublabel">
              {stats.helpfulYes}<ThumbsUp size={14} className="icon-inline" role="img" aria-label="pouce levé" /> / {stats.helpfulNo}<ThumbsDown size={14} className="icon-inline" role="img" aria-label="pouce baissé" />
              {helpfulPct === null && (stats.helpfulYes + stats.helpfulNo) < 2 && (
                <> · pas assez de votes</>
              )}
            </span>
          </span>
        </div>
      </div>

      {(stats.topQueries.length > 0 || stats.unsureQueries.length > 0) && (
        <div className="ai-stats__queries">
          {stats.topQueries.length > 0 && (
            <div className="ai-stats__queries-col">
              <h3 className="ai-stats__queries-title">Top questions</h3>
              <ul className="ai-stats__list" role="list">
                {stats.topQueries.slice(0, 5).map(q => (
                  <li key={q.query} className="ai-stats__item">
                    <span className="ai-stats__item-q">« {q.query} »</span>
                    <span className="ai-stats__item-count">{q.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {stats.unsureQueries.length > 0 && (
            <div className="ai-stats__queries-col">
              <h3 className="ai-stats__queries-title">Questions sans réponse — pistes éditoriales</h3>
              <ul className="ai-stats__list" role="list">
                {stats.unsureQueries.slice(0, 5).map(q => (
                  <li key={q.query} className="ai-stats__item">
                    <span className="ai-stats__item-q">« {q.query} »</span>
                    <span className="ai-stats__item-count">{q.count}</span>
                    {onCreateFaq && (
                      <Button variant="ghost" size="sm" onClick={() => onCreateFaq(q.query)}>
                        Créer FAQ
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ── Chatbot — usage + qualité ────────────────────────────────

interface ChatStats {
  windowDays:         number;
  totalConversations: number;
  active:             number;
  resolved:           number;
  unresolved:         number;
  escalated:          number;
  abandoned:          number;       // legacy compat
  resolvedRate:       number | null;
  escalationRate:     number | null;
  csatAverage:        number | null;
  csatRated:          number;
  topQuestions:       Array<{ question: string; count: number }>;
}

function ChatStatsBanner() {
  const [stats,   setStats]   = useState<ChatStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    apiClient.get<ChatStats>('/analytics/chat')
      .then(d => { if (alive) setStats(d); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  if (loading) return null;
  if (!stats || stats.totalConversations === 0) return null;

  const resolvedPct = stats.resolvedRate !== null ? Math.round(stats.resolvedRate * 100) : null;
  const closed = stats.resolved + stats.unresolved + stats.escalated;
  const totalParts = closed + stats.active;     // = stats.totalConversations en pratique

  // Largeurs des segments de la barre empilée (proportions des fermées)
  const barW = (n: number) => (closed > 0 ? `${(n / closed) * 100}%` : '0%');

  return (
    <section className="ai-stats" aria-labelledby="chat-stats-title">
      <header className="ai-stats__header">
        <h2 id="chat-stats-title" className="ai-stats__title icon-label">
          <MessageCircle size={20} />Chatbot — {stats.windowDays} derniers jours
        </h2>
      </header>

      {/* Rangée principale : total / taux résolution / CSAT */}
      <div className="ai-stats__row">
        <div className="ai-stats__metric">
          <span className="ai-stats__metric-value">{stats.totalConversations}</span>
          <span className="ai-stats__metric-label">
            Conversations
            {totalParts > 0 && (
              <span className="ai-stats__metric-sublabel">
                {stats.active} en cours · {closed} fermée{closed > 1 ? 's' : ''}
              </span>
            )}
          </span>
        </div>
        <div className="ai-stats__metric">
          <span className="ai-stats__metric-value">{resolvedPct !== null ? `${resolvedPct}%` : '—'}</span>
          <span className="ai-stats__metric-label">
            Taux de résolution
            <span className="ai-stats__metric-sublabel">
              {stats.resolved} sur {closed} fermée{closed > 1 ? 's' : ''}
            </span>
          </span>
        </div>
        <div className="ai-stats__metric">
          <span className="ai-stats__metric-value">
            {stats.csatAverage !== null
              ? <span className="icon-label">{stats.csatAverage.toFixed(1)}<Star size={20} className="ai-stats__star" role="img" aria-label="étoile" /></span>
              : '—'}
          </span>
          <span className="ai-stats__metric-label">
            CSAT moyen
            <span className="ai-stats__metric-sublabel">
              {stats.csatRated} note{stats.csatRated > 1 ? 's' : ''} explicite{stats.csatRated > 1 ? 's' : ''}
            </span>
          </span>
        </div>
      </div>

      {/* Décomposition des fermées : barre empilée + légende */}
      {closed > 0 && (
        <div className="ai-stats__breakdown">
          <div className="ai-stats__breakdown-title">Détail des {closed} conversations fermées</div>
          <div className="ai-stats__bar" role="img" aria-label={`${stats.resolved} résolues, ${stats.escalated} escaladées, ${stats.unresolved} non résolues`}>
            {stats.resolved > 0 && (
              <div className="ai-stats__bar-seg ai-stats__bar-seg--resolved" style={{ width: barW(stats.resolved) }} title={`${stats.resolved} résolue${stats.resolved > 1 ? 's' : ''}`} />
            )}
            {stats.escalated > 0 && (
              <div className="ai-stats__bar-seg ai-stats__bar-seg--escalated" style={{ width: barW(stats.escalated) }} title={`${stats.escalated} escaladée${stats.escalated > 1 ? 's' : ''}`} />
            )}
            {stats.unresolved > 0 && (
              <div className="ai-stats__bar-seg ai-stats__bar-seg--unresolved" style={{ width: barW(stats.unresolved) }} title={`${stats.unresolved} non résolue${stats.unresolved > 1 ? 's' : ''}`} />
            )}
          </div>
          <div className="ai-stats__breakdown-legend">
            <span className="ai-stats__legend-item">
              <span className="ai-stats__legend-dot ai-stats__legend-dot--resolved" aria-hidden="true" />
              {stats.resolved} résolue{stats.resolved > 1 ? 's' : ''}
              <span className="ai-stats__legend-hint">le bot a répondu, visiteur satisfait</span>
            </span>
            <span className="ai-stats__legend-item">
              <span className="ai-stats__legend-dot ai-stats__legend-dot--escalated" aria-hidden="true" />
              {stats.escalated} escaladée{stats.escalated > 1 ? 's' : ''}
              <span className="ai-stats__legend-hint">passée à un humain</span>
            </span>
            <span className="ai-stats__legend-item">
              <span className="ai-stats__legend-dot ai-stats__legend-dot--unresolved" aria-hidden="true" />
              {stats.unresolved} non résolue{stats.unresolved > 1 ? 's' : ''}
              <span className="ai-stats__legend-hint">le bot n'a pas su répondre</span>
            </span>
          </div>
        </div>
      )}

      {stats.topQuestions.length > 0 && (
        <div className="ai-stats__queries">
          <div className="ai-stats__queries-col">
            <h3 className="ai-stats__queries-title">Top thématiques des conversations</h3>
            <ul className="ai-stats__list" role="list">
              {stats.topQuestions.slice(0, 8).map(q => (
                <li key={q.question} className="ai-stats__item">
                  <span className="ai-stats__item-q">{q.question}</span>
                  <span className="ai-stats__item-count">{q.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

// ── FAQs à créer (suggesteur P1) ─────────────────────────────

function FaqsToCreateBanner({ onCreate }: { onCreate: (question: string) => void }) {
  const [items,   setItems]   = useState<FaqSuggestion[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    analyticsApi.faqsToCreate()
      .then(data => { if (alive) setItems(data); })
      .catch(() => { if (alive) setItems([]); /* mode dégradé silencieux */ })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  if (loading) return null;
  if (!items || items.length === 0) return null;

  return (
    <section className="faqs-to-create" aria-labelledby="faqs-to-create-title">
      <header className="faqs-to-create__header">
        <h2 id="faqs-to-create-title" className="faqs-to-create__title icon-label">
          <CircleHelp size={20} />FAQs à créer
        </h2>
        <p className="faqs-to-create__desc">
          Vos conseillers ou clients ont cherché ces termes sans résultat dans les 7 derniers jours.
          Créez une FAQ pour combler le manque.
        </p>
      </header>
      <ul className="faqs-to-create__list" role="list">
        {items.map(item => (
          <li key={item.query} className="faqs-to-create__item">
            <div className="faqs-to-create__main">
              <span className="faqs-to-create__query">« {item.query} »</span>
              <span className="faqs-to-create__meta">
                {item.searches} recherche{item.searches > 1 ? 's' : ''}
                {' · dernière '}{formatRelative(item.lastSeen)}
              </span>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onCreate(item.query)}
            >
              Créer une FAQ
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}


/* ─────────────────────────────────────────────────────────────────
   Nuage de mots-clés — verbatims visiteurs du chatbot
   Effet démo COMEX : visuel d'agrégation des termes les plus
   fréquents sur les messages clients. Périodes 7j et 30j.
   Tokenization + stop-words FR + accent normalize côté backend.
   ───────────────────────────────────────────────────────────────── */

interface WordCloudItem { word: string; count: number }

function ChatWordCloud() {
  const [days,    setDays]    = useState<7 | 30>(30);
  const [items,   setItems]   = useState<WordCloudItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    apiClient.get<WordCloudItem[]>(`/analytics/word-cloud?days=${days}`)
      .then(d => { if (alive) setItems(d); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [days]);

  if (loading && items.length === 0) return null;
  if (!loading && items.length === 0) return null;

  // Min/max counts pour mapper en font-size proportionnel
  const maxCount = Math.max(...items.map(i => i.count));
  const minCount = Math.min(...items.map(i => i.count));
  const span = Math.max(1, maxCount - minCount);

  const sizeFor = (count: number): number => {
    // Échelle 14px → 44px linéaire selon le rang dans la plage
    const ratio = (count - minCount) / span;
    return Math.round(14 + ratio * 30);
  };
  const weightFor = (count: number): number => {
    const ratio = (count - minCount) / span;
    return ratio > 0.6 ? 700 : ratio > 0.3 ? 600 : 400;
  };
  const colorFor = (count: number): string => {
    // Du neutre clair au brand foncé selon importance
    const ratio = (count - minCount) / span;
    if (ratio > 0.7) return 'var(--brand-700)';
    if (ratio > 0.4) return 'var(--brand-600)';
    if (ratio > 0.15) return 'var(--brand-500)';
    return 'var(--neutral-500)';
  };

  return (
    <section className="word-cloud" aria-labelledby="word-cloud-title">
      <header className="word-cloud__header">
        <h2 id="word-cloud-title" className="word-cloud__title icon-label">
          <Cloud size={20} />Nuage de mots — verbatims chatbot
        </h2>
        <div className="word-cloud__toggle" role="group" aria-label="Période">
          <button
            type="button"
            className={`word-cloud__toggle-btn ${days === 7 ? 'word-cloud__toggle-btn--active' : ''}`}
            onClick={() => setDays(7)}
            aria-pressed={days === 7}
          >
            7 jours
          </button>
          <button
            type="button"
            className={`word-cloud__toggle-btn ${days === 30 ? 'word-cloud__toggle-btn--active' : ''}`}
            onClick={() => setDays(30)}
            aria-pressed={days === 30}
          >
            30 jours
          </button>
        </div>
      </header>
      <div className="word-cloud__canvas">
        {items.map(({ word, count }) => (
          <span
            key={word}
            className="word-cloud__word"
            style={{
              fontSize: `${sizeFor(count)}px`,
              fontWeight: weightFor(count),
              color: colorFor(count),
            }}
            title={`${count} occurrence${count > 1 ? 's' : ''}`}
          >
            {word}
          </span>
        ))}
      </div>
      <p className="word-cloud__footer">
        {items.length} termes les plus fréquents (mots de liaison filtrés).
      </p>
    </section>
  );
}

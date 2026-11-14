import React, { useCallback, useEffect } from 'react';
import { ArticleVersionHistory } from './ArticleVersionHistory';
import '../articles.css';
import { ArticleFaqSection }    from './ArticleFaqSection';
import { StatusBadge }          from '../../../shared/components/ui/StatusBadge';
import { Skeleton }       from '../../../shared/components/ui/Skeleton';
import { NotFoundPage } from '../../../shared/components/ui/NotFoundPage';
import { useArticle }           from '../hooks/useArticle';
import { apiClient }           from '../../../shared/lib/apiClient';
import { useToast }            from '../../../shared/lib/useToast';
import { trackEvent }           from '../../../shared/lib/trackEvent';
import { sanitizeArticleHtml }  from '../../../shared/lib/sanitize';
import { useAuthStore, selectUserRole } from '../../../store/authStore';
import { formatRelative }       from '../../../shared/lib/formatDate';
import { ArrowLeft, Copy } from 'lucide-react';
import { Alert } from '../../../shared/components/ui/Alert';

interface ArticlePageProps {
  articleId: string;
  onBack?:   () => void;
  onEdit?:   (articleId: string) => void;
}

export function ArticlePage({ articleId, onBack, onEdit }: ArticlePageProps) {
  const role    = useAuthStore(selectUserRole);
  const isAdmin = role === 'admin' || role === 'manager';
  const { state, reload } = useArticle(articleId);
  const toast = useToast();

  // Tracking analytics : on consigne une vue dès qu'un article est ouvert.
  useEffect(() => {
    if (articleId) trackEvent('article.view', { targetType: 'article', targetId: articleId });
  }, [articleId]);
  const handleRestore = useCallback(async (version: number) => {
    try {
      await apiClient.post(`/articles//versions/${version}/restore`, {});
      toast.success(`Version ${version} restaurée.`);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Restauration impossible. Réessayez dans un instant.');
    }
  }, [articleId, reload, toast]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard?.writeText(window.location.href);
  }, []);

  if (state.status === 'idle' || state.status === 'loading') {
    return (
      <div className="article-page article-page--loading" aria-busy="true">
        <div className="article-page__back-row">
          <Skeleton className="sk-back" />
        </div>
        <div className="article-page__header">
          <Skeleton className="sk-title" />
          <Skeleton className="sk-meta" />
        </div>
        <div className="article-page__body">
          <Skeleton className="sk-p" />
          <Skeleton className="sk-p sk-p--short" />
          <Skeleton className="sk-p" />
        </div>
      </div>
    );
  }

if (state.status === 'error') {
  return (
    <NotFoundPage
      title="Article introuvable"
      description={state.message}
      onBack={onBack}
      backLabel="Retour"
    />
  );
}


  const article = state.data;

  return (
    <article className="article-page" aria-labelledby="article-title">

      {/* Breadcrumb + actions */}
      <div className="article-page__topbar">
        <nav className="article-page__breadcrumb" aria-label="Fil d'Ariane">
          {onBack && (
            <button className="article-page__back-btn icon-label" onClick={onBack}>
              <ArrowLeft size={16} />Base de connaissance
            </button>
          )}
          <span className="article-page__breadcrumb-sep" aria-hidden="true">/</span>
          <span className="article-page__breadcrumb-cat">{article.categoryName}</span>
        </nav>

        <div className="article-page__actions">
          <button
            className="article-page__action-btn"
            onClick={handleCopyLink}
            aria-label="Copier le lien"
            title="Copier le lien"
          >
            <Copy size={16} />
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => onEdit?.(article.id)}
              className="article-page__edit-btn"
              aria-label="Modifier cet article"
            >
              Modifier
            </button>
          )}
        </div>
      </div>

      {/* Header */}
      <header className="article-page__header">
        <div className="article-page__header-meta">
          <StatusBadge status={article.status} />
          <span className="article-page__version">v{article.version}</span>
        </div>
        <h1 id="article-title" className="article-page__title">
          {article.title}
        </h1>
        <p className="article-page__meta">
          <span>Par {article.authorName}</span>
          <span aria-hidden="true"> · </span>
          <time dateTime={article.updatedAt}>
            Mis à jour {formatRelative(article.updatedAt)}
          </time>
        </p>
        {article.tags && article.tags.length > 0 && (
          <div className="article-page__tags" aria-label="Tags de l'article">
            {article.tags.map(tag => (
              <span key={tag} className="chip chip--readonly">{tag}</span>
            ))}
          </div>
        )}
        {isOlderThan(article.updatedAt, 90) && (
          <Alert tone="warning" role="note" className="article-page__stale-warning">
            Cet article n'a pas été mis à jour depuis plus de 90 jours. Vérifiez les informations avant de les communiquer.
          </Alert>
        )}
      </header>

      {/* Article body */}
<div
  className="article-page__body article-content"
  dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(article.content) }}
  onClick={e => {
    const target = (e.target as HTMLElement).closest('a');
    if (!target) return;
    const href = target.getAttribute('href') ?? '';
    if (href.startsWith('knowdesk://article/')) {
      e.preventDefault();
      const articleId = href.replace('knowdesk://article/', '');
      onEdit?.(articleId);
    }
  }}
/>

      {/* FAQ section */}
      <ArticleFaqSection faqs={article.faqs ?? []} />

      {/* Version history */}
      <ArticleVersionHistory
        versions={article.versions ?? []}
        currentVersion={article.version}
        canRestore={isAdmin}
        onRestore={isAdmin
          ? handleRestore
          : undefined
        }
      />

      {/* Report button */}
      {!isAdmin && (
        <div className="article-page__footer">
          <button className="article-page__report">
            Signaler une information incorrecte
          </button>
        </div>
      )}

    </article>
  );
}

function isOlderThan(isoString: string, days: number): boolean {
  if (!isoString) return false;
  const ms = Date.now() - new Date(isoString).getTime();
  return ms > days * 86_400_000;
}


import React, { useState, useMemo } from 'react';
import { HELP_CONTENT, HELP_INDEX } from '../content';
import '../help.css';
import type { HelpSection, HelpArticle } from '../content';
import { ArrowLeft, ChevronRight, X } from 'lucide-react';

interface HelpPanelProps {
  onClose:      () => void;
  currentScreen?: string;
}

// Mapping screen → section d'aide contextuelle
const SCREEN_TO_SECTION: Record<string, string> = {
  dashboard:    'getting-started',
  knowledge:    'articles',
  article:      'articles',
  editor:       'articles',
  trees:        'trees',
  'tree-editor':'trees',
  tree:         'trees',
  members:      'team',
  analytics:    'analytics',
  settings:     'settings',
  account:      'settings',
};

function renderMarkdown(md: string): string {
  return md
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^> ⚠️ \*\*(.+?)\*\* : (.+)$/gm, '<div class="help-callout help-callout--warn"><strong>$1</strong> : $2</div>')
    .replace(/^> 💡 \*\*(.+?)\*\* : (.+)$/gm, '<div class="help-callout help-callout--tip"><strong>$1</strong> : $2</div>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="help-ol-item">$2</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, s => `<ul>${s}</ul>`)
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[h|u|b|d|l])(.+)$/gm, '<p>$1</p>')
    .replace(/<p><\/p>/g, '');
}

export function HelpPanel({ onClose, currentScreen }: HelpPanelProps) {
  const defaultSection = currentScreen ? (SCREEN_TO_SECTION[currentScreen] ?? 'getting-started') : 'getting-started';

  const [activeSectionId, setActiveSectionId] = useState(defaultSection);
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [query,           setQuery]           = useState('');

  const activeSection = HELP_CONTENT.find(s => s.id === activeSectionId) ?? HELP_CONTENT[0];
  const activeArticle = activeSection.articles.find(a => a.id === activeArticleId) ?? null;

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return HELP_INDEX.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.content.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [query]);

  const handleArticleClick = (sectionId: string, articleId: string) => {
    setActiveSectionId(sectionId);
    setActiveArticleId(articleId);
    setQuery('');
  };

  return (
    <div className="help-panel" role="complementary" aria-label="Centre d'aide">
      {/* Header */}
      <div className="help-panel__header">
        <h2 className="help-panel__title">Centre d'aide</h2>
        <button
          type="button"
          className="help-panel__close"
          onClick={onClose}
          aria-label="Fermer l'aide"
        ><X size={16} /></button>
      </div>

      {/* Recherche */}
      <div className="help-panel__search">
        <input
          type="search"
          className="help-search"
          placeholder="Rechercher dans l'aide…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      {/* Résultats de recherche */}
      {query.trim() && (
        <div className="help-panel__results">
          {searchResults.length === 0 ? (
            <p className="help-no-results">Aucun résultat pour « {query} »</p>
          ) : (
            <ul className="help-results-list">
              {searchResults.map(r => (
                <li key={`${r.sectionId}-${r.articleId}`}>
                  <button
                    type="button"
                    className="help-result-item"
                    onClick={() => handleArticleClick(r.sectionId, r.articleId)}
                  >
                    <span className="help-result-section">{r.sectionTitle}</span>
                    <span className="help-result-title">{r.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Navigation + contenu */}
      {!query.trim() && (
        <div className="help-panel__body">
          {/* Sidebar navigation */}
          <nav className="help-nav" aria-label="Sections d'aide">
            {HELP_CONTENT.map(section => (
              <button
                key={section.id}
                type="button"
                className={`help-nav__item ${section.id === activeSectionId ? 'help-nav__item--active' : ''}`}
                onClick={() => { setActiveSectionId(section.id); setActiveArticleId(null); }}
              >
                <span className="help-nav__icon" aria-hidden="true"><section.icon size={20} /></span>
                <span className="help-nav__label">{section.title}</span>
              </button>
            ))}
          </nav>

          {/* Contenu */}
          <div className="help-content">
            {activeArticle ? (
              <>
                <button
                  type="button"
                  className="help-content__back icon-label"
                  onClick={() => setActiveArticleId(null)}
                >
                  <ArrowLeft size={16} />Retour
                </button>
                <div
                  className="help-article"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(activeArticle.content) }}
                />
              </>
            ) : (
              <>
                <h3 className="help-content__section-title icon-label">
                  <activeSection.icon size={20} aria-hidden="true" />{activeSection.title}
                </h3>
                <ul className="help-article-list">
                  {activeSection.articles.map(article => (
                    <li key={article.id}>
                      <button
                        type="button"
                        className="help-article-item"
                        onClick={() => setActiveArticleId(article.id)}
                      >
                        {article.title}
                        <ChevronRight size={16} className="help-article-item__arrow" />
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

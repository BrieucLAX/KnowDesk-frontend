import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CategoryTree, type CategoryActions } from './CategoryTree';
import { FilterTabs }     from '../../../shared/components/ui/FilterTabs';
import { TagsFilter }     from '../../../shared/components/ui/TagsFilter';
import { CategoryFilter, aggregateCountsWithDescendants } from '../../../shared/components/ui/CategoryFilter';
import { DataTable, type SortDir } from '../../../shared/components/ui/DataTable';
import { ListViewToggle, useListViewPref } from '../../../shared/components/ui/ListViewToggle';
import { ActionMenu }     from '../../../shared/components/ui/ActionMenu';
import { PageToolbar, PageToolbarSearch } from '../../../shared/components/layout/PageToolbar';
import '../knowledge.css';
import { EmptyState }       from '../../../shared/components/ui/EmptyState';
import { StatusBadge }      from '../../../shared/components/ui/StatusBadge';
import { Skeleton }         from '../../../shared/components/ui/Skeleton';
import { Modal }            from '../../../shared/components/ui/Modal';
import { Button }           from '../../../shared/components/ui/Button';
import { Input }            from '../../../shared/components/ui/Input';
import { ConfirmDialog }    from '../../../shared/components/ui/ConfirmDialog';
import { BulkActionBar }    from '../../../shared/components/ui/BulkActionBar';
import { bulkDeleteInChunks } from '../../../shared/lib/bulkDelete';
import { EntityRow }        from '../../../shared/components/ui/EntityRow';
import { PageHeader }       from '../../../shared/components/layout/PageHeader';
import { knowledgeApi } from '../api/knowledgeApi';
import { apiClient, ApiError } from '../../../shared/lib/apiClient';
import { fetchAllPages }    from '../../../shared/lib/fetchAllPages';
import { useToast }     from '../../../shared/lib/useToast';
import { useLocalStorageState } from '../../../shared/lib/useLocalStorageState';
import { tagsApi, type OrgTag } from '../../articles/api/tagsApi';
import { archiveApi }       from '../../articles/api/archiveApi';

import { useAuthStore, selectUserRole } from '../../../store/authStore';
import { formatRelative }   from '../../../shared/lib/formatDate';
import { ImportModal }      from '../../imports/components/ImportModal';
import type { Category }    from '../types';
import type { ArticleListItem } from '../../articles/types';

interface KnowledgePageProps {
  onOpenArticle:      (articleId: string) => void;
  onNewArticle?:      () => void;
}

type SortKey = 'updated' | 'alpha' | 'popular';

/** Onglet de statut. « Tous » et « À réviser » ne montrent pas les archivés, qui ont leur onglet. */
type ArticleFilter = 'all' | 'published' | 'draft' | 'stale' | 'archived';

const FILTER_PLURAL: Record<Exclude<ArticleFilter, 'all'>, string> = {
  published: 'publiés', draft: 'brouillons', stale: 'articles à réviser', archived: 'archivés',
};

function matchesFilter(a: ArticleListItem, filter: ArticleFilter): boolean {
  if (filter === 'archived') return a.status === 'archived';
  if (a.status === 'archived') return false;
  if (filter === 'stale') return a.isStale;
  return filter === 'all' || a.status === filter;
}

const SIDEBAR_MIN     = 180;
const SIDEBAR_MAX     = 360;
const SIDEBAR_DEFAULT = 220;

/** Une ligne de GET /articles, telle que le back la rend. */
interface ArticleListRow {
  id: string; title: string; status: ArticleListItem['status']; category_id: string; category_name?: string | null;
  version: number; author_email?: string | null; updated_at: string; tags?: unknown; is_stale?: boolean;
  views_30d?: number | string | null; visibility?: string;
}

/**
 * Tous les articles de la catégorie (ou de l'organisation), page après page : le back en rend
 * 200 au plus par page. Les onglets, les compteurs et les filtres travaillent sur la liste entière.
 */
async function loadArticles(categoryId: string | null, sort: SortKey): Promise<ArticleListItem[]> {
  const params = new URLSearchParams();
  if (categoryId) {
    params.set('categoryId', categoryId);
    params.set('includeSubcategories', 'true');
  }
  params.set('sort', sort);
  const rows = await fetchAllPages<ArticleListRow>('/articles', params, 200);
  return rows.map(a => ({
    id:           a.id,
    title:        a.title,
    status:       a.status,
    categoryId:   a.category_id,
    categoryName: a.category_name ?? '',
    version:      a.version,
    authorName:   a.author_email ?? '',
    updatedAt:    a.updated_at,
    tags:         Array.isArray(a.tags) ? a.tags : [],
    isStale:      a.is_stale === true,
    viewsCount:   Number(a.views_30d ?? 0),
    visibility:   a.visibility === 'public' ? 'public' : 'internal',
  }));
}

/**
 * KnowledgePage — the browsable knowledge base.
 * Two-panel layout: collapsible/resizable category sidebar + article list.
 */
export function KnowledgePage({ onOpenArticle, onNewArticle }: KnowledgePageProps) {
  const role    = useAuthStore(selectUserRole);
  const isAdmin = role === 'admin' || role === 'manager';
  const toast   = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [categories,     setCategories]     = useState<Category[]>([]);
  const [articles,       setArticles]       = useState<ArticleListItem[]>([]);
  // Compteur incrémenté après un bulk delete pour forcer un refetch.
  // Sans ça, supprimer 200 articles sur 500 laisse la liste presque vide
  // (perPage=200, page 2+ jamais chargée) — trompe-l'œil pour l'admin.
  const [reloadCounter,  setReloadCounter]  = useState(0);
  const [selectedCatId,  setSelectedCatId]  = useState<string | null>(null);
  const [loadingCats,    setLoadingCats]    = useState(true);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCatName,       setNewCatName]       = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [newCatParentId,   setNewCatParentId]   = useState<string | null>(null);
  const [newCatLoading,    setNewCatLoading]    = useState(false);
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<Category | null>(null);
  const [moveCat,          setMoveCat]          = useState<Category | null>(null);
  const [moveTargetId,     setMoveTargetId]     = useState<string | null>(null);
  const [moveLoading,      setMoveLoading]      = useState(false);
  const [filter,           setFilter]         = useState<ArticleFilter>('all');
  const [orgTags,        setOrgTags]        = useState<OrgTag[]>([]);
  const [activeTags,     setActiveTags]     = useState<string[]>([]);
  const [tagsExpanded,   setTagsExpanded]   = useState(false);
  const [sort,           setSort]           = useState<SortKey>('updated');
  const [searchQuery,    setSearchQuery]    = useState('');

  // Sidebar persistance
  const [sidebarWidth,     setSidebarWidth]     = useLocalStorageState('knowledge.sidebar.width', SIDEBAR_DEFAULT);
  const [expandedIdsArr,   setExpandedIdsArr]   = useLocalStorageState<string[]>('knowledge.sidebar.expanded', []);
  const expandedIds = useMemo(() => new Set(expandedIdsArr), [expandedIdsArr]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIdsArr(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, [setExpandedIdsArr]);

  // Drag handle resize
  const sidebarRef = useRef<HTMLElement>(null);
  const dragStateRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStateRef.current = { startX: e.clientX, startWidth: sidebarWidth };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [sidebarWidth]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, drag.startWidth + (e.clientX - drag.startX)));
      setSidebarWidth(next);
    };
    const onUp = () => {
      if (!dragStateRef.current) return;
      dragStateRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [setSidebarWidth]);

  // Charger les tags de l'org pour les chips de filtre
  useEffect(() => {
    tagsApi.list().then(setOrgTags).catch(() => setOrgTags([]));
  }, []);

  // Load categories on mount
  useEffect(() => {
    knowledgeApi.getCategories()
      .then(cats => {
        setCategories(cats);
        setLoadingCats(false);
        // En mode sidebar (legacy ?sidebar=true) : auto-select 1ʳᵉ cat car
        // la sidebar a besoin d'une sélection active (breadcrumb, expand,
        // contexte cat pour les nouveaux articles).
        // En mode default (sans sidebar) : laisse `selectedCatId=null` →
        // dropdown sur « Toutes les catégories » et liste complète, sinon
        // l'admin voit seulement la 1ʳᵉ cat sans s'en rendre compte.
        const isSidebarMode = new URLSearchParams(window.location.search).get('sidebar') === 'true';
        if (isSidebarMode && cats.length > 0 && !selectedCatId) {
          setSelectedCatId(cats[0].id);
        }
      });
    // selectedCatId omis volontairement — exécution unique au mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Query params depuis la palette : `?cat=<id>` sélectionne, `?action=new-category` ouvre la modale.
  // location.state.preselectCategoryId : navigation programmatique (ex. depuis Settings → Imports → "Voir les articles").
  // On consomme le param puis on nettoie l'URL pour qu'un F5 ne réapplique pas l'effet.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const catParam    = params.get('cat');
    const actionParam = params.get('action');
    const stateCatId  = (location.state as { preselectCategoryId?: string } | null)?.preselectCategoryId;
    let consumed = false;
    if (stateCatId) {
      setSelectedCatId(stateCatId);
      consumed = true;
    }
    if (catParam) {
      setSelectedCatId(catParam);
      consumed = true;
    }
    if (actionParam === 'new-category' && isAdmin) {
      setShowNewCategory(true);
      consumed = true;
    }
    if (consumed) {
      navigate('/knowledge', { replace: true });
    }
  }, [location.search, isAdmin, navigate]);

  // Load articles when category or sort changes.
  // Le filtre par tag est appliqué côté client (cf. filteredArticles ci-dessous)
  // pour permettre le calcul des compteurs locaux par tag dans la sélection.
  useEffect(() => {
    setLoadingArticles(true);
    loadArticles(selectedCatId, sort)
      .then(items => {
        setArticles(items);
        setLoadingArticles(false);
      })
      .catch(err => {
        toast.error(err instanceof ApiError ? err.message : 'Impossible de charger les articles.');
        setLoadingArticles(false);
      });
  }, [selectedCatId, sort, toast, reloadCounter]);

  const toggleTag = useCallback((tag: string) => {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }, []);

  const handleCategorySelect = useCallback((cat: Category) => {
    setSelectedCatId(cat.id);
  }, []);

  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return articles.filter(a => {
      if (!matchesFilter(a, filter)) return false;
      if (q && !a.title.toLowerCase().includes(q)) return false;
      // Filtre tag (AND) : l'article doit porter chacun des tags actifs
      if (activeTags.length > 0 && !activeTags.every(t => a.tags?.includes(t))) return false;
      return true;
    });
  }, [articles, filter, searchQuery, activeTags]);

  // Compteurs scopés à la cat sélectionnée (et ses descendants) : nombre
  // d'articles taggés ce label dans la liste actuellement chargée. Ignore
  // status / search / activeTags pour rester un indicateur utilisable.
  const tagLocalCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of articles) {
      if (!Array.isArray(a.tags)) continue;
      for (const tag of a.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return counts;
  }, [articles]);

  const breadcrumb = useMemo(
    () => findCategoryPath(categories, selectedCatId),
    [categories, selectedCatId],
  );
  const selectedCategory = breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1] : null;

  // Auto-déplie les ancêtres quand une cat enfant est sélectionnée — sans
  // refermer ce que l'utilisateur a déjà ouvert manuellement.
  useEffect(() => {
    if (breadcrumb.length <= 1) return;
    const ancestorsToOpen = breadcrumb.slice(0, -1).map(c => c.id);
    setExpandedIdsArr(prev => {
      const set = new Set(prev);
      let changed = false;
      for (const id of ancestorsToOpen) {
        if (!set.has(id)) { set.add(id); changed = true; }
      }
      return changed ? Array.from(set) : prev;
    });
  }, [breadcrumb, setExpandedIdsArr]);

  const reloadCategories = useCallback(() => {
    return knowledgeApi.getCategories().then(setCategories);
  }, []);

  /* ── Actions admin sur catégories : rename / addChild / move / delete ── */

  const handleRenameCategory = useCallback(async (cat: Category, newName: string) => {
    try {
      await apiClient.patch(`/categories/${cat.id}`, { name: newName });
      await reloadCategories();
      toast.success('Catégorie renommée.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Renommage impossible.');
    }
  }, [reloadCategories, toast]);

  const handleAddChild = useCallback((parent: Category) => {
    setNewCatParentId(parent.id);
    setNewCatName('');
    setShowNewCategory(true);
  }, []);

  const handleStartMove = useCallback((cat: Category) => {
    setMoveCat(cat);
    setMoveTargetId(null);
  }, []);

  const handleConfirmMove = useCallback(async () => {
    if (!moveCat) return;
    setMoveLoading(true);
    try {
      await apiClient.patch(`/categories/${moveCat.id}`, { parentId: moveTargetId });
      await reloadCategories();
      // Auto-déplie le nouveau parent pour rendre la cat visible
      if (moveTargetId) {
        setExpandedIdsArr(prev => prev.includes(moveTargetId) ? prev : [...prev, moveTargetId]);
      }
      toast.success(moveTargetId ? 'Catégorie déplacée.' : 'Catégorie remontée à la racine.');
      setMoveCat(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Déplacement impossible.');
    } finally {
      setMoveLoading(false);
    }
  }, [moveCat, moveTargetId, reloadCategories, setExpandedIdsArr, toast]);

  const handleConfirmDelete = useCallback(async () => {
    if (!confirmDeleteCat) return;
    try {
      await apiClient.delete(`/categories/${confirmDeleteCat.id}`);
      await reloadCategories();
      // Si la cat supprimée était sélectionnée, on bascule sur la racine
      if (selectedCatId === confirmDeleteCat.id) setSelectedCatId(null);
      toast.success('Catégorie supprimée.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Suppression impossible.');
    } finally {
      setConfirmDeleteCat(null);
    }
  }, [confirmDeleteCat, reloadCategories, selectedCatId, toast]);

  const categoryActions: CategoryActions | undefined = isAdmin ? {
    onRename:   handleRenameCategory,
    onAddChild: handleAddChild,
    onMove:     handleStartMove,
    onDelete:   (cat: Category) => setConfirmDeleteCat(cat),
  } : undefined;

  const handleCreateCategory = useCallback(async () => {
    if (!newCatName.trim()) return;
    setNewCatLoading(true);
    try {
      const body: { name: string; parentId?: string } = { name: newCatName.trim() };
      if (newCatParentId) body.parentId = newCatParentId;
      await apiClient.post('/categories', body);
      setNewCatName('');
      setNewCatParentId(null);
      setShowNewCategory(false);
      toast.success(newCatParentId ? 'Sous-catégorie créée.' : 'Catégorie créée.');
      // Si on a créé une sous-cat, on déplie son parent automatiquement
      if (newCatParentId) {
        setExpandedIdsArr(prev => prev.includes(newCatParentId) ? prev : [...prev, newCatParentId]);
      }
      knowledgeApi.getCategories().then(cats => {
        setCategories(cats);
        if (cats.length > 0 && !selectedCatId) setSelectedCatId(cats[0].id);
      });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Création de la catégorie impossible.');
    } finally {
      setNewCatLoading(false);
    }
  }, [newCatName, newCatParentId, selectedCatId, toast, setExpandedIdsArr]);


  // Toggle vue : par défaut sans sidebar (nouvelle UI cohérente avec /faqs
  // et /trees), `?sidebar=true` réactive l'arbo (mode legacy / power user).
  const sidebarMode = new URLSearchParams(location.search).get('sidebar') === 'true';
  if (!sidebarMode) {
    return (
      <KnowledgeListView
        isAdmin={isAdmin}
        role={role}
        articles={articles}
        setArticles={setArticles}
        onReload={() => setReloadCounter(c => c + 1)}
        categories={categories}
        filter={filter}
        setFilter={setFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeTags={activeTags}
        setActiveTags={setActiveTags}
        selectedCatId={selectedCatId}
        setSelectedCatId={setSelectedCatId}
        loadingArticles={loadingArticles}
        orgTags={orgTags}
        onOpenArticle={onOpenArticle}
        onNewArticle={onNewArticle}
        onOpenImport={() => setShowImportModal(true)}
        importModal={showImportModal ? (
          <ImportModal
            onClose={() => setShowImportModal(false)}
            onCompleted={() => {
              setShowImportModal(false);
              setLoadingArticles(true);
              loadArticles(null, sort)
                .then(setArticles)
                .finally(() => setLoadingArticles(false));
            }}
          />
        ) : null}
      />
    );
  }

  return (
    <div className="knowledge-page-wrap">
      <PageHeader
        title="Articles"
        subtitle="Articles de référence pour vos équipes."
        actions={isAdmin && (
          <>
            <Button variant="ghost" size="md" onClick={() => setShowImportModal(true)}>
              Importer
            </Button>
            <Button variant="primary" size="md" onClick={onNewArticle}>
              + Nouvel article
            </Button>
          </>
        )}
      />

      <div
        className="knowledge-page"
        style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
      >

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className="knowledge-page__sidebar"
      >
        <div className="knowledge-page__sidebar-header">
          <h2 className="knowledge-page__sidebar-title">Catégories</h2>
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                // Pré-remplit le parent avec la cat actuellement sélectionnée — l'admin
                // navigue le plus souvent dans une cat avant de vouloir y ajouter une sous-cat.
                setNewCatParentId(selectedCatId);
                setShowNewCategory(true);
              }}
              className="knowledge-page__icon-btn"
              title="Nouvelle catégorie ou sous-catégorie"
              aria-label="Nouvelle catégorie"
            >
              +
            </button>
          )}
        </div>
        <CategoryTree
          categories={categories}
          selectedId={selectedCatId}
          expandedIds={expandedIds}
          onSelect={handleCategorySelect}
          onToggleExpand={toggleExpand}
          actions={categoryActions}
          loading={loadingCats}
        />
        {/* Resize handle */}
        <div
          className="knowledge-page__resize-handle"
          onMouseDown={onResizeStart}
          role="separator"
          aria-orientation="vertical"
          aria-label="Redimensionner la sidebar"
          title="Glisser pour redimensionner"
        />
      </aside>

      {/* Main panel */}
      <main className="knowledge-page__main">

        {/* Breadcrumb + header */}
        {selectedCategory && (
          <div className="knowledge-page__main-header">
            <div className="knowledge-page__main-header-left">
              {breadcrumb.length > 1 && (
                <nav className="knowledge-page__breadcrumb" aria-label="Fil d'ariane">
                  {breadcrumb.slice(0, -1).map((c, idx) => (
                    <React.Fragment key={c.id}>
                      <button
                        type="button"
                        className="knowledge-page__breadcrumb-link"
                        onClick={() => setSelectedCatId(c.id)}
                      >
                        {c.name}
                      </button>
                      <span className="knowledge-page__breadcrumb-sep" aria-hidden="true">›</span>
                    </React.Fragment>
                  ))}
                  <span className="knowledge-page__breadcrumb-current">{selectedCategory.name}</span>
                </nav>
              )}
              <h2 className="knowledge-page__cat-title">{selectedCategory.name}</h2>
              <p className="knowledge-page__cat-count">
                {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''}
                {filteredArticles.length !== articles.length && ` sur ${articles.length}`}
              </p>
            </div>
          </div>
        )}

        {/* Toolbar — search-in-list + sort + filter tabs */}
        {!loadingArticles && articles.length > 0 && (
          <div className="knowledge-page__toolbar">
            <div className="knowledge-page__toolbar-search">
              <input
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher dans cette liste…"
                className="knowledge-page__toolbar-search-input"
                aria-label="Rechercher dans la liste"
              />
            </div>
            <div className="knowledge-page__toolbar-right">
              <label className="knowledge-page__toolbar-sort">
                <span className="knowledge-page__toolbar-sort-label">Tri</span>
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value as SortKey)}
                  className="knowledge-page__toolbar-sort-select"
                  aria-label="Trier les articles"
                >
                  <option value="updated">Mis à jour</option>
                  <option value="alpha">A → Z</option>
                  <option value="popular">Plus consultés</option>
                </select>
              </label>
              <div className="knowledge-page__filters" role="tablist" aria-label="Filtrer les articles">
                {(['all', 'published', 'draft', 'stale', 'archived'] as const).map(f => (
                  <button
                    key={f}
                    role="tab"
                    aria-selected={filter === f}
                    className={`knowledge-filter ${filter === f ? 'knowledge-filter--active' : ''}`}
                    onClick={() => setFilter(f)}
                  >
                    {f === 'all' ? 'Tous' :
                     f === 'published' ? 'Publiés' :
                     f === 'draft' ? 'Brouillons' :
                     f === 'stale' ? 'À réviser' :
                     'Archivés'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tag filter chips — counts scopés à la cat sélectionnée + descendants.
            Tri par count local desc, tags vides masqués (sauf si actifs). */}
        {orgTags.length > 0 && (() => {
          const INITIAL_VISIBLE = 14;
          const activeSet = new Set(activeTags);
          // Enrichi avec localCount, filtré (count > 0 ou actif), trié desc
          const enriched = orgTags
            .map(t => ({ ...t, localCount: tagLocalCounts.get(t.display_name) ?? 0 }))
            .filter(t => t.localCount > 0 || activeSet.has(t.display_name))
            .sort((a, b) => b.localCount - a.localCount);

          if (enriched.length === 0) return null;

          const visible = tagsExpanded
            ? enriched
            : (() => {
                const head = enriched.slice(0, INITIAL_VISIBLE);
                const headSet = new Set(head.map(t => t.id));
                const extraActives = enriched.filter(t => activeSet.has(t.display_name) && !headSet.has(t.id));
                return [...head, ...extraActives];
              })();
          const remaining = enriched.length - visible.length;
          return (
            <div className="knowledge-page__tag-filter" aria-label="Filtrer par tag">
              {visible.map(t => {
                const active = activeSet.has(t.display_name);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTag(t.display_name)}
                    className={`chip chip--toggle ${active ? 'chip--toggle-on' : ''}`}
                    aria-pressed={active}
                  >
                    {t.display_name}
                    <span className="chip__count" aria-hidden="true">{t.localCount}</span>
                  </button>
                );
              })}
              {!tagsExpanded && remaining > 0 && (
                <button
                  type="button"
                  onClick={() => setTagsExpanded(true)}
                  className="knowledge-page__tag-filter-toggle"
                >
                  + {remaining} autre{remaining > 1 ? 's' : ''}
                </button>
              )}
              {tagsExpanded && (
                <button
                  type="button"
                  onClick={() => setTagsExpanded(false)}
                  className="knowledge-page__tag-filter-toggle"
                >
                  Réduire
                </button>
              )}
              {activeTags.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTags([])}
                  className="knowledge-page__tag-filter-clear"
                >
                  Effacer
                </button>
              )}
            </div>
          );
        })()}

        {/* Article list */}
        {loadingArticles && (
          <div className="knowledge-article-list" aria-busy="true" aria-label="Chargement des articles">
            {[1,2,3].map(i => (
              <Skeleton key={i} className="knowledge-article-skeleton" />
            ))}
          </div>
        )}

        {!loadingArticles && filteredArticles.length === 0 && articles.length === 0 && (
          <EmptyState
            title="Aucun article dans cette catégorie"
            description={isAdmin
              ? 'Créez le premier article pour cette catégorie.'
              : 'Votre équipe n\'a pas encore publié de contenu ici.'}
            ctaLabel={isAdmin ? '+ Créer un article' : undefined}
            ctaHref={undefined}
                onCta={isAdmin ? onNewArticle : undefined}
          />
        )}

        {!loadingArticles && filteredArticles.length === 0 && articles.length > 0 && (
          <p className="knowledge-page__no-match">
            Aucun article ne correspond à « {searchQuery} »{filter !== 'all' && ` dans les ${FILTER_PLURAL[filter]}`}.
          </p>
        )}

        {!loadingArticles && filteredArticles.length > 0 && (
          <ul className="knowledge-article-list" role="list">
            {filteredArticles.map(article => (
              <li key={article.id}>
                <EntityRow
                  title={article.title}
                  subtitle={(
                    <>
                      {article.authorName}
                      <span aria-hidden="true"> · </span>
                      v{article.version}
                      <span aria-hidden="true"> · </span>
                      <time dateTime={article.updatedAt}>{formatRelative(article.updatedAt)}</time>
                    </>
                  )}
                  meta={<StatusBadge status={article.status} />}
                  onClick={() => onOpenArticle(article.id)}
                  ariaLabel={`${article.title}, ${article.status}, version ${article.version}`}
                />
              </li>
            ))}
          </ul>
        )}

      </main>
      {/* Modale nouvelle catégorie ou sous-catégorie */}
      {showNewCategory && (
        <Modal
          title={newCatParentId ? 'Nouvelle sous-catégorie' : 'Nouvelle catégorie'}
          onClose={() => { setShowNewCategory(false); setNewCatParentId(null); }}
          asForm
          onSubmit={handleCreateCategory}
          footer={
            <>
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => { setShowNewCategory(false); setNewCatParentId(null); }}
              >
                Annuler
              </Button>
              <Button type="submit" variant="primary" size="md" loading={newCatLoading} disabled={!newCatName.trim()}>
                Créer
              </Button>
            </>
          }
        >
          <Input
            id="new-cat-name"
            type="text"
            label="Nom de la catégorie"
            placeholder="ex. Livraisons"
            value={newCatName}
            autoFocus
            onChange={e => setNewCatName(e.target.value)}
          />
          <div className="field">
            <label htmlFor="new-cat-parent" className="field-label">Catégorie parente</label>
            <select
              id="new-cat-parent"
              className="field-input"
              value={newCatParentId ?? ''}
              onChange={e => setNewCatParentId(e.target.value || null)}
            >
              <option value="">— Aucune (catégorie racine) —</option>
              {flattenForSelect(categories).map(({ id, indentedName }) => (
                <option key={id} value={id}>{indentedName}</option>
              ))}
            </select>
            <p className="field-helper">
              Laissez vide pour créer une catégorie de premier niveau, ou choisissez un parent pour créer une sous-catégorie.
            </p>
          </div>
        </Modal>
      )}

      {/* Modale déplacement de catégorie */}
      {moveCat && (
        <Modal
          title={`Déplacer « ${moveCat.name} »`}
          onClose={() => setMoveCat(null)}
          asForm
          onSubmit={handleConfirmMove}
          footer={
            <>
              <Button type="button" variant="ghost" size="md" onClick={() => setMoveCat(null)}>
                Annuler
              </Button>
              <Button type="submit" variant="primary" size="md" loading={moveLoading}>
                Déplacer
              </Button>
            </>
          }
        >
          <div className="field">
            <label htmlFor="move-cat-target" className="field-label">Nouvelle catégorie parente</label>
            <select
              id="move-cat-target"
              className="field-input"
              value={moveTargetId ?? ''}
              onChange={e => setMoveTargetId(e.target.value || null)}
              autoFocus
            >
              <option value="">— Aucune (catégorie racine) —</option>
              {/* Exclut la cat elle-même + ses descendants pour anti-cycle */}
              {flattenForSelect(categories)
                .filter(c => !collectDescendantIds(categories, moveCat.id).has(c.id))
                .map(({ id, indentedName }) => (
                  <option key={id} value={id}>{indentedName}</option>
                ))}
            </select>
            <p className="field-helper">
              Laissez vide pour remettre la catégorie au premier niveau, ou choisissez une nouvelle parente.
              La catégorie déplacée et ses sous-catégories sont exclues de la liste.
            </p>
          </div>
        </Modal>
      )}

      {/* Confirmation de suppression */}
      {confirmDeleteCat && (
        <ConfirmDialog
          title={`Supprimer « ${confirmDeleteCat.name} » ?`}
          description={confirmDeleteCat.children.length > 0
            ? `Cette catégorie contient ${confirmDeleteCat.children.length} sous-catégorie${confirmDeleteCat.children.length > 1 ? 's' : ''} qui seront aussi supprimées. Les articles attachés perdront leur catégorisation. Cette action est irréversible.`
            : 'Les articles attachés perdront leur catégorisation. Cette action est irréversible.'}
          confirmLabel="Supprimer"
          variant="danger"
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDeleteCat(null)}
        />
      )}

      {/* Phase A — Import de documents */}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onCompleted={completed => {
            // Recharge les catégories pour faire apparaître « 📥 Imports — date »
            // et resélectionne celle créée pour montrer les articles draft.
            reloadCategories().then(() => {
              if (completed.category_id) setSelectedCatId(completed.category_id);
            });
          }}
        />
      )}
      </div>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────── */

/**
 * Retourne le chemin parent → enfant menant à la catégorie sélectionnée.
 * Tableau vide si non trouvée.
 */
function findCategoryPath(cats: Category[], id: string | null): Category[] {
  if (!id) return [];
  for (const cat of cats) {
    if (cat.id === id) return [cat];
    const sub = findCategoryPath(cat.children, id);
    if (sub.length > 0) return [cat, ...sub];
  }
  return [];
}

/**
 * Retourne l'id de la catégorie + tous ses descendants. Réplique côté client
 * le CTE récursif backend (`categoriesRepository.findDescendantIds`) — utilisé
 * pour filtrer les processus guidés visibles depuis la sélection.
 */
function collectDescendantIds(cats: Category[], rootId: string): Set<string> {
  const out = new Set<string>();
  function walk(node: Category, inside: boolean) {
    const here = inside || node.id === rootId;
    if (here) out.add(node.id);
    for (const child of node.children) walk(child, here);
  }
  for (const cat of cats) walk(cat, false);
  return out;
}

/**
 * Aplatit l'arbre de catégories en liste indentée pour un <select>.
 * Profondeur 0 : "Mobile" / 1 : "  Activation" / 2 : "    Réseau"…
 */
function flattenForSelect(cats: Category[], depth = 0): Array<{ id: string; indentedName: string }> {
  const out: Array<{ id: string; indentedName: string }> = [];
  for (const cat of cats) {
    out.push({ id: cat.id, indentedName: `${'  '.repeat(depth)}${cat.name}` });
    if (cat.children.length > 0) out.push(...flattenForSelect(cat.children, depth + 1));
  }
  return out;
}

// ───────────────────────────────────────────────────────────────────
// Vue alternative (default — sans sidebar)
//
// Rendu cohérent avec /faqs et /trees : PageToolbar (tabs statut +
// search + cat dropdown + tags + view toggle) + DataTable ou cartes.
// Conservée comme sous-composant local pour partager le state du
// parent sans en faire un export public — l'arbre des fichiers reste
// inchangé. Activable via défaut, basculable vers la sidebar via
// `?sidebar=true`.
// ───────────────────────────────────────────────────────────────────

interface KnowledgeListViewProps {
  isAdmin:         boolean;
  role:            string | null;
  articles:        ArticleListItem[];
  setArticles:     React.Dispatch<React.SetStateAction<ArticleListItem[]>>;
  /** Force le parent à refetcher la liste depuis le backend (post bulk delete). */
  onReload:        () => void;
  categories:      Category[];
  filter:          ArticleFilter;
  setFilter:       (f: ArticleFilter) => void;
  searchQuery:     string;
  setSearchQuery:  (q: string) => void;
  activeTags:      string[];
  setActiveTags:   (tags: string[]) => void;
  selectedCatId:   string | null;
  setSelectedCatId:(id: string | null) => void;
  loadingArticles: boolean;
  orgTags:         OrgTag[];
  onOpenArticle:   (id: string) => void;
  onNewArticle?:   () => void;
  onOpenImport:    () => void;
  importModal:     React.ReactNode;
}

type ArticleSortKey = 'title' | 'category' | 'status' | 'views' | 'updated_at';

function KnowledgeListView(props: KnowledgeListViewProps) {
  const {
    isAdmin, role, articles, setArticles, categories, filter, setFilter,
    searchQuery, setSearchQuery, activeTags, setActiveTags, selectedCatId,
    setSelectedCatId, loadingArticles, orgTags, onOpenArticle, onNewArticle,
    onOpenImport, importModal, onReload,
  } = props;

  const navigate = useNavigate();
  const toast    = useToast();
  const canDelete = role === 'admin'; // backend route DELETE /articles/:id réservée admin
  const [view,    setView]    = useListViewPref('kd-knowledge-view', 'table');
  const [sortBy,  setSortBy]  = useState<ArticleSortKey>('updated_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [confirmDelete, setConfirmDelete] = useState<ArticleListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState<ArticleListItem | null>(null);
  const [archiving, setArchiving] = useState(false);

  // ── Bulk selection ────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const handleBulkDelete = useCallback(async () => {
    setBulkDeleting(true);
    try {
      const res = await bulkDeleteInChunks('/articles/bulk-delete', [...selectedIds]);

      // Retire les articles bien supprimés du state local
      const deletedSet = new Set(res.deleted);
      setArticles(prev => prev.filter(a => !deletedSet.has(a.id)));
      setSelectedIds(new Set());
      setBulkConfirmOpen(false);

      // Refetch : la liste affichée doit refléter ce que le back a vraiment
      // supprimé (les articles bloqués par Learning restent).
      if (res.deleted.length > 0) {
        onReload();
      }

      // Toast récap : succès + (éventuel) résumé des bloqués
      if (res.deleted.length > 0 && res.blocked.length === 0) {
        toast.success(`${res.deleted.length} article${res.deleted.length > 1 ? 's' : ''} supprimé${res.deleted.length > 1 ? 's' : ''}.`);
      } else if (res.deleted.length > 0 && res.blocked.length > 0) {
        toast.success(
          `${res.deleted.length} supprimé${res.deleted.length > 1 ? 's' : ''}. ${res.blocked.length} bloqué${res.blocked.length > 1 ? 's' : ''} (utilisé${res.blocked.length > 1 ? 's' : ''} dans des parcours de formation).`,
        );
      } else {
        toast.error(`Aucun article supprimé : ${res.blocked.length} bloqué${res.blocked.length > 1 ? 's' : ''} par des parcours de formation.`);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Suppression en masse impossible.');
    } finally {
      setBulkDeleting(false);
    }
  }, [selectedIds, toast]);

  // Archiver retire l'article des publiés et de la recherche ; désarchiver le remet en brouillon.
  const handleArchive = async () => {
    if (!confirmArchive) return;
    setArchiving(true);
    try {
      const updated = await archiveApi.archive(confirmArchive.id);
      setArticles(prev => prev.map(a => a.id === updated.id ? { ...a, status: updated.status } : a));
      toast.success('Article archivé.');
      setConfirmArchive(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Archivage impossible.');
    } finally {
      setArchiving(false);
    }
  };

  const handleUnarchive = async (article: ArticleListItem) => {
    try {
      const updated = await archiveApi.unarchive(article.id);
      setArticles(prev => prev.map(a => a.id === updated.id ? { ...a, status: updated.status } : a));
      toast.success('Article désarchivé : il est de nouveau en brouillon.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Désarchivage impossible.');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/articles/${confirmDelete.id}`);
      setArticles(prev => prev.filter(a => a.id !== confirmDelete.id));
      toast.success('Article supprimé.');
      setConfirmDelete(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Suppression impossible.');
    } finally {
      setDeleting(false);
    }
  };

  // Compteurs onglets — sur articles raw, pas filtrés.
  const counts = useMemo(() => ({
    all:       articles.filter(a => matchesFilter(a, 'all')).length,
    published: articles.filter(a => matchesFilter(a, 'published')).length,
    draft:     articles.filter(a => matchesFilter(a, 'draft')).length,
    stale:     articles.filter(a => matchesFilter(a, 'stale')).length,
    archived:  articles.filter(a => matchesFilter(a, 'archived')).length,
  }), [articles]);

  // Filtre les articles selon onglet + cat + search + tags
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return articles.filter(a => {
      if (!matchesFilter(a, filter)) return false;
      if (selectedCatId && a.categoryId !== selectedCatId) {
        // Inclut aussi les descendants (mêmes règles que la sidebar)
        const desc = collectDescendantIds(categories, selectedCatId);
        if (!desc.has(a.categoryId)) return false;
      }
      if (q && !a.title.toLowerCase().includes(q)) return false;
      if (activeTags.length > 0 && !activeTags.every(t => a.tags?.includes(t))) return false;
      return true;
    });
  }, [articles, filter, selectedCatId, searchQuery, activeTags, categories]);

  const sorted = useMemo(() => {
    const sign = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortBy === 'title')    return sign * a.title.localeCompare(b.title, 'fr');
      if (sortBy === 'category') return sign * (a.categoryName ?? '').localeCompare(b.categoryName ?? '', 'fr');
      if (sortBy === 'status')   return sign * a.status.localeCompare(b.status);
      if (sortBy === 'views')    return sign * (a.viewsCount - b.viewsCount);
      return sign * (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
    });
  }, [filtered, sortBy, sortDir]);

  const handleSortChange = (key: string, dir: SortDir) => {
    setSortBy(key as ArticleSortKey); setSortDir(dir);
  };

  // Counts catégorie agrégés (cat + descendants) — sur articles raw
  const categoryCounts = useMemo(
    () => aggregateCountsWithDescendants(
      categories,
      articles.map(a => ({ category_id: a.categoryId })),
    ),
    [categories, articles],
  );

  // Counts tags locaux : nb d'articles taggés `name` dans la liste filtrée
  // PAR statut/cat/search (pas par activeTags pour permettre le toggle).
  const baseForTags = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return articles.filter(a => {
      if (filter === 'stale')   { if (!a.isStale) return false; }
      else if (filter !== 'all' && a.status !== filter) return false;
      if (selectedCatId && a.categoryId !== selectedCatId) {
        const desc = collectDescendantIds(categories, selectedCatId);
        if (!desc.has(a.categoryId)) return false;
      }
      if (q && !a.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [articles, filter, selectedCatId, searchQuery, categories]);

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of baseForTags) {
      if (!Array.isArray(a.tags)) continue;
      for (const t of a.tags) counts[t] = (counts[t] ?? 0) + 1;
    }
    return counts;
  }, [baseForTags]);

  const tagOptions = useMemo(() => orgTags
    .map(t => ({
      id:          t.display_name,
      displayName: t.display_name,
      count:       tagCounts[t.display_name] ?? 0,
    }))
    .filter(t => t.count > 0 || activeTags.includes(t.id)),
    [orgTags, tagCounts, activeTags],
  );

  const renderRowActions = (a: ArticleListItem) => (
    <ActionMenu
      items={[
        { label: 'Ouvrir',   onClick: () => onOpenArticle(a.id) },
        { label: 'Modifier', onClick: () => navigate(`/articles/${a.id}/edit`), hidden: !isAdmin },
        { label: 'Archiver',    onClick: () => setConfirmArchive(a),  hidden: !isAdmin || a.status === 'archived' },
        { label: 'Désarchiver', onClick: () => handleUnarchive(a),     hidden: !isAdmin || a.status !== 'archived' },
        { type: 'separator', hidden: !canDelete },
        { label: 'Supprimer', onClick: () => setConfirmDelete(a), variant: 'danger', hidden: !canDelete },
      ]}
    />
  );

  const hasActiveFilters = !!searchQuery || activeTags.length > 0 || !!selectedCatId || filter !== 'all';
  const emptyState = (
    <EmptyState
      title={hasActiveFilters ? 'Aucun article ne correspond' : 'Aucun article pour l\'instant'}
      description={hasActiveFilters
        ? 'Affinez votre recherche ou retirez les filtres.'
        : (isAdmin ? 'Créez votre premier article pour démarrer.' : 'Votre équipe prépare le contenu.')}
      ctaLabel={isAdmin && !hasActiveFilters ? '+ Nouvel article' : undefined}
      onCta={isAdmin && !hasActiveFilters ? onNewArticle : undefined}
    />
  );

  return (
    <div className="knowledge-page-wrap">
      {importModal}
      <BulkActionBar
        count={selectedIds.size}
        label={n => `${n} article${n > 1 ? 's' : ''} sélectionné${n > 1 ? 's' : ''}`}
        onDelete={() => setBulkConfirmOpen(true)}
        onClear={() => setSelectedIds(new Set())}
        loading={bulkDeleting}
      />
      {bulkConfirmOpen && (
        <ConfirmDialog
          title={`Supprimer ${selectedIds.size} article${selectedIds.size > 1 ? 's' : ''} ?`}
          description="Cette action est irréversible."
          confirmLabel="Supprimer"
          variant="danger"
          loading={bulkDeleting}
          onConfirm={handleBulkDelete}
          onCancel={() => setBulkConfirmOpen(false)}
        />
      )}
      {confirmArchive && (
        <ConfirmDialog
          title="Archiver cet article ?"
          description={`« ${confirmArchive.title} » ne sera plus visible des conseillers ni du chatbot. Vous pourrez le désarchiver depuis l'onglet Archivés ; il reviendra en brouillon.`}
          confirmLabel="Archiver"
          loading={archiving}
          onConfirm={handleArchive}
          onCancel={() => setConfirmArchive(null)}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          title="Supprimer cet article ?"
          description={`« ${confirmDelete.title} » sera définitivement supprimé.`}
          confirmLabel="Supprimer"
          variant="danger"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      <PageHeader
        title="Articles"
        subtitle="Articles de référence pour vos équipes."
        actions={isAdmin && (
          <>
            <Button variant="ghost" size="md" onClick={onOpenImport}>Importer</Button>
            <Button variant="primary" size="md" onClick={onNewArticle}>+ Nouvel article</Button>
          </>
        )}
      />

      <PageToolbar
        left={(
          <FilterTabs
            options={[
              { id: 'all',       label: 'Tous',       count: counts.all },
              { id: 'published', label: 'Publiés',    count: counts.published },
              { id: 'draft',     label: 'Brouillons', count: counts.draft },
              { id: 'stale',     label: 'À réviser',  count: counts.stale },
              { id: 'archived',  label: 'Archivés',   count: counts.archived },
            ]}
            value={filter}
            onChange={setFilter}
            ariaLabel="Filtrer par statut"
          />
        )}
        right={(
          <div className="knowledge-list__toolbar-right">
            <PageToolbarSearch
              id="knowledge-search"
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Filtrer la page…"
              ariaLabel="Filtrer les articles"
            />
            <ListViewToggle value={view} onChange={setView} />
          </div>
        )}
        extra={(
          <div className="knowledge-list__filters-extra">
            <CategoryFilter
              categories={categories}
              value={selectedCatId}
              onChange={setSelectedCatId}
              counts={categoryCounts}
              totalCount={articles.length}
            />
            <TagsFilter
              available={tagOptions}
              active={activeTags}
              onChange={setActiveTags}
            />
          </div>
        )}
      />

      {view === 'table' ? (
        <DataTable<ArticleListItem>
          columns={[
            { key: 'title',      label: 'Titre',      sortable: true,
              render: a => (
                <div className="knowledge-list__title-cell">
                  <div className="knowledge-list__title">
                    {a.visibility === 'internal' && (
                      <span className="visibility-icon" title="Interne — non exposé au chatbot public" aria-label="Article interne">🕵️</span>
                    )}
                    {a.title}
                  </div>
                  {a.tags && a.tags.length > 0 && (
                    <div className="knowledge-list__tags">
                      {a.tags.slice(0, 4).map(t => (
                        <span key={t} className="chip chip--readonly chip--xs">{t}</span>
                      ))}
                      {a.tags.length > 4 && <span className="knowledge-list__tags-more">+{a.tags.length - 4}</span>}
                    </div>
                  )}
                </div>
              ),
            },
            { key: 'category',   label: 'Catégorie', sortable: true,
              render: a => a.categoryName || <span className="knowledge-list__muted">—</span> },
            { key: 'status',     label: 'Statut',     sortable: true,
              render: a => (
                <div className="knowledge-list__status-cell">
                  <StatusBadge status={a.status} />
                  {a.isStale && <span className="badge badge--warning" title="Non modifié depuis > 6 mois">À réviser</span>}
                </div>
              ),
            },
            { key: 'views',      label: 'Vues 30j', sortable: true, align: 'right', width: '90px',
              render: a => a.viewsCount > 0 ? a.viewsCount : <span className="knowledge-list__muted">0</span> },
            { key: 'updated_at', label: 'Mis à jour', sortable: true, width: '140px',
              render: a => formatRelative(a.updatedAt) },
          ]}
          data={sorted}
          rowKey={a => a.id}
          loading={loadingArticles}
          sortBy={sortBy}
          sortDir={sortDir}
          onSortChange={handleSortChange}
          onRowClick={a => onOpenArticle(a.id)}
          rowActions={isAdmin ? renderRowActions : undefined}
          emptyState={emptyState}
          selectable={isAdmin}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      ) : loadingArticles ? (
        <ul className="article-list" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="article-row article-row--skeleton" />
          ))}
        </ul>
      ) : sorted.length === 0 ? emptyState : (
        <ul className="knowledge-article-list" role="list">
          {sorted.map(a => (
            <li key={a.id}>
              <EntityRow
                title={a.title}
                subtitle={(
                  <>
                    {a.categoryName || 'Sans catégorie'}
                    <span aria-hidden="true"> · </span>
                    {a.authorName} · v{a.version}
                    <span aria-hidden="true"> · </span>
                    <time dateTime={a.updatedAt}>{formatRelative(a.updatedAt)}</time>
                  </>
                )}
                meta={(
                  <>
                    <StatusBadge status={a.status} />
                    {a.isStale && <span className="badge badge--warning">À réviser</span>}
                  </>
                )}
                onClick={() => onOpenArticle(a.id)}
                ariaLabel={`${a.title}, ${a.status}, version ${a.version}`}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

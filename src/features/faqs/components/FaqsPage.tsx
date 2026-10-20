import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFaqs }        from '../hooks/useFaqs';
import '../faqs.css';
import { Button }         from '../../../shared/components/ui/Button';
import { EmptyState }     from '../../../shared/components/ui/EmptyState';
import { ConfirmDialog }  from '../../../shared/components/ui/ConfirmDialog';
import { BulkActionBar }  from '../../../shared/components/ui/BulkActionBar';
import { ActionMenu }     from '../../../shared/components/ui/ActionMenu';
import { FilterTabs }     from '../../../shared/components/ui/FilterTabs';
import { TagsFilter }     from '../../../shared/components/ui/TagsFilter';
import { CategoryFilter, aggregateCountsWithDescendants } from '../../../shared/components/ui/CategoryFilter';
import { DataTable, type SortDir } from '../../../shared/components/ui/DataTable';
import { PageHeader }     from '../../../shared/components/layout/PageHeader';
import { PageToolbar, PageToolbarSearch } from '../../../shared/components/layout/PageToolbar';
import { formatRelative } from '../../../shared/lib/formatDate';
import { apiClient, ApiError } from '../../../shared/lib/apiClient';
import { useToast }       from '../../../shared/lib/useToast';
import { useAuthStore, selectUserRole } from '../../../store/authStore';
import { tagsApi, type OrgTag } from '../../articles/api/tagsApi';
import type { FaqListItem, FaqStatus, FaqSortBy, FaqSortDir } from '../types';
import type { Category }  from '../../knowledge/types';

interface FaqsPageProps {
  onNewFaq:  () => void;
  onEditFaq: (id: string) => void;
}

type FilterTab = 'all' | FaqStatus | 'stale';

/** Map clé colonne DataTable → clé sortBy backend FAQ. */
const COL_TO_SORT: Record<string, FaqSortBy> = {
  category:  'category',
  helpful:   'helpful',
  views:     'views',
  updated_at:'updated',
};
const SORT_TO_COL: Record<FaqSortBy, string> = {
  category:  'category',
  helpful:   'helpful',
  views:     'views',
  updated:   'updated_at',
};

export function FaqsPage({ onNewFaq, onEditFaq }: FaqsPageProps) {
  const role    = useAuthStore(selectUserRole);
  const canEdit = role === 'admin' || role === 'manager';
  const toast   = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  // Support du deep-link `/faqs?focus=<id>` (typiquement depuis l'extension
  // Chrome). On scrolle la ligne ciblée + on l'highlighte 2s puis on
  // nettoie l'URL pour ne pas re-déclencher au reload.
  const focusId = new URLSearchParams(location.search).get('focus');
  const [highlightedId, setHighlightedId] = useState<string | null>(focusId);
  const focusedRowRef = useRef<HTMLTableRowElement | null>(null);

  const [tab,        setTab]        = useState<FilterTab>('all');
  const [search,     setSearch]     = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [sortBy,     setSortBy]     = useState<FaqSortBy>('updated');
  const [sortDir,    setSortDir]    = useState<FaqSortDir>('desc');
  const [confirmDelete, setConfirmDelete] = useState<FaqListItem | null>(null);
  const [orgTags,    setOrgTags]    = useState<OrgTag[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Bulk selection (admin/manager only)
  const [selectedIds,     setSelectedIds]     = useState<Set<string>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkDeleting,    setBulkDeleting]    = useState(false);

  // Stratégie : pas de filtre statut/staleOnly envoyé au backend — on charge
  // tout (page après page, cf useFaqs) et on filtre/compte localement. Permet
  // d'avoir des compteurs cohérents sur les onglets (Toutes / Publiées /
  // Brouillons / À réviser) qui ne s'effondrent pas à 0 quand on change
  // d'onglet.
  const filterPayload = useMemo(() => ({
    q:                    search.trim() || undefined,
    tags:                 activeTags.length > 0 ? activeTags : undefined,
    categoryId:           categoryId ?? undefined,
    includeSubcategories: !!categoryId, // élargit aux descendants quand cat sélectionnée
    sortBy,
    sortDir,
  }), [search, activeTags, categoryId, sortBy, sortDir]);

  const { items: rawItems, loading, setFilters, remove, bulkRemove } = useFaqs(filterPayload);

  useEffect(() => { setFilters(filterPayload); }, [filterPayload, setFilters]);

  // Tags de l'org + catégories — 1× au mount
  useEffect(() => {
    tagsApi.list().then(setOrgTags).catch(() => setOrgTags([]));
    apiClient.get<Category[]>('/categories').then(setCategories).catch(() => setCategories([]));
  }, []);

  // Quand on a un focusId + items chargés : scroll + retire le highlight
  // après 2.5s + clean l'URL pour ne pas re-déclencher au reload.
  useEffect(() => {
    if (!focusId || !focusedRowRef.current) return;
    focusedRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t = setTimeout(() => {
      setHighlightedId(null);
      navigate('/faqs', { replace: true });
    }, 2500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, focusedRowRef.current]);

  // Filtre statut côté frontend (pour préserver les compteurs cohérents)
  const items = useMemo(() => {
    return rawItems.filter(f => {
      if (tab === 'stale')              return f.is_stale;
      if (tab === 'all')                return true;
      return f.status === tab;
    });
  }, [rawItems, tab]);

  // Compteurs par onglet — sur rawItems (avant filter statut)
  const counts = useMemo(() => ({
    all:       rawItems.length,
    published: rawItems.filter(f => f.status === 'published').length,
    draft:     rawItems.filter(f => f.status === 'draft').length,
    stale:     rawItems.filter(f => f.is_stale).length,
  }), [rawItems]);

  // Counts catégorie agrégés (cat + descendants), basés sur rawItems
  const categoryCounts = useMemo(
    () => aggregateCountsWithDescendants(categories, rawItems),
    [categories, rawItems],
  );

  // Counts par tag — calculés sur rawItems (sauf filtres tags eux-mêmes
  // pour cohérence avec le pattern Articles : counts scopés au statut tab
  // courant pour que le user voie « combien de FAQs taggées X dans cet
  // onglet »). Tri par count desc gestionné par TagsFilter.
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of items) {
      if (!Array.isArray(f.tags)) continue;
      for (const t of f.tags) counts[t] = (counts[t] ?? 0) + 1;
    }
    return counts;
  }, [items]);

  // Tags disponibles avec counts locaux. On garde tous les tags de l'org
  // (incluant ceux à 0 dans cette vue) pour permettre à l'admin de
  // sélectionner un tag même s'il n'a aucun item actuellement filtré.
  const tagOptions = useMemo(() => orgTags
    .map(t => ({
      id:          t.name,
      displayName: t.display_name,
      count:       tagCounts[t.name] ?? 0,
    }))
    .filter(t => t.count > 0 || activeTags.includes(t.id)),
    [orgTags, tagCounts, activeTags],
  );

  const handleSortChange = (key: string, dir: SortDir) => {
    const next = COL_TO_SORT[key];
    if (!next) return;
    setSortBy(next);
    setSortDir(dir);
  };

  const renderRowActions = (faq: FaqListItem) => canEdit ? (
    <ActionMenu
      items={[
        { label: 'Éditer',    onClick: () => onEditFaq(faq.id) },
        { type: 'separator' },
        { label: 'Supprimer', onClick: () => setConfirmDelete(faq), variant: 'danger' },
      ]}
    />
  ) : null;

  /** Badge statut éditorial pur (publié / brouillon). La visibilité
   *  interne/public est rendue à part via l'icône 🕵️ inline dans la
   *  colonne Question — séparation des 2 axes orthogonaux. */
  const renderStatusBadge = (faq: FaqListItem) => {
    if (faq.status === 'draft') {
      return <span className="badge badge--secondary">Brouillon</span>;
    }
    return <span className="badge badge--success">Publié</span>;
  };

  const hasActiveFilters = !!search || activeTags.length > 0 || !!categoryId || tab !== 'all';
  const emptyState = (
    <EmptyState
      title={hasActiveFilters ? 'Aucune FAQ ne correspond' : 'Aucune FAQ pour l\'instant'}
      description={
        hasActiveFilters
          ? 'Affinez votre recherche ou retirez les filtres.'
          : 'Créez votre première FAQ à partir des questions fréquentes de votre équipe.'
      }
      ctaLabel={canEdit && !hasActiveFilters ? '+ Nouvelle FAQ' : undefined}
      onCta={canEdit && !hasActiveFilters ? onNewFaq : undefined}
    />
  );

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      await bulkRemove([...selectedIds]);
      setSelectedIds(new Set());
      setBulkConfirmOpen(false);
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <>
      {confirmDelete && (
        <ConfirmDialog
          title="Supprimer la FAQ ?"
          description={`« ${confirmDelete.question} » sera retirée définitivement.`}
          confirmLabel="Supprimer"
          variant="danger"
          onConfirm={async () => {
            const ok = await remove(confirmDelete.id);
            if (ok) setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      <BulkActionBar
        count={selectedIds.size}
        label={n => `${n} FAQ${n > 1 ? 's' : ''} sélectionnée${n > 1 ? 's' : ''}`}
        onDelete={() => setBulkConfirmOpen(true)}
        onClear={() => setSelectedIds(new Set())}
        loading={bulkDeleting}
      />
      {bulkConfirmOpen && (
        <ConfirmDialog
          title={`Supprimer ${selectedIds.size} FAQ${selectedIds.size > 1 ? 's' : ''} ?`}
          description="Cette action est irréversible."
          confirmLabel="Supprimer"
          variant="danger"
          loading={bulkDeleting}
          onConfirm={handleBulkDelete}
          onCancel={() => setBulkConfirmOpen(false)}
        />
      )}

      <div className="faqs-page">
        <PageHeader
          title="FAQs"
          subtitle="Questions fréquentes et leurs réponses prêtes à copier."
          actions={canEdit && (
            <Button variant="primary" size="md" onClick={onNewFaq}>
              + Nouvelle FAQ
            </Button>
          )}
        />

        <PageToolbar
          left={(
            <FilterTabs<FilterTab>
              options={[
                { id: 'all',       label: 'Toutes',     count: counts.all },
                { id: 'published', label: 'Publiées',   count: counts.published },
                { id: 'draft',     label: 'Brouillons', count: counts.draft },
                { id: 'stale',     label: 'À réviser',  count: counts.stale },
              ]}
              value={tab}
              onChange={setTab}
              ariaLabel="Filtrer par statut"
            />
          )}
          right={(
            <PageToolbarSearch
              id="faq-search"
              value={search}
              onChange={setSearch}
              placeholder="Filtrer la page…"
              ariaLabel="Filtrer les FAQs"
            />
          )}
          extra={(
            <div className="faqs-page__filters-extra">
              <CategoryFilter
                categories={categories}
                value={categoryId}
                onChange={setCategoryId}
                counts={categoryCounts}
                totalCount={rawItems.length}
              />
              <TagsFilter
                available={tagOptions}
                active={activeTags}
                onChange={setActiveTags}
              />
            </div>
          )}
        />

        <DataTable<FaqListItem>
          columns={[
            { key: 'question',   label: 'Question',
              render: faq => (
                <div className="faqs-cell-question">
                  <div className="faqs-cell-question__text">
                    {faq.visibility === 'internal' && (
                      <span className="visibility-icon" title="Interne — non exposé au chatbot public" aria-label="FAQ interne">🕵️</span>
                    )}
                    {faq.question}
                  </div>
                  {faq.tags.length > 0 && (
                    <div className="faqs-cell-question__tags">
                      {faq.tags.slice(0, 4).map(t => (
                        <span key={t} className="chip chip--readonly chip--xs">{t}</span>
                      ))}
                      {faq.tags.length > 4 && <span className="faqs-cell-question__tags-more">+{faq.tags.length - 4}</span>}
                    </div>
                  )}
                </div>
              ),
            },
            { key: 'category',   label: 'Catégorie', sortable: true,
              render: faq => faq.category_name ?? <span className="faqs-cell-muted">—</span> },
            { key: 'status',     label: 'Statut',
              render: faq => (
                <div className="faqs-cell-status">
                  {renderStatusBadge(faq)}
                  {faq.is_stale && (
                    <span className="badge badge--warning" title="Dernière révision il y a plus de 6 mois">À réviser</span>
                  )}
                </div>
              ),
            },
            { key: 'helpful',    label: 'Score', align: 'right', sortable: true, width: '120px',
              render: faq => {
                const totalVotes = faq.helpful_yes + faq.helpful_no;
                return (
                  <span className={`faqs-cell-helpful ${totalVotes < 2 ? 'faqs-cell-muted' : ''}`}>
                    <span className="faqs-cell-helpful__yes">{faq.helpful_yes} 👍</span>
                    <span className="faqs-cell-helpful__sep">·</span>
                    <span className="faqs-cell-helpful__no">{faq.helpful_no} 👎</span>
                  </span>
                );
              },
            },
            { key: 'views',      label: 'Vues 30j', align: 'right', sortable: true, width: '90px',
              render: faq => (faq.views_30d ?? 0) > 0
                ? (faq.views_30d ?? 0)
                : <span className="faqs-cell-muted">0</span> },
            { key: 'updated_at', label: 'Mis à jour', sortable: true, width: '120px',
              render: faq => formatRelative(faq.updated_at) },
          ]}
          data={items}
          rowKey={faq => faq.id}
          loading={loading}
          sortBy={SORT_TO_COL[sortBy]}
          sortDir={sortDir}
          onSortChange={handleSortChange}
          onRowClick={canEdit ? faq => onEditFaq(faq.id) : undefined}
          rowActions={renderRowActions}
          emptyState={emptyState}
          selectable={canEdit}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          rowClassName={faq => faq.id === highlightedId ? 'faqs-row--focused' : undefined}
          rowRef={(faq, el) => {
            if (faq.id === focusId) focusedRowRef.current = el;
          }}
        />
      </div>
    </>
  );
}

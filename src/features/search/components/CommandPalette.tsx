import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../search.css';
import { apiClient } from '../../../shared/lib/apiClient';
import { useAuthStore, selectUserRole } from '../../../store/authStore';
import type { Category }     from '../../knowledge/types';
import type { SearchResult } from '../types';
import { BookOpen, ChartColumn, CircleHelp, FileText, Folder, House, ListOrdered, Plus, Search, Settings, User, Users } from 'lucide-react';

/**
 * CommandPalette — quick navigator (Cmd+J / Ctrl+J).
 *
 * Complément de la SearchBar (Cmd+K) :
 *  - SearchBar = recherche de contenu (FAQ in-line, article click-through)
 *  - Palette   = navigation rapide (catégories, sections, actions admin)
 *
 * Sections dynamiques :
 *  - Actions     : navigation entre pages + créations (admin only pour créer)
 *  - Catégories  : fuzzy match local sur les catégories chargées
 *  - Articles    : Meilisearch via /search (debounced 200ms)
 *  - FAQs        : idem, navigation vers /faqs (la liste — pas de fiche FAQ)
 *  - Processus   : idem, navigation vers /trees/:id
 *
 * Clavier : ↑↓ navigue (skip headers), Enter exécute, Esc ferme.
 */

const PALETTE_SHORTCUT_KEY = 'j'; // Cmd+J / Ctrl+J — Cmd+K reste sur la SearchBar

type ActionId =
  | 'go-dashboard' | 'go-knowledge' | 'go-faqs' | 'go-trees'
  | 'go-analytics' | 'go-members'   | 'go-settings' | 'go-account'
  | 'new-article'  | 'new-faq'      | 'new-category';

interface ActionItem {
  id:        ActionId;
  label:     string;
  icon:      React.ReactNode;
  /** Mots-clés invisibles utilisés pour le matching (incluent le label). */
  keywords:  string;
  /** Cible navigation. Pour les créations spéciales, on encode via query param. */
  path:      string;
  adminOnly: boolean;
}

const ACTIONS: ActionItem[] = [
  // Navigation
  { id: 'go-dashboard', label: 'Aller au tableau de bord',          icon: <House size={16} />, keywords: 'tableau bord dashboard accueil home',  path: '/',          adminOnly: false },
  { id: 'go-knowledge', label: 'Aller à la base de connaissance',   icon: <BookOpen size={16} />, keywords: 'base connaissance knowledge articles',  path: '/knowledge', adminOnly: false },
  { id: 'go-faqs',      label: 'Aller aux FAQs',                    icon: <CircleHelp size={16} />, keywords: 'faq questions',                         path: '/faqs',      adminOnly: false },
  { id: 'go-trees',     label: 'Aller aux processus guidés',        icon: <ListOrdered size={16} />, keywords: 'processus arbres trees',                 path: '/trees',     adminOnly: false },
  { id: 'go-analytics', label: 'Aller aux analytics',               icon: <ChartColumn size={16} />, keywords: 'analytics statistiques stats',           path: '/analytics', adminOnly: true },
  { id: 'go-members',   label: 'Aller à l\'équipe',                 icon: <Users size={16} />, keywords: 'équipe team members membres',           path: '/members',   adminOnly: true },
  { id: 'go-settings',  label: 'Aller aux paramètres',              icon: <Settings size={16} />, keywords: 'paramètres settings réglages config',    path: '/settings',  adminOnly: false },
  { id: 'go-account',   label: 'Mon compte',                        icon: <User size={16} />, keywords: 'compte profil account profile',         path: '/account',   adminOnly: false },
  // Création (admin / manager)
  { id: 'new-article',  label: 'Créer un nouvel article',           icon: <Plus size={16} />, keywords: 'nouvel article créer create new',       path: '/articles/new',                       adminOnly: true },
  { id: 'new-faq',      label: 'Créer une nouvelle FAQ',            icon: <Plus size={16} />, keywords: 'nouvelle faq créer create new',         path: '/faqs/new',                           adminOnly: true },
  { id: 'new-category', label: 'Créer une nouvelle catégorie',      icon: <Plus size={16} />, keywords: 'nouvelle catégorie créer create new',   path: '/knowledge?action=new-category',     adminOnly: true },
];

interface FlatItem {
  key:      string;
  label:    string;
  icon:     React.ReactNode;
  hint?:    string;
  onSelect: () => void;
}

interface Section {
  title: string;
  items: FlatItem[];
}

interface CommandPaletteProps {
  /** Optionnel : injecté par App pour les hooks de side-effect (ex. ouvrir la modale "Nouvelle catégorie"). Aujourd'hui non utilisé — la nav passe par les routes. */
  className?: string;
}

export function CommandPalette({ className }: CommandPaletteProps) {
  const navigate = useNavigate();
  const role     = useAuthStore(selectUserRole);
  const isAdmin  = role === 'admin' || role === 'manager';

  const [open,           setOpen]           = useState(false);
  const [query,          setQuery]          = useState('');
  const [categories,     setCategories]     = useState<Category[]>([]);
  const [searchResults,  setSearchResults]  = useState<SearchResult[]>([]);
  const [searchLoading,  setSearchLoading]  = useState(false);
  const [activeIndex,    setActiveIndex]    = useState(0);

  const inputRef     = useRef<HTMLInputElement>(null);
  const overlayRef   = useRef<HTMLDivElement>(null);
  const dialogRef    = useRef<HTMLDivElement>(null);

  /* ── Raccourci global Cmd+J / Ctrl+J ───────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === PALETTE_SHORTCUT_KEY) {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ── Reset au close, focus input à l'open ──────────────────── */
  useEffect(() => {
    if (!open) {
      setQuery('');
      setSearchResults([]);
      setActiveIndex(0);
      return;
    }
    // Focus l'input dès l'ouverture
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  /* ── Charge les catégories à la première ouverture ─────────── */
  useEffect(() => {
    if (!open || categories.length > 0) return;
    apiClient.get<Category[]>('/categories')
      .then(setCategories)
      .catch(() => { /* silencieux : la palette reste utilisable sans cats */ });
  }, [open, categories.length]);

  /* ── Recherche /search (debounced 200ms) ───────────────────── */
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) { setSearchResults([]); setSearchLoading(false); return; }
    setSearchLoading(true);
    const handle = setTimeout(() => {
      apiClient.get<SearchResult[]>(`/search?q=${encodeURIComponent(q)}&limit=5`)
        .then(r => setSearchResults(r))
        .catch(() => setSearchResults([]))
        .finally(() => setSearchLoading(false));
    }, 200);
    return () => clearTimeout(handle);
  }, [open, query]);

  /* ── Reset activeIndex quand les résultats changent ────────── */
  useEffect(() => { setActiveIndex(0); }, [query, searchResults.length, categories.length]);

  /* ── Helpers : nav vers une route + close ──────────────────── */
  const goPath = useCallback((path: string) => {
    setOpen(false);
    navigate(path);
  }, [navigate]);

  /* ── Construction des sections selon la query ──────────────── */
  const sections: Section[] = useMemo(() => {
    const out: Section[] = [];
    const q = query.trim().toLowerCase();

    // Actions — toutes si query vide, filter par includes sinon
    const visibleActions = ACTIONS
      .filter(a => isAdmin || !a.adminOnly)
      .filter(a => !q || a.label.toLowerCase().includes(q) || a.keywords.toLowerCase().includes(q));
    if (visibleActions.length > 0) {
      out.push({
        title: 'Actions',
        items: visibleActions.map(a => ({
          key:    `action-${a.id}`,
          label:  a.label,
          icon:   a.icon,
          onSelect: () => goPath(a.path),
        })),
      });
    }

    // Catégories — fuzzy local (includes), affichées si query présente OU on a des cats
    const flatCats = flattenCategories(categories);
    const matchedCats = q
      ? flatCats.filter(c => c.name.toLowerCase().includes(q)).slice(0, 6)
      : flatCats.slice(0, 6);
    if (matchedCats.length > 0) {
      out.push({
        title: 'Catégories',
        items: matchedCats.map(c => ({
          key:    `cat-${c.id}`,
          label:  c.name,
          icon:   <Folder size={16} />,
          hint:   c.path.length > 1 ? c.path.slice(0, -1).join(' › ') : undefined,
          onSelect: () => goPath(`/knowledge?cat=${encodeURIComponent(c.id)}`),
        })),
      });
    }

    // Articles / FAQs / Processus — uniquement si query présente
    if (q) {
      const articles = searchResults.filter(r => r.type === 'article');
      const faqs     = searchResults.filter(r => r.type === 'faq');
      const trees    = searchResults.filter(r => r.type === 'tree');

      if (articles.length > 0) {
        out.push({
          title: 'Articles',
          items: articles.map(r => ({
            key:    `article-${r.id}`,
            label:  r.title,
            icon:   <FileText size={16} />,
            hint:   r.category || undefined,
            onSelect: () => goPath(`/articles/${r.id}`),
          })),
        });
      }
      if (faqs.length > 0) {
        // Pas de fiche FAQ deep-linkable aujourd'hui → on navigue vers /faqs
        out.push({
          title: 'FAQs',
          items: faqs.map(r => ({
            key:    `faq-${r.id}`,
            label:  r.title,
            icon:   <CircleHelp size={16} />,
            hint:   r.category || undefined,
            onSelect: () => goPath(`/faqs`),
          })),
        });
      }
      if (trees.length > 0) {
        out.push({
          title: 'Processus',
          items: trees.map(r => ({
            key:    `tree-${r.id}`,
            label:  r.title,
            icon:   <ListOrdered size={16} />,
            hint:   r.category || undefined,
            onSelect: () => goPath(`/trees/${r.id}`),
          })),
        });
      }
    }

    return out;
  }, [query, categories, searchResults, isAdmin, goPath]);

  // Liste à plat pour la navigation clavier (skip les headers naturellement)
  const flatItems = useMemo(() => sections.flatMap(s => s.items), [sections]);

  /* ── Clavier : ↑↓ Enter Esc ────────────────────────────────── */
  const onInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, Math.max(0, flatItems.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      flatItems[activeIndex]?.onSelect();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  }, [flatItems, activeIndex]);

  /* ── Click outside ferme ───────────────────────────────────── */
  const onOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === overlayRef.current) setOpen(false);
  }, []);

  /* ── Scroll automatique sur l'item actif ───────────────────── */
  useEffect(() => {
    if (!open) return;
    const el = dialogRef.current?.querySelector(`[data-cmd-index="${activeIndex}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className={`cmd-palette-overlay ${className ?? ''}`}
      onClick={onOverlayClick}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="cmd-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Palette de commandes"
      >
        <div className="cmd-palette__input-row">
          <label htmlFor="cmd-palette-input" className="sr-only">Recherche dans la palette</label>
          <div className="cmd-palette__field">
            <Search size={20} className="cmd-palette__input-icon" />
            <input
              id="cmd-palette-input"
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="Naviguer ou créer…"
              className="cmd-palette__input"
              autoComplete="off"
              spellCheck={false}
            />
            {searchLoading && (
              <span className="cmd-palette__loading" aria-hidden="true">…</span>
            )}
          </div>
        </div>

        <div className="cmd-palette__results" role="listbox" aria-label="Résultats">
          {flatItems.length === 0 && !searchLoading && (
            <div className="cmd-palette__empty">
              Aucun résultat pour « {query} »
            </div>
          )}

          {(() => {
            let runningIndex = 0;
            return sections.map(section => {
              const sectionStart = runningIndex;
              runningIndex += section.items.length;
              return (
                <div key={section.title} className="cmd-palette__section">
                  <div className="cmd-palette__section-title" role="presentation">
                    {section.title}
                    <span className="cmd-palette__section-count">{section.items.length}</span>
                  </div>
                  {section.items.map((item, idx) => {
                    const flatIdx = sectionStart + idx;
                    const isActive = flatIdx === activeIndex;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        data-cmd-index={flatIdx}
                        className={`cmd-palette__item ${isActive ? 'cmd-palette__item--active' : ''}`}
                        onMouseEnter={() => setActiveIndex(flatIdx)}
                        onClick={item.onSelect}
                      >
                        <span className="cmd-palette__item-icon" aria-hidden="true">{item.icon}</span>
                        <span className="cmd-palette__item-label">{item.label}</span>
                        {item.hint && (
                          <span className="cmd-palette__item-hint">{item.hint}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            });
          })()}
        </div>

        <div className="cmd-palette__footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> naviguer</span>
          <span><kbd>↵</kbd> sélectionner</span>
          <span><kbd>esc</kbd> fermer</span>
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────── */

interface FlatCategory {
  id:   string;
  name: string;
  /** Chaîne de noms parent → enfant — utilisée comme hint visuel. */
  path: string[];
}

function flattenCategories(cats: Category[], parentPath: string[] = []): FlatCategory[] {
  const out: FlatCategory[] = [];
  for (const c of cats) {
    const path = [...parentPath, c.name];
    out.push({ id: c.id, name: c.name, path });
    if (c.children?.length) out.push(...flattenCategories(c.children, path));
  }
  return out;
}

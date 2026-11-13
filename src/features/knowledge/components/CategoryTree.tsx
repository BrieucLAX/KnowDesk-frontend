import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn }              from '../../../shared/lib/cn';
import type { Category }   from '../types';
import { FolderInput, Pencil, Plus, Trash2 } from 'lucide-react';

export interface CategoryActions {
  /** Renomme inline — appelée quand l'utilisateur valide l'édition. */
  onRename:   (cat: Category, newName: string) => void | Promise<void>;
  /** Ouvre la modale de création avec ce parent pré-rempli. */
  onAddChild: (parent: Category) => void;
  /** Ouvre la modale de déplacement pour cette catégorie. */
  onMove:     (cat: Category) => void;
  /** Ouvre le ConfirmDialog de suppression. */
  onDelete:   (cat: Category) => void;
}

interface CategoryTreeProps {
  categories:       Category[];
  selectedId:       string | null;
  expandedIds:      Set<string>;
  onSelect:         (category: Category) => void;
  onToggleExpand:   (categoryId: string) => void;
  /** Si fourni, active les actions admin (menu hover). Hors-admin → mode lecture. */
  actions?:         CategoryActions;
  loading?:         boolean;
}

/**
 * CategoryTree — collapsible sidebar navigation.
 * Chevron click = expand/collapse only. Name click = navigate.
 * Expansion state lifted to parent (KnowledgePage) for persistence.
 */
export function CategoryTree({
  categories,
  selectedId,
  expandedIds,
  onSelect,
  onToggleExpand,
  actions,
  loading,
}: CategoryTreeProps) {
  // Un seul menu ouvert à la fois (la piste racine du menu contextuel)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  /** id de la cat en cours de renommage. Tree-wide pour ne pas en avoir 2 en même temps. */
  const [editingId,  setEditingId]  = useState<string | null>(null);

  if (loading) {
    return (
      <nav className="category-tree" aria-label="Catégories">
        {[1,2,3,4].map(i => (
          <div key={i} className="category-tree__skeleton" aria-hidden="true">
            <div className="cat-sk cat-sk--item" />
          </div>
        ))}
      </nav>
    );
  }

  return (
    <nav className="category-tree" aria-label="Catégories de la base de connaissance">
      <ul role="tree" className="category-tree__list">
        {categories.map(cat => (
          <CategoryNode
            key={cat.id}
            category={cat}
            selectedId={selectedId}
            expandedIds={expandedIds}
            onSelect={onSelect}
            onToggleExpand={onToggleExpand}
            actions={actions}
            openMenuId={openMenuId}
            setOpenMenuId={setOpenMenuId}
            editingId={editingId}
            setEditingId={setEditingId}
            level={0}
          />
        ))}
      </ul>
    </nav>
  );
}

/* ── Category node — recursive ───────────────────────────────── */

interface CategoryNodeProps {
  category:       Category;
  selectedId:     string | null;
  expandedIds:    Set<string>;
  onSelect:       (cat: Category) => void;
  onToggleExpand: (categoryId: string) => void;
  actions?:       CategoryActions;
  openMenuId:     string | null;
  setOpenMenuId:  (id: string | null) => void;
  editingId:      string | null;
  setEditingId:   (id: string | null) => void;
  level:          number;
}

function CategoryNode({
  category,
  selectedId,
  expandedIds,
  onSelect,
  onToggleExpand,
  actions,
  openMenuId,
  setOpenMenuId,
  editingId,
  setEditingId,
  level,
}: CategoryNodeProps) {
  const hasChildren = category.children.length > 0;
  const isSelected  = category.id === selectedId;
  const isOpen      = expandedIds.has(category.id);
  const isMenuOpen  = openMenuId === category.id;
  const isEditing   = editingId === category.id;

  const [editValue, setEditValue] = useState(category.name);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isEditing) {
      setEditValue(category.name);
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [isEditing, category.name]);

  const handleSelect = useCallback(() => {
    if (isEditing) return;
    onSelect(category);
  }, [category, onSelect, isEditing]);

  const handleChevron = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand(category.id);
  }, [category.id, onToggleExpand]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (isEditing) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(); }
    if (e.key === 'ArrowRight' && hasChildren && !isOpen) { e.preventDefault(); onToggleExpand(category.id); }
    if (e.key === 'ArrowLeft'  && hasChildren && isOpen)  { e.preventDefault(); onToggleExpand(category.id); }
  }, [handleSelect, hasChildren, isOpen, category.id, onToggleExpand, isEditing]);

  const submitRename = useCallback(() => {
    const next = editValue.trim();
    if (!next || next === category.name) {
      setEditingId(null);
      return;
    }
    actions?.onRename(category, next);
    setEditingId(null);
  }, [editValue, category, actions, setEditingId]);

  const cancelRename = useCallback(() => {
    setEditingId(null);
  }, [setEditingId]);

  return (
    <li
      role="treeitem"
      aria-selected={isSelected}
      aria-expanded={hasChildren ? isOpen : undefined}
      aria-level={level + 1}
    >
      <div
        className={cn(
          'cat-item',
          isSelected && 'cat-item--selected',
          isEditing  && 'cat-item--editing',
        )}
        tabIndex={isEditing ? -1 : 0}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
        style={{ '--cat-level': level } as React.CSSProperties}
      >
        {hasChildren ? (
          <button
            type="button"
            className={cn('cat-item__chevron', isOpen && 'cat-item__chevron--open')}
            onClick={handleChevron}
            aria-label={isOpen ? 'Replier' : 'Déplier'}
            tabIndex={-1}
          >
            ›
          </button>
        ) : (
          <span className="cat-item__dot" aria-hidden="true" />
        )}

        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className="cat-item__rename-input"
            value={editValue}
            maxLength={80}
            onChange={e => setEditValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter')  { e.preventDefault(); submitRename(); }
              if (e.key === 'Escape') { e.preventDefault(); cancelRename(); }
            }}
            onBlur={submitRename}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className="cat-item__name">{category.name}</span>
        )}

        {!isEditing && (
          <span className="cat-item__count" aria-label={`${category.articleCount} articles`}>
            {category.articleCount}
          </span>
        )}

        {/* Menu actions admin — visible au hover, ouvre un dropdown au click */}
        {actions && !isEditing && (
          <button
            type="button"
            className={cn('cat-item__menu-btn', isMenuOpen && 'cat-item__menu-btn--open')}
            onClick={e => {
              e.stopPropagation();
              setOpenMenuId(isMenuOpen ? null : category.id);
            }}
            aria-label="Actions"
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            tabIndex={-1}
          >
            ···
          </button>
        )}

        {actions && isMenuOpen && (
          <CategoryActionsMenu
            category={category}
            actions={actions}
            onClose={() => setOpenMenuId(null)}
            onStartRename={() => { setOpenMenuId(null); setEditingId(category.id); }}
          />
        )}
      </div>

      {hasChildren && isOpen && (
        <ul role="group" className="cat-item__children">
          {category.children.map(child => (
            <CategoryNode
              key={child.id}
              category={child}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              actions={actions}
              openMenuId={openMenuId}
              setOpenMenuId={setOpenMenuId}
              editingId={editingId}
              setEditingId={setEditingId}
              level={level + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/* ── Menu déroulant d'actions ──────────────────────────────── */

interface CategoryActionsMenuProps {
  category:      Category;
  actions:       CategoryActions;
  onClose:       () => void;
  onStartRename: () => void;
}

function CategoryActionsMenu({ category, actions, onClose, onStartRename }: CategoryActionsMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Click outside ferme
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="cat-menu"
      role="menu"
      onClick={e => e.stopPropagation()}
    >
      <button type="button" className="cat-menu__item" role="menuitem"
        onClick={onStartRename}>
        <Pencil size={16} />Renommer
      </button>
      <button type="button" className="cat-menu__item" role="menuitem"
        onClick={() => { onClose(); actions.onAddChild(category); }}>
        <Plus size={16} />Ajouter une sous-catégorie
      </button>
      <button type="button" className="cat-menu__item" role="menuitem"
        onClick={() => { onClose(); actions.onMove(category); }}>
        <FolderInput size={16} />Déplacer…
      </button>
      <div className="cat-menu__divider" role="separator" />
      <button type="button" className="cat-menu__item cat-menu__item--danger" role="menuitem"
        onClick={() => { onClose(); actions.onDelete(category); }}>
        <Trash2 size={16} />Supprimer
      </button>
    </div>
  );
}

import React, { useRef } from 'react';
import { Skeleton } from './Skeleton';
import './DataTable.css';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useIsMobile } from '../../lib/useMediaQuery';

export type SortDir = 'asc' | 'desc';

export interface DataTableColumn<T> {
  /** Identifiant utilisé pour le tri. Doit être unique. */
  key:        string;
  label:      string;
  /** Si true → header cliquable, page appelante gère le state de tri. */
  sortable?:  boolean;
  /** Largeur CSS (ex: '120px', '20%'). Optionnel. */
  width?:     string;
  /** Alignement (default left, useful pour les colonnes numériques). */
  align?:     'left' | 'center' | 'right';
  /** Rendu de la cellule. Si absent, on affiche `row[key]` brut. */
  render?:    (row: T) => React.ReactNode;
  /** Classe additionnelle appliquée à la `<td>`. */
  cellClassName?: string;
}

/** Présentation sous 768 px, où le tableau devient une liste de cartes. */
export interface DataTableMobile {
  /** Colonne qui donne le titre de la carte. Défaut : la première colonne. */
  primary?: string;
  /** Colonnes secondaires masquées sur mobile. */
  hidden?:  ReadonlyArray<string>;
}

interface DataTableProps<T> {
  columns:        ReadonlyArray<DataTableColumn<T>>;
  data:           ReadonlyArray<T>;
  /** Fonction pour extraire la clé React (typiquement row.id). */
  rowKey:         (row: T) => string;
  loading?:       boolean;
  sortBy?:        string;
  sortDir?:       SortDir;
  onSortChange?:  (key: string, dir: SortDir) => void;
  /** Clic sur la ligne entière. */
  onRowClick?:    (row: T) => void;
  /** Cellule "Actions" affichée en dernier (admin only typiquement).
   *  Ne pas inclure cette colonne dans `columns` — gérée séparément. */
  rowActions?:    (row: T) => React.ReactNode;
  /** Rendu custom quand data est vide (après loading=false). */
  emptyState?:    React.ReactNode;
  /** Nombre de lignes squelette pendant le loading (default 5). */
  skeletonRows?:  number;
  /** Optionnel : ajoute une classe par ligne (typiquement pour highlight). */
  rowClassName?:  (row: T) => string | undefined;
  /** Optionnel : pose un ref sur la ligne, ou sur la carte en mobile (typiquement pour scrollIntoView). */
  rowRef?:        (row: T, el: HTMLElement | null) => void;
  /** Active la colonne de cases à cocher pour sélection multiple.
   *  Le parent contrôle l'état via `selectedIds` + `onSelectionChange`. */
  selectable?:   boolean;
  selectedIds?:  ReadonlySet<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  /** Optionnel : empêche la sélection d'une ligne (ex: row.status === 'protected'). */
  isRowSelectable?: (row: T) => boolean;
  /** Sous 768 px : colonne principale et colonnes masquées des cartes. */
  mobile?:        DataTableMobile;
}

/**
 * Tableau de données générique avec tri par colonne, skeleton, empty state,
 * a11y (role/scope), hover-row optionnel via `onRowClick`.
 *
 * Pattern unifié pour les pages list : Articles, FAQs, Trees.
 */
export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading,
  sortBy,
  sortDir,
  onSortChange,
  onRowClick,
  rowActions,
  emptyState,
  skeletonRows = 5,
  rowClassName,
  rowRef,
  selectable,
  selectedIds,
  onSelectionChange,
  isRowSelectable,
  mobile,
}: DataTableProps<T>) {
  const isMobile = useIsMobile();
  const toggleSort = (key: string) => {
    if (!onSortChange) return;
    if (sortBy === key) {
      onSortChange(key, sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(key, 'asc');
    }
  };

  // ── Sélection multiple ─────────────────────────────────────────
  const selectableRows = selectable
    ? data.filter(r => !isRowSelectable || isRowSelectable(r))
    : [];
  const allSelectableIds = selectableRows.map(rowKey);
  const allSelected = selectable
    && allSelectableIds.length > 0
    && allSelectableIds.every(id => selectedIds?.has(id));
  const someSelected = selectable
    && allSelectableIds.some(id => selectedIds?.has(id))
    && !allSelected;

  // Anchor pour la sélection en plage avec Shift+click. Garde l'ID de
  // la dernière ligne cochée SANS shift. Pattern Finder / Gmail.
  const anchorIdRef = useRef<string | null>(null);

  const toggleRow = (id: string, shiftKey = false) => {
    if (!onSelectionChange || !selectedIds) return;
    const next = new Set(selectedIds);

    if (shiftKey && anchorIdRef.current && anchorIdRef.current !== id) {
      // Sélection en plage : on étend de l'anchor jusqu'à `id` inclus.
      // Référence sur la liste affichée (data filtrée/triée par le parent),
      // pas sur la liste globale — comportement attendu par l'utilisateur.
      const startIdx = data.findIndex(r => rowKey(r) === anchorIdRef.current);
      const endIdx   = data.findIndex(r => rowKey(r) === id);
      if (startIdx !== -1 && endIdx !== -1) {
        const [from, to] = startIdx <= endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        // On force la sélection (add) plutôt qu'un toggle sur la plage :
        // évite que le shift désélectionne brutalement la moitié visible.
        for (let i = from; i <= to; i++) {
          const row = data[i];
          if (isRowSelectable && !isRowSelectable(row)) continue;
          next.add(rowKey(row));
        }
        onSelectionChange(next);
        return;
      }
    }

    // Click simple (ou shift sans anchor) : toggle + mémorise comme anchor
    if (next.has(id)) next.delete(id); else next.add(id);
    anchorIdRef.current = id;
    onSelectionChange(next);
  };
  const toggleAll = () => {
    if (!onSelectionChange) return;
    onSelectionChange(allSelected ? new Set() : new Set(allSelectableIds));
    anchorIdRef.current = null;
  };

  if (loading) {
    return (
      <div className="data-table" aria-busy="true">
        <div className="data-table__skel">
          {Array.from({ length: skeletonRows }).map((_, i) => (
            <Skeleton key={i} className="data-table__skel-row" />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return <>{emptyState}</>;
  }

  const renderCell = (col: DataTableColumn<T>, row: T) =>
    col.render ? col.render(row) : (row as Record<string, unknown>)[col.key] as React.ReactNode;

  // ── Sous 768 px : liste de cartes (fiche Card) ─────────────────
  if (isMobile) {
    const primaryCol = columns.find(c => c.key === mobile?.primary) ?? columns[0];
    const fieldCols  = columns.filter(c => c !== primaryCol && !mobile?.hidden?.includes(c.key));
    const sortCols   = onSortChange ? columns.filter(c => c.sortable) : [];
    const sortValue  = sortBy && sortCols.some(c => c.key === sortBy) ? `${sortBy}:${sortDir ?? 'asc'}` : '';

    return (
      <div className="data-table-cards">
        {(selectable || sortCols.length > 0) && (
          <div className="data-table-cards__toolbar">
            {selectable && (
              <label className="data-table-cards__select-all">
                <input
                  type="checkbox"
                  checked={!!allSelected}
                  ref={el => { if (el) el.indeterminate = !!someSelected; }}
                  onChange={toggleAll}
                />
                Tout sélectionner
              </label>
            )}
            {sortCols.length > 0 && (
              <label className="data-table-cards__sort">
                <span>Trier par</span>
                <select
                  className="field-input data-table-cards__sort-select"
                  value={sortValue}
                  onChange={e => {
                    const [key, dir] = e.target.value.split(':');
                    if (key) onSortChange?.(key, dir as SortDir);
                  }}
                >
                  {!sortValue && <option value="">—</option>}
                  {sortCols.flatMap(c => [
                    <option key={`${c.key}:asc`}  value={`${c.key}:asc`}>{c.label}, ordre croissant</option>,
                    <option key={`${c.key}:desc`} value={`${c.key}:desc`}>{c.label}, ordre décroissant</option>,
                  ])}
                </select>
              </label>
            )}
          </div>
        )}
        <ul className="data-table-cards__list" role="list">
          {data.map(row => {
            const id = rowKey(row);
            const canSelect = !selectable || !isRowSelectable || isRowSelectable(row);
            const isSelected = selectable && selectedIds?.has(id);
            return (
              <li
                key={id}
                ref={rowRef ? (el) => rowRef(row, el) : undefined}
                className={`data-table-card ${onRowClick ? 'data-table-card--clickable' : ''} ${isSelected ? 'data-table-card--selected' : ''} ${rowClassName?.(row) ?? ''}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                <div className="data-table-card__head">
                  {selectable && (
                    <span className="data-table-card__select" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={isSelected ? 'Désélectionner' : 'Sélectionner'}
                        checked={!!isSelected}
                        disabled={!canSelect}
                        onChange={() => toggleRow(id)}
                      />
                    </span>
                  )}
                  <div className="data-table-card__title">{renderCell(primaryCol, row)}</div>
                  {rowActions && (
                    <div className="data-table-card__actions" onClick={e => e.stopPropagation()}>
                      {rowActions(row)}
                    </div>
                  )}
                </div>
                {fieldCols.length > 0 && (
                  <dl className="data-table-card__fields">
                    {fieldCols.map(col => (
                      <div key={col.key} className="data-table-card__field">
                        <dt>{col.label}</dt>
                        <dd>{renderCell(col, row)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="data-table">
      <table className="data-table__table" role="table">
        <thead>
          <tr>
            {selectable && (
              <th scope="col" className="data-table__th data-table__th--select">
                <input
                  type="checkbox"
                  aria-label={allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                  checked={allSelected}
                  ref={el => { if (el) el.indeterminate = !!someSelected; }}
                  onChange={toggleAll}
                />
              </th>
            )}
            {columns.map(col => (
              <th
                key={col.key}
                scope="col"
                className={`data-table__th data-table__th--${col.align ?? 'left'}`}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.sortable ? (
                  <button
                    type="button"
                    className={`data-table__sort ${sortBy === col.key ? 'data-table__sort--active' : ''}`}
                    onClick={() => toggleSort(col.key)}
                    title={`Trier par ${col.label.toLowerCase()}`}
                    aria-sort={
                      sortBy === col.key
                        ? sortDir === 'asc' ? 'ascending' : 'descending'
                        : 'none'
                    }
                  >
                    {col.label}
                    <span className="data-table__sort-icon" aria-hidden="true">
                      {sortBy === col.key
                        ? (sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)
                        : <ArrowUpDown size={14} />}
                    </span>
                  </button>
                ) : (
                  col.label
                )}
              </th>
            ))}
            {rowActions && (
              <th
                scope="col"
                className="data-table__th data-table__th--actions"
                aria-label="Actions"
              />
            )}
          </tr>
        </thead>
        <tbody>
          {data.map(row => {
            const id = rowKey(row);
            const canSelect = !selectable || !isRowSelectable || isRowSelectable(row);
            const isSelected = selectable && selectedIds?.has(id);
            return (
              <tr
                key={id}
                ref={rowRef ? (el) => rowRef(row, el) : undefined}
                className={`data-table__row ${onRowClick ? 'data-table__row--clickable' : ''} ${isSelected ? 'data-table__row--selected' : ''} ${rowClassName?.(row) ?? ''}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {selectable && (
                  <td
                    className="data-table__td data-table__td--select"
                    onClick={e => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      aria-label={isSelected ? 'Désélectionner' : 'Sélectionner'}
                      checked={!!isSelected}
                      disabled={!canSelect}
                      onChange={e => {
                        // L'event natif du change (déclenché par click) porte
                        // shiftKey, contrairement à React.ChangeEvent.
                        const native = e.nativeEvent as MouseEvent;
                        toggleRow(id, !!native.shiftKey);
                      }}
                    />
                  </td>
                )}
                {columns.map(col => (
                  <td
                    key={col.key}
                    className={`data-table__td data-table__td--${col.align ?? 'left'} ${col.cellClassName ?? ''}`}
                  >
                    {renderCell(col, row)}
                  </td>
                ))}
                {rowActions && (
                  <td
                    className="data-table__td data-table__td--actions"
                    onClick={e => e.stopPropagation()}
                  >
                    {rowActions(row)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

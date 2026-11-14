import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import { DataTable, type DataTableColumn } from './DataTable';
import { mockViewportWidth } from '../../../test/matchMedia';

interface Row { id: string; title: string; category: string; views: number }

const rows: Row[] = [
  { id: 'a1', title: 'Suivre un colis',          category: 'Livraison',   views: 12 },
  { id: 'a2', title: 'Comprendre sa facture',    category: 'Facturation', views: 3 },
];

const columns: DataTableColumn<Row>[] = [
  { key: 'category', label: 'Catégorie', sortable: true },
  { key: 'title',    label: 'Titre',     sortable: true, render: r => <strong>{r.title}</strong> },
  { key: 'views',    label: 'Vues 30 j', align: 'right' },
];

let restore: () => void = () => {};
afterEach(() => restore());

describe('DataTable — 768 px et au-dessus', () => {
  it('reste un tableau', () => {
    restore = mockViewportWidth(1024);
    render(<DataTable columns={columns} data={rows} rowKey={r => r.id} mobile={{ primary: 'title' }} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map(th => th.textContent)).toEqual(['Catégorie', 'Titre', 'Vues 30 j']);
  });
});

describe('DataTable — sous 768 px : liste de cartes', () => {
  it('première colonne en titre par défaut, les autres en lignes « libellé : valeur »', () => {
    restore = mockViewportWidth(390);
    render(<DataTable columns={columns} data={rows} rowKey={r => r.id} />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const cards = screen.getAllByRole('listitem');
    expect(cards).toHaveLength(2);
    expect(cards[0].querySelector('.data-table-card__title')).toHaveTextContent('Livraison');
    const fields = within(cards[0]).getAllByRole('term').map(dt => dt.textContent);
    expect(fields).toEqual(['Titre', 'Vues 30 j']);
    expect(within(cards[0]).getAllByRole('definition').map(dd => dd.textContent)).toEqual(['Suivre un colis', '12']);
  });

  it('colonne principale choisie et colonnes secondaires masquées', () => {
    restore = mockViewportWidth(390);
    render(<DataTable columns={columns} data={rows} rowKey={r => r.id} mobile={{ primary: 'title', hidden: ['views'] }} />);
    const card = screen.getAllByRole('listitem')[0];
    expect(card.querySelector('.data-table-card__title')).toHaveTextContent('Suivre un colis');
    expect(within(card).getAllByRole('term').map(dt => dt.textContent)).toEqual(['Catégorie']);
    expect(within(card).getByText('Livraison')).toBeInTheDocument();
    expect(within(card).queryByText('12')).not.toBeInTheDocument();
  });

  it('clic sur la carte, actions dans la carte sans ouvrir la ligne', () => {
    restore = mockViewportWidth(390);
    const onRowClick = vi.fn();
    const onAction = vi.fn();
    render(
      <DataTable
        columns={columns} data={rows} rowKey={r => r.id} mobile={{ primary: 'title' }}
        onRowClick={onRowClick}
        rowActions={r => <button type="button" onClick={() => onAction(r.id)}>Archiver {r.title}</button>}
      />,
    );
    fireEvent.click(screen.getByText('Comprendre sa facture'));
    expect(onRowClick).toHaveBeenCalledWith(rows[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Archiver Suivre un colis' }));
    expect(onAction).toHaveBeenCalledWith('a1');
    expect(onRowClick).toHaveBeenCalledTimes(1);
  });

  it('sélection : « Tout sélectionner » et une case par carte', () => {
    restore = mockViewportWidth(390);
    const onSelectionChange = vi.fn();
    render(
      <DataTable
        columns={columns} data={rows} rowKey={r => r.id}
        selectable selectedIds={new Set(['a2'])} onSelectionChange={onSelectionChange}
      />,
    );
    expect(screen.getAllByRole('checkbox', { name: 'Désélectionner' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Sélectionner' }));
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(['a2', 'a1']));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Tout sélectionner' }));
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(['a1', 'a2']));
  });

  it('tri : la liste « Trier par » remplace les en-têtes cliquables', () => {
    restore = mockViewportWidth(390);
    const onSortChange = vi.fn();
    render(
      <DataTable columns={columns} data={rows} rowKey={r => r.id}
        sortBy="title" sortDir="asc" onSortChange={onSortChange} />,
    );
    const select = screen.getByRole('combobox', { name: 'Trier par' });
    expect(select).toHaveValue('title:asc');
    expect(within(select).getAllByRole('option').map(o => o.textContent)).toEqual([
      'Catégorie, ordre croissant', 'Catégorie, ordre décroissant',
      'Titre, ordre croissant', 'Titre, ordre décroissant',
    ]);
    fireEvent.change(select, { target: { value: 'category:desc' } });
    expect(onSortChange).toHaveBeenCalledWith('category', 'desc');
  });
});

describe('DataTable — tablette : cartes quand le tableau ne tient pas', () => {
  // jsdom ne calcule pas de mise en page : on simule la largeur du conteneur
  // (ResizeObserver, clientWidth) et celle dont le tableau a besoin (scrollWidth).
  let resize: (width: number) => void = () => {};
  let hostWidth = 470;
  const originals: Array<() => void> = [];

  function stub<T extends object>(proto: T, prop: string, get: () => number) {
    const desc = Object.getOwnPropertyDescriptor(proto, prop);
    Object.defineProperty(proto, prop, { configurable: true, get });
    originals.push(() => { if (desc) Object.defineProperty(proto, prop, desc); else delete (proto as Record<string, unknown>)[prop]; });
  }

  afterEach(() => {
    originals.splice(0).forEach(r => r());
    delete (window as { ResizeObserver?: unknown }).ResizeObserver;
  });

  it('passe en cartes si le tableau dépasse son conteneur, revient au tableau quand la place revient', () => {
    restore = mockViewportWidth(800);   // au-dessus de 768 px : pas de mode mobile
    hostWidth = 470;
    stub(HTMLTableElement.prototype, 'scrollWidth', () => 780);
    stub(HTMLElement.prototype, 'clientWidth', () => hostWidth);
    (window as { ResizeObserver?: unknown }).ResizeObserver = class {
      constructor(private cb: ResizeObserverCallback) { resize = w => { hostWidth = w; this.cb([{ contentRect: { width: w } } as ResizeObserverEntry], this as unknown as ResizeObserver); }; }
      observe() { resize(hostWidth); }
      disconnect() {}
      unobserve() {}
    };

    render(<DataTable columns={columns} data={rows} rowKey={r => r.id} mobile={{ primary: 'title' }} />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')[0].querySelector('.data-table-card__title')).toHaveTextContent('Suivre un colis');

    act(() => resize(900));
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('reste un tableau quand il tient dans son conteneur', () => {
    restore = mockViewportWidth(1024);
    hostWidth = 726;
    stub(HTMLTableElement.prototype, 'scrollWidth', () => 700);
    stub(HTMLElement.prototype, 'clientWidth', () => hostWidth);
    render(<DataTable columns={columns} data={rows} rowKey={r => r.id} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});

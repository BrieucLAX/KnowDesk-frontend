import React, { useRef } from 'react';
import './Tabs.css';

export interface TabItem<T extends string> {
  id:    T;
  label: string;
}

interface TabsProps<T extends string> {
  /** Préfixe des id : relie chaque onglet au panneau (aria-controls / aria-labelledby). */
  id:        string;
  items:     ReadonlyArray<TabItem<T>>;
  value:     T;
  onChange:  (id: T) => void;
  ariaLabel: string;
}

export const tabId   = (id: string, item: string) => `${id}-tab-${item}`;
export const panelId = (id: string) => `${id}-panel`;

/**
 * Onglets de navigation entre les sections d'une page (motif ARIA « tabs ») :
 * role tablist / tab / tabpanel, un seul onglet dans l'ordre de tabulation,
 * flèches gauche et droite (et Début / Fin) pour passer d'un onglet à l'autre.
 * Onglet actif souligné en --primary. Pour filtrer une liste, FilterTabs.
 */
export function Tabs<T extends string>({ id, items, value, onChange, ariaLabel }: TabsProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const select = (index: number) => {
    const item = items[(index + items.length) % items.length];
    refs.current[items.indexOf(item)]?.focus();
    onChange(item.id);
  };

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const moves: Record<string, number> = {
      ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: items.length - 1,
    };
    if (!(e.key in moves)) return;
    e.preventDefault();
    select(moves[e.key]);
  };

  return (
    <div className="tabs" role="tablist" aria-label={ariaLabel}>
      {items.map((item, i) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            ref={el => { refs.current[i] = el; }}
            type="button"
            role="tab"
            id={tabId(id, item.id)}
            aria-selected={selected}
            aria-controls={panelId(id)}
            tabIndex={selected ? 0 : -1}
            className={`tabs__tab${selected ? ' tabs__tab--active' : ''}`}
            onClick={() => onChange(item.id)}
            onKeyDown={e => onKeyDown(e, i)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

interface TabPanelProps {
  /** Même `id` que les Tabs associés. */
  id:        string;
  /** Onglet actif : le panneau porte son nom. */
  value:     string;
  className?: string;
  children:  React.ReactNode;
}

/** Panneau de l'onglet actif, nommé par cet onglet. */
export function TabPanel({ id, value, className, children }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      id={panelId(id)}
      aria-labelledby={tabId(id, value)}
      tabIndex={0}
      className={className}
    >
      {children}
    </div>
  );
}

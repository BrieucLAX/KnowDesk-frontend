import React, { useEffect, useState } from 'react';
import './ListViewToggle.css';
import { LayoutGrid, Table as TableIcon } from 'lucide-react';

export type ListView = 'table' | 'cards';

interface ListViewToggleProps {
  value:    ListView;
  onChange: (v: ListView) => void;
  /** Optionnel : si fourni, persiste le choix dans localStorage sous cette clé. */
  storageKey?: string;
}

/**
 * Toggle « tableau / cartes » — pattern Airtable.
 * Si `storageKey` est fourni, le choix est mémorisé entre sessions
 * via localStorage. La page appelante peut aussi gérer la persistance
 * elle-même via le hook `useListViewPref` ci-dessous.
 */
export function ListViewToggle({ value, onChange, storageKey }: ListViewToggleProps) {
  const handle = (v: ListView) => {
    onChange(v);
    if (storageKey) {
      try { localStorage.setItem(storageKey, v); } catch { /* ignore */ }
    }
  };
  return (
    <div className="list-view-toggle" role="group" aria-label="Affichage">
      <button
        type="button"
        className={`list-view-toggle__btn ${value === 'table' ? 'list-view-toggle__btn--active' : ''}`}
        onClick={() => handle('table')}
        aria-pressed={value === 'table'}
        aria-label="Vue tableau"
        title="Vue tableau"
      >
        <TableIcon size={16} />
      </button>
      <button
        type="button"
        className={`list-view-toggle__btn ${value === 'cards' ? 'list-view-toggle__btn--active' : ''}`}
        onClick={() => handle('cards')}
        aria-pressed={value === 'cards'}
        aria-label="Vue cartes"
        title="Vue cartes"
      >
        <LayoutGrid size={16} />
      </button>
    </div>
  );
}

/**
 * Hook utilitaire : récupère la préférence d'affichage depuis localStorage
 * au mount, avec fallback sur `defaultView`. Le setter retourné synchronise
 * automatiquement le localStorage.
 */
export function useListViewPref(
  storageKey: string,
  defaultView: ListView = 'table',
): [ListView, (v: ListView) => void] {
  const [view, setView] = useState<ListView>(defaultView);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === 'table' || stored === 'cards') setView(stored);
    } catch { /* ignore */ }
  }, [storageKey]);
  const update = (v: ListView) => {
    setView(v);
    try { localStorage.setItem(storageKey, v); } catch { /* ignore */ }
  };
  return [view, update];
}

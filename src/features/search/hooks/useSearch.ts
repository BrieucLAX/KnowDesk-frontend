import { useReducer, useCallback, useEffect, useRef } from 'react';
import { apiClient }          from '../../../shared/lib/apiClient';
import { trackEvent }         from '../../../shared/lib/trackEvent';
import type { SearchState, SearchResult } from '../types';

type Action =
  | { type: 'SET_QUERY';   query: string }
  | { type: 'LOADING' }
  | { type: 'SUCCESS';     results: SearchResult[] }
  | { type: 'ERROR';       message: string }
  | { type: 'CLEAR' };

function reducer(state: SearchState, action: Action): SearchState {
  switch (action.type) {
    case 'SET_QUERY': return { ...state, query: action.query };
    case 'LOADING':   return { ...state, status: 'loading' };
    case 'SUCCESS':   return { ...state, status: 'success', results: action.results };
    case 'ERROR':     return { ...state, status: 'error',   message: action.message, results: [] };
    case 'CLEAR':     return { query: '', results: [], status: 'idle' };
  }
}

const INITIAL: SearchState = { query: '', results: [], status: 'idle' };
const DEBOUNCE_MS = 200;
const TRACK_DEBOUNCE_MS = 1500;   // ne consigne une recherche qu'après 1,5 s d'inactivité

interface UseSearchOptions {
  token?:   string;
  onSelect: (result: SearchResult) => void;
}

export function useSearch({ onSelect }: UseSearchOptions) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const [activeIndex, setActiveIndex] = useReducer((_: number, n: number) => n, -1);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const listRef     = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const search = useCallback(async (q: string) => {
    try {
      const path = q.trim()
        ? `/search?q=${encodeURIComponent(q)}`
        : '/search';
      const results = await apiClient.get<SearchResult[]>(path);
      // Boost les FAQs en haut (réponse rapide pour conseillers en ligne).
      // Stable sort par type — l'ordre de score interne au type est préservé.
      const TYPE_ORDER: Record<string, number> = { faq: 0, article: 1, tree: 2 };
      const sorted = [...results].sort((a, b) =>
        (TYPE_ORDER[a.type] ?? 99) - (TYPE_ORDER[b.type] ?? 99)
      );
      dispatch({ type: 'SUCCESS', results: sorted });
      // Tracking analytics : on ne consigne que les recherches "intentionnelles" (avec query),
      // après TRACK_DEBOUNCE_MS d'inactivité. Si l'utilisateur continue de taper, on annule
      // et on reprogramme — seule la dernière query "stable" sera consignée.
      const query = q.trim();
      if (trackRef.current) clearTimeout(trackRef.current);
      if (query) {
        const count = results.length;
        trackRef.current = setTimeout(() => {
          trackEvent('search.query', {
            payload: { query: query.toLowerCase(), resultsCount: count },
          });
        }, TRACK_DEBOUNCE_MS);
      }
    } catch (err) {
      dispatch({
        type:    'ERROR',
        message: err instanceof Error ? err.message : 'La recherche a échoué. Réessayez dans un instant.',
      });
    }
  }, []);

  const handleChange = useCallback((q: string) => {
    dispatch({ type: 'SET_QUERY', query: q });
    setActiveIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      dispatch({ type: 'CLEAR' });
      return;
    }
    dispatch({ type: 'LOADING' });
    debounceRef.current = setTimeout(() => search(q), DEBOUNCE_MS);
  }, [search]);

  const handleClear = useCallback(() => {
    if (trackRef.current) clearTimeout(trackRef.current);
    dispatch({ type: 'CLEAR' });
    setActiveIndex(-1);
    inputRef.current?.focus();
  }, []);

  // Cleanup des timers au démontage
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (trackRef.current)    clearTimeout(trackRef.current);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const resultCount = state.results.length;
    if (resultCount === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(Math.min(activeIndex + 1, resultCount - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(Math.max(activeIndex - 1, -1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      onSelect(state.results[activeIndex]);
    } else if (e.key === 'Escape') {
      handleClear();
    }
  }, [state.results, activeIndex, onSelect, handleClear]);

  const handleFocus = useCallback(() => {
    if (!state.query) search('');
  }, [state.query, search]);

  const isOpen = state.status === 'success' && state.results.length > 0;

  return {
    state, activeIndex, isOpen,
    inputRef, listRef,
    handleChange, handleClear, handleKeyDown, handleFocus,
  };
}

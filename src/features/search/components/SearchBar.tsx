import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { SearchResultItem }    from './SearchResultItem';
import '../search.css';
import { FaqResultExpansion }  from './FaqResultExpansion';
import { AiAnswerCard }        from './AiAnswerCard';
import { useSearch }           from '../hooks/useSearch';
import { useAiTrigger }        from '../hooks/useAiTrigger';
import { useAiAnswer, type AiSource } from '../hooks/useAiAnswer';
import { useAuthStore }        from '../../../store/authStore';
import { useToast }            from '../../../shared/lib/useToast';
import type { SearchResult, SearchResultType }   from '../types';

interface SearchBarProps {
  /** Called when user selects a result — caller handles navigation */
  onSelect: (result: SearchResult) => void;
  className?: string;
}

interface SectionDef {
  type:  SearchResultType;
  label: string;
  icon:  string;
}

/** Ordre des sections dans le dropdown — les FAQs en premier (cas d'usage conseiller). */
const SECTIONS: SectionDef[] = [
  { type: 'faq',     label: 'FAQs',      icon: '❓' },
  { type: 'article', label: 'Articles',  icon: '📄' },
  { type: 'tree',    label: 'Processus', icon: '🌳' },
];

/**
 * SearchBar — the global search widget.
 *
 * Features:
 *  - Cmd+K focuses from anywhere in the app
 *  - Debounced 200ms, results under 500ms
 *  - Arrow key + Enter navigation across sections
 *  - Sections par type (FAQs, Articles, Processus) avec headers + count
 *  - Sections vides masquées
 *  - Click outside ferme le dropdown sans vider la query
 *  - Full ARIA combobox pattern
 */
export function SearchBar({ onSelect, className }: SearchBarProps) {
  const token      = useAuthStore(s => s.session?.accessToken);
  const listboxId  = useId();
  const resultIdPrefix = useId();
  const toast      = useToast();
  const wrapperRef = useRef<HTMLFormElement>(null);

  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);
  // Override local : permet de fermer le dropdown sans vider la query
  // (click outside, Escape avec query). Reset à false au focus / au change.
  const [dismissed, setDismissed] = useState(false);

  const handleSelect = useCallback((result: SearchResult) => {
    if (result.type === 'faq') {
      // Pour une FAQ, on n'ouvre pas une page — on déplie la réponse en place
      // pour permettre la copie en 1 clic. C'est le cas d'usage conseiller.
      setExpandedFaqId(prev => {
        const isOpening = prev !== result.id;
        if (isOpening) {
          // Tracke la vue côté serveur (incrementViews). Fire-and-forget :
          // un fail n'empêche pas l'expansion UI. Sans ce ping, la colonne
          // "Vues" reste à 0 car GET /faqs/:id est noTrack=1 dans l'éditeur.
          import('../../faqs/api/faqsApi').then(({ faqsApi }) => {
            faqsApi.get(result.id).catch(() => { /* noop */ });
          });
        }
        return isOpening ? result.id : null;
      });
    } else {
      setExpandedFaqId(null);
      onSelect(result);
    }
  }, [onSelect]);

  const handleCopyAnswer = useCallback(async (text: string) => {
    // Strip les <mark> du highlight pour ne copier que le texte propre
    const plain = text.replace(/<\/?mark>/g, '');
    try {
      await navigator.clipboard.writeText(plain);
      toast.success('Réponse copiée');
    } catch {
      toast.error('Impossible d\'accéder au presse-papier');
    }
  }, [toast]);

  const {
    state, activeIndex, isOpen,
    inputRef, listRef,
    handleChange, handleClear, handleKeyDown, handleFocus,
  } = useSearch({ token, onSelect: handleSelect });

  // Reset l'expansion ET le dismissed quand la query change
  useEffect(() => {
    setExpandedFaqId(null);
    setDismissed(false);
  }, [state.query]);

  // Click outside → ferme le dropdown sans vider la query.
  // L'utilisateur peut ré-ouvrir en cliquant sur l'input (focus relance dismissed=false).
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (wrapperRef.current.contains(e.target as Node)) return;
      setDismissed(true);
      setExpandedFaqId(null);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  // Wrapped focus handler : reset dismissed pour ré-afficher si on a déjà des résultats
  const handleFocusWrapped = useCallback(() => {
    setDismissed(false);
    handleFocus();
  }, [handleFocus]);

  // Effective open : on respecte le dismiss tant que l'utilisateur n'a pas re-focus
  const isOpenEffective = isOpen && !dismissed;

  // Réponse IA : trigger + état stream
  const aiTriggered = useAiTrigger(state.query);
  const aiVisible   = aiTriggered && !dismissed && state.query.trim().length > 0;
  const aiState     = useAiAnswer(state.query, aiVisible);

  const handleSelectSource = useCallback((source: AiSource) => {
    // Construit un SearchResult-like minimal et délègue au handler standard
    const synthetic: SearchResult = {
      id:        source.id,
      type:      source.type,
      title:     source.title,
      excerpt:   '',
      category:  '',
      score:     1,
      updatedAt: new Date().toISOString(),
    };
    onSelect(synthetic);
    setDismissed(true);
  }, [onSelect]);

  const activeResultId = activeIndex >= 0
    ? `${resultIdPrefix}-${activeIndex}`
    : undefined;

  // Groupage par type, en suivant l'ordre de SECTIONS. Les sections vides
  // sont filtrées. L'index global (pour activeIndex / aria-activedescendant)
  // reste sur le tableau plat state.results — sorté à l'ordre logique des
  // sections grâce au tri TYPE_ORDER côté useSearch.
  const grouped = useMemo(() => {
    return SECTIONS
      .map(section => ({
        ...section,
        results: state.results.filter(r => r.type === section.type),
      }))
      .filter(s => s.results.length > 0);
  }, [state.results]);

  return (
    <form
      ref={wrapperRef}
      className={`search-bar ${className ?? ''}`}
      role="search"
      // Entrée sans résultat sélectionné : rien à soumettre (useSearch gère
      // la navigation au clavier dans les résultats).
      onSubmit={e => e.preventDefault()}
    >
      <label htmlFor="global-search" className="sr-only">
        Rechercher dans la base de connaissance
      </label>
      <div
        className="search-bar__combobox"
        role="combobox"
        aria-expanded={isOpenEffective}
        aria-haspopup="listbox"
        aria-owns={listboxId}
      >
        {/* Search icon */}
        <SearchIcon />

        <input
          ref={inputRef}
          id="global-search"
          type="search"
          className="search-bar__input"
          placeholder="Rechercher… (⌘K)"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={state.query}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={activeResultId}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocusWrapped}
        />

        {/* Sparkle IA : visible dès que la query déclenche le trigger.
            Masquée quand la feature est désactivée côté org */}
        {aiTriggered && aiState.status !== 'disabled' && (
          <span
            className={`search-bar__ai-sparkle ${aiState.status === 'streaming' ? 'search-bar__ai-sparkle--anim' : ''}`}
            aria-hidden="true"
            title="Réponse IA disponible"
          >
            ✨
          </span>
        )}

        {/* Kbd hint — hidden when typing */}
        {!state.query && (
          <kbd className="search-bar__kbd" aria-hidden="true">⌘K</kbd>
        )}

        {/* Clear button — shown when there's a query */}
        {state.query && (
          <button
            type="button"
            className="search-bar__clear"
            onClick={handleClear}
            aria-label="Effacer la recherche"
          >
            <ClearIcon />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {(isOpenEffective || (aiVisible && aiState.status !== 'idle' && aiState.status !== 'disabled')) && (
        <div className="search-bar__dropdown">
          {/* Réponse IA — toujours en tête, visuellement distinct.
              Cachée quand l'org a désactivé la feature (status='disabled') */}
          {aiVisible && aiState.status !== 'idle' && aiState.status !== 'disabled' && (
            <AiAnswerCard state={aiState} query={state.query} onSelectSource={handleSelectSource} />
          )}

          {/* Header global */}
          {isOpenEffective && (
            <p className="search-bar__dropdown-label" aria-hidden="true">
              {state.query
                ? `${state.results.length} résultat${state.results.length > 1 ? 's' : ''} pour « ${state.query} »`
                : 'Articles populaires'}
            </p>
          )}

          {isOpenEffective && (
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label="Résultats de recherche"
            className="search-bar__results"
          >
            {grouped.map(section => {
              const indexedResults = section.results.map(result => ({
                result,
                // Position originale dans state.results plat — pour matcher activeIndex
                globalIndex: state.results.indexOf(result),
              }));
              return (
                <React.Fragment key={section.type}>
                  {/* Header de section : non focusable, role=presentation */}
                  <li className="search-section__header" role="presentation" aria-hidden="true">
                    <span className="search-section__icon">{section.icon}</span>
                    <span className="search-section__label">{section.label}</span>
                    <span className="search-section__count">{section.results.length}</span>
                  </li>
                  {indexedResults.map(({ result, globalIndex }) => (
                    <React.Fragment key={result.id}>
                      <SearchResultItem
                        id={`${resultIdPrefix}-${globalIndex}`}
                        result={result}
                        isActive={globalIndex === activeIndex}
                        onClick={handleSelect}
                      />
                      {result.type === 'faq' && expandedFaqId === result.id && (
                        <FaqResultExpansion
                          result={result}
                          onCopy={handleCopyAnswer}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </React.Fragment>
              );
            })}
          </ul>
          )}

          {/* Footer hint */}
          {isOpenEffective && (
            <div className="search-bar__footer" aria-hidden="true">
              <span><kbd>↑↓</kbd> naviguer</span>
              <span><kbd>↵</kbd> ouvrir</span>
              <span><kbd>Esc</kbd> fermer</span>
            </div>
          )}
        </div>
      )}

      {/* Loading indicator */}
      {state.status === 'loading' && !dismissed && (
        <div className="search-bar__loading" role="status" aria-label="Recherche en cours…">
          <div className="search-bar__spinner" aria-hidden="true" />
        </div>
      )}

      {/* Error */}
      {state.status === 'error' && state.message && !dismissed && (
        <div className="search-bar__error" role="alert">
          {state.message}
        </div>
      )}

      {/* No results */}
      {state.status === 'success' && state.query && state.results.length === 0 && !dismissed && (
        <div className="search-bar__empty" role="status">
          <p>Aucun résultat pour <strong>"{state.query}"</strong></p>
          <p className="search-bar__empty-hint">Essayez d'autres mots-clés ou consultez les catégories.</p>
        </div>
      )}
    </form>
  );
}

function SearchIcon() {
  return (
    <svg className="search-bar__icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" />
      <line x1="11" y1="11" x2="15" y2="15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <line x1="2" y1="2" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="2" x2="2"  y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

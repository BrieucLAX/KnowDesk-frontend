import { useEffect, useState } from 'react';

/** Largeur sous laquelle l'app passe en présentation mobile (volet de menu, tableaux en cartes). */
export const MOBILE_QUERY = '(max-width: 767.98px)';

function matches(query: string): boolean {
  // jsdom et quelques vieux navigateurs n'ont pas matchMedia : présentation bureau.
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(query).matches;
}

/** Suit une media query CSS et se met à jour quand la fenêtre change de taille. */
export function useMediaQuery(query: string): boolean {
  const [value, setValue] = useState(() => matches(query));

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    const onChange = () => setValue(mql.matches);
    onChange();
    // Safari < 14 n'a que addListener.
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, [query]);

  return value;
}

/** Vrai sous 768 px de large. */
export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY);
}

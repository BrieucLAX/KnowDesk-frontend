import { useEffect, useRef } from 'react';

/**
 * Appelle `callback` toutes les `intervalMs` tant que `active` est vrai.
 *
 * Tiré du patron d'ImportModal, avec deux différences :
 *   - l'intervalle n'est pas recréé quand le rappel change (il est lu dans
 *     une ref), donc un rendu ne décale pas le prochain appel ;
 *   - un appel encore en cours fait sauter le tick suivant : pas de requêtes
 *     qui se chevauchent sur un réseau lent.
 *
 * Une erreur du rappel est ignorée ici ; le rappel décide s'il la montre
 * (un appel de fond non critique peut échouer en silence).
 */
export function usePolling(callback: () => unknown, intervalMs: number, active: boolean): void {
  const latest = useRef(callback);
  latest.current = callback;

  useEffect(() => {
    if (!active) return;
    let inFlight = false;
    const id = window.setInterval(() => {
      if (inFlight) return;
      inFlight = true;
      Promise.resolve()
        .then(() => latest.current())
        .catch(() => { /* voir la note ci-dessus */ })
        .finally(() => { inFlight = false; });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, active]);
}

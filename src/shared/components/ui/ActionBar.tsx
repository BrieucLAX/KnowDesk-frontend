import React, { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';
import './ActionBar.css';

interface ActionBarProps {
  /** Ce qui va se passer, ou ce qui manque. */
  note?:      React.ReactNode;
  /** L'action principale et, au plus, une secondaire (la secondaire en premier). */
  children?:  React.ReactNode;
  className?: string;
}

/**
 * Barre d'action d'un écran de parcours (design system CX, fiche ActionBar) : collée en bas de
 * l'écran pendant le défilement, une note à gauche, les boutons à droite. Une seule par écran,
 * une seule action principale.
 */
export function ActionBar({ note, children, className }: ActionBarProps) {
  return (
    <div className={cn('actionbar', className)}>
      <ActionBarInner note={note}>{children}</ActionBarInner>
    </div>
  );
}

function ActionBarInner({ note, children }: ActionBarProps) {
  return (
    <>
      {note && <div className="actionbar__note">{note}</div>}
      {children && <div className="actionbar__actions">{children}</div>}
    </>
  );
}

// ── Barre tenue par la page, remplie par l'écran affiché ─────────

interface Slot {
  target:  HTMLElement | null;
  /** Réserve la barre ; `hidden` : l'écran n'en veut pas (session, écran vide). Renvoie la libération. */
  claim:   (hidden: boolean) => () => void;
}

const SlotContext = createContext<Slot | null>(null);

interface ActionBarHostProps {
  children: React.ReactNode;
  /** Ce que la barre montre quand l'écran ne la remplit pas (« Continuer : … ») ; absent : pas de barre. */
  fallback?: ActionBarProps | null;
  className?: string;
}

/**
 * La page tient une seule barre, en bas de son contenu ; l'écran affiché y place son action
 * principale avec `ActionBarContent`, qui garde ses états (grisage, chargement, messages). Sans
 * contenu, la barre montre `fallback`, ou disparaît.
 */
export function ActionBarHost({ children, fallback = null, className }: ActionBarHostProps) {
  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  const [claims, setClaims] = useState({ shown: 0, hidden: 0 });
  const claim = useCallback((hidden: boolean) => {
    const key = hidden ? 'hidden' : 'shown';
    setClaims(c => ({ ...c, [key]: c[key] + 1 }));
    return () => setClaims(c => ({ ...c, [key]: c[key] - 1 }));
  }, []);
  const slot = useMemo<Slot>(() => ({ target, claim }), [target, claim]);
  const useFallback = claims.shown === 0 && claims.hidden === 0 && fallback !== null;
  const visible = claims.shown > 0 || useFallback;

  return (
    <SlotContext.Provider value={slot}>
      {children}
      <div className={cn('actionbar', className)} hidden={!visible} role="region" aria-label="Action de l'étape">
        <div ref={setTarget} className="actionbar__slot" />
        {useFallback && <ActionBarInner note={fallback.note}>{fallback.children}</ActionBarInner>}
      </div>
    </SlotContext.Provider>
  );
}

interface ActionBarContentProps extends ActionBarProps {
  /** L'écran ne veut pas de barre pour l'instant (pas même « Continuer »). */
  hidden?: boolean;
}

/**
 * L'action principale d'un écran, placée dans la barre de la page. Hors d'un `ActionBarHost`
 * (écran rendu seul), elle s'affiche sur place, dans sa propre barre.
 */
export function ActionBarContent({ note, children, hidden = false }: ActionBarContentProps) {
  const slot = useContext(SlotContext);
  const claim = slot?.claim;
  useLayoutEffect(() => (claim ? claim(hidden) : undefined), [claim, hidden]);
  if (hidden) return null;
  if (!slot) return <ActionBar note={note}>{children}</ActionBar>;
  if (!slot.target) return null;
  return createPortal(<ActionBarInner note={note}>{children}</ActionBarInner>, slot.target);
}

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './HelpPopover.css';

interface HelpPopoverProps {
  /** Contenu affiché dans la popover (texte ou JSX riche). */
  content: React.ReactNode;
  /** Label aria pour le bouton trigger. Défaut : "Aide". */
  ariaLabel?: string;
}

/**
 * Petit bouton circulaire « ? » qui ouvre une popover contextuelle au
 * clic. Utilisé à côté des réglages critiques pour expliquer l'impact
 * (ex: rétention 30j → seuil RGPD ; coût Mistral Large × 10 vs Small).
 *
 * Click outside / Escape ferme la popover. Le contenu reste flottant
 * et ne pousse pas le layout. Il est rendu dans <body> (portail), en position fixe
 * à --z-modal : ouvert depuis une modale, il passe au-dessus du fond et n'est pas
 * rogné par la carte (lot étape A).
 */
export function HelpPopover({ content, ariaLabel = 'Aide' }: HelpPopoverProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ left: number; top: number } | null>(null);

  // Sous le bouton, décalée de 8 px vers la gauche, comme avant le portail.
  const place = useCallback(() => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (r) setCoords({ left: r.left - 8, top: r.bottom + 6 });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!wrapRef.current?.contains(target) && !contentRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span ref={wrapRef} className="help-popover">
      <button
        type="button"
        className="help-popover__trigger"
        onClick={() => setOpen(o => !o)}
        aria-label={ariaLabel}
        aria-expanded={open}
      >
        ?
      </button>
      {open && createPortal(
        <div
          ref={contentRef}
          className="help-popover__content"
          role="tooltip"
          style={{ left: coords?.left ?? 0, top: coords?.top ?? 0, visibility: coords ? 'visible' : 'hidden' }}
        >
          {content}
        </div>,
        document.body,
      )}
    </span>
  );
}

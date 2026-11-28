import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './Tooltip.css';
import { Info } from 'lucide-react';

/**
 * InfoTooltip — petite icône ⓘ qui ouvre une bulle d'aide au hover/focus/tap.
 *
 * Usage :
 *   <InfoTooltip
 *     title="Couverture"
 *     rows={[
 *       { label: 'Quoi',   text: '...' },
 *       { label: 'Calcul', text: '...' },
 *       { label: 'Action', text: '...' },
 *     ]}
 *   />
 *
 * Accessibilité :
 *  - L'icône est un <button> focusable au clavier (Tab → focus → bulle visible)
 *  - aria-describedby relie le bouton au tooltip pour les lecteurs d'écran
 *  - Escape ferme la bulle quand elle a le focus
 *  - Tap mobile (click) toggle (le hover ne marche pas sur tactile)
 *  - Click outside ferme aussi
 *
 * Style : la bulle s'affiche au-dessus de l'icône, ou dessous s'il manque la place.
 * Elle est rendue dans <body> (portail), en position fixe à --z-modal : ouverte depuis
 * une modale, elle passe au-dessus du fond et n'est pas rognée par la carte (lot étape A).
 */
export interface InfoTooltipRow {
  label: string;
  /** Texte simple ou JSX si on veut formater (gras, lien…). */
  text:  React.ReactNode;
}

interface InfoTooltipProps {
  /** Titre affiché en gras dans la bulle. */
  title:    string;
  /** Lignes structurées Label : Texte (le pattern qu'on impose dans Analytics). */
  rows?:    InfoTooltipRow[];
  /** Contenu libre à la place des rows si besoin de formatage particulier. */
  children?: React.ReactNode;
  /** Texte alternatif du bouton, lu par les lecteurs d'écran. */
  ariaLabel?: string;
}

export function InfoTooltip({ title, rows, children, ariaLabel }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  /**
   * Placement choisi APRÈS render via la hauteur réelle de la bulle :
   * - null tant que pas mesuré → bulle rendue avec visibility:hidden
   *   (mesurable mais invisible, évite le flicker)
   * - 'top' si l'espace au-dessus du trigger ≥ hauteur réelle de la bulle
   * - 'bottom' sinon
   * useLayoutEffect synchrone avant paint = pas de flash visible.
   */
  const [placement, setPlacement] = useState<'top' | 'bottom' | null>(null);
  /** Position fixe de la bulle (portail) : centre horizontal du déclencheur, haut de la bulle. */
  const [coords, setCoords] = useState<{ left: number; top: number } | null>(null);
  const wrapRef    = useRef<HTMLSpanElement>(null);
  const bubbleRef  = useRef<HTMLDivElement>(null);
  const tooltipId  = useId();

  // Escape pour fermer
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  /**
   * Smart placement avec mesure RÉELLE de la hauteur de bulle :
   * - À l'ouverture, on render la bulle avec placement=null + visibility:hidden
   * - useLayoutEffect mesure synchrone la hauteur réelle ET l'espace au-dessus
   * - Bascule en 'top' ou 'bottom' selon la mesure → bulle devient visible
   *
   * Bénéfice vs ancien seuil 200px : marche pour toutes les hauteurs de
   * tooltip (3 rangées, 4 rangées, contenu libre), pour toutes les
   * positions verticales (haut de page, milieu, bas) sans réglage.
   */
  const place = useCallback(() => {
    if (!wrapRef.current || !bubbleRef.current) return;
    const triggerRect = wrapRef.current.getBoundingClientRect();
    const bubbleHeight = bubbleRef.current.offsetHeight;
    const GAP = 8;                 // écart entre la bulle et le déclencheur
    const GAP_AND_MARGIN = 16;     // 8px gap entre bulle et trigger + 8px marge sécurité viewport
    const spaceAbove = triggerRect.top - GAP_AND_MARGIN;
    const next = spaceAbove >= bubbleHeight ? 'top' : 'bottom';
    setPlacement(next);
    setCoords({
      left: triggerRect.left + triggerRect.width / 2,
      top:  next === 'top' ? triggerRect.top - GAP - bubbleHeight : triggerRect.bottom + GAP,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    // Position fixe : elle suit le déclencheur quand la page ou la modale défile.
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, place]);

  const openTooltip   = () => { setPlacement(null); setOpen(true); };
  const toggleTooltip = () => { if (open) setOpen(false); else openTooltip(); };

  // Click outside pour fermer
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapRef.current && !wrapRef.current.contains(target) && !bubbleRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    // setTimeout pour ne pas attraper le click qui vient d'ouvrir
    const t = window.setTimeout(() => window.addEventListener('mousedown', onClick), 0);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  return (
    <span
      ref={wrapRef}
      className="info-tooltip"
      onMouseEnter={openTooltip}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="info-tooltip__trigger"
        aria-label={ariaLabel ?? `À propos de ${title}`}
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onFocus={openTooltip}
        onBlur={() => setOpen(false)}
        onClick={e => { e.stopPropagation(); toggleTooltip(); }}
      >
        <Info size={16} />
      </button>
      {open && createPortal(
        <div
          ref={bubbleRef}
          id={tooltipId}
          role="tooltip"
          className={`info-tooltip__bubble info-tooltip__bubble--${placement ?? 'top'}`}
          style={{ visibility: placement && coords ? 'visible' : 'hidden', left: coords?.left ?? 0, top: coords?.top ?? 0 }}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <div className="info-tooltip__title">{title}</div>
          {rows && rows.length > 0 && (
            <dl className="info-tooltip__rows">
              {rows.map(r => (
                <div key={r.label} className="info-tooltip__row">
                  <dt>{r.label}</dt>
                  <dd>{r.text}</dd>
                </div>
              ))}
            </dl>
          )}
          {children}
          <span className={`info-tooltip__arrow info-tooltip__arrow--${placement ?? 'top'}`} aria-hidden="true" />
        </div>,
        document.body,
      )}
    </span>
  );
}

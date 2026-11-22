import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2 } from 'lucide-react';
import './ActionMenu.css';

export type ActionMenuItem =
  | {
      type?:    'item';
      label:    string;
      onClick:  () => void;
      variant?: 'default' | 'danger';
      disabled?: boolean;
      hidden?:   boolean;
    }
  | { type: 'separator'; hidden?: boolean };

interface ActionMenuProps {
  items:      ActionMenuItem[];
  /** Label a11y du bouton trigger. Default : « Actions ». */
  ariaLabel?: string;
  /** Si fourni, override l'icône du trigger (default : ···). */
  triggerLabel?: React.ReactNode;
}

interface PopoverPos {
  top:    number;
  left:   number;
  /** Direction d'ouverture (utilisé pour flip vers le haut si pas la place en bas). */
  placement: 'bottom' | 'top';
}

const POPOVER_MIN_WIDTH = 160;
const POPOVER_GAP       = 4;
const VIEWPORT_MARGIN   = 8;

/**
 * Menu d'actions en popover déclenché par un bouton « ··· ».
 *
 * Le popover est rendu via portal dans `document.body` avec un positionnement
 * fixed calculé depuis le trigger. Ça évite le clipping par les conteneurs
 * avec `overflow: hidden` (ex: `.data-table` qui clip les coins arrondis).
 * Bonus : flip vers le haut quand le menu déborderait du bas du viewport
 * (utile pour la dernière ligne d'un tableau).
 *
 * - Click outside ferme
 * - Escape ferme + restaure le focus sur le trigger
 * - Items avec `variant: 'danger'` : suppressions, rendues en rouge avec l'icône trash-2
 * - Items avec `hidden: true` ne sont pas rendus
 * - Separators acceptés pour grouper visuellement
 */
export function ActionMenu({ items, ariaLabel = 'Actions', triggerLabel = '···' }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState<PopoverPos | null>(null);
  const wrapRef     = useRef<HTMLSpanElement>(null);
  const triggerRef  = useRef<HTMLButtonElement>(null);
  const popoverRef  = useRef<HTMLDivElement>(null);

  // Calcule la position du popover par rapport au trigger.
  // Flip vers le haut si pas la place en bas (dernière ligne de tableau).
  const computePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect    = trigger.getBoundingClientRect();
    const popover = popoverRef.current;
    const popH    = popover?.offsetHeight ?? 0;
    const popW    = Math.max(popover?.offsetWidth ?? 0, POPOVER_MIN_WIDTH);

    const spaceBelow = window.innerHeight - rect.bottom;
    const placement: 'bottom' | 'top' =
      spaceBelow < popH + POPOVER_GAP + VIEWPORT_MARGIN && rect.top > popH + POPOVER_GAP + VIEWPORT_MARGIN
        ? 'top'
        : 'bottom';

    const top = placement === 'bottom'
      ? rect.bottom + POPOVER_GAP
      : rect.top - popH - POPOVER_GAP;

    // Aligné à droite du trigger, clampé pour rester dans le viewport.
    let left = rect.right - popW;
    if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN;
    if (left + popW > window.innerWidth - VIEWPORT_MARGIN) {
      left = window.innerWidth - popW - VIEWPORT_MARGIN;
    }

    setPos({ top, left, placement });
  };

  // Recalcule la position juste après que le popover soit monté (on a besoin
  // de offsetHeight pour le flip), puis on écoute scroll/resize tant qu'il
  // est ouvert.
  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    computePosition();
    const onReflow = () => computePosition();
    window.addEventListener('scroll', onReflow, true);
    window.addEventListener('resize', onReflow);
    return () => {
      window.removeEventListener('scroll', onReflow, true);
      window.removeEventListener('resize', onReflow);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t))    return;
      if (popoverRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown',   onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown',   onKey);
    };
  }, [open]);

  const visibleItems = items.filter(i => !i.hidden);
  if (visibleItems.length === 0) return null;

  return (
    <span ref={wrapRef} className="action-menu">
      <button
        ref={triggerRef}
        type="button"
        className="action-menu__trigger"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        {triggerLabel}
      </button>

      {open && createPortal(
        <div
          ref={popoverRef}
          className="action-menu__popover"
          role="menu"
          style={{
            top:        pos?.top  ?? -9999,
            left:       pos?.left ?? -9999,
            visibility: pos ? 'visible' : 'hidden',
          }}
          onClick={e => e.stopPropagation()}
        >
          {visibleItems.map((item, i) => {
            if (item.type === 'separator') {
              return <div key={`sep-${i}`} className="action-menu__separator" role="separator" />;
            }
            const variant = item.variant ?? 'default';
            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={`action-menu__item action-menu__item--${variant}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (item.disabled) return;
                  setOpen(false);
                  item.onClick();
                }}
                disabled={item.disabled}
              >
                {variant === 'danger' && <Trash2 size={16} aria-hidden="true" />}
                {item.label}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </span>
  );
}

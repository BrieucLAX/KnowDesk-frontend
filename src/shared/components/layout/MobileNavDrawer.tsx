import React, { useEffect, useRef } from 'react';
import { LogOut, X } from 'lucide-react';
import { SideNav, type NavRoute } from './SideNav';

interface MobileNavDrawerProps {
  id:         string;
  active:     NavRoute;
  onNavigate: (route: NavRoute) => void;
  onHelp?:    () => void;
  onLogout:   () => void;
  /** Fermeture sans choix de rubrique (Échap, voile, bouton Fermer). */
  onClose:    () => void;
}

const FOCUSABLE = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Volet de navigation sous 768 px : la barre latérale (SideNav) dans une
 * fenêtre modale qui glisse depuis la gauche. Monté seulement quand il est
 * ouvert ; le parent rend le focus au bouton « Menu » à la fermeture.
 */
export function MobileNavDrawer({ id, active, onNavigate, onHelp, onLogout, onClose }: MobileNavDrawerProps) {
  const panelRef   = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  // Focus initial sur la rubrique active (sinon le premier élément) ; la page
  // derrière ne défile plus tant que le volet est ouvert.
  useEffect(() => {
    const panel = panelRef.current;
    const target = panel?.querySelector<HTMLElement>('[aria-current="page"]')
      ?? panel?.querySelector<HTMLElement>(FOCUSABLE);
    target?.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; };
  }, []);

  // Échap ferme ; Tab reste dans le volet.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const panel = panelRef.current;
      if (!panel) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) { e.preventDefault(); return; }
      const first  = focusables[0];
      const last   = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      // Le panneau des notifications, ouvert depuis le volet, garde son focus.
      if (active && !panel.contains(active) && active.closest('.notif-panel')) return;
      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="mobile-nav" role="presentation">
      <div className="mobile-nav__overlay" data-testid="mobile-nav-overlay" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        id={id}
        className="mobile-nav__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        <button type="button" className="mobile-nav__close" onClick={onClose} aria-label="Fermer le menu">
          <X size={20} aria-hidden="true" />
        </button>
        <SideNav active={active} onNavigate={onNavigate} onHelp={onHelp} />
        <div className="mobile-nav__footer">
          <button type="button" className="sidenav__item mobile-nav__logout" onClick={onLogout}>
            <span className="sidenav__icon" aria-hidden="true"><LogOut size={20} /></span>
            <span className="sidenav__label">Se déconnecter</span>
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Menu, Search, X } from 'lucide-react';
import { SideNav, type NavRoute } from './SideNav';
import { MobileNavDrawer } from './MobileNavDrawer';
import { useAuthStore, selectOrganization } from '../../../store/authStore';
import { isTestOrganization } from '../../lib/modules';
import { useIsMobile } from '../../lib/useMediaQuery';
import { cn } from '../../lib/cn';
import { StatusIcon } from '../ui/StatusIcon';

interface AppLayoutProps {
  children:     React.ReactNode;
  pageTitle?:   string;
  activeRoute?: NavRoute;
  onNavigate?:  (route: NavRoute) => void;
  onHelp?:      () => void;
  searchSlot?:  React.ReactNode;
}

export function AppLayout({
  children, pageTitle, activeRoute = 'dashboard', onNavigate, onHelp, searchSlot,
}: AppLayoutProps) {
  const logout        = useAuthStore(s => s.logout);
  const impersonating = useAuthStore(s => s.impersonating);
  const organization  = useAuthStore(selectOrganization);
  const isMobile      = useIsMobile();
  const drawerId      = useId();

  // ── Présentation mobile (sous 768 px) : volet de menu et recherche dépliable.
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const menuButtonRef   = useRef<HTMLButtonElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const searchWrapRef   = useRef<HTMLDivElement>(null);
  // Où rendre le focus après la fermeture du volet ou de la recherche.
  const pendingFocus = useRef<'menu' | 'search' | null>(null);

  // Repassé en bureau : volet et recherche dépliée n'ont plus lieu d'être.
  useEffect(() => {
    if (!isMobile) { setMenuOpen(false); setSearchOpen(false); }
  }, [isMobile]);

  useEffect(() => {
    if (pendingFocus.current === 'menu' && !menuOpen) menuButtonRef.current?.focus();
    if (pendingFocus.current === 'search' && !searchOpen) searchButtonRef.current?.focus();
    pendingFocus.current = null;
  }, [menuOpen, searchOpen]);

  // Recherche dépliée : le curseur va directement dans le champ.
  useEffect(() => {
    if (searchOpen) searchWrapRef.current?.querySelector<HTMLInputElement>('input')?.focus();
  }, [searchOpen]);

  const closeMenu = useCallback(() => {
    pendingFocus.current = 'menu';
    setMenuOpen(false);
  }, []);

  const closeSearch = useCallback(() => {
    pendingFocus.current = 'search';
    setSearchOpen(false);
  }, []);

  const handleNavigate = (route: NavRoute) => {
    onNavigate?.(route);
  };

  const handleDrawerNavigate = (route: NavRoute) => {
    closeMenu();
    onNavigate?.(route);
  };

  const handleDrawerHelp = onHelp ? () => { closeMenu(); onHelp(); } : undefined;

  return (
    <div className={cn('app-layout', isMobile && 'app-layout--mobile')} style={impersonating ? { marginTop: '40px' } : undefined}>
      {!isMobile && <SideNav active={activeRoute} onNavigate={handleNavigate} onHelp={onHelp} />}
      <div className="app-layout__body">
        {/* Organisations de test (module onboarding) : bandeau permanent. */}
        {isTestOrganization(organization) && (
          <div className="test-version-banner" role="status">
            <StatusIcon tone="info" size={16} className="test-version-banner__icon" />
            <span><strong>Version de test</strong> — ce parcours est en cours de développement.</span>
          </div>
        )}
        {isMobile ? (
          <header className="topbar topbar--mobile" role="banner">
            {pageTitle && <h1 className="topbar__title sr-only">{pageTitle}</h1>}
            {searchOpen ? (
              <>
                <div className="topbar__search-wrap topbar__search-wrap--open" ref={searchWrapRef}>
                  {searchSlot}
                </div>
                <button type="button" className="topbar__icon-btn" onClick={closeSearch} aria-label="Fermer la recherche">
                  <X size={20} aria-hidden="true" />
                </button>
              </>
            ) : (
              <>
                <button
                  ref={menuButtonRef}
                  type="button"
                  className="topbar__icon-btn"
                  onClick={() => setMenuOpen(true)}
                  aria-label="Ouvrir le menu"
                  aria-expanded={menuOpen}
                  aria-controls={menuOpen ? drawerId : undefined}
                  aria-haspopup="dialog"
                >
                  <Menu size={20} aria-hidden="true" />
                </button>
                <span className="topbar__brand">KnowDesk</span>
                {searchSlot && (
                  <button
                    ref={searchButtonRef}
                    type="button"
                    className="topbar__icon-btn topbar__icon-btn--end"
                    onClick={() => setSearchOpen(true)}
                    aria-label="Rechercher"
                    aria-expanded={false}
                  >
                    <Search size={20} aria-hidden="true" />
                  </button>
                )}
              </>
            )}
          </header>
        ) : (
          <header className="topbar" role="banner">
            {pageTitle && <h1 className="topbar__title sr-only">{pageTitle}</h1>}
            <div className="topbar__search-wrap">
              {/* Barre de recherche : absente sans le module knowledge (App.tsx). */}
              {searchSlot}
            </div>
            <div className="topbar__actions">
              <button
                type="button"
                className="topbar__logout"
                onClick={() => { void logout(); }}
                aria-label="Se déconnecter"
              >
                Déconnexion
              </button>
            </div>
          </header>
        )}
        <main className="app-layout__content" id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
      {isMobile && menuOpen && (
        <MobileNavDrawer
          id={drawerId}
          active={activeRoute}
          onNavigate={handleDrawerNavigate}
          onHelp={handleDrawerHelp}
          onLogout={() => { void logout(); }}
          onClose={closeMenu}
        />
      )}
    </div>
  );
}

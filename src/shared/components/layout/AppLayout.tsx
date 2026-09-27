import React from 'react';
import { SideNav, type NavRoute } from './SideNav';
import { useAuthStore } from '../../../store/authStore';

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

  const handleNavigate = (route: NavRoute) => {
    onNavigate?.(route);
  };

  return (
    <div className="app-layout" style={impersonating ? { marginTop: '40px' } : undefined}>
      <SideNav active={activeRoute} onNavigate={handleNavigate} onHelp={onHelp} />
      <div className="app-layout__body">
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
        <main className="app-layout__content" id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}

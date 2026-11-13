import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { initSentry, Sentry } from './shared/lib/monitoring/sentry';
import { App } from './App';
// Foundation : tokens (variables CSS) + base (reset, root) + layout (sidenav,
// topbar) — d'abord, pour que les autres feuilles puissent utiliser les
// variables sans soucis de cascade. Toutes les autres CSS sont co-localisées
// avec leur composant/feature et chargées par les imports ESM (Vite les
// concatène automatiquement dans le bundle final).
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';

// Initialisé avant tout — capture les erreurs de boot React.
initSentry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={ErrorFallback}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);

function ErrorFallback() {
  return (
    <div role="alert" style={{
      maxWidth: 520, margin: '80px auto', padding: '32px 28px',
      fontFamily: 'var(--font-sans)', textAlign: 'center',
    }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>Une erreur s'est produite</h1>
      <p style={{ fontSize: 14, color: 'var(--ink-muted)', lineHeight: 1.5, marginBottom: 20 }}>
        L'équipe technique a été automatiquement notifiée. Recharge la page pour réessayer.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          padding: '10px 22px', background: 'var(--primary)', color: 'var(--on-primary)',
          border: 0, borderRadius: 8, cursor: 'pointer', fontSize: 14,
        }}
      >
        Recharger la page
      </button>
    </div>
  );
}

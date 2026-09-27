import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import { PublicClientApplication, type Configuration } from '@azure/msal-browser';
import { useOAuthLogin } from '../hooks/useOAuthLogin';
import type { AuthSession } from '../types';
import './OAuthButtons.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const MICROSOFT_CLIENT_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID as string | undefined;

/**
 * Boutons "Continuer avec Google" et "Continuer avec Microsoft".
 *
 * Si les CLIENT_IDs ne sont pas posés en env, les boutons sont masqués
 * (gracefully degrade — pas de bouton mort en prod).
 *
 * Flux :
 *   1. User clique → popup provider
 *   2. Provider renvoie un idToken JWT signé
 *   3. On poste sur /auth/oauth (backend vérifie + crée/lie le user + pose cookies)
 *   4. onSuccess(session) → App reprend la main comme un login normal
 */
export function OAuthButtons({ onSuccess, mode }: {
  onSuccess: (session: AuthSession) => void;
  mode: 'login' | 'register';
}) {
  if (!GOOGLE_CLIENT_ID && !MICROSOFT_CLIENT_ID) return null;

  return (
    <div className="oauth-buttons">
      {GOOGLE_CLIENT_ID && (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <GoogleSignInButton onSuccess={onSuccess} mode={mode} />
        </GoogleOAuthProvider>
      )}

      {MICROSOFT_CLIENT_ID && (
        <MicrosoftSignInButton onSuccess={onSuccess} mode={mode} />
      )}

      <p className="oauth-buttons__gdpr">
        Vos données sont traitées selon notre{' '}
        <a href="/privacy" target="_blank" rel="noopener noreferrer">politique de confidentialité</a>.
      </p>

      <div className="oauth-buttons__divider"><span>ou</span></div>
    </div>
  );
}

// ── Google ─────────────────────────────────────────────────────────────────

function GoogleSignInButton({ onSuccess, mode }: {
  onSuccess: (session: AuthSession) => void;
  mode: 'login' | 'register';
}) {
  const { signIn, loading, error } = useOAuthLogin(onSuccess);

  // Avec auth-code flow + idToken : @react-oauth/google `useGoogleLogin` renvoie
  // un access token, pas l'idToken. On utilise donc le credential flow via le
  // popup natif Google Identity Services qui retourne directement l'ID token JWT.
  const handleClick = useCallback(() => {
    /* global google */
    const w = window as unknown as { google?: { accounts?: { id?: {
      initialize: (cfg: { client_id: string; callback: (resp: { credential: string }) => void }) => void;
      prompt:     (cb?: (notif: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
    } } } };

    if (!w.google?.accounts?.id) {
      console.warn('[oauth] Google Identity Services SDK non chargé');
      return;
    }
    w.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID!,
      callback: (resp) => { void signIn('google', resp.credential); },
    });
    w.google.accounts.id.prompt();
  }, [signIn]);

  // Charge le SDK Google Identity Services 1× au mount.
  useEffect(() => {
    if (document.querySelector('script[src*="gsi/client"]')) return;
    const s = document.createElement('script');
    s.src   = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    document.body.appendChild(s);
  }, []);

  return (
    <>
      <button
        type="button"
        className="oauth-btn oauth-btn--google"
        onClick={handleClick}
        disabled={loading}
        aria-busy={loading}
      >
        <GoogleIcon />
        {loading ? 'Connexion…' : (mode === 'register' ? 'Créer un espace avec Google' : 'Continuer avec Google')}
      </button>
      {error && <p className="oauth-buttons__error" role="alert">{error}</p>}
    </>
  );
}

// ── Microsoft ──────────────────────────────────────────────────────────────

let msalInstance: PublicClientApplication | null = null;
function getMsalInstance(): PublicClientApplication {
  if (msalInstance) return msalInstance;
  const config: Configuration = {
    auth: {
      clientId:    MICROSOFT_CLIENT_ID!,
      // 'common' = accepte les comptes perso + Azure AD travail (multi-tenant).
      // Pour ne supporter qu'Azure AD entreprise, mettre 'organizations'.
      authority:   'https://login.microsoftonline.com/common',
      redirectUri: typeof window !== 'undefined' ? window.location.origin : '/',
    },
    cache: { cacheLocation: 'sessionStorage' },
  };
  msalInstance = new PublicClientApplication(config);
  return msalInstance;
}

function MicrosoftSignInButton({ onSuccess, mode }: {
  onSuccess: (session: AuthSession) => void;
  mode: 'login' | 'register';
}) {
  const { signIn, loading, error } = useOAuthLogin(onSuccess);
  const initRef = useRef<Promise<void> | null>(null);

  // Initialize MSAL une seule fois (asynchrone depuis MSAL v3).
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = getMsalInstance().initialize();
  }, []);

  const handleClick = useCallback(async () => {
    const msal = getMsalInstance();
    await initRef.current;  // attends l'init si encore en cours
    try {
      const result = await msal.loginPopup({
        scopes: ['openid', 'profile', 'email'],
      });
      const idToken = result.idToken;
      if (!idToken) {
        console.warn('[oauth] Microsoft: pas d\'idToken retourné');
        return;
      }
      await signIn('microsoft', idToken);
    } catch (err) {
      // user_cancelled ou popup fermée → silence (pas une vraie erreur)
      const code = (err as { errorCode?: string })?.errorCode;
      if (code === 'user_cancelled' || code === 'popup_window_error') return;
      console.warn('[oauth] Microsoft sign-in failed', err);
    }
  }, [signIn]);

  return (
    <>
      <button
        type="button"
        className="oauth-btn oauth-btn--microsoft"
        onClick={handleClick}
        disabled={loading}
        aria-busy={loading}
      >
        <MicrosoftIcon />
        {loading ? 'Connexion…' : (mode === 'register' ? 'Créer un espace avec Microsoft' : 'Continuer avec Microsoft')}
      </button>
      {error && <p className="oauth-buttons__error" role="alert">{error}</p>}
    </>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 23 23" aria-hidden="true">
      <path fill="#F25022" d="M1 1h10v10H1z"/>
      <path fill="#7FBA00" d="M12 1h10v10H12z"/>
      <path fill="#00A4EF" d="M1 12h10v10H1z"/>
      <path fill="#FFB900" d="M12 12h10v10H12z"/>
    </svg>
  );
}

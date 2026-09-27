import { useAuthStore } from '../../store/authStore';

/**
 * Base URL : absolue en prod (api.knowdesk.fr) si VITE_API_URL est posé,
 * relative en dev (proxy Vite vers localhost:3001 défini dans vite.config.ts).
 * Cookies HTTP-only sameSite=lax fonctionnent grâce au domaine partagé
 * `.knowdesk.fr` (cf COOKIE_DOMAIN backend) — app.knowdesk.fr et
 * api.knowdesk.fr sont same-site bien que cross-origin.
 */
const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

export class ApiError extends Error {
  constructor(
    public readonly code:    string,
    public readonly message: string,
    public readonly status:  number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };

  // L'access token vit dans un cookie HTTP-only — credentials:include le transporte
  // automatiquement, plus besoin d'un header Authorization.
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401) {
    const refresh = await tryRefresh();
    if (refresh.ok) {
      const retryRes = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers,
        credentials: 'include',
      });
      return endSessionIfOrgDisabled(parseResponse<T>(retryRes));
    } else if (refresh.error?.code === ORG_DISABLED) {
      useAuthStore.getState().endSession(refresh.error.message);
      throw refresh.error;
    } else {
      useAuthStore.getState().clearSession();
      throw new ApiError('TOKEN_EXPIRED', 'Session expirée. Reconnectez-vous.', 401);
    }
  }

  return endSessionIfOrgDisabled(parseResponse<T>(res));
}

/**
 * Organisation désactivée (fin d'un test, ou désactivation par un
 * superadmin) : le back répond 403 ORG_DISABLED sur toute requête
 * authentifiée et au rafraîchissement. On coupe la session locale ; l'écran
 * de connexion affiche le message.
 */
const ORG_DISABLED = 'ORG_DISABLED';

async function endSessionIfOrgDisabled<T>(pending: Promise<T>): Promise<T> {
  try {
    return await pending;
  } catch (err) {
    // Sans session locale (écran de connexion), le formulaire affiche déjà l'erreur.
    if (err instanceof ApiError && err.code === ORG_DISABLED && useAuthStore.getState().session) {
      useAuthStore.getState().endSession(err.message);
    }
    throw err;
  }
}

async function parseResponse<T>(res: Response): Promise<T> {
  const body = await res.json();
  if (!res.ok || body.error) {
    throw new ApiError(
      body.error?.code    ?? 'UNKNOWN_ERROR',
      body.error?.message ?? 'Une erreur est survenue.',
      res.status,
    );
  }
  return body.data as T;
}

// Mutex pour le refresh : plusieurs requêtes simultanées qui voient un 401
// partagent la même tentative au lieu de la lancer en parallèle.
interface RefreshResult {
  ok:     boolean;
  /** Erreur renvoyée par /auth/refresh, si elle en porte une (ex. ORG_DISABLED). */
  error?: ApiError;
}

let refreshPromise: Promise<RefreshResult> | null = null;

async function tryRefresh(): Promise<RefreshResult> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

async function doRefresh(): Promise<RefreshResult> {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method:      'POST',
      credentials: 'include',
    });
    // Le nouveau access token est posé en cookie par le backend ; pas besoin
    // de toucher au store côté frontend.
    if (res.ok) return { ok: true };
    const body = await res.json().catch(() => null);
    const code = body?.error?.code;
    return code
      ? { ok: false, error: new ApiError(code, body.error.message ?? 'Une erreur est survenue.', res.status) }
      : { ok: false };
  } catch {
    return { ok: false };
  }
}

export const apiClient = {
  get:    <T>(path: string)                 => request<T>(path),
  post:   <T>(path: string, body: unknown)  => request<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown)  => request<T>(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  put:    <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT',    body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string)                => request<T>(path, { method: 'DELETE' }),
};

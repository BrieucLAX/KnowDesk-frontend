import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { AuthSession } from '../../features/auth/types';
import { apiClient, ApiError } from './apiClient';
import { useAuthStore } from '../../store/authStore';

const session: AuthSession = {
  user:         { id: 'usr_1', email: 'admin@acme.fr', role: 'admin', onboardingDone: true },
  organization: { id: 'org_1', name: 'Acme', slug: 'acme', plan: 'pro' },
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const fetchMock = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  useAuthStore.setState({ session, isLoaded: true, sessionEndedReason: null, impersonating: null });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiClient — erreurs', () => {
  it('transmet le code et le message du back', async () => {
    fetchMock.mockResolvedValueOnce(json(409, { data: null, error: { code: 'DUPLICATE_FILENAME', message: 'déjà là' } }));
    const err = await apiClient.get('/x').catch(e => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ code: 'DUPLICATE_FILENAME', message: 'déjà là', status: 409 });
    expect(useAuthStore.getState().session).not.toBeNull();
  });

  it('ORG_DISABLED en cours de session : coupe la session et garde la raison', async () => {
    fetchMock.mockResolvedValueOnce(json(403, { data: null, error: { code: 'ORG_DISABLED', message: 'Cet espace est désactivé.' } }));
    await expect(apiClient.get('/account')).rejects.toMatchObject({ code: 'ORG_DISABLED' });
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().sessionEndedReason).toBe('Cet espace est désactivé.');
  });

  it('ORG_DISABLED au rafraîchissement : même traitement', async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { data: null, error: { code: 'UNAUTHORIZED', message: 'x' } }))
      .mockResolvedValueOnce(json(403, { data: null, error: { code: 'ORG_DISABLED', message: 'Cet espace est désactivé.' } }));
    await expect(apiClient.get('/account')).rejects.toMatchObject({ code: 'ORG_DISABLED' });
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().sessionEndedReason).toBe('Cet espace est désactivé.');
  });

  it('rafraîchissement refusé sans code : session expirée, sans raison', async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { data: null, error: { code: 'UNAUTHORIZED', message: 'x' } }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));
    await expect(apiClient.get('/account')).rejects.toMatchObject({ code: 'TOKEN_EXPIRED' });
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().sessionEndedReason).toBeNull();
  });

  it('ORG_DISABLED sans session (formulaire de connexion) : pas de raison posée', async () => {
    useAuthStore.setState({ session: null });
    fetchMock.mockResolvedValueOnce(json(403, { data: null, error: { code: 'ORG_DISABLED', message: 'Cet espace est désactivé.' } }));
    await expect(apiClient.post('/auth/login', {})).rejects.toMatchObject({ code: 'ORG_DISABLED' });
    expect(useAuthStore.getState().sessionEndedReason).toBeNull();
  });

  it('une nouvelle session efface la raison', () => {
    useAuthStore.getState().endSession('Cet espace est désactivé.');
    useAuthStore.getState().setSession(session);
    expect(useAuthStore.getState().sessionEndedReason).toBeNull();
  });
});

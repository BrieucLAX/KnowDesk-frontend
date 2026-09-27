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

describe('apiClient — succès', () => {
  it('get renvoie data seul ; getWithMeta garde aussi meta', async () => {
    const body = { data: [{ id: 'a' }], meta: { quota: { used: 1, max: 5 } }, error: null };
    fetchMock.mockResolvedValueOnce(json(200, body)).mockResolvedValueOnce(json(200, body));
    expect(await apiClient.get('/x')).toEqual([{ id: 'a' }]);
    expect(await apiClient.getWithMeta('/x')).toEqual({ data: [{ id: 'a' }], meta: { quota: { used: 1, max: 5 } } });
  });
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

describe('apiClient — réponses sans corps (R15)', () => {
  it('un 204 renvoie undefined', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(apiClient.delete('/brand-monitoring/prompts/1')).resolves.toBeUndefined();
  });

  it('une erreur sans corps reste une ApiError', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 502 }));
    await expect(apiClient.get('/x')).rejects.toMatchObject({ code: 'UNKNOWN_ERROR', status: 502 });
  });

  it('un succès JSON renvoie data', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: { ok: 1 }, error: null }));
    await expect(apiClient.get('/x')).resolves.toEqual({ ok: 1 });
  });
});

describe('apiClient — envoi de fichiers', () => {
  it('postForm envoie le FormData sans imposer de Content-Type', async () => {
    fetchMock.mockResolvedValueOnce(json(201, { data: [{ id: 'd1' }], error: null }));
    const form = new FormData();
    form.append('files', new Blob(['%PDF-1.7']), 'a.pdf');
    await expect(apiClient.postForm('/onboarding/projects/p/documents', form)).resolves.toEqual([{ id: 'd1' }]);
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.body).toBe(form);
    expect((init?.headers as Record<string, string>)['Content-Type']).toBeUndefined();
  });

  it('les requêtes JSON gardent leur Content-Type', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: {}, error: null }));
    await apiClient.post('/x', { a: 1 });
    const [, init] = fetchMock.mock.calls[0];
    expect((init?.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });
});

describe('apiClient — contenu binaire', () => {
  it('getBlob renvoie le corps tel quel', async () => {
    fetchMock.mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'Content-Type': 'image/png' } }));
    const blob = await apiClient.getBlob('/img');
    expect(blob.type).toBe('image/png');
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('getBlob en erreur : ApiError avec le code du back', async () => {
    fetchMock.mockResolvedValueOnce(json(404, { data: null, error: { code: 'NOT_FOUND', message: 'Image introuvable.' } }));
    const err = await apiClient.getBlob('/img').catch(e => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });

  it('getBlob après un 401 : rafraîchit la session puis relit le binaire', async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { data: null, error: { code: 'TOKEN_EXPIRED', message: 'expiré' } }))
      .mockResolvedValueOnce(json(200, { data: null, error: null }))
      .mockResolvedValueOnce(new Response(new Uint8Array([9]), { status: 200 }));
    const blob = await apiClient.getBlob('/img');
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(new Uint8Array([9]));
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1][0])).toContain('/auth/refresh');
  });
});

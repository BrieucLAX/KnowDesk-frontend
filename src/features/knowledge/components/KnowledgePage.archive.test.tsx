import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../../shared/lib/apiClient', () => ({
  ApiError: class ApiError extends Error {
    constructor(public readonly code: string, message: string, public readonly status: number) { super(message); }
  },
  apiClient: { get: vi.fn(), getWithMeta: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { apiClient, ApiError } from '../../../shared/lib/apiClient';
import { respond } from '../../../shared/lib/fixtures/lot0Responses';
import { useAuthStore } from '../../../store/authStore';
import type { AuthSession } from '../../auth/types';
import { KnowledgePage } from './KnowledgePage';
// Réponses réelles du back (main 8bd868d, base locale) : une petite organisation de 3 articles
// (publié, brouillon, archivé), puis ses PUT …/archive et …/unarchive ; et le 403 de la limite,
// rendu par la grande organisation de lot0Responses (205 articles, au-delà de 50).
import LIST from './fixtures/archives-list.response.json';
import ARCHIVE from './fixtures/archives-archive.response.json';
import UNARCHIVE from './fixtures/archives-unarchive.response.json';
import UNARCHIVE_403 from './fixtures/archives-unarchive-403.response.json';

const session: AuthSession = {
  user:         { id: 'u1', email: 'archives@fixtures.local', role: 'admin', onboardingDone: true, emailVerified: true },
  organization: { id: 'o1', name: 'Alviva (archives)', slug: 'alviva-archives', plan: 'free', enabledModules: ['knowledge'] },
};

const tabCount = (name: string) =>
  within(screen.getByRole('tab', { name: new RegExp(`^${name}`) })).getByText(/^\d+$/).textContent;

/** Ouvre le menu d'actions de la ligne qui porte ce titre, puis clique sur l'action. */
function rowAction(title: string, action: string) {
  const row = screen.getByText(title).closest('tr, li, [role="row"], .entity-row') as HTMLElement;
  fireEvent.click(within(row).getByRole('button', { name: 'Actions' }));
  fireEvent.click(screen.getByRole('menuitem', { name: action }));
}

const toasts: string[] = [];
window.__toastBus!.subscribe(ts => ts.forEach(t => { if (!toasts.includes(t.message)) toasts.push(t.message); }));

type Body = { data: unknown; error?: { code: string; message: string } | null };
/** Le PUT simulé rend la réponse enregistrée : `data` en cas de succès, une ApiError sinon. */
const replay = (body: Body, status: number) => async () => {
  if (body.error) throw new ApiError(body.error.code, body.error.message, status);
  return body.data as never;
};

describe('KnowledgePage : Archiver, onglet Archivés, Désarchiver (plan-articles-v1, lot 0)', () => {
  beforeEach(() => {
    toasts.length = 0;
    useAuthStore.setState({ session, isLoaded: true, onboardingDone: true, sessionEndedReason: null, impersonating: null });
    vi.mocked(apiClient.get).mockImplementation(async (path: string) => respond(path).data as never);
    vi.mocked(apiClient.getWithMeta).mockImplementation(async () => LIST as never);
    vi.mocked(apiClient.put).mockReset();
  });

  const renderPage = async () => {
    render(<MemoryRouter><KnowledgePage onOpenArticle={() => {}} /></MemoryRouter>);
    await waitFor(() => expect(tabCount('Tous')).toBe('2'));
  };

  it('« Tous » ne compte pas l\'archivé ; l\'onglet Archivés le montre seul', async () => {
    await renderPage();
    expect(tabCount('Archivés')).toBe('1');
    expect(screen.queryByText('Grille tarifaire 2024')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: /^Archivés/ }));
    expect(screen.getByText('Grille tarifaire 2024')).toBeTruthy();
    expect(screen.queryByText('Résiliation infra-annuelle')).toBeNull();
  });

  it('Archiver demande confirmation, appelle le back, et l\'article passe dans les archivés', async () => {
    vi.mocked(apiClient.put).mockImplementation(replay(ARCHIVE, 200));
    await renderPage();

    rowAction('Résiliation infra-annuelle', 'Archiver');
    expect(apiClient.put).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Archiver' }));

    await waitFor(() => expect(tabCount('Archivés')).toBe('2'));
    expect(apiClient.put).toHaveBeenCalledWith(`/articles/${(ARCHIVE.data as { id: string }).id}/archive`);
    expect(tabCount('Tous')).toBe('1');
    expect(toasts).toContain('Article archivé.');
  });

  it('Désarchiver depuis l\'onglet Archivés remet l\'article en brouillon', async () => {
    vi.mocked(apiClient.put).mockImplementation(replay(UNARCHIVE, 200));
    await renderPage();
    fireEvent.click(screen.getByRole('tab', { name: /^Archivés/ }));

    rowAction('Grille tarifaire 2024', 'Désarchiver');

    await waitFor(() => expect(tabCount('Archivés')).toBe('0'));
    expect(apiClient.put).toHaveBeenCalledWith(`/articles/${(UNARCHIVE.data as { id: string }).id}/unarchive`);
    expect(tabCount('Brouillons')).toBe('2');
    expect(toasts).toContain('Article désarchivé : il est de nouveau en brouillon.');
  });

  it('limite atteinte : le message du back s\'affiche et l\'article reste archivé', async () => {
    vi.mocked(apiClient.getWithMeta).mockImplementation(async (path: string) => respond(path) as never);
    vi.mocked(apiClient.put).mockImplementation(replay(UNARCHIVE_403, 403));
    render(<MemoryRouter><KnowledgePage onOpenArticle={() => {}} /></MemoryRouter>);
    await waitFor(() => expect(tabCount('Archivés')).toBe('2'));
    fireEvent.click(screen.getByRole('tab', { name: /^Archivés/ }));

    const archived = (respond('/articles?page=2').data as Array<{ title: string; status: string }>).filter(a => a.status === 'archived');
    rowAction(archived[0].title, 'Désarchiver');

    await waitFor(() => expect(toasts).toContain('Limite de 50 articles atteinte. Passez au plan Pro.'));
    expect(tabCount('Archivés')).toBe('2');
  });

  it('un conseiller ne voit ni Archiver ni Désarchiver', async () => {
    useAuthStore.setState({ session: { ...session, user: { ...session.user, role: 'advisor' } } });
    await renderPage();
    const row = screen.getByText('Résiliation infra-annuelle').closest('tr, li, [role="row"], .entity-row') as HTMLElement;
    const trigger = within(row).queryByRole('button', { name: 'Actions' });
    if (trigger) fireEvent.click(trigger);
    expect(screen.queryByRole('menuitem', { name: 'Archiver' })).toBeNull();
  });
});

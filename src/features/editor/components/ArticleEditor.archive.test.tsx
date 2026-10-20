import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';

vi.mock('../../../shared/lib/apiClient', () => ({
  ApiError: class ApiError extends Error {
    constructor(public readonly code: string, message: string, public readonly status: number) { super(message); }
  },
  apiClient: { get: vi.fn(), getWithMeta: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { apiClient } from '../../../shared/lib/apiClient';
import { useAuthStore } from '../../../store/authStore';
import type { AuthSession } from '../../auth/types';
import { ArticleEditor } from './ArticleEditor';
// Réponses réelles du back (main 8bd868d, base locale, organisation « archives ») : un brouillon et un
// archivé tels que GET /articles/:id les rend, avec ce que l'éditeur charge autour, puis leurs PUT.
import CATEGORIES from '../../knowledge/components/fixtures/editor-categories.response.json';
import DRAFT from '../../knowledge/components/fixtures/editor-draft.response.json';
import DRAFT_VERSIONS from '../../knowledge/components/fixtures/editor-draft-versions.response.json';
import DRAFT_QUALITY from '../../knowledge/components/fixtures/editor-draft-quality.response.json';
import ARCHIVED from '../../knowledge/components/fixtures/editor-archived.response.json';
import ARCHIVED_VERSIONS from '../../knowledge/components/fixtures/editor-archived-versions.response.json';
import ARCHIVED_QUALITY from '../../knowledge/components/fixtures/editor-archived-quality.response.json';
import ARCHIVE from '../../knowledge/components/fixtures/editor-archive.response.json';
import UNARCHIVE from '../../knowledge/components/fixtures/editor-unarchive.response.json';

const draftId    = DRAFT.data.id;
const archivedId = ARCHIVED.data.id;

const GET: Record<string, unknown> = {
  '/categories':                        CATEGORIES.data,
  '/tags':                              [],
  [`/articles/${draftId}`]:             DRAFT.data,
  [`/articles/${draftId}/versions`]:    DRAFT_VERSIONS.data,
  [`/article-quality/${draftId}`]:      DRAFT_QUALITY.data,
  [`/articles/${archivedId}`]:          ARCHIVED.data,
  [`/articles/${archivedId}/versions`]: ARCHIVED_VERSIONS.data,
  [`/article-quality/${archivedId}`]:   ARCHIVED_QUALITY.data,
};

const session = (role: 'admin' | 'advisor'): AuthSession => ({
  user:         { id: 'u1', email: 'archives@fixtures.local', role, onboardingDone: true, emailVerified: true },
  organization: { id: 'o1', name: 'Alviva (archives)', slug: 'alviva-archives', plan: 'free', enabledModules: ['knowledge'] },
});

const toasts: string[] = [];
window.__toastBus!.subscribe(ts => ts.forEach(t => { if (!toasts.includes(t.message)) toasts.push(t.message); }));

describe('ArticleEditor : Archiver et Désarchiver (plan-articles-v1, lot 0)', () => {
  beforeEach(() => {
    toasts.length = 0;
    useAuthStore.setState({ session: session('admin'), isLoaded: true, onboardingDone: true, sessionEndedReason: null, impersonating: null });
    vi.mocked(apiClient.get).mockImplementation(async (path: string) => {
      if (!(path in GET)) throw new Error(`appel inattendu : ${path}`);
      return GET[path] as never;
    });
    vi.mocked(apiClient.put).mockReset();
  });

  it('un brouillon : Archiver, confirmation, appel au back, puis le bouton devient Désarchiver', async () => {
    vi.mocked(apiClient.put).mockResolvedValue(ARCHIVE.data as never);
    render(<ArticleEditor articleId={draftId} onSaved={() => {}} onCancel={() => {}} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Archiver' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Archiver' }));

    expect(await screen.findByRole('button', { name: 'Désarchiver' })).toBeTruthy();
    expect(apiClient.put).toHaveBeenCalledWith(`/articles/${draftId}/archive`);
    expect(toasts).toContain('Article archivé.');
  });

  it('un archivé : Désarchiver le remet en brouillon', async () => {
    vi.mocked(apiClient.put).mockResolvedValue(UNARCHIVE.data as never);
    render(<ArticleEditor articleId={archivedId} onSaved={() => {}} onCancel={() => {}} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Désarchiver' }));

    expect(await screen.findByRole('button', { name: 'Archiver' })).toBeTruthy();
    expect(apiClient.put).toHaveBeenCalledWith(`/articles/${archivedId}/unarchive`);
    expect(UNARCHIVE.data.status).toBe('draft');
    expect(toasts).toContain('Article désarchivé : il est de nouveau en brouillon.');
  });

  it('un nouvel article n\'a pas de bouton Archiver', async () => {
    render(<ArticleEditor onSaved={() => {}} onCancel={() => {}} />);
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/categories'));
    expect(screen.queryByRole('button', { name: 'Archiver' })).toBeNull();
  });

  it('un conseiller ne voit pas Archiver', async () => {
    useAuthStore.setState({ session: session('advisor') });
    render(<ArticleEditor articleId={draftId} onSaved={() => {}} onCancel={() => {}} />);
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith(`/articles/${draftId}`));
    expect(screen.queryByRole('button', { name: 'Archiver' })).toBeNull();
  });
});

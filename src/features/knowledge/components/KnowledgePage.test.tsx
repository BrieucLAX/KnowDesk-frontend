import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../../shared/lib/apiClient', () => ({
  ApiError: class extends Error {},
  apiClient: { get: vi.fn(), getWithMeta: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { apiClient } from '../../../shared/lib/apiClient';
import { respond } from '../../../shared/lib/fixtures/lot0Responses';
import { useAuthStore } from '../../../store/authStore';
import type { AuthSession } from '../../auth/types';
import { KnowledgePage } from './KnowledgePage';

const session: AuthSession = {
  user:         { id: 'u1', email: 'admin@fixtures.local', role: 'admin', onboardingDone: true, emailVerified: true },
  organization: { id: 'o1', name: 'Alviva (fixtures)', slug: 'alviva-fixtures', plan: 'free', enabledModules: ['knowledge'] },
};

/** Le compteur d'un onglet de statut. */
const tabCount = (name: string) =>
  within(screen.getByRole('tab', { name: new RegExp(`^${name}`) })).getByText(/^\d+$/).textContent;

describe('KnowledgePage : tous les articles, au-delà de 200 (réponses réelles du back, plan-articles-v1, lot 0)', () => {
  beforeEach(() => {
    useAuthStore.setState({ session, isLoaded: true, onboardingDone: true, sessionEndedReason: null, impersonating: null });
    vi.mocked(apiClient.get).mockImplementation(async (path: string) => respond(path).data as never);
    vi.mocked(apiClient.getWithMeta).mockClear();
    vi.mocked(apiClient.getWithMeta).mockImplementation(async (path: string) => respond(path) as never);
  });

  it('charge les deux pages et compte les 205 articles, sans bannière de limite', async () => {
    render(<MemoryRouter><KnowledgePage onOpenArticle={() => {}} /></MemoryRouter>);

    // « Tous » ne compte pas les 2 archivés, qui ont leur onglet.
    await waitFor(() => expect(tabCount('Tous')).toBe('203'));
    expect(tabCount('Publiés')).toBe('201');
    expect(tabCount('Brouillons')).toBe('2');
    expect(tabCount('Archivés')).toBe('2');
    expect(screen.queryByText(/Affichage des 200 articles/)).toBeNull();

    const pages = vi.mocked(apiClient.getWithMeta).mock.calls.map(c => new URLSearchParams(c[0].split('?')[1]).get('page'));
    expect(pages).toEqual(['1', '2']);
  });

  it('les articles de la deuxième page sont dans la liste', async () => {
    render(<MemoryRouter><KnowledgePage onOpenArticle={() => {}} /></MemoryRouter>);
    // Les 5 plus anciens, rendus seulement par la page 2 du back : les archivés sous leur onglet.
    const page2 = respond('/articles?page=2').data as Array<{ title: string; status: string }>;
    for (const a of page2.filter(a => a.status !== 'archived')) expect(await screen.findByText(a.title)).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: /^Archivés/ }));
    for (const a of page2.filter(a => a.status === 'archived')) expect(await screen.findByText(a.title)).toBeTruthy();
  });
});

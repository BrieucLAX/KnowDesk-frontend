import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../../shared/lib/apiClient', () => ({
  ApiError: class extends Error {},
  apiClient: { get: vi.fn(), getWithMeta: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { apiClient } from '../../../shared/lib/apiClient';
import { respond } from '../../../shared/lib/fixtures/lot0Responses';
import { useAuthStore } from '../../../store/authStore';
import type { AuthSession } from '../../auth/types';
import { FaqsPage } from './FaqsPage';

const session: AuthSession = {
  user:         { id: 'u1', email: 'admin@fixtures.local', role: 'admin', onboardingDone: true, emailVerified: true },
  organization: { id: 'o1', name: 'Alviva (fixtures)', slug: 'alviva-fixtures', plan: 'free', enabledModules: ['knowledge'] },
};

const tabCount = (name: string) =>
  within(screen.getByRole('tab', { name: new RegExp(`^${name}`) })).getByText(/^\d+$/).textContent;

describe('FaqsPage : toutes les FAQ, au-delà de 100 (réponses réelles du back, plan-articles-v1, lot 0)', () => {
  beforeEach(() => {
    useAuthStore.setState({ session, isLoaded: true, onboardingDone: true, sessionEndedReason: null, impersonating: null });
    vi.mocked(apiClient.get).mockImplementation(async (path: string) => respond(path).data as never);
    vi.mocked(apiClient.getWithMeta).mockClear();
    vi.mocked(apiClient.getWithMeta).mockImplementation(async (path: string) => respond(path) as never);
  });

  it('charge les deux pages de 100 et compte les 105 FAQ, sans bannière de limite', async () => {
    render(<MemoryRouter><FaqsPage onNewFaq={() => {}} onEditFaq={() => {}} /></MemoryRouter>);

    await waitFor(() => expect(tabCount('Toutes')).toBe('105'));
    expect(screen.queryByText(/Affichage des 200 FAQs/)).toBeNull();
    const calls = vi.mocked(apiClient.getWithMeta).mock.calls.map(c => new URLSearchParams(c[0].split('?')[1]));
    expect(calls.map(p => [p.get('perPage'), p.get('page')])).toEqual([['100', '1'], ['100', '2']]);
  });

  it('les FAQ de la deuxième page sont dans la liste', async () => {
    render(<MemoryRouter><FaqsPage onNewFaq={() => {}} onEditFaq={() => {}} /></MemoryRouter>);
    const page2 = (respond('/faqs?page=2').data as Array<{ question: string }>).map(f => f.question);
    for (const question of page2) expect(await screen.findByText(question)).toBeTruthy();
  });
});

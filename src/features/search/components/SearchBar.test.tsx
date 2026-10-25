import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

vi.mock('../../../shared/lib/apiClient', () => ({
  ApiError: class extends Error {},
  apiClient: { get: vi.fn(async () => []), getWithMeta: vi.fn(), post: vi.fn(async () => undefined), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { useAuthStore } from '../../../store/authStore';
import type { AuthSession } from '../../auth/types';
import type { ModuleName } from '../../../shared/lib/modules';
import { SearchBar } from './SearchBar';

const sessionWith = (enabledModules: ModuleName[]): AuthSession => ({
  user:         { id: 'u1', email: 'admin@fixtures.local', role: 'admin', onboardingDone: true, emailVerified: true },
  organization: { id: 'o1', name: 'Alviva (fixtures)', slug: 'alviva-fixtures', plan: 'free', enabledModules },
});

/** Tape une question qui déclenche la réponse IA, puis dépasse son délai de 1200 ms. */
async function askQuestion() {
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'comment résilier mon contrat ?' } });
  await act(async () => { vi.advanceTimersByTime(2000); });
}

describe('SearchBar : réponse IA gardée par le module ai_answer', () => {
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response('', { status: 404 }));

  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock.mockClear();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("sans le module : aucun appel à /ai-answer, ni sparkle, ni encadré (le back répondrait 404)", async () => {
    useAuthStore.setState({ session: sessionWith(['onboarding', 'knowledge', 'faqs']), isLoaded: true });
    render(<SearchBar onSelect={() => {}} />);
    await askQuestion();

    expect(fetchMock.mock.calls.filter(c => String(c[0]).includes('/ai-answer'))).toHaveLength(0);
    expect(screen.queryByTitle('Réponse IA disponible')).toBeNull();
    expect(screen.queryByText(/AI HTTP/)).toBeNull();
  });

  it('avec le module : la question part vers /ai-answer', async () => {
    useAuthStore.setState({ session: sessionWith(['knowledge', 'ai_answer']), isLoaded: true });
    render(<SearchBar onSelect={() => {}} />);
    await askQuestion();

    expect(screen.getByTitle('Réponse IA disponible')).toBeTruthy();
    expect(fetchMock.mock.calls.filter(c => String(c[0]).includes('/ai-answer'))).toHaveLength(1);
  });
});

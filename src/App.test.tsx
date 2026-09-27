import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { AuthSession } from './features/auth/types';

const MB = 1024 * 1024;
const project = {
  id: 'p1', name: 'Base SAV', createdAt: '', updatedAt: '', documentsCount: 0, totalBytes: 0, cadrageVersion: null,
  limits: { maxFileBytes: 50 * MB, maxDocumentsPerProject: 50, maxProjectBytes: 300 * MB, maxFilesPerUpload: 10 },
};
const session: AuthSession = {
  user:         { id: 'u1', email: 'admin@test.fr', role: 'admin', onboardingDone: true, emailVerified: true },
  organization: { id: 'o1', name: 'Test', slug: 'test', plan: 'free', enabledModules: ['onboarding'] },
};

vi.mock('./shared/lib/apiClient', () => ({
  ApiError: class extends Error {},
  apiClient: {
    get: vi.fn((path: string) => {
      if (path === '/auth/me') return Promise.resolve({ user: session.user, organization: session.organization });
      if (path === '/onboarding/projects/p1') return Promise.resolve(project);
      if (path === '/onboarding/notice') return Promise.resolve({ version: 'v', text: 'Texte', sha256: 'h', acceptedAt: null });
      if (path.endsWith('/documents')) return Promise.resolve([]);
      return Promise.reject(new Error(`appel inattendu : ${path}`));
    }),
    post: vi.fn(() => Promise.resolve({})),
    patch: vi.fn(() => Promise.resolve({})),
  },
}));

import { useAuthStore } from './store/authStore';
import { App } from './App';

describe('App — aiguillage', () => {
  beforeEach(() => {
    useAuthStore.setState({ session, isLoaded: true, onboardingDone: true, sessionEndedReason: null, impersonating: null });
  });

  it('la page d\'un projet d\'onboarding s\'affiche seule, sans page 404 en dessous', async () => {
    render(<MemoryRouter initialEntries={['/onboarding/projects/p1']}><App /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Base SAV' })).toBeInTheDocument();
    expect(screen.queryByText(/introuvable/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /tableau de bord/i })).not.toBeInTheDocument();
  });
});

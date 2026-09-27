import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { AuthSession } from '../../../features/auth/types';

vi.mock('../../lib/apiClient', () => ({
  apiClient: {
    get:  vi.fn(() => Promise.resolve({ data: [], meta: {} })),
    post: vi.fn(() => Promise.resolve({})),
    patch: vi.fn(() => Promise.resolve({})),
  },
  ApiError: class extends Error {},
}));

const useNotificationsSpy = vi.fn(() => ({
  notifications: [], unreadCount: 0, loading: false,
  markAsRead: vi.fn(), markAllAsRead: vi.fn(), refetch: vi.fn(),
}));
vi.mock('../../../features/notifications/hooks/useNotifications', () => ({
  useNotifications: () => useNotificationsSpy(),
}));

import { apiClient } from '../../lib/apiClient';
import { useAuthStore } from '../../../store/authStore';
import { LEGACY_MODULES } from '../../lib/modules';
import { SideNav } from './SideNav';

function sessionWith(enabledModules: string[] | undefined): AuthSession {
  return {
    user:         { id: 'usr_1', email: 'admin@acme.fr', role: 'admin', onboardingDone: true },
    organization: { id: 'org_1', name: 'Acme', slug: 'acme', plan: 'pro', enabledModules },
  };
}

function renderNav() {
  return render(<SideNav active="dashboard" onNavigate={() => {}} onHelp={() => {}} />);
}

describe('SideNav — filtrage par modules', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockClear();
    useNotificationsSpy.mockClear();
  });

  it('organisation historique : toutes les entrées', () => {
    useAuthStore.setState({ session: sessionWith([...LEGACY_MODULES]), isLoaded: true });
    renderNav();
    for (const label of ['Accueil', 'Articles', 'FAQs', 'Processus', 'Formations', 'Analyse',
      'Conversations', 'Brand monitoring', 'Équipe', 'Paramètres', 'Notifications', 'Aide', 'Mon compte']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${label}`) })).toBeInTheDocument();
    }
  });

  it('session sans enabledModules : comportement inchangé', () => {
    useAuthStore.setState({ session: sessionWith(undefined), isLoaded: true });
    renderNav();
    expect(screen.getByRole('button', { name: 'Articles' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Notifications/ })).toBeInTheDocument();
  });

  it('organisation de test : Onboarding et Mon compte, et les notifications ne sont pas montées', () => {
    useAuthStore.setState({ session: sessionWith(['onboarding']), isLoaded: true });
    render(<SideNav active="dashboard" onNavigate={() => {}} />);
    const labels = screen.getAllByRole('button').map(b => b.getAttribute('aria-label'));
    expect(labels).toEqual(['Onboarding', 'Mon compte']);
    expect(useNotificationsSpy).not.toHaveBeenCalled();
    expect(apiClient.get).not.toHaveBeenCalled();
  });
});

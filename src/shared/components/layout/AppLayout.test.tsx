import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { AuthSession } from '../../../features/auth/types';

vi.mock('../../lib/apiClient', () => ({
  apiClient: { get: vi.fn(() => Promise.resolve([])), post: vi.fn(), patch: vi.fn() },
  ApiError: class extends Error {},
}));
vi.mock('../../../features/notifications/hooks/useNotifications', () => ({
  useNotifications: () => ({
    notifications: [], unreadCount: 0, loading: false,
    markAsRead: vi.fn(), markAllAsRead: vi.fn(), refetch: vi.fn(),
  }),
}));

import { useAuthStore } from '../../../store/authStore';
import { AppLayout } from './AppLayout';

function sessionWith(enabledModules?: string[]): AuthSession {
  return {
    user:         { id: 'usr_1', email: 'admin@acme.fr', role: 'admin', onboardingDone: true },
    organization: { id: 'org_1', name: 'Acme', slug: 'acme', plan: 'pro', enabledModules },
  };
}

describe('AppLayout — bandeau « Version de test »', () => {
  it('affiché pour une organisation qui a le module onboarding', () => {
    useAuthStore.setState({ session: sessionWith(['onboarding']), isLoaded: true });
    render(<AppLayout>contenu</AppLayout>);
    expect(screen.getByRole('status')).toHaveTextContent('Version de test');
  });

  it('absent pour une organisation historique', () => {
    useAuthStore.setState({ session: sessionWith(undefined), isLoaded: true });
    render(<AppLayout>contenu</AppLayout>);
    expect(screen.queryByText('Version de test')).not.toBeInTheDocument();
  });
});

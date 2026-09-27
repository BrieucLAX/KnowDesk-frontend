import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../../shared/lib/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
  ApiError: class extends Error {},
}));

import { useAuthStore } from '../../../store/authStore';
import { LoginPage } from './LoginPage';

describe('LoginPage', () => {
  it('ne propose pas de créer un compte', () => {
    render(<LoginPage onLoginSuccess={() => {}} />);
    expect(screen.queryByText(/Créer un espace/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Pas encore de compte/)).not.toBeInTheDocument();
  });

  it('n\'a plus de lien vers /terms ni /cgu', () => {
    const { container } = render(<LoginPage onLoginSuccess={() => {}} />);
    const hrefs = [...container.querySelectorAll('a')].map(a => a.getAttribute('href'));
    expect(hrefs).not.toContain('/terms');
    expect(hrefs).not.toContain('/cgu');
    expect(hrefs).toContain('/privacy');
  });

  it('affiche la raison d\'une session coupée par le serveur', () => {
    useAuthStore.setState({ session: null, sessionEndedReason: 'Cet espace est désactivé.' });
    render(<LoginPage onLoginSuccess={() => {}} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Cet espace est désactivé.');
  });
});

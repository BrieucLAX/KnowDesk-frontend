import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../../../shared/lib/apiClient', () => ({
  ApiError: class extends Error {},
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

import { apiClient } from '../../../shared/lib/apiClient';
import { AcceptInvitationPage } from './AcceptInvitationPage';

const info = (accountExists: boolean) => ({
  email: 'admin@prospect.fr', role: 'admin', orgName: 'Prospect SA', expiresAt: '2026-10-04T10:00:00Z', accountExists,
});

describe('AcceptInvitationPage', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(apiClient.post).mockReset();
  });

  it('nouveau compte : choisir et confirmer un mot de passe', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(info(false));
    vi.mocked(apiClient.post).mockResolvedValue({ accountExisted: false });
    render(<AcceptInvitationPage token="t1" onSuccess={() => {}} />);
    expect(await screen.findByRole('heading', { name: 'Créer votre mot de passe' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^Mot de passe/), { target: { value: 'NouveauMdp123' } });
    fireEvent.change(screen.getByLabelText(/Confirmer le mot de passe/), { target: { value: 'NouveauMdp123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }));
    expect(await screen.findByRole('heading', { name: 'Compte créé !' })).toBeInTheDocument();
    expect(apiClient.post).toHaveBeenCalledWith('/members/invitations/t1/accept', { password: 'NouveauMdp123' });
  });

  it('compte existant : son mot de passe actuel, sans confirmation', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(info(true));
    vi.mocked(apiClient.post).mockResolvedValue({ accountExisted: true });
    render(<AcceptInvitationPage token="t2" onSuccess={() => {}} />);
    expect(await screen.findByRole('heading', { name: 'Rejoindre Prospect SA' })).toBeInTheDocument();
    expect(screen.getByText(/il ne sera pas modifié/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Confirmer le mot de passe/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Mot de passe actuel/), { target: { value: 'MonMdpActuel1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rejoindre l\'espace' }));
    expect(await screen.findByRole('heading', { name: 'Vous avez rejoint Prospect SA' })).toBeInTheDocument();
  });

  it('compte existant, mauvais mot de passe : le message du back s\'affiche', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(info(true));
    vi.mocked(apiClient.post).mockRejectedValue(new Error('Un compte existe déjà pour cette adresse : saisissez son mot de passe actuel pour rejoindre l\'espace.'));
    render(<AcceptInvitationPage token="t3" onSuccess={() => {}} />);
    fireEvent.change(await screen.findByLabelText(/Mot de passe actuel/), { target: { value: 'Mauvais123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rejoindre l\'espace' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('mot de passe actuel'));
  });

  it('lien invalide ou expiré', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('Invitation invalide ou expirée.'));
    render(<AcceptInvitationPage token="x" onSuccess={() => {}} />);
    expect(await screen.findByRole('heading', { name: 'Invitation invalide' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Invitation invalide ou expirée.');
  });
});

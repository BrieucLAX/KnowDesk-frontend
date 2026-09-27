import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateTestOrgModal } from './CreateTestOrgModal';
import type { TestOrgCreated } from '../types';

function created(email: TestOrgCreated['email']): TestOrgCreated {
  return {
    organization: { id: 'org_t', name: 'Prospect SA', slug: 'prospect-sa', enabledModules: ['onboarding'], createdAt: '2026-09-27T10:00:00Z' },
    invitation:   { email: 'admin@prospect.fr', role: 'admin', expiresAt: '2026-10-04T10:00:00Z', acceptUrl: 'https://app.knowdesk.fr/accept-invitation?token=abc' },
    email,
  };
}

function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText("Nom de l'organisation"), { target: { value: ' Prospect SA ' } });
  fireEvent.change(screen.getByLabelText("Email de l'admin"), { target: { value: 'admin@prospect.fr' } });
  fireEvent.click(screen.getByRole('button', { name: 'Créer et inviter' }));
}

describe('CreateTestOrgModal', () => {
  it('crée l\'organisation puis affiche le lien d\'invitation', async () => {
    const onCreate = vi.fn(() => Promise.resolve(created('sent')));
    render(<CreateTestOrgModal onCreate={onCreate} onClose={() => {}} />);
    fillAndSubmit();
    expect(onCreate).toHaveBeenCalledWith('Prospect SA', 'admin@prospect.fr');
    expect(await screen.findByLabelText("Lien d'invitation")).toHaveValue('https://app.knowdesk.fr/accept-invitation?token=abc');
    expect(screen.getByRole('status')).toHaveTextContent('envoyée par email');
  });

  it('dit de transmettre le lien si l\'email n\'est pas parti', async () => {
    render(<CreateTestOrgModal onCreate={() => Promise.resolve(created('failed'))} onClose={() => {}} />);
    fillAndSubmit();
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Transmettez le lien vous-même'));
  });

  it('affiche l\'erreur du back', async () => {
    render(<CreateTestOrgModal onCreate={() => Promise.reject(new Error('Email invalide.'))} onClose={() => {}} />);
    fillAndSubmit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Email invalide.');
  });

  it('refuse un formulaire incomplet sans appeler le back', () => {
    const onCreate = vi.fn();
    render(<CreateTestOrgModal onCreate={onCreate} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Créer et inviter' }));
    expect(onCreate).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

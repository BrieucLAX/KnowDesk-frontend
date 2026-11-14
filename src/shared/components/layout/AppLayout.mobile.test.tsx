import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import type { AuthSession } from '../../../features/auth/types';
import { mockViewportWidth } from '../../../test/matchMedia';

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

function session(enabledModules?: string[]): AuthSession {
  return {
    user:         { id: 'usr_1', email: 'admin@acme.fr', role: 'admin', onboardingDone: true },
    organization: { id: 'org_1', name: 'Acme', slug: 'acme', plan: 'pro', enabledModules },
  };
}

let restore: () => void = () => {};
afterEach(() => { restore(); document.body.style.overflow = ''; });

describe('AppLayout — 768 px et au-dessus', () => {
  beforeEach(() => { restore = mockViewportWidth(1024); });

  it('garde la barre latérale et la barre de recherche, sans bouton « Menu »', () => {
    useAuthStore.setState({ session: session(['dashboard', 'knowledge']), isLoaded: true });
    render(<AppLayout searchSlot={<input aria-label="Recherche globale" />}>contenu</AppLayout>);
    expect(screen.getByRole('navigation', { name: 'Navigation principale' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Recherche globale' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ouvrir le menu' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Se déconnecter' })).toBeInTheDocument();
  });
});

describe('AppLayout — sous 768 px : volet de menu', () => {
  beforeEach(() => {
    restore = mockViewportWidth(390);
    useAuthStore.setState({ session: session(['dashboard', 'knowledge', 'settings']), isLoaded: true });
  });

  const openMenu = () => {
    const button = screen.getByRole('button', { name: 'Ouvrir le menu' });
    button.focus();
    fireEvent.click(button);
    return button;
  };

  it('barre du haut : bouton « Menu », nom KnowDesk, bouton de recherche ; pas de barre latérale', () => {
    render(<AppLayout searchSlot={<input aria-label="Recherche globale" />}>contenu</AppLayout>);
    const button = screen.getByRole('button', { name: 'Ouvrir le menu' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('KnowDesk')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rechercher' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Navigation principale' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Recherche globale' })).not.toBeInTheDocument();
  });

  it('ouvre le volet : dialogue modal « Menu », même navigation (modules) et même entrée active', () => {
    render(<AppLayout activeRoute="knowledge">contenu</AppLayout>);
    const button = openMenu();
    expect(button).toHaveAttribute('aria-expanded', 'true');

    const dialog = screen.getByRole('dialog', { name: 'Menu' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(button).toHaveAttribute('aria-controls', dialog.id);
    const nav = within(dialog).getByRole('navigation', { name: 'Navigation principale' });
    expect(within(nav).getByRole('button', { name: 'Articles' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('button', { name: 'Accueil' })).not.toHaveAttribute('aria-current');
    // Module absent de l'organisation : pas d'entrée, comme dans la barre latérale.
    expect(within(nav).queryByRole('button', { name: 'FAQ' })).not.toBeInTheDocument();
    // Le focus entre dans le volet, sur l'entrée active ; la page ne défile plus.
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    expect(document.activeElement).toHaveAccessibleName('Articles');
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('Échap ferme le volet et rend le focus au bouton « Menu »', () => {
    render(<AppLayout>contenu</AppLayout>);
    const button = openMenu();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(button);
    expect(document.body.style.overflow).toBe('');
  });

  it('un clic sur le voile ferme le volet et rend le focus', () => {
    render(<AppLayout>contenu</AppLayout>);
    const button = openMenu();
    fireEvent.click(screen.getByTestId('mobile-nav-overlay'));
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(button);
  });

  it('choisir une rubrique navigue, ferme le volet et rend le focus', () => {
    const onNavigate = vi.fn();
    render(<AppLayout onNavigate={onNavigate}>contenu</AppLayout>);
    const button = openMenu();
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Menu' })).getByRole('button', { name: 'Paramètres' }));
    expect(onNavigate).toHaveBeenCalledWith('settings');
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(button);
  });

  it('le focus reste piégé dans le volet', () => {
    render(<AppLayout>contenu</AppLayout>);
    openMenu();
    const dialog = screen.getByRole('dialog', { name: 'Menu' });
    const buttons = within(dialog).getAllByRole('button');
    const first = buttons[0];
    const last  = buttons[buttons.length - 1];
    expect(first).toHaveAccessibleName('Fermer le menu');
    expect(last).toHaveAccessibleName('Se déconnecter');

    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('le bouton « Fermer le menu » ferme aussi le volet', () => {
    render(<AppLayout>contenu</AppLayout>);
    const button = openMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Fermer le menu' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(button);
  });

  it('le bouton de recherche déplie la recherche sur toute la largeur, puis la referme', () => {
    render(<AppLayout searchSlot={<input aria-label="Recherche globale" />}>contenu</AppLayout>);
    fireEvent.click(screen.getByRole('button', { name: 'Rechercher' }));
    const input = screen.getByRole('textbox', { name: 'Recherche globale' });
    expect(document.activeElement).toBe(input);
    expect(screen.queryByRole('button', { name: 'Ouvrir le menu' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Fermer la recherche' }));
    expect(screen.queryByRole('textbox', { name: 'Recherche globale' })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Rechercher' }));
  });

  it('sans le module de recherche, pas de bouton « Rechercher »', () => {
    render(<AppLayout searchSlot={null}>contenu</AppLayout>);
    expect(screen.queryByRole('button', { name: 'Rechercher' })).not.toBeInTheDocument();
  });
});

import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { useAuthStore } from '../../../store/authStore';
import type { AuthSession } from '../../auth/types';
import { HelpPanel } from './HelpPanel';

const PRODUCTION = [
  'ai_answer', 'analytics_collect', 'article_quality', 'dashboard', 'faqs', 'help',
  'imports', 'knowledge', 'members', 'settings',
];

function login(enabledModules: string[] | undefined) {
  const session: AuthSession = {
    user:         { id: 'u1', email: 'a@test.fr', role: 'admin', onboardingDone: true, emailVerified: true, firstName: 'Alex' },
    organization: { id: 'o1', name: 'Test', slug: 'test', plan: 'free', enabledModules },
  };
  useAuthStore.setState({ session, isLoaded: true });
}

describe('Centre d\'aide filtré (séquence 2 du masquage)', () => {
  beforeEach(() => login(PRODUCTION));

  it('menu de l\'aide : ni Processus guidés, ni Analyse, ni Conversations', () => {
    render(<HelpPanel onClose={() => {}} />);
    const nav = screen.getByRole('navigation', { name: 'Sections d\'aide' });
    for (const s of ['Premiers pas', 'Articles', 'FAQ', 'Recherche', 'Équipe', 'Paramètres']) expect(within(nav).getByText(s)).toBeInTheDocument();
    for (const s of ['Processus guidés', 'Analyse', 'Conversations']) expect(within(nav).queryByText(s)).not.toBeInTheDocument();
  });

  it('écran masqué demandé (processus) : l\'aide s\'ouvre sur « Premiers pas »', () => {
    render(<HelpPanel onClose={() => {}} currentScreen="trees" />);
    expect(screen.getByRole('heading', { name: 'Premiers pas' })).toBeInTheDocument();
  });

  it('recherche « chatbot » : aucun résultat ; « synonymes » : l\'article gardé', () => {
    render(<HelpPanel onClose={() => {}} />);
    const input = screen.getByPlaceholderText('Rechercher dans l\'aide…');
    fireEvent.change(input, { target: { value: 'chatbot' } });
    expect(screen.getByText('Aucun résultat pour « chatbot »')).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'synonymes' } });
    expect(screen.getAllByText('Définir des synonymes (administrateurs)').length).toBeGreaterThan(0);
  });

  it('tous les modules : les rubriques masquées reviennent', () => {
    login(undefined);
    render(<HelpPanel onClose={() => {}} />);
    const nav = screen.getByRole('navigation', { name: 'Sections d\'aide' });
    for (const s of ['Processus guidés', 'Analyse', 'Conversations']) expect(within(nav).getByText(s)).toBeInTheDocument();
  });
});

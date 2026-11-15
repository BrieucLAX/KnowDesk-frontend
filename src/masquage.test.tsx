import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { AuthSession } from './features/auth/types';

/**
 * Séquence 1 du masquage (décisions du PO du 2026-11-15) : avec `DISABLED_MODULES` posé, le back
 * renvoie ces modules dans `/auth/me` ; le front n'affiche, n'ouvre et n'appelle rien d'autre.
 */
const KEPT = [
  'ai_answer', 'analytics_collect', 'article_quality', 'dashboard', 'faqs', 'help',
  'imports', 'knowledge', 'members', 'settings',
];

const session: AuthSession = {
  user:         { id: 'u1', email: 'admin@test.fr', role: 'admin', onboardingDone: true, emailVerified: true, firstName: 'Alex' },
  organization: { id: 'o1', name: 'Test', slug: 'test', plan: 'free', enabledModules: KEPT },
};

/** Préfixes des API des fonctions masquées : aucun appel ne doit y partir. */
const MASKED_API = [
  '/trees', '/learning', '/analytics', '/chats', '/brand-monitoring', '/api-keys',
  '/onboarding', '/notifications', '/kbscore', '/audit-logs', '/settings/org/chat',
];

const calls: string[] = [];
let meOrg: AuthSession['organization'] = session.organization;

vi.mock('./shared/lib/apiClient', () => ({
  ApiError: class extends Error {},
  apiClient: {
    get: vi.fn((path: string) => {
      calls.push(path);
      if (path === '/auth/me') return Promise.resolve({ user: session.user, organization: meOrg });
      if (path.startsWith('/dashboard')) return Promise.resolve({
        stats: { publishedArticles: 3, totalArticles: 4, totalFaqs: 2, teamMembers: 5 },
        recentItems: [], activity: [],
        checklist: [
          { id: 'c1', label: 'Publier votre premier article', completed: false, href: '/articles/new' },
          { id: 'c2', label: 'Créer un processus guidé',      completed: false, href: '/trees' },
          { id: 'c3', label: 'Voir l\'analyse',                completed: false, href: '/analytics' },
        ],
      });
      if (path === '/article-quality/stats') return Promise.resolve({ published: 3, scored: 0, perfect: 0, good: 0, toRework: 0 });
      if (path.startsWith('/article-quality')) return Promise.resolve({ items: [], total: 0, stats: null });
      if (path.startsWith('/settings/org')) return Promise.resolve({});
      return Promise.resolve([]);
    }),
    getWithMeta: vi.fn((path: string) => { calls.push(path); return Promise.resolve({ data: [], meta: {} }); }),
    post:   vi.fn((path: string) => { calls.push(path); return Promise.resolve({}); }),
    patch:  vi.fn(() => Promise.resolve({})),
    put:    vi.fn(() => Promise.resolve({})),
    delete: vi.fn(() => Promise.resolve({})),
  },
}));

import { useAuthStore } from './store/authStore';
import { App } from './App';

// jsdom n'a pas scrollIntoView (palette de commandes).
Element.prototype.scrollIntoView = vi.fn();

function renderAt(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
}

const maskedCalls = () => calls.filter(p => MASKED_API.some(m => p === m || p.startsWith(`${m}/`) || p.startsWith(`${m}?`)));

describe('Masquage global : le front suit les modules de /auth/me', () => {
  beforeEach(() => {
    calls.length = 0;
    meOrg = session.organization;
    useAuthStore.setState({ session, isLoaded: true, onboardingDone: true, sessionEndedReason: null, impersonating: null });
  });

  it.each([
    '/trees', '/trees/t1', '/trees/t1/edit', '/learning', '/learning/l1/edit', '/learning/play/m1',
    '/analytics', '/chats', '/brand-monitoring', '/onboarding', '/onboarding/projects/p1', '/audit',
  ])('lien direct vers un écran masqué (%s) : tableau de bord, sans erreur', async path => {
    renderAt(path);
    expect(await screen.findByRole('heading', { name: /^Bon.*Alex$/ })).toBeInTheDocument();
    expect(screen.queryByText(/introuvable|erreur|404/i)).not.toBeInTheDocument();
    expect(maskedCalls()).toEqual([]);
  });

  it('menu : seules les fonctions gardées ; ni processus, ni formations, ni notifications', async () => {
    renderAt('/');
    const nav = await screen.findByRole('navigation', { name: 'Navigation principale' });
    for (const label of ['Accueil', 'Articles', 'FAQ', 'Équipe', 'Paramètres']) {
      expect(within(nav).getByRole('button', { name: label })).toBeInTheDocument();
    }
    for (const label of ['Processus', 'Formations', 'Analyse', 'Conversations', 'Brand monitoring', 'Onboarding']) {
      expect(within(nav).queryByRole('button', { name: label })).not.toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: /^Notifications/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aide' })).toBeInTheDocument();
  });

  it('tableau de bord : ni score de la base ni lien vers une fonction masquée ; FAQ et membres restent', async () => {
    renderAt('/');
    expect(await screen.findByText('FAQ créées')).toBeInTheDocument();
    expect(screen.getByText('Membres actifs')).toBeInTheDocument();
    expect(await screen.findByText('Publier votre premier article')).toBeInTheDocument();
    expect(screen.queryByText('Créer un processus guidé')).not.toBeInTheDocument();
    expect(screen.queryByText('Voir l\'analyse')).not.toBeInTheDocument();
    expect(calls).not.toContain('/kbscore');
    expect(maskedCalls()).toEqual([]);
  });

  it('palette de commandes : aucune action vers une fonction masquée', async () => {
    renderAt('/');
    await screen.findByRole('navigation', { name: 'Navigation principale' });
    fireEvent.keyDown(window, { key: 'j', metaKey: true });
    const dialog = await screen.findByRole('dialog', { name: 'Palette de commandes' });
    for (const label of ['Aller aux articles', 'Aller aux FAQ', 'Aller à l\'équipe', 'Aller aux paramètres', 'Créer une nouvelle FAQ']) {
      expect(within(dialog).getByText(label)).toBeInTheDocument();
    }
    expect(within(dialog).queryByText('Aller aux processus')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('Aller à l\'analyse')).not.toBeInTheDocument();
  });

  it('Paramètres : un onglet par fonction ; Chatbot public, API, Notifications et Audit masqués', async () => {
    renderAt('/settings');
    expect(await screen.findByRole('heading', { name: 'Paramètres' })).toBeInTheDocument();
    const select = screen.getByRole('combobox', { name: 'Naviguer entre les sections' });
    const options = within(select).getAllByRole('option').map(o => o.textContent);
    expect(options).toEqual(expect.arrayContaining([
      'Général', 'Recherche interne', 'Auditeur qualité', 'Modèles et fournisseurs',
      'Synonymes', 'Tags', 'Imports', 'Facturation',
    ]));
    for (const hidden of ['Chatbot public', 'API', 'Notifications', 'Audit']) expect(options).not.toContain(hidden);
    expect(maskedCalls()).toEqual([]);
  });

  it('éditeur : sans chatbot, pas de choix « Interne / Public » ni de mention du chatbot', async () => {
    renderAt('/articles/new');
    await screen.findByRole('navigation', { name: 'Navigation principale' });
    expect(await screen.findByLabelText('Tags')).toBeInTheDocument();
    expect(screen.queryByLabelText('Visibilité')).not.toBeInTheDocument();
    expect(screen.queryByText(/chatbot/i)).not.toBeInTheDocument();
  });

  it('éditeur : avec le chatbot, le choix de visibilité reste', async () => {
    meOrg = { ...session.organization, enabledModules: [...KEPT, 'chatbot'] };
    useAuthStore.setState({ session: { ...session, organization: meOrg } });
    renderAt('/articles/new');
    expect(await screen.findByLabelText('Visibilité')).toBeInTheDocument();
  });

  it('tableau de bord : la carte de l\'auditeur s\'appelle « Qualité des articles »', async () => {
    renderAt('/');
    expect(await screen.findByRole('heading', { name: 'Qualité des articles' })).toBeInTheDocument();
    expect(screen.queryByText(/KB Health Score/)).not.toBeInTheDocument();
  });

  it('organisation sans le masquage : tout reste comme avant (processus, palette, Paramètres)', async () => {
    meOrg = { ...session.organization, enabledModules: undefined };
    useAuthStore.setState({ session: { ...session, organization: meOrg } });
    renderAt('/settings');
    const select = await screen.findByRole('combobox', { name: 'Naviguer entre les sections' });
    const options = within(select).getAllByRole('option').map(o => o.textContent);
    for (const label of ['Chatbot public', 'API', 'Notifications', 'Audit']) expect(options).toContain(label);
    const nav = screen.getByRole('navigation', { name: 'Navigation principale' });
    expect(within(nav).getByRole('button', { name: 'Processus' })).toBeInTheDocument();
  });
});

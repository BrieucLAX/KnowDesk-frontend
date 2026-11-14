import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import type { OrgRow } from '../types';
import { mockViewportWidth } from '../../../test/matchMedia';

const impersonate = vi.fn();
const orgs: OrgRow[] = [
  {
    id: 'org_test', name: 'Prospect SA', slug: 'prospect-sa', plan: 'free', created_at: '2026-11-01T10:00:00Z',
    disabled_at: null, enabled_modules: ['onboarding'], test_ended_at: null, onboarding_purged_at: null,
    stats: { membersActive: 2, membersDisabled: 1, articlesCount: 0 },
  } as OrgRow,
];

vi.mock('../hooks/useSuperadmin', () => ({
  useSuperadmin: () => ({
    session: { accessToken: 't', superadmin: { id: 'sa', email: 'equipe@knowdesk.fr', firstName: null, lastName: null } },
    orgs, loading: false, error: '', loginErr: '',
    login: vi.fn(), logout: vi.fn(), disableOrg: vi.fn(), enableOrg: vi.fn(), impersonate,
    reindexSearch: vi.fn(), recomputeResolutions: vi.fn(), createTestOrg: vi.fn(), endTest: vi.fn(),
    listOnboardingProjects: vi.fn(() => Promise.resolve([])), purgeTestData: vi.fn(),
  }),
}));

import { SuperadminApp } from './SuperadminApp';

let restore: () => void = () => {};
afterEach(() => { restore(); impersonate.mockReset(); });

describe('SuperadminApp — liste des organisations', () => {
  it('1024 px et au-dessus : tableau, actions en boutons', () => {
    restore = mockViewportWidth(1024);
    render(<SuperadminApp />);
    const table = screen.getByRole('table');
    expect(within(table).getByText('Prospect SA')).toBeInTheDocument();
    for (const label of ['Désactiver', 'Accéder', 'Terminer le test', 'Données de test']) {
      expect(within(table).getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it.each([390, 768])('à %i px : une carte par organisation, toutes les actions dans l\'ActionMenu', (width) => {
    restore = mockViewportWidth(width);
    render(<SuperadminApp />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const card = screen.getByRole('listitem');
    expect(card.querySelector('.data-table-card__title')).toHaveTextContent('Prospect SA');
    expect(within(card).getAllByRole('term').map(dt => dt.textContent)).toEqual([
      'Plan', 'Membres actifs', 'Membres désactivés', 'Articles', 'Créée', 'Statut',
    ]);
    expect(within(card).queryByRole('button', { name: 'Accéder' })).not.toBeInTheDocument();

    fireEvent.click(within(card).getByRole('button', { name: 'Actions pour Prospect SA' }));
    const items = screen.getAllByRole('menuitem').map(i => i.textContent);
    expect(items).toEqual(['Désactiver', 'Accéder', 'Terminer le test', 'Données de test']);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Accéder' }));
    expect(impersonate).toHaveBeenCalledWith('org_test', 'Prospect SA');
  });
});

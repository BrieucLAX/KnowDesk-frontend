import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TestDataModal } from './TestDataModal';
import type { OnboardingProjectRow, PurgeReport } from '../types';

const ORG = { id: 'org_t', name: 'Prospect SA' };
const P1: OnboardingProjectRow = { id: 'p1', createdAt: '2026-09-28T10:00:00Z', documents: 2 };
const P2: OnboardingProjectRow = { id: 'p2', createdAt: '2026-09-30T10:00:00Z', documents: 1 };
const report = (scope: PurgeReport['scope'], objects: number): PurgeReport =>
  ({ scope, objects, rows: { onboarding_documents: 2, onboarding_projects: 1 } });

function setup(opts: { projects?: OnboardingProjectRow[][]; purge?: TestDataModalProps['purge'] } = {}) {
  const lists = opts.projects ?? [[P1, P2], [P2]];
  let call = 0;
  const listProjects = vi.fn(async () => lists[Math.min(call++, lists.length - 1)]);
  const purge = vi.fn(opts.purge ?? (async (_org: string, projectId?: string) => report(projectId ? 'project' : 'org', 3)));
  render(<TestDataModal org={ORG} listProjects={listProjects} purge={purge} onClose={() => {}} />);
  return { listProjects, purge };
}
type TestDataModalProps = React.ComponentProps<typeof TestDataModal>;

describe('TestDataModal', () => {
  it('liste les projets par rang, sans nom, avec leur nombre de documents', async () => {
    setup();
    expect(await screen.findByText('Projet 1')).toBeInTheDocument();
    expect(screen.getByText('Projet 2')).toBeInTheDocument();
    expect(screen.getByText(/2 documents/)).toBeInTheDocument();
    expect(screen.getByText(/1 document$/)).toBeInTheDocument();
  });

  it('supprime un projet après confirmation, puis recharge la liste', async () => {
    const { purge, listProjects } = setup();
    await screen.findByText('Projet 1');
    fireEvent.click(screen.getAllByRole('button', { name: 'Supprimer' })[0]);
    expect(screen.getByText('Supprimer le projet 1 de « Prospect SA »')).toBeInTheDocument();
    expect(purge).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
    await waitFor(() => expect(purge).toHaveBeenCalledWith('org_t', 'p1'));
    expect(await screen.findByRole('status')).toHaveTextContent('Projet 1 supprimé : 3 fichiers et 3 lignes supprimés.');
    expect(listProjects).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Projet 2')).not.toBeInTheDocument();
  });

  it('supprime toutes les données de test de l\'organisation après confirmation', async () => {
    const { purge } = setup({ projects: [[P1], []] });
    await screen.findByText('Projet 1');
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer toutes les données de test' }));
    expect(screen.getByText(/L'organisation et ses comptes restent/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
    await waitFor(() => expect(purge).toHaveBeenCalledWith('org_t', undefined));
    expect(await screen.findByRole('status')).toHaveTextContent('Données de test supprimées');
    expect(screen.getByText(/Aucun projet/)).toBeInTheDocument();
  });

  it('annuler la confirmation ne supprime rien', async () => {
    const { purge } = setup();
    await screen.findByText('Projet 1');
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer toutes les données de test' }));
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(purge).not.toHaveBeenCalled();
    expect(screen.getByText('Projet 1')).toBeInTheDocument();
  });

  it('affiche l\'erreur d\'une purge incomplète', async () => {
    setup({ purge: async () => { throw new Error('La purge n\'a pas pu aller au bout. Nous sommes prévenus ; elle peut être relancée.'); } });
    await screen.findByText('Projet 1');
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer toutes les données de test' }));
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('elle peut être relancée');
  });
});

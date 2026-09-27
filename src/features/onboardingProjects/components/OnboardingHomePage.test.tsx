import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../api/onboardingApi', () => ({
  onboardingApi: { listProjects: vi.fn(), createProject: vi.fn() },
}));

import { onboardingApi } from '../api/onboardingApi';
import { OnboardingHomePage } from './OnboardingHomePage';

const project = {
  id: 'p1', name: 'Base SAV', createdAt: '2026-09-27T08:00:00Z', updatedAt: '2026-09-27T08:00:00Z',
  documentsCount: 3, totalBytes: 5 * 1024 * 1024,
};

describe('OnboardingHomePage', () => {
  beforeEach(() => {
    vi.mocked(onboardingApi.listProjects).mockReset();
    vi.mocked(onboardingApi.createProject).mockReset();
  });

  it('sans projet : écran vide avec création', async () => {
    vi.mocked(onboardingApi.listProjects).mockResolvedValue([]);
    render(<OnboardingHomePage onOpenProject={() => {}} />);
    expect(await screen.findByText('Aucun projet pour l\'instant')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Créer un projet' })).toBeInTheDocument();
  });

  it('liste les projets et ouvre celui qu\'on choisit', async () => {
    vi.mocked(onboardingApi.listProjects).mockResolvedValue([project]);
    const onOpen = vi.fn();
    render(<OnboardingHomePage onOpenProject={onOpen} />);
    fireEvent.click(await screen.findByRole('button', { name: /Base SAV/ }));
    expect(screen.getByText(/3 documents · 5,0 Mo/)).toBeInTheDocument();
    expect(onOpen).toHaveBeenCalledWith('p1');
  });

  it('crée un projet puis l\'ouvre ; affiche l\'erreur du back sinon', async () => {
    vi.mocked(onboardingApi.listProjects).mockResolvedValue([]);
    vi.mocked(onboardingApi.createProject)
      .mockRejectedValueOnce(new Error('Le nom du projet est requis.'))
      .mockResolvedValueOnce({ ...project, id: 'p2', documentsCount: 0, totalBytes: 0 });
    const onOpen = vi.fn();
    render(<OnboardingHomePage onOpenProject={onOpen} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Créer un projet' }));
    fireEvent.change(screen.getByLabelText('Nom du projet'), { target: { value: 'Projet 2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Créer le projet' }));
    expect(await screen.findByText('Le nom du projet est requis.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Créer le projet' }));
    await waitFor(() => expect(onOpen).toHaveBeenCalledWith('p2'));
    expect(onboardingApi.createProject).toHaveBeenLastCalledWith('Projet 2');
  });
});

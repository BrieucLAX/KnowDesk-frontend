import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../../../shared/lib/apiClient', () => ({
  ApiError: class extends Error {},
  apiClient: { get: vi.fn(), getWithMeta: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { apiClient } from '../../../shared/lib/apiClient';
import { respond, LEARNING_PATH_ID } from '../../../shared/lib/fixtures/lot0Responses';
import { LearningPathEditor } from './LearningPathEditor';

describe('Éditeur de parcours : le sélecteur trouve les ressources au-delà de la première page (réponses réelles du back, plan-articles-v1, lot 0)', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockImplementation(async (path: string) => respond(path).data as never);
    vi.mocked(apiClient.getWithMeta).mockClear();
    vi.mocked(apiClient.getWithMeta).mockImplementation(async (path: string) => respond(path) as never);
  });

  async function openModule() {
    render(<LearningPathEditor pathId={LEARNING_PATH_ID} onBack={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Modifier' }));
    return screen.findByPlaceholderText(/Ajouter une ressource/);
  }

  it('le 201e article publié, rendu par la page 2, se trouve en tapant son titre', async () => {
    const [last] = respond('/articles?page=2&status=published').data as Array<{ title: string }>;
    const input = await openModule();
    fireEvent.change(input, { target: { value: last.title } });
    expect(await screen.findByText(last.title)).toBeTruthy();
  });

  it('les FAQ publiées de la page 2 se trouvent aussi', async () => {
    const page2 = respond('/faqs?page=2&status=published').data as Array<{ question: string }>;
    const input = await openModule();
    fireEvent.change(input, { target: { value: page2[0].question } });
    expect(await screen.findByText(page2[0].question)).toBeTruthy();
  });

  it('demande les deux pages des articles (200) et des FAQ (100) publiés', async () => {
    await openModule();
    const pages = vi.mocked(apiClient.getWithMeta).mock.calls.map(c => {
      const [base, qs] = c[0].split('?');
      const p = new URLSearchParams(qs);
      return `${base} ${p.get('status')} ${p.get('perPage')} ${p.get('page')}`;
    });
    expect(pages.sort()).toEqual([
      '/articles published 200 1', '/articles published 200 2',
      '/faqs published 100 1', '/faqs published 100 2',
    ]);
  });
});

describe('Éditeur de parcours : supprimer un module demande une confirmation', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockImplementation(async (path: string) => respond(path).data as never);
    vi.mocked(apiClient.getWithMeta).mockImplementation(async (path: string) => respond(path) as never);
    vi.mocked(apiClient.delete).mockReset();
    vi.mocked(apiClient.delete).mockResolvedValue({ message: 'ok' } as never);
  });

  async function askDelete() {
    render(<LearningPathEditor pathId={LEARNING_PATH_ID} onBack={() => {}} />);
    const [deleteButton] = await screen.findAllByRole('button', { name: 'Supprimer' });
    fireEvent.click(deleteButton);
    return screen.findByRole('dialog', { name: 'Supprimer ce module ?' });
  }

  it('ouvre la confirmation sans rien supprimer', async () => {
    const dialog = await askDelete();
    expect(dialog).toHaveTextContent('Cette action est définitive.');
    expect(apiClient.delete).not.toHaveBeenCalled();
  });

  it('« Annuler » ferme la confirmation sans supprimer', async () => {
    await askDelete();
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(apiClient.delete).not.toHaveBeenCalled();
  });

  it('« Supprimer le module » envoie la suppression du module et ferme la confirmation', async () => {
    await askDelete();
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer le module' }));
    await waitFor(() => expect(apiClient.delete).toHaveBeenCalledTimes(1));
    expect(vi.mocked(apiClient.delete).mock.calls[0][0]).toMatch(/^\/learning\/modules\/[^/]+$/);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

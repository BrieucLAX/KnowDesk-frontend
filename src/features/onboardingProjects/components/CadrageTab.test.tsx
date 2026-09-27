import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('../api/onboardingApi', () => ({
  onboardingApi: { getCadrage: vi.fn(), listDocuments: vi.fn(), saveCadrage: vi.fn() },
}));

import { onboardingApi } from '../api/onboardingApi';
import { ApiError } from '../../../shared/lib/apiClient';
import { emptyCadrageForm } from '../lib/cadrageForm';
import { CadrageTab } from './CadrageTab';
import type { OnboardingProject } from '../types';

const MB = 1024 * 1024;
const D1 = '11111111-1111-4111-8111-111111111111';
const D2 = '22222222-2222-4222-8222-222222222222';
const project: OnboardingProject = {
  id: 'p1', name: 'Base SAV', createdAt: '', updatedAt: '', documentsCount: 2, totalBytes: 2 * MB, cadrageVersion: null,
  limits: { maxFileBytes: 50 * MB, maxDocumentsPerProject: 50, maxProjectBytes: 300 * MB, maxFilesPerUpload: 10 },
};
const docs = [
  { id: D1, filename: 'cgv.pdf', format: 'pdf' as const, sizeBytes: MB, sha256: 'a', locked: false, createdAt: '' },
  { id: D2, filename: 'faq.docx', format: 'docx' as const, sizeBytes: MB, sha256: 'b', locked: false, createdAt: '' },
];

function renderTab(extra: Partial<React.ComponentProps<typeof CadrageTab>> = {}) {
  return render(<CadrageTab project={project} onSaved={() => {}} onDirtyChange={() => {}} {...extra} />);
}

describe('CadrageTab', () => {
  beforeEach(() => {
    vi.mocked(onboardingApi.getCadrage).mockRejectedValue(new ApiError('NOT_FOUND', 'Aucun cadrage enregistré pour ce projet.', 404));
    vi.mocked(onboardingApi.listDocuments).mockResolvedValue(docs);
    vi.mocked(onboardingApi.saveCadrage).mockReset();
  });

  it('sans version : formulaire vide, six sections', async () => {
    renderTab();
    expect(await screen.findByText('Aucune version enregistrée.')).toBeInTheDocument();
    for (const title of ['1. Les offres', '2. Les segments de clientèle', '3. Les services et activités',
      '4. Notions à ne jamais confondre', '5. Hiérarchie des sources', '6. Documents à durée limitée']) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  it('refuse d\'enregistrer une offre sans nom, puis enregistre une nouvelle version', async () => {
    const onSaved = vi.fn();
    const onDirtyChange = vi.fn();
    vi.mocked(onboardingApi.saveCadrage).mockImplementation(async (_p, form) => ({
      version: 1, form, markdown: '# Cadrage', createdAt: '2026-09-27T10:00:00Z', createdBy: 'u1',
    }));
    renderTab({ onSaved, onDirtyChange });
    fireEvent.click(await screen.findByRole('button', { name: '+ Ajouter une offre' }));
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getAllByRole('button', { name: 'Enregistrer une nouvelle version' })[0]);
    expect(await screen.findByText('Champ requis.')).toBeInTheDocument();
    expect(onboardingApi.saveCadrage).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: ' Box fibre ' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Enregistrer une nouvelle version' })[0]);
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(vi.mocked(onboardingApi.saveCadrage).mock.calls[0][1].offers).toEqual([{ name: 'Box fibre', description: '' }]);
    expect(await screen.findByText(/Version 1, enregistrée le/)).toBeInTheDocument();
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });

  it('place une erreur 422 du back sous le champ concerné', async () => {
    vi.mocked(onboardingApi.getCadrage).mockResolvedValue({
      version: 2, createdAt: '2026-09-27T10:00:00Z', createdBy: 'u1', markdown: '',
      form: { ...emptyCadrageForm(), segments: [{ name: 'Pros', description: '' }] },
    });
    vi.mocked(onboardingApi.saveCadrage).mockRejectedValue(new ApiError('VALIDATION_ERROR', 'segments.0.name : nom refusé', 422));
    renderTab();
    fireEvent.change(await screen.findByDisplayValue('Pros'), { target: { value: 'Professionnels' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Enregistrer une nouvelle version' })[0]);
    expect(await screen.findByText('nom refusé')).toBeInTheDocument();
    expect(screen.getByText('1 erreur')).toBeInTheDocument();
  });

  it('hiérarchie : un document rangé à un niveau est grisé aux autres', async () => {
    vi.mocked(onboardingApi.getCadrage).mockResolvedValue({
      version: 1, createdAt: '', createdBy: 'u1', markdown: '',
      form: { ...emptyCadrageForm(), sourceHierarchy: { levels: [
        { label: 'Contractuel', detail: '', documentIds: [D1] },
        { label: 'Commercial',  detail: '', documentIds: [] },
      ], specialCases: [] } },
    });
    renderTab();
    const level2 = (await screen.findAllByRole('group', { name: 'Documents de ce niveau' }))[1];
    expect(within(level2).getByRole('checkbox', { name: /cgv\.pdf/ })).toBeDisabled();
    expect(within(level2).getByRole('checkbox', { name: /faq\.docx/ })).not.toBeDisabled();
  });
});

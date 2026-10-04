import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../api/onboardingApi', () => ({
  onboardingApi: { getNotice: vi.fn(), listDocuments: vi.fn(), deleteDocument: vi.fn(), uploadDocuments: vi.fn() },
}));

import { onboardingApi } from '../api/onboardingApi';
import { ApiError } from '../../../shared/lib/apiClient';
import { DocumentsTab } from './DocumentsTab';
import type { OnboardingDocument, OnboardingProject } from '../types';

const MB = 1024 * 1024;
const project: OnboardingProject = {
  id: 'p1', name: 'Base SAV', createdAt: '', updatedAt: '', documentsCount: 2, totalBytes: 3 * MB, cadrageVersion: null,
  limits: { maxFileBytes: 50 * MB, maxDocumentsPerProject: 50, maxProjectBytes: 300 * MB, maxFilesPerUpload: 10 },
};
const doc = (id: string, filename: string, locked = false, format: OnboardingDocument['format'] = 'pdf'): OnboardingDocument =>
  ({ id, filename, format, sizeBytes: MB, sha256: id, locked, createdAt: '2026-09-27T08:00:00Z' });

describe('DocumentsTab', () => {
  beforeEach(() => {
    vi.mocked(onboardingApi.getNotice).mockResolvedValue({ version: 'v', text: 'Texte', sha256: 'h', acceptedAt: '2026-09-27T08:00:00Z' });
    vi.mocked(onboardingApi.listDocuments).mockResolvedValue([doc('d1', 'cgv.pdf'), doc('d2', 'tarifs.pdf', true)]);
    vi.mocked(onboardingApi.deleteDocument).mockReset();
  });

  it('sans acceptation : le texte d\'information remplace la zone d\'import', async () => {
    vi.mocked(onboardingApi.getNotice).mockResolvedValue({ version: 'v', text: 'Texte', sha256: 'h', acceptedAt: null });
    render(<DocumentsTab project={project} onChanged={() => {}} />);
    expect(await screen.findByText('Avant votre premier import')).toBeInTheDocument();
    expect(screen.queryByText('Importer des documents')).not.toBeInTheDocument();
  });

  it('retire un document après confirmation', async () => {
    vi.mocked(onboardingApi.deleteDocument).mockResolvedValue(undefined);
    const onChanged = vi.fn();
    render(<DocumentsTab project={project} onChanged={onChanged} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Retirer cgv.pdf' }));
    fireEvent.click(screen.getByRole('button', { name: 'Retirer' }));
    await waitFor(() => expect(screen.queryByText('cgv.pdf')).not.toBeInTheDocument());
    expect(onboardingApi.deleteDocument).toHaveBeenCalledWith('p1', 'd1');
    expect(onChanged).toHaveBeenCalled();
  });

  it('une archive .zip se présente comme une archive, quel que soit son contenu', async () => {
    vi.mocked(onboardingApi.listDocuments).mockResolvedValue([doc('d3', 'pilote-corpus.zip', false, 'zip')]);
    render(<DocumentsTab project={project} onChanged={() => {}} />);
    expect(await screen.findByText(/^Archive \(\.zip\) · /)).toBeInTheDocument();
    expect(screen.queryByText(/Export Notion/)).not.toBeInTheDocument();
  });

  it('un document figé par une analyse ne peut pas être retiré', async () => {
    render(<DocumentsTab project={project} onChanged={() => {}} />);
    expect(await screen.findByRole('button', { name: 'Retirer tarifs.pdf' })).toBeDisabled();
  });

  it('un refus du back laisse le document en place', async () => {
    vi.mocked(onboardingApi.deleteDocument).mockRejectedValue(new ApiError('DOCUMENT_CITED', 'Ce document est cité par la fiche de cadrage.', 409));
    render(<DocumentsTab project={project} onChanged={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Retirer cgv.pdf' }));
    fireEvent.click(screen.getByRole('button', { name: 'Retirer' }));
    await waitFor(() => expect(onboardingApi.deleteDocument).toHaveBeenCalled());
    expect(screen.getByText('cgv.pdf')).toBeInTheDocument();
  });
});

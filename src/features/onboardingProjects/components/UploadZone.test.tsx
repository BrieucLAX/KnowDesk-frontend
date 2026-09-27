import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../api/onboardingApi', () => ({
  onboardingApi: { uploadDocuments: vi.fn() },
}));

import { onboardingApi } from '../api/onboardingApi';
import { ApiError } from '../../../shared/lib/apiClient';
import { UploadZone } from './UploadZone';
import type { OnboardingProject } from '../types';

const MB = 1024 * 1024;
const project: OnboardingProject = {
  id: 'p1', name: 'Base SAV', createdAt: '', updatedAt: '', documentsCount: 2, totalBytes: 3 * MB, cadrageVersion: null,
  limits: { maxFileBytes: 50 * MB, maxDocumentsPerProject: 50, maxProjectBytes: 300 * MB, maxFilesPerUpload: 10 },
};

function pick(container: HTMLElement, names: string[]) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: names.map(n => new File(['%PDF'], n)) } });
}

describe('UploadZone', () => {
  beforeEach(() => { vi.mocked(onboardingApi.uploadDocuments).mockReset(); });

  it('plus de 10 fichiers : refus avec un message, rien n\'est envoyé', () => {
    const { container } = render(<UploadZone project={project} onUploaded={() => {}} onNoticeRequired={() => {}} />);
    pick(container, Array.from({ length: 12 }, (_, i) => `f${i}.pdf`));
    expect(screen.getByRole('alert')).toHaveTextContent('12 fichiers : 10 au plus par envoi. Rien n\'a été envoyé.');
    expect(onboardingApi.uploadDocuments).not.toHaveBeenCalled();
  });

  it('envoie la sélection et remonte les documents créés', async () => {
    const created = [{ id: 'd1', filename: 'a.pdf', format: 'pdf' as const, sizeBytes: 4, sha256: 'h', locked: false, createdAt: '' }];
    vi.mocked(onboardingApi.uploadDocuments).mockResolvedValue(created);
    const onUploaded = vi.fn();
    const { container } = render(<UploadZone project={project} onUploaded={onUploaded} onNoticeRequired={() => {}} />);
    pick(container, ['a.pdf']);
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith(created));
    expect(vi.mocked(onboardingApi.uploadDocuments).mock.calls[0][1].map(f => f.name)).toEqual(['a.pdf']);
  });

  it('affiche l\'erreur du back : rien n\'a été importé', async () => {
    vi.mocked(onboardingApi.uploadDocuments).mockRejectedValue(
      new ApiError('DUPLICATE_CONTENT', '« b.pdf » a le même contenu que « a.pdf », déjà importé.', 409));
    const { container } = render(<UploadZone project={project} onUploaded={() => {}} onNoticeRequired={() => {}} />);
    pick(container, ['b.pdf']);
    expect(await screen.findByRole('alert'))
      .toHaveTextContent('Aucun fichier n\'a été importé : « b.pdf » a le même contenu que « a.pdf », déjà importé.');
  });

  it('NOTICE_NOT_ACCEPTED : redemande le texte d\'information', async () => {
    vi.mocked(onboardingApi.uploadDocuments).mockRejectedValue(new ApiError('NOTICE_NOT_ACCEPTED', 'Acceptez le texte.', 403));
    const onNoticeRequired = vi.fn();
    const { container } = render(<UploadZone project={project} onUploaded={() => {}} onNoticeRequired={onNoticeRequired} />);
    pick(container, ['a.pdf']);
    await waitFor(() => expect(onNoticeRequired).toHaveBeenCalled());
  });
});

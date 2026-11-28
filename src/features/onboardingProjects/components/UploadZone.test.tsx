import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../api/onboardingApi', () => ({
  onboardingApi: { uploadDocuments: vi.fn() },
}));

import { onboardingApi } from '../api/onboardingApi';
import { ApiError } from '../../../shared/lib/apiClient';
import { UploadZone } from './UploadZone';
import { makeDocument } from './documentsTestUtils';
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
    const created = [makeDocument({ id: 'd1', filename: 'a.pdf' })];
    const summary = { received: 1, created: 1, duplicates: [], unreadable: [], unsupported: [] };
    vi.mocked(onboardingApi.uploadDocuments).mockResolvedValue({ data: created, meta: { summary } });
    const onUploaded = vi.fn();
    const { container } = render(<UploadZone project={project} onUploaded={onUploaded} onNoticeRequired={() => {}} />);
    pick(container, ['a.pdf']);
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith(created, summary));
    expect(vi.mocked(onboardingApi.uploadDocuments).mock.calls[0][1].map(f => f.name)).toEqual(['a.pdf']);
  });

  it('affiche l\'erreur du back (415 UNSUPPORTED_FORMAT) : rien n\'a été importé', async () => {
    const message = 'Format non pris en charge : « a.pdf ». Formats acceptés : PDF, Word, PowerPoint, Excel, Markdown ou archive .zip.';
    vi.mocked(onboardingApi.uploadDocuments).mockRejectedValue(new ApiError('UNSUPPORTED_FORMAT', message, 415));
    const { container } = render(<UploadZone project={project} onUploaded={() => {}} onNoticeRequired={() => {}} />);
    pick(container, ['a.pdf']);
    expect(await screen.findByRole('alert')).toHaveTextContent(`Aucun fichier n'a été importé : ${message}`);
  });

  it('US 1.1 : un .exe est refusé avant l\'envoi, avec la liste des formats acceptés', () => {
    const { container } = render(<UploadZone project={project} onUploaded={() => {}} onNoticeRequired={() => {}} />);
    pick(container, ['setup.exe']);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Format non pris en charge : « setup.exe ». Formats acceptés : PDF, Word, PowerPoint, Excel, Markdown ou archive .zip.');
    expect(onboardingApi.uploadDocuments).not.toHaveBeenCalled();
  });

  it('US 1.1 : un fichier Excel part au back ; la zone annonce les formats de la maquette, sans « export Notion »', async () => {
    vi.mocked(onboardingApi.uploadDocuments).mockResolvedValue({ data: [makeDocument({ id: 'x', filename: 'gamme.xlsx', format: 'xlsx' })], meta: {} });
    const onUploaded = vi.fn();
    const { container } = render(<UploadZone project={project} onUploaded={onUploaded} onNoticeRequired={() => {}} />);
    expect(screen.getByText('Déposez vos fichiers ici ou cliquez pour les choisir')).toBeInTheDocument();
    expect(screen.getByText('PDF, Word, PowerPoint, Excel, Markdown ou archive .zip')).toBeInTheDocument();
    expect(screen.queryByText(/Notion/)).not.toBeInTheDocument();
    expect(container.querySelector('input[type="file"]')).toHaveAttribute('accept', expect.stringContaining('.xlsx'));
    pick(container, ['gamme.xlsx']);
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith([expect.objectContaining({ filename: 'gamme.xlsx' })], null));
  });

  it('NOTICE_NOT_ACCEPTED : redemande le texte d\'information', async () => {
    vi.mocked(onboardingApi.uploadDocuments).mockRejectedValue(new ApiError('NOTICE_NOT_ACCEPTED', 'Acceptez le texte.', 403));
    const onNoticeRequired = vi.fn();
    const { container } = render(<UploadZone project={project} onUploaded={() => {}} onNoticeRequired={onNoticeRequired} />);
    pick(container, ['a.pdf']);
    await waitFor(() => expect(onNoticeRequired).toHaveBeenCalled());
  });

  it('lot 1 « Socle » (règle transverse 4) : ni jauge de volume ni compteurs du projet ; la règle d\'envoi reste dite', () => {
    const measured = { ...project, limits: { ...project.limits, maxTextChars: 450_000 }, textChars: 380_000, unmeasuredDocuments: 1 };
    render(<UploadZone project={measured} onUploaded={() => {}} onNoticeRequired={() => {}} />);
    expect(screen.queryByRole('meter')).not.toBeInTheDocument();
    expect(screen.queryByText(/Volume de texte|Projet :/)).not.toBeInTheDocument();
    expect(screen.getByText(/fichiers au plus par envoi/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('au-delà de ce qu\'une analyse peut lire : le dépassement reste signalé, sans pourcentage', () => {
    const over = { ...project, limits: { ...project.limits, maxTextChars: 450_000 }, textChars: 470_000, unmeasuredDocuments: 0 };
    render(<UploadZone project={over} onUploaded={() => {}} onNoticeRequired={() => {}} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Vos documents dépassent ce qu\'une analyse peut lire');
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it('corpus trop grand à l\'import : le message du back, qui dit de combien et quoi faire', async () => {
    const message = 'Avec ces fichiers, le projet compterait environ 470 000 caractères de texte, soit 104 % de ce qu\'une analyse peut lire (450 000 au plus). Retirez des documents, ou répartissez-les entre plusieurs projets.';
    vi.mocked(onboardingApi.uploadDocuments).mockRejectedValue(new ApiError('CORPUS_TOO_LARGE', message, 422));
    const { container } = render(<UploadZone project={project} onUploaded={() => {}} onNoticeRequired={() => {}} />);
    pick(container, ['gros.pdf']);
    expect(await screen.findByRole('alert')).toHaveTextContent(`Aucun fichier n'a été importé : ${message}`);
  });
});

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('../api/onboardingApi', () => ({
  onboardingApi: {
    getCadrage: vi.fn(), listDocuments: vi.fn(), saveCadrage: vi.fn(), saveFreeCadrage: vi.fn(), listCadrages: vi.fn(),
  },
}));

import { onboardingApi } from '../api/onboardingApi';
import { ApiError } from '../../../shared/lib/apiClient';
import { emptyCadrageForm } from '../lib/cadrageForm';
import { CadrageTab } from './CadrageTab';
import type { Cadrage, CadrageForm, OnboardingProject } from '../types';

const MB = 1024 * 1024;
const project: OnboardingProject = {
  id: 'p1', name: 'Base SAV', createdAt: '', updatedAt: '', documentsCount: 2, totalBytes: 2 * MB, cadrageVersion: null,
  limits: { maxFileBytes: 50 * MB, maxDocumentsPerProject: 50, maxProjectBytes: 300 * MB, maxFilesPerUpload: 10 },
};
const docs = [
  { id: 'd1', filename: 'cgv.pdf', format: 'pdf' as const, sizeBytes: MB, sha256: 'a', locked: false, createdAt: '' },
  { id: 'd2', filename: 'faq.docx', format: 'docx' as const, sizeBytes: MB, sha256: 'b', locked: false, createdAt: '' },
];

function structured(version: number, form: Partial<CadrageForm> = {}, markdown = ''): Cadrage {
  return { version, kind: 'structured', sourceFilename: null, createdAt: '2026-09-27T10:00:00Z', createdBy: 'u1', markdown, form: { ...emptyCadrageForm(), ...form } };
}
function free(version: number, text: string, sourceFilename: string | null = null): Cadrage {
  return { version, kind: 'free', sourceFilename, createdAt: '2026-09-27T11:00:00Z', createdBy: 'u1', markdown: text, form: null };
}
const summary = (c: Cadrage) => ({ version: c.version, kind: c.kind, sourceFilename: c.sourceFilename, createdAt: c.createdAt, createdBy: c.createdBy });

function renderTab(extra: Partial<React.ComponentProps<typeof CadrageTab>> = {}) {
  return render(<CadrageTab project={project} onSaved={() => {}} onDirtyChange={() => {}} {...extra} />);
}
const saveButton = () => screen.getAllByRole('button', { name: 'Enregistrer une nouvelle version' })[0];
const toStructured = async () => fireEvent.click(await screen.findByRole('tab', { name: /Formulaire structuré/ }));

describe('CadrageTab', () => {
  beforeEach(() => {
    vi.mocked(onboardingApi.getCadrage).mockRejectedValue(new ApiError('NOT_FOUND', 'Aucun cadrage enregistré pour ce projet.', 404));
    vi.mocked(onboardingApi.listDocuments).mockResolvedValue(docs);
    vi.mocked(onboardingApi.listCadrages).mockResolvedValue([]);
    vi.mocked(onboardingApi.saveCadrage).mockReset();
    vi.mocked(onboardingApi.saveFreeCadrage).mockReset();
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo; // absent de jsdom
  });

  // ── Fiche libre ───────────────────────────────────────────────

  it('sans version : s\'ouvre sur le texte libre ; le formulaire reste disponible', async () => {
    renderTab();
    expect(await screen.findByText('Aucune version enregistrée.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Texte de la fiche/)).toHaveValue('');
    expect(screen.queryByText('1. Les offres')).not.toBeInTheDocument();
    await toStructured();
    for (const title of ['1. Les offres', '2. Les segments de clientèle', '3. Les services et activités',
      '4. Notions à ne jamais confondre', '5. Hiérarchie des sources', '6. Documents à durée limitée']) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  it('enregistre le texte collé tel quel, en version libre', async () => {
    const text = '# Notre métier\n\n  Les emails datés priment sur `cgv.pdf`.\n';
    vi.mocked(onboardingApi.saveFreeCadrage).mockResolvedValue({ ...free(1, text), missingDocuments: [] });
    const onSaved = vi.fn();
    renderTab({ onSaved });
    fireEvent.change(await screen.findByLabelText(/Texte de la fiche/), { target: { value: text } });
    fireEvent.click(saveButton());
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(onboardingApi.saveFreeCadrage).toHaveBeenCalledWith('p1', text, null);
    expect(await screen.findByText(/Version 1 \(libre\), enregistrée le/)).toBeInTheDocument();
  });

  it('refuse un texte vide sans appeler le back', async () => {
    renderTab();
    fireEvent.change(await screen.findByLabelText(/Texte de la fiche/), { target: { value: '   ' } });
    fireEvent.click(saveButton());
    expect(await screen.findByText('Le texte de la fiche est vide.')).toBeInTheDocument();
    expect(onboardingApi.saveFreeCadrage).not.toHaveBeenCalled();
  });

  it('importe un fichier .md, garde son nom, puis l\'enregistre', async () => {
    vi.mocked(onboardingApi.saveFreeCadrage).mockImplementation(async (_p, text, source) => ({ ...free(1, text, source), missingDocuments: [] }));
    const { container } = renderTab();
    await screen.findByLabelText(/Texte de la fiche/);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['\uFEFF## Offres\nConfort'], 'cadrage.md', { type: 'text/markdown' })] } });
    await waitFor(() => expect(screen.getByLabelText(/Texte de la fiche/)).toHaveValue('## Offres\nConfort'));
    expect(screen.getByText(/importé de « cadrage\.md »/)).toBeInTheDocument();
    fireEvent.click(saveButton());
    await waitFor(() => expect(onboardingApi.saveFreeCadrage).toHaveBeenCalledWith('p1', '## Offres\nConfort', 'cadrage.md'));
  });

  it('refuse un fichier qui n\'est ni .md ni .txt', async () => {
    const { container } = renderTab();
    await screen.findByLabelText(/Texte de la fiche/);
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(['x'], 'fiche.docx')] } });
    expect(await screen.findByText(/fichier \.md ou \.txt attendu/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Texte de la fiche/)).toHaveValue('');
  });

  it('une version libre s\'ouvre en texte libre ; « Partir du rendu de la fiche structurée » demande confirmation', async () => {
    const v1 = structured(1, { offers: [{ name: 'Confort', description: '' }] }, '# Cadrage métier — Base SAV\n\n## 1. Les offres');
    const v2 = free(2, 'Mon texte libre');
    vi.mocked(onboardingApi.getCadrage).mockImplementation(async (_p, version) => (version === 1 ? v1 : v2));
    vi.mocked(onboardingApi.listCadrages).mockResolvedValue([summary(v2), summary(v1)]);
    renderTab();
    expect(await screen.findByDisplayValue('Mon texte libre')).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: 'Partir du rendu de la fiche structurée' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Remplacer' }));
    await waitFor(() => expect(screen.getByLabelText(/Texte de la fiche/)).toHaveValue(v1.markdown));
  });

  it('changer de type avec des modifications non enregistrées demande confirmation', async () => {
    renderTab();
    fireEvent.change(await screen.findByLabelText(/Texte de la fiche/), { target: { value: 'brouillon' } });
    await toStructured();
    expect(screen.getByRole('button', { name: 'Changer sans enregistrer' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.getByLabelText(/Texte de la fiche/)).toHaveValue('brouillon');

    await toStructured();
    fireEvent.click(screen.getByRole('button', { name: 'Changer sans enregistrer' }));
    expect(await screen.findByText('1. Les offres')).toBeInTheDocument();
  });

  // ── Fiche structurée ──────────────────────────────────────────

  it('refuse d\'enregistrer une offre sans nom, puis enregistre une nouvelle version structurée', async () => {
    const onSaved = vi.fn();
    const onDirtyChange = vi.fn();
    vi.mocked(onboardingApi.saveCadrage).mockImplementation(async (_p, form) => ({ ...structured(1, form), missingDocuments: [] }));
    renderTab({ onSaved, onDirtyChange });
    await toStructured();
    fireEvent.click(await screen.findByRole('button', { name: '+ Ajouter une offre' }));
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    fireEvent.click(saveButton());
    expect(await screen.findByText('Champ requis.')).toBeInTheDocument();
    expect(onboardingApi.saveCadrage).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: ' Box fibre ' } });
    fireEvent.click(saveButton());
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(vi.mocked(onboardingApi.saveCadrage).mock.calls[0][1].offers).toEqual([{ name: 'Box fibre', description: '' }]);
    expect(await screen.findByText(/Version 1 \(structurée\), enregistrée le/)).toBeInTheDocument();
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });

  it('place une erreur 422 du back sous le champ concerné', async () => {
    vi.mocked(onboardingApi.getCadrage).mockResolvedValue(structured(2, { segments: [{ name: 'Pros', description: '' }] }));
    vi.mocked(onboardingApi.saveCadrage).mockRejectedValue(new ApiError('VALIDATION_ERROR', 'segments.0.name : nom refusé', 422));
    renderTab();
    fireEvent.change(await screen.findByDisplayValue('Pros'), { target: { value: 'Professionnels' } });
    fireEvent.click(saveButton());
    expect(await screen.findByText('nom refusé')).toBeInTheDocument();
    expect(screen.getByText('1 erreur')).toBeInTheDocument();
  });

  it('hiérarchie : un document rangé à un niveau est grisé aux autres', async () => {
    vi.mocked(onboardingApi.getCadrage).mockResolvedValue(structured(1, { sourceHierarchy: { levels: [
      { label: 'Contractuel', detail: '', documents: ['cgv.pdf'] },
      { label: 'Commercial',  detail: '', documents: [] },
    ], specialCases: [] } }));
    renderTab();
    const level2 = (await screen.findAllByRole('group', { name: 'Documents de ce niveau' }))[1];
    expect(within(level2).getByRole('checkbox', { name: /cgv\.pdf/ })).toBeDisabled();
    expect(within(level2).getByRole('checkbox', { name: /faq\.docx/ })).not.toBeDisabled();
  });

  it('un document cité mais absent du projet est signalé sans bloquer l\'enregistrement', async () => {
    vi.mocked(onboardingApi.getCadrage).mockResolvedValue(structured(1, {
      sourceHierarchy: { levels: [{ label: 'Contractuel', detail: '', documents: ['cgv.pdf', 'ancien-tarif.pdf'] }], specialCases: [] },
      limitedDocuments: [{ document: 'ancien-tarif.pdf', validFrom: null, validUntil: null, effect: 'replaces', scope: '' }],
    }));
    vi.mocked(onboardingApi.saveCadrage).mockImplementation(async (_p, form) => ({ ...structured(2, form), missingDocuments: ['ancien-tarif.pdf'] }));
    renderTab();
    expect(await screen.findByRole('status')).toHaveTextContent('ancien-tarif.pdf');
    expect(screen.getAllByText('absent du projet').length).toBeGreaterThan(0);

    fireEvent.change(screen.getByDisplayValue('Contractuel'), { target: { value: 'Contractuel et tarifaire' } });
    fireEvent.click(saveButton());
    await waitFor(() => expect(onboardingApi.saveCadrage).toHaveBeenCalled());
    const sent = vi.mocked(onboardingApi.saveCadrage).mock.calls[0][1];
    expect(sent.sourceHierarchy.levels[0].documents).toEqual(['cgv.pdf', 'ancien-tarif.pdf']);
    expect(sent.limitedDocuments[0].document).toBe('ancien-tarif.pdf');
  });

  it('un document réimporté sous le même nom est de nouveau coché', async () => {
    vi.mocked(onboardingApi.getCadrage).mockResolvedValue(structured(1, {
      sourceHierarchy: { levels: [{ label: 'Contractuel', detail: '', documents: ['faq.docx'] }], specialCases: [] },
    }));
    renderTab();
    const group = (await screen.findAllByRole('group', { name: 'Documents de ce niveau' }))[0];
    expect(within(group).getByRole('checkbox', { name: /faq\.docx/ })).toBeChecked();
    expect(within(group).queryByText('absent du projet')).not.toBeInTheDocument();
  });

  // ── Historique ────────────────────────────────────────────────

  it('historique : montre les deux types ; repartir d\'une version structurée recharge le formulaire', async () => {
    const v1 = structured(1, { offers: [{ name: 'Ancienne offre', description: '' }] }, '# Cadrage métier — Base SAV\n\n## 1. Les offres');
    const v2 = free(2, 'Texte libre actuel', 'cadrage.md');
    vi.mocked(onboardingApi.getCadrage).mockImplementation(async (_p, version) => (version === 1 ? v1 : v2));
    vi.mocked(onboardingApi.listCadrages).mockResolvedValue([summary(v2), summary(v1)]);
    const onDirtyChange = vi.fn();
    renderTab({ onDirtyChange });

    expect(await screen.findByText('Libre')).toBeInTheDocument();
    expect(screen.getByText('Structurée')).toBeInTheDocument();
    expect(screen.getByText(/importée de cadrage\.md/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Consulter la version 1' }));
    expect(await screen.findByRole('heading', { name: 'Cadrage métier — Base SAV' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Repartir de cette version' }));

    expect(await screen.findByDisplayValue('Ancienne offre')).toBeInTheDocument();
    expect(screen.getByText(/Repris de la version 1/)).toBeInTheDocument();
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    expect(onboardingApi.saveCadrage).not.toHaveBeenCalled();
  });
});

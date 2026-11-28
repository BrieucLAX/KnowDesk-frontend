import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('../api/onboardingApi', () => ({
  onboardingApi: {
    getNotice: vi.fn(), acceptNotice: vi.fn(), listDocuments: vi.fn(), deleteDocument: vi.fn(), uploadDocuments: vi.fn(),
    updateDocument: vi.fn(), listDocumentTypes: vi.fn(),
  },
}));

import { onboardingApi } from '../api/onboardingApi';
import { ApiError } from '../../../shared/lib/apiClient';
import { DocumentsTab } from './DocumentsTab';
import { makeDocument } from './documentsTestUtils';
import { CLASSIFICATION_POLL_MS, DEFAULT_DOCUMENT_TYPES, USAGE_HELP } from '../lib/documents';
import type { DocumentPatch, ImportSummary, OnboardingDocument, OnboardingProject } from '../types';

const MB = 1024 * 1024;
const project: OnboardingProject = {
  id: 'p1', name: 'Base SAV', createdAt: '', updatedAt: '', documentsCount: 2, totalBytes: 3 * MB, cadrageVersion: null,
  limits: { maxFileBytes: 50 * MB, maxDocumentsPerProject: 50, maxProjectBytes: 300 * MB, maxFilesPerUpload: 10 },
};
const accepted = { version: 'v', text: 'Texte', sha256: 'h', acceptedAt: '2026-09-27T08:00:00Z' };

/** Le PATCH simulé applique la correction comme le back (contrat, section 5). */
function patchLikeBack(docs: OnboardingDocument[]) {
  vi.mocked(onboardingApi.updateDocument).mockImplementation(async (_p: string, id: string, patch: DocumentPatch) => {
    const d = docs.find(x => x.id === id)!;
    const next = { ...d };
    if (patch.documentType) Object.assign(next, { documentType: patch.documentType, typeOrigin: 'utilisateur', toVerify: false });
    if (patch.usage) Object.assign(next, { usage: patch.usage, usageOrigin: 'utilisateur' });
    if (patch.date !== undefined) Object.assign(next, { date: patch.date, dateOrigin: 'utilisateur', datePage: null });
    return next;
  });
}

const row = (name: string) => screen.getByRole('listitem', { name });
const group = (name: string) => screen.getByRole('region', { name });

function pickFiles(container: HTMLElement, names: string[]) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: names.map(n => new File(['%PDF'], n)) } });
}

describe('DocumentsTab (étape 1, lot 2a)', () => {
  beforeEach(() => {
    vi.mocked(onboardingApi.getNotice).mockResolvedValue(accepted);
    vi.mocked(onboardingApi.listDocumentTypes).mockResolvedValue([...DEFAULT_DOCUMENT_TYPES]);
    vi.mocked(onboardingApi.listDocuments).mockResolvedValue([
      makeDocument({ id: 'd1', filename: 'cgv.pdf', title: 'Conditions générales de vente', documentType: 'conditions_contrats' }),
      makeDocument({ id: 'd2', filename: 'tarifs.pdf', locked: true }),
    ]);
    for (const fn of [onboardingApi.deleteDocument, onboardingApi.uploadDocuments, onboardingApi.updateDocument, onboardingApi.acceptNotice]) {
      vi.mocked(fn).mockReset();
    }
  });

  // ── Écran et textes de la maquette ─────────────────────────────

  it('« Ce qui est utile » liste les 7 types ; la mention KnowDesk et l\'aide d\'usage, mot pour mot', async () => {
    render(<DocumentsTab project={project} onChanged={() => {}} />);
    const useful = await screen.findByRole('region', { name: 'Ce qui est utile' });
    expect(within(useful).getAllByRole('listitem').map(li => li.textContent)).toEqual([
      'Conditions générales et contrats', 'Tarifs', 'Descriptions d\'offres', 'Procédures internes',
      'Supports de formation', 'Communications aux clients', 'Base ou FAQ existante',
    ]);
    expect(screen.getByRole('heading', { name: '2 documents classés' })).toBeInTheDocument();
    const mention = screen.getByText('Types, usages et dates proposés par KnowDesk · modifiables');
    expect(mention).toHaveClass('kd-mention');
    expect(screen.getByText(/L'usage indique si un document/)).toHaveTextContent(USAGE_HELP);
    expect(USAGE_HELP).toBe('L\'usage indique si un document peut servir à répondre aux clients. Le contenu d\'un document interne ne sera repris que dans les parties réservées aux conseillers.');
    expect(screen.queryByText(/Besoin d'aide/)).not.toBeInTheDocument();
  });

  it('les types se lisent dans GET …/document-types ; à défaut, la liste figée des 7 libellés', async () => {
    vi.mocked(onboardingApi.listDocumentTypes).mockRejectedValue(new ApiError('NOT_FOUND', 'x', 404));
    render(<DocumentsTab project={project} onChanged={() => {}} />);
    const select = within(await screen.findByRole('listitem', { name: 'Conditions générales de vente' }))
      .getByRole('combobox', { name: 'Type de document' });
    expect([...(select as HTMLSelectElement).options].map(o => o.textContent)).toEqual(DEFAULT_DOCUMENT_TYPES.map(t => t.name));
  });

  it('titre lisible et nom de fichier dessous ; sans titre, le nom de fichier seul', async () => {
    render(<DocumentsTab project={project} onChanged={() => {}} />);
    expect(within(await screen.findByRole('listitem', { name: 'Conditions générales de vente' })).getByText('cgv.pdf')).toBeInTheDocument();
    expect(within(row('tarifs.pdf')).getAllByText('tarifs.pdf')).toHaveLength(1);
    expect(within(row('tarifs.pdf')).queryByText(/Mo\b|Ko\b|octets/)).not.toBeInTheDocument();
  });

  // ── US 1.1 ──────────────────────────────────────────────────────

  it('US 1.1 : archive de 38 fichiers → 32 documents, « 5 doublons écartés · 1 document illisible » avec un lien vers ce document', async () => {
    vi.mocked(onboardingApi.listDocuments).mockResolvedValue([]);
    const created = [
      ...Array.from({ length: 32 }, (_, i) => makeDocument({ id: `n${i}`, filename: `doc-${i}.pdf` })),
      makeDocument({ id: 'u1', filename: 'scan-abime.pdf', state: 'illisible', documentType: null, usage: null, dateOrigin: null }),
    ];
    const summary: ImportSummary = {
      received: 38, created: 33,
      duplicates: Array.from({ length: 5 }, (_, i) => ({ filename: `doc-${i}.pdf`, reason: 'contenu' as const, duplicateOf: `doc-${i}.pdf` })),
      unreadable: [{ id: 'u1', filename: 'scan-abime.pdf' }],
      unsupported: [],
    };
    vi.mocked(onboardingApi.uploadDocuments).mockResolvedValue({ data: created, meta: { summary } });
    const onChanged = vi.fn();
    const { container } = render(<DocumentsTab project={project} onChanged={onChanged} />);
    await screen.findByText('Aucun document pour l\'instant.');
    pickFiles(container, ['corpus.zip']);

    expect(await screen.findByRole('heading', { name: '32 documents classés' })).toBeInTheDocument();
    expect(within(group('Tarifs')).getAllByRole('listitem')).toHaveLength(32);
    const line = screen.getByText(/doublons écartés/);
    expect(line).toHaveTextContent('5 doublons écartés · 1 document illisible');
    fireEvent.click(within(line).getByRole('button', { name: '1 document illisible' }));
    const unreadable = screen.getByRole('listitem', { name: 'scan-abime.pdf' });
    expect(unreadable).toHaveFocus();
    expect(within(screen.getByRole('region', { name: 'Documents illisibles' })).getByRole('button', { name: 'Retirer scan-abime.pdf' }))
      .toBeInTheDocument();
    expect(within(unreadable).queryByRole('combobox')).not.toBeInTheDocument();
    expect(onChanged).toHaveBeenCalled();
  });

  it('US 1.1 : la synthèse dit aussi les membres d\'archive ignorés (format non accepté)', async () => {
    vi.mocked(onboardingApi.uploadDocuments).mockResolvedValue({
      data: [makeDocument({ id: 'n1', filename: 'a.pdf' })],
      meta: { summary: { received: 3, created: 1, duplicates: [], unreadable: [], unsupported: [{ filename: 'setup.exe' }, { filename: 'notes.csv' }] } },
    });
    const { container } = render(<DocumentsTab project={project} onChanged={() => {}} />);
    await screen.findByRole('heading', { name: '2 documents classés' });
    pickFiles(container, ['corpus.zip']);
    expect(await screen.findByText('2 fichiers ignorés (format non accepté) : « setup.exe », « notes.csv »')).toBeInTheDocument();
  });

  it('US 1.1 : un .exe est refusé avec la liste des formats acceptés ; rien n\'est envoyé', async () => {
    const { container } = render(<DocumentsTab project={project} onChanged={() => {}} />);
    await screen.findByRole('heading', { name: '2 documents classés' });
    pickFiles(container, ['setup.exe']);
    expect(screen.getByRole('alert')).toHaveTextContent('Formats acceptés : PDF, Word, PowerPoint, Excel, Markdown ou archive .zip.');
    expect(onboardingApi.uploadDocuments).not.toHaveBeenCalled();
  });

  it('US 1.1 : un fichier Excel est accepté et apparaît dans la liste', async () => {
    vi.mocked(onboardingApi.uploadDocuments).mockResolvedValue({
      data: [makeDocument({ id: 'x1', filename: 'Tableau_comparatif_gamme_2026.xlsx', format: 'xlsx', title: 'Tableau comparatif gamme 2026' })],
      meta: { summary: { received: 1, created: 1, duplicates: [], unreadable: [], unsupported: [] } },
    });
    const { container } = render(<DocumentsTab project={project} onChanged={() => {}} />);
    await screen.findByRole('heading', { name: '2 documents classés' });
    pickFiles(container, ['Tableau_comparatif_gamme_2026.xlsx']);
    expect(await screen.findByRole('listitem', { name: 'Tableau comparatif gamme 2026' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('US 1.1 : consentement déjà donné → il n\'est pas redemandé à l\'import suivant', async () => {
    vi.mocked(onboardingApi.uploadDocuments).mockResolvedValue({ data: [makeDocument({ id: 'n1', filename: 'nouveau.pdf' })], meta: {} });
    vi.mocked(onboardingApi.getNotice).mockClear();
    const { container } = render(<DocumentsTab project={project} onChanged={() => {}} />);
    await screen.findByRole('heading', { name: '2 documents classés' });
    expect(screen.queryByText('Avant votre premier import')).not.toBeInTheDocument();
    pickFiles(container, ['nouveau.pdf']);
    expect(await screen.findByRole('listitem', { name: 'nouveau.pdf' })).toBeInTheDocument();
    expect(screen.queryByText('Avant votre premier import')).not.toBeInTheDocument();
    expect(onboardingApi.acceptNotice).not.toHaveBeenCalled();
    expect(onboardingApi.getNotice).toHaveBeenCalledTimes(1);
  });

  it('sans acceptation : le texte d\'information remplace la zone d\'import', async () => {
    vi.mocked(onboardingApi.getNotice).mockResolvedValue({ ...accepted, acceptedAt: null });
    render(<DocumentsTab project={project} onChanged={() => {}} />);
    expect(await screen.findByText('Avant votre premier import')).toBeInTheDocument();
    expect(screen.queryByText('Déposez vos fichiers ici ou cliquez pour les choisir')).not.toBeInTheDocument();
  });

  // ── US 1.2 ──────────────────────────────────────────────────────

  it('US 1.2 : documents groupés par type dans l\'ordre des rangs, avec leur nombre', async () => {
    vi.mocked(onboardingApi.listDocuments).mockResolvedValue([
      makeDocument({ id: 'a', filename: 'formation.pptx', documentType: 'supports_formation' }),
      makeDocument({ id: 'b', filename: 'grille.pdf', documentType: 'tarifs' }),
      makeDocument({ id: 'c', filename: 'cgv.pdf', documentType: 'conditions_contrats' }),
      makeDocument({ id: 'd', filename: 'grille2.pdf', documentType: 'tarifs' }),
    ]);
    render(<DocumentsTab project={project} onChanged={() => {}} />);
    await screen.findByRole('heading', { name: '4 documents classés' });
    const heads = screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);
    expect(heads).toEqual(['Conditions générales et contrats', 'Tarifs', 'Supports de formation']);
    expect(within(group('Tarifs')).getByText('2 documents')).toBeInTheDocument();
    expect(within(group('Supports de formation')).getByText('1 document')).toBeInTheDocument();
  });

  it('US 1.2 : « Supports de formation » → « Tarifs » : le document change de groupe et les deux compteurs suivent', async () => {
    const docs = [
      makeDocument({ id: 'f1', filename: 'f1.pptx', title: 'Présentation gamme', documentType: 'supports_formation' }),
      makeDocument({ id: 'f2', filename: 'f2.pptx', documentType: 'supports_formation' }),
      makeDocument({ id: 't1', filename: 't1.pdf', documentType: 'tarifs' }),
    ];
    vi.mocked(onboardingApi.listDocuments).mockResolvedValue(docs);
    patchLikeBack(docs);
    render(<DocumentsTab project={project} onChanged={() => {}} />);
    const item = await screen.findByRole('listitem', { name: 'Présentation gamme' });
    expect(within(group('Supports de formation')).getByText('2 documents')).toBeInTheDocument();
    expect(within(group('Tarifs')).getByText('1 document')).toBeInTheDocument();
    fireEvent.change(within(item).getByRole('combobox', { name: 'Type de document' }), { target: { value: 'tarifs' } });

    await waitFor(() => expect(within(group('Tarifs')).getByText('2 documents')).toBeInTheDocument());
    expect(within(group('Supports de formation')).getByText('1 document')).toBeInTheDocument();
    expect(within(group('Tarifs')).getByRole('listitem', { name: 'Présentation gamme' })).toBeInTheDocument();
    expect(onboardingApi.updateDocument).toHaveBeenCalledWith('p1', 'f1', { documentType: 'tarifs' });
  });

  it('US 1.2 : passer un document Client en Interne', async () => {
    const docs = [makeDocument({ id: 'd1', filename: 'procedure.docx', usage: 'client' })];
    vi.mocked(onboardingApi.listDocuments).mockResolvedValue(docs);
    patchLikeBack(docs);
    render(<DocumentsTab project={project} onChanged={() => {}} />);
    const usage = within(await screen.findByRole('listitem', { name: 'procedure.docx' })).getByRole('combobox', { name: 'Usage' });
    expect(usage).toHaveValue('client');
    expect([...(usage as HTMLSelectElement).options].map(o => o.textContent)).toEqual(['Client', 'Interne']);
    fireEvent.change(usage, { target: { value: 'interne' } });
    await waitFor(() => expect(onboardingApi.updateDocument).toHaveBeenCalledWith('p1', 'd1', { usage: 'interne' }));
    await waitFor(() => expect(within(row('procedure.docx')).getByRole('combobox', { name: 'Usage' })).toHaveValue('interne'));
  });

  it('US 1.2 : type incertain → badge « À vérifier » et encadré ; le badge disparaît quand l\'utilisateur change le type', async () => {
    const docs = [
      makeDocument({ id: 'v1', filename: 'presentation.pptx', documentType: 'supports_formation', toVerify: true, date: '2026-03-10', dateOrigin: 'corps', datePage: 1 }),
      makeDocument({ id: 'ok', filename: 'grille.pdf', date: '2026-09-01', dateOrigin: 'titre' }),
    ];
    vi.mocked(onboardingApi.listDocuments).mockResolvedValue(docs);
    patchLikeBack(docs);
    render(<DocumentsTab project={project} onChanged={() => {}} />);
    const item = await screen.findByRole('listitem', { name: 'presentation.pptx' });
    expect(within(item).getByText('À vérifier')).toHaveClass('badge--warning');
    expect(within(row('grille.pdf')).queryByText('À vérifier')).not.toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(
      '1 document est difficile à classer. Vérifiez aussi les dates trouvées : elles servent à savoir quel document est le plus récent.');
    expect(screen.getByText('2 documents classés · 1 à vérifier')).toBeInTheDocument();

    fireEvent.change(within(item).getByRole('combobox', { name: 'Type de document' }), { target: { value: 'descriptions_offres' } });
    await waitFor(() => expect(within(row('presentation.pptx')).queryByText('À vérifier')).not.toBeInTheDocument());
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    // Le titre de la liste et la note de la barre d'action.
    expect(screen.getAllByText('2 documents classés')).toHaveLength(2);
  });

  it('US 1.2 : « Confirmer le type » envoie le type actuel et retire le badge', async () => {
    const docs = [makeDocument({ id: 'v1', filename: 'presentation.pptx', documentType: 'supports_formation', toVerify: true })];
    vi.mocked(onboardingApi.listDocuments).mockResolvedValue(docs);
    patchLikeBack(docs);
    render(<DocumentsTab project={project} onChanged={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmer le type de presentation.pptx' }));
    await waitFor(() => expect(within(row('presentation.pptx')).queryByText('À vérifier')).not.toBeInTheDocument());
    expect(onboardingApi.updateDocument).toHaveBeenCalledWith('p1', 'v1', { documentType: 'supports_formation' });
    expect(within(row('presentation.pptx')).queryByRole('button', { name: /Confirmer/ })).not.toBeInTheDocument();
  });

  it('encadré de la maquette : « N documents sont difficiles à classer et N documents n\'ont pas de date »', async () => {
    vi.mocked(onboardingApi.listDocuments).mockResolvedValue([
      makeDocument({ id: 'a', filename: 'a.pdf', toVerify: true }),
      makeDocument({ id: 'b', filename: 'b.pdf', toVerify: true, date: '2026-01-15', dateOrigin: 'titre' }),
    ]);
    render(<DocumentsTab project={project} onChanged={() => {}} />);
    expect(await screen.findByRole('note')).toHaveTextContent(
      '2 documents sont difficiles à classer et 1 document n\'a pas de date. Vérifiez aussi les dates trouvées');
  });

  it('classement en échec : « À vérifier », type à choisir, aucune erreur technique', async () => {
    vi.mocked(onboardingApi.listDocuments).mockResolvedValue([
      makeDocument({ id: 'e1', filename: 'contrat.docx', classificationStatus: 'echec', toVerify: true, documentType: null, usage: null, dateOrigin: null }),
    ]);
    render(<DocumentsTab project={project} onChanged={() => {}} />);
    const item = await screen.findByRole('listitem', { name: 'contrat.docx' });
    expect(within(item).getByText('À vérifier')).toBeInTheDocument();
    expect(within(group('Type à choisir')).getByRole('listitem', { name: 'contrat.docx' })).toBeInTheDocument();
    expect(within(item).getByRole('combobox', { name: 'Type de document' })).toHaveValue('');
    expect(document.body).not.toHaveTextContent(/échec|echec|erreur|classification_not_supported|pipeline/i);
  });

  it('repli de la maquette : trois groupes, puis « Voir tous les documents · N autres de M types »', async () => {
    vi.mocked(onboardingApi.listDocuments).mockResolvedValue([
      makeDocument({ id: '1', filename: '1.pdf', documentType: 'conditions_contrats' }),
      makeDocument({ id: '2', filename: '2.pdf', documentType: 'tarifs' }),
      makeDocument({ id: '3', filename: '3.pdf', documentType: 'descriptions_offres' }),
      makeDocument({ id: '4', filename: '4.pdf', documentType: 'procedures_internes' }),
      makeDocument({ id: '5', filename: '5.pdf', documentType: 'procedures_internes' }),
      makeDocument({ id: '6', filename: '6.pdf', documentType: 'base_faq' }),
    ]);
    render(<DocumentsTab project={project} onChanged={() => {}} />);
    const more = await screen.findByRole('button', { name: 'Voir tous les documents · 3 autres de 2 types' });
    expect(screen.queryByRole('region', { name: 'Procédures internes' })).not.toBeInTheDocument();
    fireEvent.click(more);
    expect(within(group('Procédures internes')).getByText('2 documents')).toBeInTheDocument();
    expect(group('Base ou FAQ existante')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Voir tous les documents/ })).not.toBeInTheDocument();
  });

  // ── US 1.3 ──────────────────────────────────────────────────────

  it('US 1.3 : date trouvée dans le titre → « 1er sept. 2026 · trouvée dans le titre · Modifier »', async () => {
    vi.mocked(onboardingApi.listDocuments).mockResolvedValue([
      makeDocument({ id: 'g', filename: 'Grille_v2_2026-09-01.pdf', date: '2026-09-01', dateOrigin: 'titre' }),
    ]);
    render(<DocumentsTab project={project} onChanged={() => {}} />);
    const item = await screen.findByRole('listitem', { name: 'Grille_v2_2026-09-01.pdf' });
    expect(within(item).getByText(/^1er sept\. 2026$/).parentElement).toHaveTextContent('1er sept. 2026 · trouvée dans le titre · Modifier');
  });

  it('US 1.3 : date trouvée dans le corps → « trouvée dans le document, page 1 »', async () => {
    vi.mocked(onboardingApi.listDocuments).mockResolvedValue([
      makeDocument({ id: 'c', filename: 'cgv.pdf', date: '2026-01-15', dateOrigin: 'corps', datePage: 1 }),
    ]);
    render(<DocumentsTab project={project} onChanged={() => {}} />);
    const item = await screen.findByRole('listitem', { name: 'cgv.pdf' });
    expect(within(item).getByText(/15 janv\. 2026/).parentElement).toHaveTextContent('15 janv. 2026 · trouvée dans le document, page 1 · Modifier');
  });

  it('US 1.3 : aucune date → « Aucune date trouvée » en jaune et « Ajouter une date (facultatif) » ; la suite reste ouverte', async () => {
    vi.mocked(onboardingApi.listDocuments).mockResolvedValue([
      makeDocument({ id: 'n', filename: 'tableau.xlsx', format: 'xlsx', date: null, dateOrigin: 'aucune', toVerify: true }),
    ]);
    const onContinue = vi.fn();
    render(<DocumentsTab project={project} onChanged={() => {}} onContinue={onContinue} />);
    const item = await screen.findByRole('listitem', { name: 'tableau.xlsx' });
    expect(within(item).getByText('Aucune date trouvée')).toHaveClass('obp-doc-item__no-date');
    expect(within(item).getByRole('button', { name: 'Ajouter une date à tableau.xlsx (facultatif)' }))
      .toHaveTextContent('Ajouter une date (facultatif)');
    expect(within(item).queryByText(/trouvée dans/)).not.toBeInTheDocument();
    const next = screen.getByRole('button', { name: 'Continuer vers le contexte métier' });
    expect(next).toBeEnabled();
    fireEvent.click(next);
    expect(onContinue).toHaveBeenCalled();
    expect(screen.getByText('1 document classé · 1 à vérifier')).toBeInTheDocument();
  });

  it('US 1.3 : corriger une date trouvée → la nouvelle date s\'affiche sans origine', async () => {
    const docs = [makeDocument({ id: 'g', filename: 'Grille_v2_2026-09-01.pdf', date: '2026-09-01', dateOrigin: 'titre' })];
    vi.mocked(onboardingApi.listDocuments).mockResolvedValue(docs);
    patchLikeBack(docs);
    render(<DocumentsTab project={project} onChanged={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Modifier la date de Grille_v2_2026-09-01.pdf' }));
    const input = screen.getByLabelText('Date du document');
    expect(input).toHaveValue('2026-09-01');
    fireEvent.change(input, { target: { value: '2026-10-15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(screen.queryByLabelText('Date du document')).not.toBeInTheDocument());
    expect(onboardingApi.updateDocument).toHaveBeenCalledWith('p1', 'g', { date: '2026-10-15' });
    const item = row('Grille_v2_2026-09-01.pdf');
    expect(within(item).getByText('15 oct. 2026').parentElement).toHaveTextContent('15 oct. 2026 · Modifier');
    expect(within(item).queryByText(/trouvée dans/)).not.toBeInTheDocument();
  });

  it('US 1.3 : ajouter une date à un document qui n\'en a pas', async () => {
    const docs = [makeDocument({ id: 'n', filename: 'note.md', format: 'md' })];
    vi.mocked(onboardingApi.listDocuments).mockResolvedValue(docs);
    patchLikeBack(docs);
    render(<DocumentsTab project={project} onChanged={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Ajouter une date à note.md (facultatif)' }));
    expect(screen.getByLabelText('Date du document')).toHaveValue('');
    fireEvent.change(screen.getByLabelText('Date du document'), { target: { value: '2025-08-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await within(row('note.md')).findByText('1er août 2025')).toBeInTheDocument();
  });

  it('US 1.3 : « Annuler » referme le sélecteur et garde la date d\'origine', async () => {
    vi.mocked(onboardingApi.listDocuments).mockResolvedValue([
      makeDocument({ id: 'g', filename: 'Grille_v2_2026-09-01.pdf', date: '2026-09-01', dateOrigin: 'titre' }),
    ]);
    render(<DocumentsTab project={project} onChanged={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Modifier la date de Grille_v2_2026-09-01.pdf' }));
    fireEvent.change(screen.getByLabelText('Date du document'), { target: { value: '2027-01-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.queryByLabelText('Date du document')).not.toBeInTheDocument();
    expect(onboardingApi.updateDocument).not.toHaveBeenCalled();
    expect(within(row('Grille_v2_2026-09-01.pdf')).getByText('1er sept. 2026').parentElement)
      .toHaveTextContent('1er sept. 2026 · trouvée dans le titre · Modifier');
  });

  it('une correction refusée par le back garde la valeur d\'origine', async () => {
    vi.mocked(onboardingApi.listDocuments).mockResolvedValue([makeDocument({ id: 'd1', filename: 'a.pdf', usage: 'client' })]);
    vi.mocked(onboardingApi.updateDocument).mockRejectedValue(new ApiError('DOCUMENT_UNREADABLE', 'Ce document est illisible.', 409));
    render(<DocumentsTab project={project} onChanged={() => {}} />);
    const usage = within(await screen.findByRole('listitem', { name: 'a.pdf' })).getByRole('combobox', { name: 'Usage' });
    fireEvent.change(usage, { target: { value: 'interne' } });
    await waitFor(() => expect(onboardingApi.updateDocument).toHaveBeenCalled());
    await waitFor(() => expect(usage).toBeEnabled());
    expect(usage).toHaveValue('client');
  });

  // ── Retrait ─────────────────────────────────────────────────────

  it('retire un document après confirmation (corbeille, confirmation danger)', async () => {
    vi.mocked(onboardingApi.deleteDocument).mockResolvedValue(undefined);
    const onChanged = vi.fn();
    render(<DocumentsTab project={project} onChanged={onChanged} />);
    const remove = await screen.findByRole('button', { name: 'Retirer cgv.pdf' });
    expect(remove.querySelector('svg.lucide-trash-2')).not.toBeNull();
    fireEvent.click(remove);
    fireEvent.click(screen.getByRole('button', { name: 'Retirer le document' }));
    await waitFor(() => expect(screen.queryByText('cgv.pdf')).not.toBeInTheDocument());
    expect(onboardingApi.deleteDocument).toHaveBeenCalledWith('p1', 'd1');
    expect(onChanged).toHaveBeenCalled();
  });

  it('un document figé par une analyse ne peut pas être retiré', async () => {
    render(<DocumentsTab project={project} onChanged={() => {}} />);
    expect(await screen.findByRole('button', { name: 'Retirer tarifs.pdf' })).toBeDisabled();
  });

  it('un refus du back laisse le document en place', async () => {
    vi.mocked(onboardingApi.deleteDocument).mockRejectedValue(new ApiError('DOCUMENT_CITED', 'Ce document est cité par la fiche de cadrage.', 409));
    render(<DocumentsTab project={project} onChanged={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Retirer cgv.pdf' }));
    fireEvent.click(screen.getByRole('button', { name: 'Retirer le document' }));
    await waitFor(() => expect(onboardingApi.deleteDocument).toHaveBeenCalled());
    expect(screen.getByText('cgv.pdf')).toBeInTheDocument();
  });

  // ── Classement en cours ─────────────────────────────────────────

  describe('classement en cours', () => {
    beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); });
    afterEach(() => { vi.useRealTimers(); });

    it('la liste se relit toutes les quelques secondes tant qu\'il reste des documents à classer, puis s\'arrête', async () => {
      const waiting = [
        makeDocument({ id: 'a', filename: 'a.pdf', classificationStatus: 'en_cours', documentType: null, usage: null, dateOrigin: null }),
        makeDocument({ id: 'b', filename: 'b.pdf', classificationStatus: 'en_attente', documentType: null, usage: null, dateOrigin: null }),
        makeDocument({ id: 'c', filename: 'c.pdf' }),
      ];
      const done = waiting.map(d => ({ ...d, classificationStatus: 'termine' as const, documentType: 'tarifs' as const, usage: 'client' as const, dateOrigin: 'aucune' as const }));
      vi.mocked(onboardingApi.listDocuments).mockReset()
        .mockResolvedValueOnce(waiting)
        .mockResolvedValue(done);
      render(<DocumentsTab project={project} onChanged={() => {}} onContinue={() => {}} />);

      expect(await screen.findByRole('heading', { name: '3 documents' })).toBeInTheDocument();
      expect(within(group('En cours de classement')).getAllByText('Classement en cours…')).toHaveLength(2);
      expect(within(row('a.pdf')).queryByRole('combobox')).not.toBeInTheDocument();
      expect(screen.getByText(/Classement en cours : 1 sur 3 documents classés/)).toBeInTheDocument();
      expect(screen.getByText('Classement en cours · 1 sur 3')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Continuer vers le contexte métier' })).toBeEnabled();

      await act(async () => { await vi.advanceTimersByTimeAsync(CLASSIFICATION_POLL_MS); });
      expect(await screen.findByRole('heading', { name: '3 documents classés' })).toBeInTheDocument();
      expect(screen.queryByText('Classement en cours…')).not.toBeInTheDocument();
      expect(onboardingApi.listDocuments).toHaveBeenCalledTimes(2);

      await act(async () => { await vi.advanceTimersByTimeAsync(CLASSIFICATION_POLL_MS * 3); });
      expect(onboardingApi.listDocuments).toHaveBeenCalledTimes(2);
    });
  });
});

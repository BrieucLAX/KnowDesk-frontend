import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('../../api/onboardingApi', () => ({
  onboardingApi: { listAnalyses: vi.fn(), getAudit: vi.fn(), getAuditImage: vi.fn(), listDecisions: vi.fn() },
}));

import { onboardingApi } from '../../api/onboardingApi';
import { ApiError } from '../../../../shared/lib/apiClient';
import { AuditTab } from './AuditTab';
import type { OnboardingAnalysis, OnboardingProject } from '../../types';

const MB = 1024 * 1024;
const project: OnboardingProject = {
  id: 'p1', name: 'Base SAV', createdAt: '', updatedAt: '', documentsCount: 2, totalBytes: 2 * MB, cadrageVersion: 3,
  limits: { maxFileBytes: 50 * MB, maxDocumentsPerProject: 50, maxProjectBytes: 300 * MB, maxFilesPerUpload: 10 },
};

const analysis = (id: string, extra: Partial<OnboardingAnalysis> = {}): OnboardingAnalysis => ({
  id, status: 'succeeded', stage: 'storing', done: 0, total: 0, llmCalls: 12, llmRetries: 0, cadrageVersion: 3,
  documents: [{ id: 'd1', filename: 'cgv.pdf' }, { id: 'd2', filename: 'guide.docx' }], errorCode: null,
  pipelineVersion: null, createdAt: '2026-09-27T10:00:00Z', createdBy: 'u1', submittedAt: null,
  finishedAt: '2026-09-27T10:20:00Z', deadlineAt: '2026-09-27T11:00:00Z', ...extra,
});

const listed = (data: OnboardingAnalysis[]) => ({ data, meta: { quota: { used: data.length, max: 5 } } });

const pdf = (docId: string, excerpt: string, extra: object = {}) =>
  ({ format: 'pdf', document_id: docId, excerpt, page: 2, ...extra });

/** Audit 0.6.0 : une décision, un point à vérifier (image), un cas à confirmer, une résolution automatique. */
const AUDIT = {
  schema_version: '0.6.0',
  generated_at: '2026-09-27T10:19:00Z',
  inventory: [
    { document_id: 'd1', path: 'cgv.pdf', title: 'Conditions générales de vente', format: 'pdf', size_bytes: 1, sha256: 'a', unit_count: 2 },
    { document_id: 'd2', path: 'guide.docx', title: 'Guide', format: 'docx', size_bytes: 1, sha256: 'b', unit_count: 3 },
  ],
  decisions: { count: 1, conflict_count: 3, auto_resolved_count: 1, to_verify_count: 1, to_confirm_count: 1, by_impact: { high: 1 } },
  estimated_duration: { minutes: 3, method: 'x' },
  assertions: [
    { id: 'a1', subject: 'frais', source: pdf('d1', 'Frais de retour : 5 €') },
    { id: 'a2', subject: 'frais', source: { format: 'docx', document_id: 'd2', excerpt: 'Retour gratuit', heading_path: ['Retours'], block_kind: 'paragraph', block_index: 0 } },
    { id: 'a3', subject: 'plafond', source: pdf('d1', 'Plafond 80 €', { zone: 'image', image_id: 'img-ok', excerpt_origin: 'vision_unverified' }) },
    { id: 'a4', subject: 'plafond', source: pdf('d1', 'Plafond [...] 50 €', { zone: 'image', image_id: 'img-lost', excerpt_origin: 'vision_unverified' }) },
  ],
  conflicts: [
    { id: 'c1', status: 'open' },
    { id: 'c2', status: 'to_verify' },
    { id: 'c3', status: 'to_confirm', proposed_condition: { text: 'Livraison en Corse' } },
  ],
  questions: [
    {
      id: 'q1', type: 'genuine_conflict', question: 'Quels sont les frais de retour ?', subject: 'frais', conflict_ids: ['c1'],
      group_id: 'g1', blocking: true, impact: { level: 'high', customer_fact: true, score: 70 },
      options: [
        { label: 'A — 5 €, « cgv.pdf »', document: 'cgv.pdf', value: '5 €', assertion_ids: ['a1'] },
        { label: 'B — gratuit, « guide.docx »', document: 'guide.docx', value: 'gratuit', assertion_ids: ['a2'], scope: 'Clients fidèles' },
      ],
    },
    {
      id: 'q2', type: 'genuine_conflict', question: 'Quel est le plafond ?', subject: 'plafond', conflict_ids: ['c2'],
      group_id: 'g2', blocking: false, impact: { level: 'high', customer_fact: true, score: 60 },
      options: [
        { label: 'A — 80 €', document: 'cgv.pdf', value: '80 €', assertion_ids: ['a3'], read_by_vision: true },
        { label: 'B — 50 €', document: 'cgv.pdf', value: '50 €', assertion_ids: ['a4'], read_by_vision: true },
      ],
    },
    {
      id: 'q3', type: 'genuine_conflict', question: 'Quel délai de livraison ?', subject: 'délai', conflict_ids: ['c3'],
      group_id: 'g3', blocking: false, impact: { level: 'low', customer_fact: true, score: 30 },
      options: [
        { label: 'A — 6 jours', document: 'guide.docx', value: '6 jours', assertion_ids: ['a2'] },
        { label: 'B — 3 jours', document: 'cgv.pdf', value: '3 jours', assertion_ids: ['a1'] },
      ],
    },
  ],
  automatic_decisions: [{
    id: 'dec_auto_1', conflict_ids: ['c9'], origin: 'automatic', action: { type: 'choose', kept_assertion_id: 'x', discarded_assertion_ids: ['y'] },
    author: { id: 'knowdesk', display_name: 'Knowdesk', kind: 'system' }, decided_at: '2026-09-27T10:18:00Z',
    rationale: 'La version 2 remplace la version 1.', evidence: [pdf('d1', 'Délai de remboursement : 14 jours')],
  }],
  discarded_gaps: [{ id: 'g-1', subject: 'coordonnées', assertion_ids: ['a1', 'a2'], reason: 'distinct_notions', explanation: 'Pas la même chose.' }],
  unavailable_detections: ['undefined_references'],
  obsolescence_hints: [],
};

describe('AuditTab', () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.mocked(onboardingApi.listAnalyses).mockReset().mockResolvedValue(listed([analysis('a-new')]));
    vi.mocked(onboardingApi.getAudit).mockReset().mockResolvedValue({
      analysisId: 'a-new', schemaVersion: '0.6.0', audit: AUDIT, imageIds: ['img-ok'],
    });
    vi.mocked(onboardingApi.listDecisions).mockReset().mockResolvedValue({
      decisions: [], counts: { decided: 0, later: 0, skipped: 0 }, arbitrable: true,
    });
    vi.mocked(onboardingApi.getAuditImage).mockReset().mockResolvedValue(new Blob([new Uint8Array([1])], { type: 'image/png' }));
    createObjectURL = vi.fn(() => 'blob:image-1');
    revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('sans analyse réussie : état vide, et un lien vers l\'onglet Analyse', async () => {
    vi.mocked(onboardingApi.listAnalyses).mockResolvedValue(listed([analysis('a1', { status: 'failed' }), analysis('a2', { status: 'running' })]));
    const onGoToAnalysis = vi.fn();
    render(<AuditTab project={project} onGoToAnalysis={onGoToAnalysis} />);
    expect(await screen.findByText('Aucun audit pour l\'instant')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Aller à l\'analyse' }));
    expect(onGoToAnalysis).toHaveBeenCalled();
    expect(onboardingApi.getAudit).not.toHaveBeenCalled();
  });

  it('affiche l\'audit de la dernière analyse réussie : annonce, puis points à vérifier et cas à confirmer à part', async () => {
    vi.mocked(onboardingApi.listAnalyses).mockResolvedValue(listed([analysis('a-run', { status: 'running' }), analysis('a-new'), analysis('a-old')]));
    render(<AuditTab project={project} onGoToAnalysis={() => {}} />);

    expect(await screen.findByRole('heading', { name: /Décisions à prendre/ })).toBeInTheDocument();
    expect(onboardingApi.getAudit).toHaveBeenCalledWith('p1', 'a-new');
    expect(screen.getByText('1 décision est annoncée', { exact: false })).toHaveTextContent('(impact fort : 1)');
    expect(screen.getByText('3 min')).toBeInTheDocument();

    const decisions = screen.getByRole('region', { name: /Décisions à prendre/ });
    expect(within(decisions).getByRole('article', { name: 'Décision 1' })).toHaveTextContent('Quels sont les frais de retour ?');
    expect(within(decisions).queryByText('Quel est le plafond ?')).not.toBeInTheDocument();

    const toVerify = screen.getByRole('region', { name: /Points à vérifier visuellement/ });
    expect(toVerify).toHaveTextContent('Quel est le plafond ?');
    const toConfirm = screen.getByRole('region', { name: /Cas à confirmer/ });
    expect(toConfirm).toHaveTextContent('Condition qui séparerait les cas : Livraison en Corse');
  });

  it('options dans l\'ordre, avec portée, extraits, et documents nommés par leur nom de fichier', async () => {
    render(<AuditTab project={project} onGoToAnalysis={() => {}} />);
    const card = await screen.findByRole('article', { name: 'Décision 1' });
    const options = within(card).getAllByRole('listitem');
    expect(options[0]).toHaveTextContent('A — 5 €, « cgv.pdf »');
    expect(options[0]).toHaveTextContent('Frais de retour : 5 €');
    expect(options[0]).toHaveTextContent('page 2');
    expect(options[1]).toHaveTextContent('Portée : Clients fidèles');
    expect(options[1]).toHaveTextContent('Retours, paragraphe 1');
    expect(screen.queryByText(/Conditions générales de vente/)).not.toBeInTheDocument();
  });

  it('extrait lu par vision : la mention, l\'image si elle est conservée, un encadré sinon', async () => {
    render(<AuditTab project={project} onGoToAnalysis={() => {}} />);
    const toVerify = await screen.findByRole('region', { name: /Points à vérifier visuellement/ });
    expect(within(toVerify).getAllByText('Extrait transcrit par vision, non vérifié')).toHaveLength(2);
    // [...] est une élision voulue : affichée telle quelle.
    expect(toVerify).toHaveTextContent('Plafond [...] 50 €');

    const img = await within(toVerify).findByRole('img');
    expect(img).toHaveAttribute('src', 'blob:image-1');
    expect(img).toHaveAttribute('alt', 'Image lue dans cgv.pdf, page 2, image');
    expect(onboardingApi.getAuditImage).toHaveBeenCalledWith('p1', 'a-new', 'img-ok');
    expect(onboardingApi.getAuditImage).not.toHaveBeenCalledWith('p1', 'a-new', 'img-lost');
    expect(within(toVerify).getByText('Image non disponible')).toBeInTheDocument();
  });

  it('image conservée mais illisible : encadré, sans message d\'erreur', async () => {
    vi.mocked(onboardingApi.getAuditImage).mockRejectedValue(new ApiError('NOT_FOUND', 'Image introuvable.', 404));
    render(<AuditTab project={project} onGoToAnalysis={() => {}} />);
    const toVerify = await screen.findByRole('region', { name: /Points à vérifier visuellement/ });
    await waitFor(() => expect(within(toVerify).getAllByText('Image non disponible')).toHaveLength(2));
    expect(within(toVerify).queryByRole('img')).not.toBeInTheDocument();
  });

  it('détection non disponible : « non disponible », jamais « 0 » ; disponible et vide : « aucune »', async () => {
    render(<AuditTab project={project} onGoToAnalysis={() => {}} />);
    const undefinedRefs = await screen.findByRole('region', { name: 'Références non définies' });
    expect(undefinedRefs).toHaveTextContent('Non disponible');
    expect(undefinedRefs).not.toHaveTextContent('0');
    const hints = screen.getByRole('region', { name: /Indices d'obsolescence/ });
    expect(hints).toHaveTextContent('Aucune trouvée.');
  });

  it('résolutions automatiques et écarts écartés restent lisibles, avec leur raison', async () => {
    render(<AuditTab project={project} onGoToAnalysis={() => {}} />);
    const automatic = await screen.findByRole('region', { name: /Écarts résolus automatiquement/ });
    expect(automatic).toHaveTextContent('La version 2 remplace la version 1.');
    expect(automatic).toHaveTextContent('Délai de remboursement : 14 jours');
    const discarded = screen.getByRole('region', { name: /Écarts écartés/ });
    expect(discarded).toHaveTextContent('coordonnées');
    expect(discarded).toHaveTextContent('Notions différentes');
    expect(discarded).toHaveTextContent('Pas la même chose.');
  });

  it('version de schéma inconnue : un message, rien d\'autre', async () => {
    vi.mocked(onboardingApi.getAudit).mockResolvedValue({ analysisId: 'a-new', schemaVersion: '0.7.0', audit: AUDIT, imageIds: [] });
    render(<AuditTab project={project} onGoToAnalysis={() => {}} />);
    expect(await screen.findByRole('status')).toHaveTextContent('format que cette version de l\'application ne sait pas afficher (version 0.7.0)');
    expect(screen.queryByRole('heading', { name: /Décisions à prendre/ })).not.toBeInTheDocument();
  });

  it('audit minimal (champs requis seuls) : affiché sans erreur', async () => {
    vi.mocked(onboardingApi.getAudit).mockResolvedValue({
      analysisId: 'a-new', schemaVersion: '0.6.0', imageIds: [],
      audit: { generated_at: 'x', inventory: [], decisions: { count: 0, conflict_count: 0, auto_resolved_count: 0 }, estimated_duration: { minutes: 0, method: 'x' } },
    });
    render(<AuditTab project={project} onGoToAnalysis={() => {}} />);
    expect(await screen.findByText('Aucune décision à prendre.')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Indices d'obsolescence/ })).toHaveTextContent('Aucune trouvée.');
  });

  it('les audits précédents restent consultables, en lecture seule', async () => {
    vi.mocked(onboardingApi.listAnalyses).mockResolvedValue(listed([
      analysis('a-new'), analysis('a-old', { finishedAt: '2026-09-20T10:00:00Z' }),
    ]));
    render(<AuditTab project={project} onGoToAnalysis={() => {}} />);
    const picker = await screen.findByRole('combobox');
    expect(screen.getByText(/Fiche de cadrage version 3, 2 documents/)).toBeInTheDocument();
    fireEvent.change(picker, { target: { value: 'a-old' } });
    await waitFor(() => expect(onboardingApi.getAudit).toHaveBeenLastCalledWith('p1', 'a-old'));
    expect(screen.getByText('Audit d\'une analyse précédente, en lecture seule.')).toBeInTheDocument();
  });

  it('chargement de l\'audit en échec : message d\'erreur', async () => {
    const add = vi.spyOn(window.__toastBus!, 'add');
    vi.mocked(onboardingApi.getAudit).mockRejectedValue(new ApiError('NOT_FOUND', 'Audit introuvable.', 404));
    render(<AuditTab project={project} onGoToAnalysis={() => {}} />);
    expect(await screen.findByText('L\'audit n\'a pas pu être chargé.')).toBeInTheDocument();
    expect(add).toHaveBeenCalledWith('Audit introuvable.', 'error', expect.anything());
  });
});

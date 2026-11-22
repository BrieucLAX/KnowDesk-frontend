import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('../../api/onboardingApi', () => ({
  onboardingApi: {
    listAnalyses: vi.fn(), getAudit: vi.fn(), listAuditImages: vi.fn(), getAuditImage: vi.fn(), listDecisions: vi.fn(),
    listCorrections: vi.fn(), launchCorrection: vi.fn(), getBase: vi.fn(),
    listPlans: vi.fn(), getPlanEdits: vi.fn(), editPlan: vi.fn(), undoPlanEdit: vi.fn(), resetPlanEdits: vi.fn(),
    launchPlan: vi.fn(), getPlanContent: vi.fn(), listPlanComments: vi.fn(),
    commentPlan: vi.fn(), cancelPlanComment: vi.fn(),
    listBuilds: vi.fn(), launchBuild: vi.fn(), getBuildContent: vi.fn(), listBuildComments: vi.fn(),
    commentBuild: vi.fn(), cancelBuildComment: vi.fn(),
    listReviews: vi.fn(), listSectionComments: vi.fn(), listSectionFixes: vi.fn(), listValidations: vi.fn(),
  },
}));

import { onboardingApi } from '../../api/onboardingApi';
import { ApiError } from '../../../../shared/lib/apiClient';
import { BaseTab } from './BaseTab';
import { CorrectionEntry } from './CorrectionEntry';
import type { AuditResponse } from '../../lib/audit';
import type { Decision } from '../../lib/decisions';
import type { OnboardingPlan, PlanComment, PlanContent } from '../../lib/plan';
import type { PlanEditsState } from '../../lib/planEdits';
import type { ExistingBase, ReadingCard } from '../../lib/reading';
import type { OnboardingAnalysis, OnboardingProject } from '../../types';
import ELYRA from '../clarify/fixtures/audit-0.16.0-elyra-v2-lecture-4.response.json';
import PROPOSED from './fixtures/plan-0.1.0-elyra-2026-11-19.json';
import MODIFIED_STATE from './fixtures/plan-edits-elyra-2026-11-19.response.json';

/**
 * Modification du plan avant la rédaction (plan-construire-v1, étape 4 ; décisions du porteur du
 * 2026-11-22). Le plan est le plan réel d'Elyra du 19/11 (premier tirage, 34 articles) ; l'état
 * modifié, la réponse réelle du back après le scénario de l'experte (10 modifications, 31 articles).
 */
const AUDIT = ELYRA as unknown as AuditResponse & { reading: { cards: ReadingCard[]; base: ExistingBase } };
const CARDS = AUDIT.reading.cards;
const MODIFIED = MODIFIED_STATE as unknown as PlanEditsState;
const PLAN_ID = MODIFIED.planId;
const CONTENT: PlanContent = { planId: PLAN_ID, schemaVersion: '0.1.0', plan: PROPOSED, createdAt: '2026-11-19T03:40:00Z', commentable: true };
const FRESH: PlanEditsState = {
  planId: PLAN_ID, editable: true, headId: null, editCount: 0, plan: PROPOSED, edits: [],
  changedChapterIds: [], changedSubjectIds: [], gone: [],
};
const TECHNICAL = /\b(card|sub|ch|doc)_|ch_e\d|merge_subjects|remove_subject|move_subject/;

const MB = 1024 * 1024;
const project: OnboardingProject = {
  id: 'p1', name: 'Elyra', createdAt: '', updatedAt: '', documentsCount: 39, totalBytes: 4 * MB, cadrageVersion: 1,
  limits: { maxFileBytes: 50 * MB, maxDocumentsPerProject: 50, maxProjectBytes: 300 * MB, maxFilesPerUpload: 10 },
};
const analysis = { id: 'a1', status: 'succeeded', createdAt: '2026-11-13T09:00:00Z', finishedAt: '2026-11-13T09:10:00Z' } as OnboardingAnalysis;
const planRow: OnboardingPlan = {
  id: PLAN_ID, analysisId: 'a1', generation: 1, status: 'succeeded', stage: 'storing', done: 0, total: 0, errorCode: null,
  decisionCount: 14, createdAt: '2026-11-19T03:30:00Z', submittedAt: null, finishedAt: '2026-11-19T03:40:00Z',
};

function mock(edits: PlanEditsState | Error = FRESH, comments: PlanComment[] = [], content: PlanContent = CONTENT) {
  vi.mocked(onboardingApi.listAnalyses).mockResolvedValue({ data: [analysis], meta: { quota: { used: 1, max: 5 } } });
  vi.mocked(onboardingApi.getAudit).mockResolvedValue(AUDIT);
  vi.mocked(onboardingApi.listAuditImages).mockResolvedValue([]);
  vi.mocked(onboardingApi.listDecisions).mockResolvedValue({ decisions: [], counts: { decided: 0, later: 0, skipped: 0 }, arbitrable: true });
  vi.mocked(onboardingApi.listCorrections).mockResolvedValue({ data: [], meta: { quota: { used: 0, max: 30 } } });
  vi.mocked(onboardingApi.listPlans).mockResolvedValue({ data: [planRow], meta: { quota: { used: 1, max: 30 } } });
  vi.mocked(onboardingApi.getPlanContent).mockResolvedValue(content);
  vi.mocked(onboardingApi.listPlanComments).mockResolvedValue(comments);
  vi.mocked(onboardingApi.listBuilds).mockResolvedValue({ data: [], meta: { quota: { used: 0, max: 30 }, launch: { allowed: true } } });
  if (edits instanceof Error) vi.mocked(onboardingApi.getPlanEdits).mockRejectedValue(edits);
  else vi.mocked(onboardingApi.getPlanEdits).mockResolvedValue(edits);
}

const show = () => render(<BaseTab project={project} onGoToClarify={() => {}} />);
const article = (title: string) => screen.getByRole('heading', { name: new RegExp(`^${title.replace(/[()]/g, '\\$&')}( Modifié)?$`) }).closest('article')!;
const startEditing = async () => fireEvent.click(await screen.findByRole('button', { name: 'Modifier le plan' }));

// Le plan réel (34 articles et leurs sources) est long à rendre quand toute la suite tourne en parallèle.
vi.setConfig({ testTimeout: 30_000 });

beforeEach(() => { mock(); });
afterEach(() => { vi.clearAllMocks(); });

describe('Le plan se modifie : « Modifier le plan »', () => {
  it('sans la route du back (avant l\'étape 4) : le plan se lit comme avant, sans bouton', async () => {
    mock(new Error('route absente'));
    show();
    expect(await screen.findByText('12 catégories · 34 articles · 98 passages couverts sur 133')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Modifier le plan' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Vos modifications/)).not.toBeInTheDocument();
  });

  it('le mode modification : les outils de chaque catégorie et de chaque article, sans les commentaires', async () => {
    show();
    expect(await screen.findByText('12 catégories · 34 articles · 98 passages couverts sur 133')).toBeInTheDocument();
    expect(screen.getAllByText('Commentaire sur cet article (facultatif)').length).toBeGreaterThan(0);
    await startEditing();
    expect(screen.getByRole('button', { name: 'Terminer les modifications' })).toBeInTheDocument();
    expect(screen.getByText('Vos modifications (0)')).toBeInTheDocument();
    expect(screen.getByText('Aucune modification : le plan est celui proposé par Knowdesk.')).toBeInTheDocument();
    expect(screen.queryByText('Commentaire sur cet article (facultatif)')).not.toBeInTheDocument();
    const tools = within(article('Elyra Gaz Indexé')).getByRole('group', { name: 'Modifier l\'article « Elyra Gaz Indexé »' });
    for (const name of ['Renommer', 'Déplacer…', 'Réunir dans…', 'Retirer du plan']) {
      expect(within(tools).getByRole('button', { name })).toBeEnabled();
    }
    expect(screen.getByRole('group', { name: 'Modifier la catégorie « Marché de l\'énergie »' })).toBeInTheDocument();
    // Seul article de sa catégorie : ni monter ni descendre.
    expect(screen.getByRole('button', { name: 'Monter l\'article « Elyra Énergie »' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Monter la catégorie « Présentation de l\'entreprise »' })).toBeDisabled();
  });

  it('renommer un article : le titre seulement, envoyé avec la tête du journal ; « Modifié » ensuite', async () => {
    const after: PlanEditsState = {
      ...FRESH, headId: '00000000-0000-4000-8000-000000000001', editCount: 1, changedSubjectIds: ['sub_1'],
      plan: { ...PROPOSED, subjects: PROPOSED.subjects.map(s => (s.id === 'sub_1' ? { ...s, title: 'Qui est Elyra ?' } : s)) },
      edits: [{
        id: '00000000-0000-4000-8000-000000000001', kind: 'rename_subject', op: { kind: 'rename_subject', subjectId: 'sub_1', title: 'Qui est Elyra ?' },
        names: { subject: 'Elyra Énergie', from: 'Elyra Énergie', to: 'Qui est Elyra ?' }, author: { id: 'u1', name: 'Experte Elyra' }, createdAt: '2026-11-22T10:00:00Z',
      }],
    };
    vi.mocked(onboardingApi.editPlan).mockResolvedValue(after);
    show();
    await startEditing();
    fireEvent.click(within(article('Elyra Énergie')).getByRole('button', { name: 'Renommer' }));
    const dialog = screen.getByRole('dialog', { name: 'Renommer l\'article' });
    expect(within(dialog).getByRole('button', { name: 'Renommer' })).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText('Nouveau nom'), { target: { value: '  Qui est Elyra ?  ' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Renommer' }));
    await waitFor(() => expect(onboardingApi.editPlan).toHaveBeenCalledWith('p1', PLAN_ID, null, { kind: 'rename_subject', subjectId: 'sub_1', title: 'Qui est Elyra ?' }));
    expect(await screen.findByRole('heading', { name: 'Qui est Elyra ? Modifié' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Article « Elyra Énergie » renommé « Qui est Elyra ? »')).toBeInTheDocument();
  });

  it('déplacer dans une nouvelle catégorie : le nom demandé, placée après la catégorie quittée', async () => {
    vi.mocked(onboardingApi.editPlan).mockResolvedValue(MODIFIED);
    show();
    await startEditing();
    fireEvent.click(within(article('Acteurs du marché de l\'énergie')).getByRole('button', { name: 'Déplacer…' }));
    const dialog = screen.getByRole('dialog', { name: 'Déplacer « Acteurs du marché de l\'énergie »' });
    fireEvent.change(within(dialog).getByLabelText('Catégorie'), { target: { value: '__new__' } });
    expect(within(dialog).getByText(/Elle se place après « Marché de l'énergie »/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Déplacer' })).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText('Nom de la nouvelle catégorie'), { target: { value: 'Fonctionnement du secteur de l\'énergie' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Déplacer' }));
    await waitFor(() => expect(onboardingApi.editPlan).toHaveBeenCalledWith('p1', PLAN_ID, null, {
      kind: 'move_subject', subjectId: 'sub_3', chapterId: null, newChapterTitle: 'Fonctionnement du secteur de l\'énergie', afterSubjectId: null,
    }));
  });

  it('déplacer dans une catégorie existante, après un article ; en premier', async () => {
    vi.mocked(onboardingApi.editPlan).mockResolvedValue(FRESH);
    show();
    await startEditing();
    fireEvent.click(within(article('Droit de rétractation (particuliers)')).getByRole('button', { name: 'Déplacer…' }));
    const dialog = screen.getByRole('dialog');
    // Par défaut : à la fin de sa catégorie.
    expect((within(dialog).getByLabelText('Position') as HTMLSelectElement).value).toBe('sub_23');
    fireEvent.change(within(dialog).getByLabelText('Position'), { target: { value: 'sub_22' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Déplacer' }));
    await waitFor(() => expect(onboardingApi.editPlan).toHaveBeenCalledWith('p1', PLAN_ID, null, {
      kind: 'move_subject', subjectId: 'sub_20', chapterId: 'ch_5', afterSubjectId: 'sub_22',
    }));
  });

  it('réunir : ce que l\'article gardé reçoit, et le public qui change', async () => {
    vi.mocked(onboardingApi.editPlan).mockResolvedValue(FRESH);
    show();
    await startEditing();
    fireEvent.click(within(article('Prix repère de la CRE')).getByRole('button', { name: 'Réunir dans…' }));
    const dialog = screen.getByRole('dialog', { name: 'Réunir « Prix repère de la CRE »' });
    expect(within(dialog).getByRole('button', { name: 'Réunir' })).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText('Réunir dans l\'article'), { target: { value: 'sub_12' } });
    expect(within(dialog).getByText(/« Elyra Gaz Indexé » garde son titre et sa question, et reçoit la source de « Prix repère de la CRE »\. « Prix repère de la CRE » disparaît du plan\./)).toBeInTheDocument();
    expect(within(dialog).getByText('Public : Particuliers → Particuliers et professionnels (publics différents).')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Réunir' }));
    await waitFor(() => expect(onboardingApi.editPlan).toHaveBeenCalledWith('p1', PLAN_ID, null, {
      kind: 'merge_subjects', subjectId: 'sub_7', intoSubjectId: 'sub_12',
    }));
  });

  it('retirer : ce qui ne sera pas rédigé, avec confirmation ; monter et descendre', async () => {
    vi.mocked(onboardingApi.editPlan).mockResolvedValue(FRESH);
    show();
    await startEditing();
    fireEvent.click(within(article('Décisions du Comité Offres & Prix de septembre 2026')).getByRole('button', { name: 'Retirer du plan' }));
    const dialog = screen.getByRole('dialog', { name: 'Retirer « Décisions du Comité Offres & Prix de septembre 2026 » du plan ?' });
    expect(within(dialog).getByText('Sa source ne sera pas rédigée. Vous pourrez annuler.')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Retirer du plan' }));
    await waitFor(() => expect(onboardingApi.editPlan).toHaveBeenCalledWith('p1', PLAN_ID, null, { kind: 'remove_subject', subjectId: 'sub_2' }));

    fireEvent.click(screen.getByRole('button', { name: 'Descendre l\'article « Droit de rétractation (particuliers) »' }));
    await waitFor(() => expect(onboardingApi.editPlan).toHaveBeenLastCalledWith('p1', PLAN_ID, null, {
      kind: 'move_subject', subjectId: 'sub_20', chapterId: 'ch_5', afterSubjectId: 'sub_21',
    }));
    fireEvent.click(screen.getByRole('button', { name: 'Monter la catégorie « Marché de l\'énergie »' }));
    await waitFor(() => expect(onboardingApi.editPlan).toHaveBeenLastCalledWith('p1', PLAN_ID, null, {
      kind: 'move_chapter', chapterId: 'ch_2', afterChapterId: null,
    }));
  });

  it('une modification refusée se dit ; un conflit recharge le plan modifié', async () => {
    vi.mocked(onboardingApi.editPlan).mockRejectedValue(new ApiError('PLAN_EDIT_CONFLICT', 'Le plan a été modifié entre-temps. Rechargez le plan.', 409));
    show();
    await startEditing();
    fireEvent.click(screen.getByRole('button', { name: 'Monter la catégorie « Marché de l\'énergie »' }));
    await waitFor(() => expect(onboardingApi.getPlanEdits).toHaveBeenCalledTimes(2));
  });
});

describe('Le plan modifié : ce qui a changé, et revenir en arrière', () => {
  const COMMENT: PlanComment = {
    id: 'c1', subjectId: 'sub_2', comment: 'Note interne, pas pour les clients.', supersedesId: null,
    author: { id: 'u1', name: 'Experte Elyra' }, createdAt: '2026-11-21T10:00:00Z', cancelledAt: null, cancelledBy: null,
  };

  it('le plan modifié, « Modifié », « Vos modifications », « Retirés ou réunis » avec leurs commentaires, sans aucun code', async () => {
    mock(MODIFIED, [COMMENT]);
    const { container } = show();
    expect(await screen.findByText('13 catégories · 31 articles · 98 passages couverts sur 133')).toBeInTheDocument();
    expect(screen.getByText(/Plan modifié par vous : 10 modifications\./)).toBeInTheDocument();
    expect(screen.getByText('Catégorie 1 · Fonctionnement du secteur de l\'énergie')).toBeInTheDocument();
    expect(screen.getByText('Catégorie 3 · Le marché de l\'énergie')).toBeInTheDocument();
    expect(screen.getAllByText('Modifié').length).toBe(9);
    expect(article('Elyra Gaz Indexé')).toHaveTextContent('Particuliers et professionnels');

    const panel = screen.getByRole('region', { name: 'Vos modifications (10)' });
    expect(within(panel).getAllByRole('listitem')).toHaveLength(10);
    expect(within(panel).getByText(/« Prix repère de la CRE » réuni dans « Elyra Gaz Indexé », qui devient « Particuliers et professionnels »/)).toBeInTheDocument();
    expect(within(panel).getAllByText(/Experte Elyra/)).toHaveLength(10);

    const gone = screen.getByRole('region', { name: 'Retirés ou réunis (3)' });
    expect(within(gone).getByText(/« Prix repère de la CRE » : réuni dans « Elyra Gaz Indexé »\./)).toBeInTheDocument();
    expect(within(gone).getByText(/« Décisions du Comité Offres & Prix de septembre 2026 » : retiré du plan, ses sources ne seront pas rédigées\./)).toBeInTheDocument();
    expect(within(gone).getByText(/Note interne, pas pour les clients\./)).toBeInTheDocument();

    // La rédaction part du plan modifié.
    expect(screen.getByRole('button', { name: 'Rédiger les 31 articles' })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(TECHNICAL);
  });

  it('« Voir le plan proposé » montre la proposition de Knowdesk, sans modification possible', async () => {
    mock(MODIFIED);
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Voir le plan proposé' }));
    expect(screen.getByText('12 catégories · 34 articles · 98 passages couverts sur 133')).toBeInTheDocument();
    expect(screen.getByText(/Vous voyez le plan proposé par Knowdesk, sans vos modifications\./)).toBeInTheDocument();
    expect(screen.queryByText('Modifié')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Modifier le plan' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /Vos modifications/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Voir le plan modifié' }));
    expect(screen.getByText('13 catégories · 31 articles · 98 passages couverts sur 133')).toBeInTheDocument();
  });

  it('annuler la dernière modification ; revenir au plan proposé, avec confirmation', async () => {
    mock(MODIFIED);
    vi.mocked(onboardingApi.undoPlanEdit).mockResolvedValue({ ...MODIFIED, editCount: 9, edits: MODIFIED.edits.slice(0, 9) });
    vi.mocked(onboardingApi.resetPlanEdits).mockResolvedValue(FRESH);
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Annuler la dernière modification' }));
    await waitFor(() => expect(onboardingApi.undoPlanEdit).toHaveBeenCalledWith('p1', PLAN_ID, MODIFIED.headId));
    expect(await screen.findByText('Vos modifications (9)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Revenir au plan proposé' }));
    const dialog = screen.getByRole('dialog', { name: 'Revenir au plan proposé ?' });
    expect(within(dialog).getByText('Vos 9 modifications seront annulées. Les rédactions déjà faites ne changent pas.')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Revenir au plan proposé' }));
    await waitFor(() => expect(onboardingApi.resetPlanEdits).toHaveBeenCalledWith('p1', PLAN_ID, MODIFIED.headId));
    expect(await screen.findByText('12 catégories · 34 articles · 98 passages couverts sur 133')).toBeInTheDocument();
    expect(screen.queryByText(/Plan modifié par vous/)).not.toBeInTheDocument();
  });

  it('un plan remplacé se lit avec ses modifications, mais ne se modifie plus', async () => {
    mock({ ...MODIFIED, editable: false }, [], { ...CONTENT, commentable: false });
    show();
    expect(await screen.findByText('13 catégories · 31 articles · 98 passages couverts sur 133')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Modifier le plan' })).not.toBeInTheDocument();
    expect(screen.getByText('Vos modifications (10)')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Annuler la dernière modification' })).not.toBeInTheDocument();
  });
});

describe('« Préparer à nouveau le plan » : les modifications ne sont pas reprises', () => {
  const decision = (cardId: string): Decision => ({
    id: `d-${cardId}`, questionId: cardId, cardId, groupId: null, conflictIds: null, action: { type: 'other_answer' } as Decision['action'],
    supersedesId: null, decidedBy: { id: 'u1', name: 'Experte Elyra' }, decidedAt: '2026-11-13T10:00:00Z', cancelledAt: null, cancelledBy: null,
  });
  const BLOCKING = ['dated_change', 'contradiction', 'probable_error', 'remplacement_version', 'reprise_version_remplacee'];
  const answered = new Map(CARDS.filter(c => BLOCKING.includes(c.nature)).map(c => [c.id, decision(c.id)]));
  const entry = () => render(
    <CorrectionEntry projectId="p1" analysisId="a1" schemaVersion="0.16.0" cards={CARDS} current={answered} onOpenBase={() => {}} base={AUDIT.reading.base} />,
  );

  it('avec des modifications : l\'avertissement le dit avant le lancement', async () => {
    mock(MODIFIED);
    entry();
    fireEvent.click(await screen.findByRole('button', { name: 'Préparer à nouveau le plan' }));
    const dialog = await screen.findByRole('dialog', { name: 'Préparer à nouveau le plan ?' });
    await waitFor(() => expect(within(dialog).getByText(/Vos 10 modifications du plan actuel ne seront pas reprises : le nouveau plan repart de la proposition de Knowdesk/)).toBeInTheDocument());
  });

  it('sans modification : l\'avertissement d\'avant', async () => {
    mock(FRESH);
    entry();
    fireEvent.click(await screen.findByRole('button', { name: 'Préparer à nouveau le plan' }));
    expect(await screen.findByText(/Un nouveau plan sera préparé avec vos réponses actuelles\./)).toBeInTheDocument();
  });
});

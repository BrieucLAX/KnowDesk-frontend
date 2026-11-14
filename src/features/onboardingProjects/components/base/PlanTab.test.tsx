import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('../../api/onboardingApi', () => ({
  onboardingApi: {
    listAnalyses: vi.fn(), getAudit: vi.fn(), listAuditImages: vi.fn(), getAuditImage: vi.fn(), listDecisions: vi.fn(),
    listCorrections: vi.fn(), launchCorrection: vi.fn(), getBase: vi.fn(),
    listPlans: vi.fn(), launchPlan: vi.fn(), getPlanContent: vi.fn(), listPlanComments: vi.fn(),
    commentPlan: vi.fn(), cancelPlanComment: vi.fn(),
    listReviews: vi.fn(), listSectionComments: vi.fn(), listSectionFixes: vi.fn(), listValidations: vi.fn(),
  },
}));

import { onboardingApi } from '../../api/onboardingApi';
import { BaseTab } from './BaseTab';
import { CorrectionEntry } from './CorrectionEntry';
import type { AuditResponse } from '../../lib/audit';
import type { Decision } from '../../lib/decisions';
import type { OnboardingPlan, PlanComment, PlanContent } from '../../lib/plan';
import { NO_BASE_TO_PREPARE, type ExistingBase, type ReadingCard } from '../../lib/reading';
import type { OnboardingAnalysis, OnboardingProject } from '../../types';
import ELYRA from '../clarify/fixtures/audit-0.16.0-elyra-v2-lecture-4.response.json';
import PLAN_ELYRA from './fixtures/plan-0.1.0-elyra.response.json';

/**
 * Plan d'une base à construire (plan-construire-v1, lot B ; décisions du porteur du 2026-11-14).
 * L'audit est la réponse réelle du back pour la lecture 4 d'Elyra en v2 (sans base existante,
 * 20 cartes) ; le plan suit le contrat 0.1.0, bâti sur ses documents et ses cartes réelles (aucun
 * pipeline ne produit encore de plan) et validé par le modèle du pipeline.
 */
const AUDIT = ELYRA as unknown as AuditResponse & { reading: { cards: ReadingCard[]; base: ExistingBase } };
const CARDS = AUDIT.reading.cards;
const BLOCKING = ['dated_change', 'contradiction', 'probable_error', 'remplacement_version', 'reprise_version_remplacee'];
const REPLACEMENT = CARDS.find(c => c.nature === 'remplacement_version')!;
const PLAN = PLAN_ELYRA as unknown as PlanContent;

/** Ce qu'aucun écran ne doit montrer : identifiants de carte, de sujet, de document, codes. */
const TECHNICAL = /card_|sub_|ch_|doc_|plan_not_supported|no_content|out_of_scope/;

const MB = 1024 * 1024;
const project: OnboardingProject = {
  id: 'p1', name: 'Elyra', createdAt: '', updatedAt: '', documentsCount: 39, totalBytes: 4 * MB, cadrageVersion: 1,
  limits: { maxFileBytes: 50 * MB, maxDocumentsPerProject: 50, maxProjectBytes: 300 * MB, maxFilesPerUpload: 10 },
};
const analysis = { id: 'a1', status: 'succeeded', createdAt: '2026-11-13T09:00:00Z', finishedAt: '2026-11-13T09:10:00Z' } as OnboardingAnalysis;

const decision = (cardId: string, type: string): Decision => ({
  id: `d-${cardId}`, questionId: cardId, cardId, groupId: null, conflictIds: null, action: { type } as Decision['action'],
  supersedesId: null, decidedBy: { id: 'u1', name: 'Camille Martin' }, decidedAt: '2026-11-13T10:00:00Z', cancelledAt: null, cancelledBy: null,
});
const answered = (except: string[] = []) => new Map(
  CARDS.filter(c => BLOCKING.includes(c.nature) && !except.includes(c.id)).map(c => [c.id, decision(c.id, 'other_answer')]),
);

const planRow = (over: Partial<OnboardingPlan> = {}): OnboardingPlan => ({
  id: PLAN.planId, analysisId: 'a1', generation: 1, status: 'succeeded', stage: 'storing', done: 0, total: 0, errorCode: null,
  decisionCount: 14, createdAt: '2026-11-14T10:00:00Z', submittedAt: null, finishedAt: '2026-11-14T10:05:00Z', ...over,
});

const entry = (current: ReadonlyMap<string, Decision>, schemaVersion = '0.16.0', base: ExistingBase | null = AUDIT.reading.base, onOpenBase = vi.fn()) =>
  render(
    <CorrectionEntry projectId="p1" analysisId="a1" schemaVersion={schemaVersion} cards={CARDS} current={current}
      onOpenBase={onOpenBase} base={base} />,
  );

beforeEach(() => {
  vi.mocked(onboardingApi.listPlans).mockResolvedValue({ data: [], meta: { quota: { used: 0, max: 30 } } });
  vi.mocked(onboardingApi.listCorrections).mockResolvedValue({ data: [], meta: { quota: { used: 0, max: 30 } } });
});
afterEach(() => { vi.clearAllMocks(); });

describe('« À clarifier » en mode construire : le bloc « Plan de la nouvelle base »', () => {
  it('l\'audit réel est sans base existante, en 0.16.0', () => {
    expect(AUDIT.schemaVersion).toBe('0.16.0');
    expect(AUDIT.reading.base.mode).toBe('build');
  });

  it('remplace le message « ne sait pas encore construire » ; grisé tant que la carte de remplacement attend, avec le message qui la nomme', async () => {
    entry(answered([REPLACEMENT.id]));
    expect(await screen.findByRole('heading', { name: 'Plan de la nouvelle base' })).toBeInTheDocument();
    expect(screen.queryByText(NO_BASE_TO_PREPARE)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Préparer le plan' })).toBeDisabled();
    expect(screen.getByText(`La carte « ${REPLACEMENT.analysis.subject.trim()} » attend votre réponse.`)).toBeInTheDocument();
    expect(onboardingApi.listCorrections).not.toHaveBeenCalled();
  });

  it('« Plus tard » ne tranche pas : le bouton reste grisé', async () => {
    const current = answered();
    const contradiction = CARDS.find(c => c.nature === 'contradiction')!;
    current.set(contradiction.id, decision(contradiction.id, 'later'));
    entry(current);
    expect(await screen.findByRole('button', { name: 'Préparer le plan' })).toBeDisabled();
    expect(screen.getByText(/Encore 1 carte bloquante à trancher avant de préparer le plan\. « Plus tard » ne tranche pas/)).toBeInTheDocument();
  });

  it('toutes les cartes bloquantes répondues : « Préparer le plan » lance le plan et ouvre « Nouvelle base »', async () => {
    vi.mocked(onboardingApi.launchPlan).mockResolvedValue(planRow({ status: 'queued', stage: null }));
    const onOpenBase = vi.fn();
    entry(answered(), '0.16.0', AUDIT.reading.base, onOpenBase);
    const button = await screen.findByRole('button', { name: 'Préparer le plan' });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    await waitFor(() => expect(onboardingApi.launchPlan).toHaveBeenCalledWith('p1', 'a1'));
    expect(onOpenBase).toHaveBeenCalled();
  });

  it('pipeline qui ne connaît pas encore la tâche : le plan en échec se dit en clair, et se relance', async () => {
    vi.mocked(onboardingApi.listPlans).mockResolvedValue({
      data: [planRow({ status: 'failed', stage: null, errorCode: 'plan_not_supported', finishedAt: null })], meta: { quota: { used: 0, max: 30 } },
    });
    const { container } = entry(answered());
    expect(await screen.findByText(/Le service d'analyse ne sait pas encore préparer un plan/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Préparer le plan' })).toBeEnabled();
    expect(container.textContent).not.toMatch(TECHNICAL);
  });

  it('un plan prêt : « Voir le plan » et « Préparer à nouveau le plan »', async () => {
    vi.mocked(onboardingApi.listPlans).mockResolvedValue({ data: [planRow()], meta: { quota: { used: 1, max: 30 } } });
    entry(answered());
    expect(await screen.findByRole('button', { name: 'Voir le plan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Préparer à nouveau le plan' })).toBeInTheDocument();
  });

  it('ailleurs, rien ne change : audit antérieur à 0.16.0 sans base, et mode correction', async () => {
    entry(answered(), '0.15.0');
    expect(screen.getByText(NO_BASE_TO_PREPARE)).toBeInTheDocument();
    expect(screen.queryByText('Plan de la nouvelle base')).not.toBeInTheDocument();

    entry(answered(), '0.16.0', { ...AUDIT.reading.base, mode: 'correct' });
    expect(await screen.findByRole('button', { name: 'Préparer la nouvelle base' })).toBeInTheDocument();
    expect(onboardingApi.listPlans).not.toHaveBeenCalled();
  });
});

describe('« Nouvelle base » en mode construire : le plan en lecture seule', () => {
  function mockPlan(plans: OnboardingPlan[] = [planRow()], content: PlanContent = PLAN, comments: PlanComment[] = []) {
    vi.mocked(onboardingApi.listAnalyses).mockResolvedValue({ data: [analysis], meta: { quota: { used: 1, max: 5 } } });
    vi.mocked(onboardingApi.getAudit).mockResolvedValue(AUDIT);
    vi.mocked(onboardingApi.listAuditImages).mockResolvedValue([]);
    vi.mocked(onboardingApi.listDecisions).mockResolvedValue({ decisions: [], counts: { decided: 0, later: 0, skipped: 0 }, arbitrable: true });
    vi.mocked(onboardingApi.listPlans).mockResolvedValue({ data: plans, meta: { quota: { used: 1, max: 30 } } });
    vi.mocked(onboardingApi.getPlanContent).mockResolvedValue(content);
    vi.mocked(onboardingApi.listPlanComments).mockResolvedValue(comments);
  }

  it('le plan, ses points d\'attention, ses chapitres et les sources de chaque sujet, sans aucun code', async () => {
    mockPlan();
    const { container } = render(<BaseTab project={project} onGoToClarify={() => {}} />);
    expect(await screen.findByText('3 chapitres · 3 sujets · 10 passages couverts sur 12')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Plan du / })).toBeInTheDocument();

    const attention = screen.getByRole('region', { name: 'Points d\'attention' });
    expect(within(attention).getByText('Documents écartés comme obsolètes (1)')).toBeInTheDocument();
    expect(within(attention).getByText('Grille_Tarifaire_Particuliers_v1_2025-08-01.pdf')).toBeInTheDocument();
    expect(within(attention).getByText(/remplacé par Grille_Tarifaire_Particuliers_v2_2026-09-01\.pdf, confirmé par vous/)).toBeInTheDocument();
    expect(within(attention).getByText('Passages sans sujet (2)')).toBeInTheDocument();
    expect(within(attention).getByText(/note de travail interne/)).toBeInTheDocument();
    expect(within(attention).getByText('Sujets réunis (1)')).toBeInTheDocument();
    expect(within(attention).getByText(/« Frais de résiliation » et « Résilier un contrat particulier » : mêmes passages, un seul sujet/)).toBeInTheDocument();
    expect(within(attention).getByText(/Une carte n'est rattachée à aucun sujet/)).toBeInTheDocument();
    expect(within(attention).getByText('Une citation introuvable dans vos documents a été écartée.')).toBeInTheDocument();

    expect(screen.getByText('Chapitre 1 · Offres et prix')).toBeInTheDocument();
    const subject = screen.getByRole('heading', { name: 'Offre Gaz Indexé' }).closest('article')!;
    expect(within(subject).getByText('Question : Quel est le prix de l\'offre Gaz Indexé ?')).toBeInTheDocument();
    expect(within(subject).getByText('Public : particuliers')).toBeInTheDocument();
    expect(within(subject).getByText('Sources (3)')).toBeInTheDocument();
    expect(within(subject).getByText('Fiche_Offre_Gaz_Indexe.docx')).toBeInTheDocument();
    expect(within(subject).getByText(/Cartes liées \(1\)/)).toBeInTheDocument();
    expect(within(subject).getByRole('button', { name: 'Remise sur l\'offre Gaz Indexé' })).toBeInTheDocument();

    expect(screen.getByText(/La rédaction de la base à partir de ce plan arrive bientôt/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Rédiger|Créer la base/ })).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(TECHNICAL);
  });

  it('lecture v1 : « Non disponible » pour les documents remplacés, jamais « 0 »', async () => {
    const raw = PLAN.plan as { attention: Record<string, unknown> };
    mockPlan([planRow()], { ...PLAN, plan: { ...raw, attention: { ...raw.attention, retired_documents_detection: 'unavailable', retired_documents: [] } } });
    render(<BaseTab project={project} onGoToClarify={() => {}} />);
    const attention = await screen.findByRole('region', { name: 'Points d\'attention' });
    expect(within(attention).getByText('Documents écartés comme obsolètes')).toBeInTheDocument();
    expect(within(attention).getByText(/^Non disponible/)).toBeInTheDocument();
    expect(within(attention).queryByText(/obsolètes \(0\)/)).not.toBeInTheDocument();
  });

  it('un commentaire par sujet et un pour le plan, jamais dans la base', async () => {
    mockPlan();
    vi.mocked(onboardingApi.commentPlan).mockImplementation(async (_p, _plan, body) => ({
      id: `c-${body.subjectId ?? 'plan'}`, subjectId: body.subjectId, comment: body.comment, supersedesId: null,
      author: { id: 'u1', name: 'Camille Martin' }, createdAt: '2026-11-14T11:00:00Z', cancelledAt: null, cancelledBy: null,
    }));
    render(<BaseTab project={project} onGoToClarify={() => {}} />);
    await screen.findByText('3 chapitres · 3 sujets · 10 passages couverts sur 12');

    const subject = screen.getByRole('heading', { name: 'Offre Gaz Indexé' }).closest('article')!;
    fireEvent.change(within(subject).getByLabelText('Commentaire sur ce sujet (facultatif)'), { target: { value: 'Sujet à scinder.' } });
    fireEvent.click(within(subject).getByRole('button', { name: 'Enregistrer le commentaire' }));
    await waitFor(() => expect(onboardingApi.commentPlan).toHaveBeenCalledWith('p1', PLAN.planId, expect.anything()));

    fireEvent.change(screen.getByLabelText('Commentaire sur le plan (facultatif)'), { target: { value: 'Il manque les horaires.' } });
    fireEvent.click(within(screen.getByRole('region', { name: 'Commentaire sur le plan' })).getByRole('button', { name: 'Enregistrer le commentaire' }));
    await waitFor(() => expect(onboardingApi.commentPlan).toHaveBeenCalledTimes(2));
    expect(vi.mocked(onboardingApi.commentPlan).mock.calls.map(c => c[2])).toEqual([
      { subjectId: 'sub_gaz_indexe', expectedCurrentId: null, comment: 'Sujet à scinder.' },
      { subjectId: null, expectedCurrentId: null, comment: 'Il manque les horaires.' },
    ]);
    expect(screen.getAllByText(/ce commentaire n'entre jamais dans la base/).length).toBeGreaterThan(1);
  });

  it('un plan remplacé se lit, sans champ de commentaire', async () => {
    mockPlan([planRow()], { ...PLAN, commentable: false }, [{
      id: 'c1', subjectId: null, comment: 'Ancienne remarque.', supersedesId: null, author: { id: 'u1', name: 'Camille Martin' },
      createdAt: '2026-11-14T11:00:00Z', cancelledAt: null, cancelledBy: null,
    }]);
    render(<BaseTab project={project} onGoToClarify={() => {}} />);
    expect(await screen.findByText(/il se consulte, mais ne se commente plus/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enregistrer le commentaire' })).not.toBeInTheDocument();
    expect(screen.getByText(/Commentaire : Ancienne remarque\./)).toBeInTheDocument();
  });

  it('en préparation : les étapes du plan ; en échec : le message en clair', async () => {
    mockPlan([planRow({ status: 'running', stage: 'complement', finishedAt: null })]);
    const { unmount } = render(<BaseTab project={project} onGoToClarify={() => {}} />);
    expect(await screen.findByRole('heading', { name: 'Plan en préparation' })).toBeInTheDocument();
    expect(screen.getByText('Rattachement des passages restants').closest('li')).toHaveClass('obp-step--current');
    unmount();

    mockPlan([planRow({ status: 'failed', stage: null, errorCode: 'plan_not_supported', finishedAt: null })]);
    render(<BaseTab project={project} onGoToClarify={() => {}} />);
    expect(await screen.findByRole('heading', { name: 'Préparation du plan interrompue' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/ne sait pas encore préparer un plan/);
  });

  it('sans plan : renvoie à « À clarifier »', async () => {
    mockPlan([]);
    render(<BaseTab project={project} onGoToClarify={() => {}} />);
    expect(await screen.findByText('Aucun plan pour l\'instant')).toBeInTheDocument();
  });
});

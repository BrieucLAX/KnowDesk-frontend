import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('../../api/onboardingApi', () => ({
  onboardingApi: {
    listAnalyses: vi.fn(), getAudit: vi.fn(), listAuditImages: vi.fn(), getAuditImage: vi.fn(), listDecisions: vi.fn(),
    listCorrections: vi.fn(), launchCorrection: vi.fn(), getBase: vi.fn(),
    listPlans: vi.fn(), launchPlan: vi.fn(), getPlanContent: vi.fn(), listPlanComments: vi.fn(),
    commentPlan: vi.fn(), cancelPlanComment: vi.fn(),
    listBuilds: vi.fn(), launchBuild: vi.fn(), getBuildContent: vi.fn(), listBuildComments: vi.fn(),
    commentBuild: vi.fn(), cancelBuildComment: vi.fn(),
    listReviews: vi.fn(), listSectionComments: vi.fn(), listSectionFixes: vi.fn(), listValidations: vi.fn(),
  },
}));

import { onboardingApi } from '../../api/onboardingApi';
import { BaseTab } from './BaseTab';
import type { AuditResponse } from '../../lib/audit';
import type { BuildContent, BuildLaunch, OnboardingBuild } from '../../lib/build';
import type { Decision } from '../../lib/decisions';
import type { OnboardingPlan, PlanContent } from '../../lib/plan';
import type { ExistingBase, ReadingCard } from '../../lib/reading';
import type { OnboardingAnalysis, OnboardingProject } from '../../types';
import ELYRA from '../clarify/fixtures/audit-0.16.0-elyra-v2-lecture-4.response.json';
import PLAN_ELYRA from './fixtures/plan-0.1.0-elyra.response.json';
import BUILD_ELYRA from './fixtures/construction-0.1.0-elyra.response.json';

/**
 * Rédaction des articles (plan-construire-v1, lot C ; décisions du porteur C-Q1 à C-Q6). L'audit est
 * la réponse réelle du back pour la lecture 4 d'Elyra ; la rédaction suit le contrat 0.1.0, écrite
 * sur ses documents et ses cartes réels (aucun pipeline ne rédige encore), validée par le modèle du
 * pipeline et par `lib/build.test.ts`.
 */
const AUDIT = ELYRA as unknown as AuditResponse & { reading: { cards: ReadingCard[]; base: ExistingBase } };
const PLAN = PLAN_ELYRA as unknown as PlanContent;
const BUILD = BUILD_ELYRA as unknown as BuildContent;

/** Ce qu'aucun écran ne doit montrer : identifiants de carte, d'article, de document, codes. */
const TECHNICAL = /\b(card|sub|ch|doc|blk|pt)_|build_not_supported|joined_passages|discarded_|no_source/;

const MB = 1024 * 1024;
const project: OnboardingProject = {
  id: 'p1', name: 'Elyra', createdAt: '', updatedAt: '', documentsCount: 39, totalBytes: 4 * MB, cadrageVersion: 1,
  limits: { maxFileBytes: 50 * MB, maxDocumentsPerProject: 50, maxProjectBytes: 300 * MB, maxFilesPerUpload: 10 },
};
const analysis = { id: 'a1', status: 'succeeded', createdAt: '2026-11-13T09:00:00Z', finishedAt: '2026-11-13T09:10:00Z' } as OnboardingAnalysis;

const planRow: OnboardingPlan = {
  id: PLAN.planId, analysisId: 'a1', generation: 1, status: 'succeeded', stage: 'storing', done: 0, total: 0, errorCode: null,
  decisionCount: 14, createdAt: '2026-11-14T10:00:00Z', submittedAt: null, finishedAt: '2026-11-14T10:05:00Z',
};
const buildRow = (over: Partial<OnboardingBuild> = {}): OnboardingBuild => ({
  id: BUILD.buildId, planId: PLAN.planId, analysisId: 'a1', generation: 1, status: 'succeeded', stage: 'storing', done: 6, total: 6,
  errorCode: null, decisionCount: 14, createdAt: '2026-11-14T10:50:00Z', submittedAt: null, finishedAt: '2026-11-14T11:00:00Z', ...over,
});

const VERT_LOCAL = 'card_1b9961bd7843699b';
const decision = (id: string, cardId: string, action: Decision['action']): Decision => ({
  id, questionId: cardId, cardId, groupId: null, conflictIds: null, action, supersedesId: null,
  decidedBy: { id: 'u1', name: 'Camille Martin' }, decidedAt: '2026-11-13T10:00:00Z', cancelledAt: null, cancelledBy: null,
});

function mock(builds: OnboardingBuild[] = [], launch: BuildLaunch = { allowed: true }, audit: AuditResponse = AUDIT, decisions: Decision[] = []) {
  vi.mocked(onboardingApi.listAnalyses).mockResolvedValue({ data: [analysis], meta: { quota: { used: 1, max: 5 } } });
  vi.mocked(onboardingApi.getAudit).mockResolvedValue(audit);
  vi.mocked(onboardingApi.listAuditImages).mockResolvedValue([]);
  vi.mocked(onboardingApi.listDecisions).mockResolvedValue({ decisions, counts: { decided: decisions.length, later: 0, skipped: 0 }, arbitrable: true });
  vi.mocked(onboardingApi.listCorrections).mockResolvedValue({ data: [], meta: { quota: { used: 0, max: 30 } } });
  vi.mocked(onboardingApi.listPlans).mockResolvedValue({ data: [planRow], meta: { quota: { used: 1, max: 30 } } });
  vi.mocked(onboardingApi.getPlanContent).mockResolvedValue(PLAN);
  vi.mocked(onboardingApi.listPlanComments).mockResolvedValue([]);
  vi.mocked(onboardingApi.listBuilds).mockResolvedValue({ data: builds, meta: { quota: { used: builds.length, max: 30 }, launch } });
  vi.mocked(onboardingApi.getBuildContent).mockResolvedValue(BUILD);
  vi.mocked(onboardingApi.listBuildComments).mockResolvedValue([]);
}

const show = () => render(<BaseTab project={project} onGoToClarify={() => {}} />);
const openTab = async (name: RegExp | string) => fireEvent.click(await screen.findByRole('tab', { name }));

beforeEach(() => { mock(); });
afterEach(() => { vi.clearAllMocks(); });

describe('« Nouvelle base » en mode construire : lancer la rédaction depuis le plan', () => {
  it('trois vues : Plan, Articles rédigés, Points non couverts ; le plan d\'abord', async () => {
    show();
    const tabs = await screen.findAllByRole('tab');
    expect(tabs.map(t => t.textContent)).toEqual(['Plan', 'Articles rédigés', 'Points non couverts']);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('sous le plan, « Rédiger les 3 articles » lance la rédaction et montre l\'avancement', async () => {
    vi.mocked(onboardingApi.launchBuild).mockImplementation(async () => {
      vi.mocked(onboardingApi.listBuilds).mockResolvedValue({
        data: [buildRow({ status: 'running', stage: 'build', done: 1, total: 3, finishedAt: null })],
        meta: { quota: { used: 1, max: 30 }, launch: { allowed: false, code: 'BUILD_IN_PROGRESS', message: 'Une rédaction est déjà en cours.' } },
      });
      return buildRow({ status: 'queued', stage: null });
    });
    show();
    const entry = await screen.findByRole('region', { name: 'Rédaction des articles' });
    expect(within(entry).getByText(/Ce que vos documents ne disent pas n'est jamais écrit/)).toBeInTheDocument();
    expect(within(entry).getByText('Environ 5 à 10 minutes. Vous pourrez fermer cette page.')).toBeInTheDocument();
    fireEvent.click(within(entry).getByRole('button', { name: 'Rédiger les 3 articles' }));
    await waitFor(() => expect(onboardingApi.launchBuild).toHaveBeenCalledWith('p1', PLAN.planId));
    expect(await screen.findByRole('heading', { name: 'Rédaction en cours' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Articles rédigés' })).toHaveAttribute('aria-selected', 'true');
    const step = screen.getByText('Rédaction des articles', { selector: '.obp-step__label' }).closest('li')!;
    expect(step).toHaveClass('obp-step--current');
    expect(within(step).getByText('1 / 3')).toBeInTheDocument();
    expect(screen.getByText(/Vous pouvez fermer cette page : la rédaction continue/)).toBeInTheDocument();
  });

  it('réponses changées depuis le plan (C-Q1) : bouton grisé, avec le message du back', async () => {
    const message = 'Vos réponses dans « À clarifier » ont changé depuis ce plan : préparez le plan à nouveau, puis lancez la rédaction.';
    mock([], { allowed: false, code: 'ANSWERS_CHANGED', message });
    show();
    const entry = await screen.findByRole('region', { name: 'Rédaction des articles' });
    expect(await within(entry).findByRole('button', { name: 'Rédiger les 3 articles' })).toBeDisabled();
    expect(within(entry).getByRole('status')).toHaveTextContent(message);
  });

  it('une rédaction prête : « Voir les articles rédigés » et « Rédiger à nouveau », avec confirmation', async () => {
    mock([buildRow()]);
    vi.mocked(onboardingApi.launchBuild).mockResolvedValue(buildRow({ id: 'b2', status: 'queued', stage: null }));
    show();
    const entry = await screen.findByRole('region', { name: 'Rédaction des articles' });
    expect(await within(entry).findByRole('button', { name: 'Voir les articles rédigés' })).toBeInTheDocument();
    fireEvent.click(within(entry).getByRole('button', { name: 'Rédiger à nouveau' }));
    expect(screen.getByText('Rédiger à nouveau les articles ?')).toBeInTheDocument();
    expect(onboardingApi.launchBuild).not.toHaveBeenCalled();
  });

  it('pipeline qui ne connaît pas encore la tâche : l\'échec se dit en clair, hors quota, et se relance', async () => {
    mock([buildRow({ status: 'failed', stage: null, errorCode: 'build_not_supported', finishedAt: null })]);
    const { container } = show();
    const entry = await screen.findByRole('region', { name: 'Rédaction des articles' });
    expect(await within(entry).findByText(/La rédaction n'est pas encore disponible : réessayez plus tard\. Elle ne compte pas dans votre quota/)).toBeInTheDocument();
    expect(within(entry).getByRole('button', { name: 'Rédiger les 3 articles' })).toBeEnabled();
    await openTab('Articles rédigés');
    expect(await screen.findByRole('heading', { name: 'Rédaction interrompue' })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(TECHNICAL);
  });
});

describe('« Articles rédigés » : chaque passage avec ses sources', () => {
  it('par catégorie, chaque article : question, public, blocs, sources, sans aucun code', async () => {
    mock([buildRow()]);
    const { container } = show();
    await openTab('Articles rédigés');
    expect(await screen.findByText('6 articles · 2 phrases à vérifier · 1 texte saisi par l\'expert · 5 points non couverts')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Articles rédigés le .*, à partir du plan du / })).toBeInTheDocument();
    expect(screen.getByText('Catégorie 1 · Offres et prix')).toBeInTheDocument();

    const prix = screen.getByRole('heading', { name: 'Prix d\'Elyra Fixe 2 ans' }).closest('article')!;
    expect(within(prix).getByText('Cet article répondra à : Quel est le prix du kWh d\'Elyra Fixe 2 ans ?')).toBeInTheDocument();
    expect(within(prix).getByText('Public : particuliers')).toBeInTheDocument();
    expect(prix.querySelector('.obp-build-table')).toHaveTextContent('Elyra Fixe 2 ans');
    expect(within(prix).getAllByText('Sources (1)')).toHaveLength(2);
    expect(within(prix).getAllByText('Grille_Tarifaire_Particuliers_v2_2026-09-01.pdf').length).toBeGreaterThan(0);

    expect(container.textContent).not.toMatch(/[Cc]hapitre|[Ss]ujet/);
    expect(container.textContent).not.toMatch(TECHNICAL);
    expect(screen.getByText('La création des articles dans votre base arrive bientôt.')).toBeInTheDocument();
  });

  it('une phrase qui relie deux passages est surlignée « À vérifier », avec sa raison (cas Pro Sérénité / parrainage)', async () => {
    mock([buildRow()]);
    show();
    await openTab('Articles rédigés');
    const parrainage = (await screen.findByRole('heading', { name: 'Le parrainage' })).closest('article')!;
    const marked = [...parrainage.querySelectorAll('mark.obp-base-verify')].map(m => m.textContent);
    expect(marked).toContain('À vérifier : La remise s\'applique si le filleul souscrit Elyra Pro Sérénité.');
    expect(within(parrainage).getByText(/cette phrase relie deux passages différents de vos documents/)).toBeInTheDocument();
    expect(within(parrainage).getByText('Sources (2)')).toBeInTheDocument();
    expect(within(parrainage).getByText('Argumentaire_Commercial_TPE_Artisans.docx')).toBeInTheDocument();
  });

  it('le texte de l\'expert, mot pour mot, « saisi par l\'expert le … », sans source de document', async () => {
    mock([buildRow()]);
    show();
    await openTab('Articles rédigés');
    const parrainage = (await screen.findByRole('heading', { name: 'Le parrainage' })).closest('article')!;
    const expert = parrainage.querySelector('.obp-build-expert')!;
    expect(expert).toHaveTextContent('Précision de l\'expert');
    expect(expert).toHaveTextContent('« Le parrainage est limité à 10 filleuls par an et par parrain. »');
    expect(expert).toHaveTextContent('Saisi par l\'expert le 13/11/2026.');
    expect(within(expert as HTMLElement).getByRole('button', { name: 'Montant de la remise du programme de parrainage' })).toBeInTheDocument();
    expect(within(expert as HTMLElement).queryByText(/Sources/)).not.toBeInTheDocument();
  });

  it('ce qui a été retiré, replié, avec sa raison et la carte qui l\'a décidé', async () => {
    mock([buildRow()]);
    show();
    await openTab('Articles rédigés');
    const parrainage = (await screen.findByRole('heading', { name: 'Le parrainage' })).closest('article')!;
    const removed = within(parrainage).getByText('Retiré de cet article (1)').closest('details')!;
    expect(removed).toHaveTextContent('passage écarté par votre réponse à la carte « Montant de la remise du programme de parrainage ».');
    expect(removed).toHaveTextContent('Flyer_Parrainage_Octobre2026.pptx');
  });

  it('un article sans texte le dit, et renvoie aux points non couverts', async () => {
    mock([buildRow()]);
    show();
    await openTab('Articles rédigés');
    const tarifs = (await screen.findByRole('heading', { name: 'Tarifs 2025' })).closest('article')!;
    expect(tarifs).toHaveTextContent('Aucun texte gardé : toutes ses sources sont écartées par vos réponses.');
    fireEvent.click(within(tarifs).getByRole('button', { name: 'Voir les points non couverts' }));
    expect(await screen.findByRole('heading', { name: 'Points non couverts par vos documents (5)' })).toBeInTheDocument();
  });

  it('un commentaire par article et un pour la rédaction, jamais dans la base', async () => {
    mock([buildRow()]);
    vi.mocked(onboardingApi.commentBuild).mockImplementation(async (_p, _b, body) => ({
      id: `c-${body.subjectId ?? 'build'}`, subjectId: body.subjectId, comment: body.comment, supersedesId: null,
      author: { id: 'u1', name: 'Camille Martin' }, createdAt: '2026-11-14T11:30:00Z', cancelledAt: null, cancelledBy: null,
    }));
    show();
    await openTab('Articles rédigés');
    const parrainage = (await screen.findByRole('heading', { name: 'Le parrainage' })).closest('article')!;
    fireEvent.change(within(parrainage).getByLabelText('Commentaire sur cet article (facultatif)'), { target: { value: 'Phrase fausse.' } });
    fireEvent.click(within(parrainage).getByRole('button', { name: 'Enregistrer le commentaire' }));
    await waitFor(() => expect(onboardingApi.commentBuild).toHaveBeenCalledWith('p1', BUILD.buildId, {
      subjectId: 'sub_parrainage', expectedCurrentId: null, comment: 'Phrase fausse.',
    }));
    expect(onboardingApi.commentPlan).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Commentaire sur la rédaction (facultatif)')).toBeInTheDocument();
    expect(screen.getAllByText('Pour l\'équipe Knowdesk seulement : ce commentaire n\'entre jamais dans la base.').length).toBeGreaterThan(1);
  });
});

describe('« Points non couverts par vos documents »', () => {
  it('les cartes sans article en tête, puis les informations absentes, les articles sans texte, les points non tranchés', async () => {
    mock([buildRow()]);
    const { container } = show();
    await openTab('Points non couverts (5)');
    const list = await screen.findByRole('region', { name: 'Points non couverts par vos documents (5)' });
    expect([...list.querySelectorAll('h3')].map(h => h.textContent)).toEqual([
      'Cartes sans article (1)', 'Informations absentes de vos documents (2)', 'Articles sans texte (1)', 'Points non tranchés (1)',
    ]);
    expect(within(list).getByText(/Ce que vos documents ne donnent pas n'est jamais écrit dans un article/)).toBeInTheDocument();
    const card = within(list).getByText('Date d\'ouverture des souscriptions pour Elyra Vert Local').closest('li')!;
    expect(card).toHaveTextContent('carte bloquante');
    expect(card).toHaveTextContent('votre réponse n\'apparaît dans aucun article');
    expect(within(card).getByText('Passages (2)')).toBeInTheDocument();
    expect(within(list).getByText('Signalé par la rédaction : aucune source de cet article ne donne cette information.')).toBeInTheDocument();
    expect(within(list).getByText('Une résiliation avant 12 mois coûte 75 € TTC.')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(TECHNICAL);
  });

  it('C-Q3 : une carte sans article montre la réponse retenue et sa date (décision nommée par le point)', async () => {
    const vertLocal = (AUDIT.reading.cards.find(c => c.id === VERT_LOCAL)!).sides;
    const crSide = vertLocal.find(side => JSON.stringify(side).includes('doc_cr_comite_offres'))!.label;
    mock([buildRow()], { allowed: true }, AUDIT, [decision('dec_vert_local', VERT_LOCAL, { type: 'accept_side', side: crSide })]);
    show();
    await openTab('Points non couverts (5)');
    const card = (await screen.findByText('Date d\'ouverture des souscriptions pour Elyra Vert Local')).closest('li')!;
    expect(await within(card).findByText(`Votre réponse : Côté ${crSide} retenu : CR_Comite_Offres_2026-09-22.docx (13/11/2026)`)).toBeInTheDocument();
  });

  it('C-Q3 : le texte de l\'expert, mot pour mot, « saisi par l\'expert le … », écrit dans aucun article', async () => {
    const built = JSON.parse(JSON.stringify(BUILD)) as BuildContent & { construction: { uncovered: Array<Record<string, unknown>> } };
    built.construction.uncovered[0].expert = {
      card_id: VERT_LOCAL, decision_id: 'dec_vert_local', text: 'Ouverture des souscriptions le 1er novembre 2026.', entered_on: '2026-11-13',
    };
    mock([buildRow()], { allowed: true }, AUDIT, [decision('dec_vert_local', VERT_LOCAL, { type: 'other_answer', text: 'Ouverture des souscriptions le 1er novembre 2026.' })]);
    vi.mocked(onboardingApi.getBuildContent).mockResolvedValue(built);
    show();
    await openTab('Points non couverts (5)');
    const card = (await screen.findByText('Date d\'ouverture des souscriptions pour Elyra Vert Local')).closest('li')!;
    expect(await within(card).findByText('Votre réponse : Autre réponse (13/11/2026)')).toBeInTheDocument();
    expect(within(card).getByText('« Ouverture des souscriptions le 1er novembre 2026. »')).toBeInTheDocument();
    expect(card).toHaveTextContent('Saisi par l\'expert le 13/11/2026. Ce texte n\'est écrit dans aucun article.');
  });

  it('C-Q3 : sans décision connue pour la carte, aucune réponse affichée', async () => {
    mock([buildRow()]);
    show();
    await openTab('Points non couverts (5)');
    const card = (await screen.findByText('Date d\'ouverture des souscriptions pour Elyra Vert Local')).closest('li')!;
    expect(card).toHaveTextContent('votre réponse n\'apparaît dans aucun article');
    expect(within(card).queryByText(/^Votre réponse :/)).not.toBeInTheDocument();
  });

  it('« Voir la carte » ouvre la carte ; « Voir l\'article » ouvre l\'article dans « Articles rédigés »', async () => {
    mock([buildRow()]);
    const onGoToClarify = vi.fn();
    render(<BaseTab project={project} onGoToClarify={onGoToClarify} />);
    await openTab('Points non couverts (5)');
    const list = await screen.findByRole('region', { name: 'Points non couverts par vos documents (5)' });
    fireEvent.click(within(list).getAllByRole('button', { name: 'Voir la carte' })[0]);
    expect(onGoToClarify).toHaveBeenCalledWith('card_1b9961bd7843699b');
    fireEvent.click(within(list).getAllByRole('button', { name: 'Voir l\'article' })[0]);
    expect(screen.getByRole('tab', { name: 'Articles rédigés' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('heading', { name: 'Frais de résiliation' })).toBeInTheDocument();
  });

  it('sans rédaction : rien à lister, retour au plan', async () => {
    show();
    await openTab('Points non couverts');
    expect(await screen.findByText('Aucun article rédigé pour l\'instant')).toBeInTheDocument();
  });
});

describe('Ailleurs, rien ne change', () => {
  it('mode correction : ni vues de la rédaction, ni appel aux rédactions', async () => {
    const correct = { ...AUDIT, reading: { ...AUDIT.reading, base: { ...AUDIT.reading.base, mode: 'correct' } } } as AuditResponse;
    mock([], { allowed: true }, correct);
    show();
    await waitFor(() => expect(onboardingApi.listCorrections).toHaveBeenCalled());
    expect(screen.queryByRole('tab', { name: 'Articles rédigés' })).not.toBeInTheDocument();
    expect(onboardingApi.listBuilds).not.toHaveBeenCalled();
    expect(onboardingApi.listPlans).not.toHaveBeenCalled();
  });
});

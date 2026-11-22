import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('../../api/onboardingApi', () => ({
  onboardingApi: {
    listAnalyses: vi.fn(), getAudit: vi.fn(), listAuditImages: vi.fn(), getAuditImage: vi.fn(), listDecisions: vi.fn(),
    listCorrections: vi.fn(), launchCorrection: vi.fn(), getBase: vi.fn(),
    listPlans: vi.fn(), getPlanEdits: vi.fn(), editPlan: vi.fn(), undoPlanEdit: vi.fn(), resetPlanEdits: vi.fn(), launchPlan: vi.fn(), getPlanContent: vi.fn(), listPlanComments: vi.fn(),
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
import BUILD_ELYRA_03 from './fixtures/construction-0.3.0-elyra-2026-11-22.response.json';

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

beforeEach(() => {
  // Back d'avant l'étape 4 : pas de plan modifié, le plan proposé se lit.
  vi.mocked(onboardingApi.getPlanEdits).mockRejectedValue(new Error('route absente'));
  mock();
});
afterEach(() => { vi.clearAllMocks(); });

describe('« Nouvelle base » en mode construire : lancer la rédaction depuis le plan', () => {
  it('deux vues : Plan, Articles rédigés (C-Q11 : plus de « Points non couverts ») ; le plan d\'abord', async () => {
    show();
    const tabs = await screen.findAllByRole('tab');
    expect(tabs.map(t => t.textContent)).toEqual(['Plan', 'Articles rédigés']);
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
  it('public de chaque article (18/11) : étiquette de la liste fermée et filtre ; « tous » sous les deux filtres', async () => {
    const build = JSON.parse(JSON.stringify(BUILD)) as typeof BUILD;
    const articles = (build.construction as { articles: Array<{ subject_id: string; audience: string | null }> }).articles;
    for (const a of articles) {
      if (a.subject_id === 'sub_parrainage') a.audience = 'professionnels';
      if (a.subject_id === 'sub_horaires') a.audience = 'tous';
    }
    mock([buildRow()]);
    vi.mocked(onboardingApi.getBuildContent).mockResolvedValue(build);
    show();
    await openTab('Articles rédigés');
    const horaires = (await screen.findByRole('heading', { name: 'Horaires du service client' })).closest('article')!;
    expect(within(horaires).getByText('Particuliers et professionnels')).toHaveClass('obp-audience--tous');
    const filters = screen.getByRole('group', { name: 'Filtrer les articles par public' });
    expect(within(filters).getByRole('button', { name: /^Professionnels/ })).toHaveTextContent('Professionnels2');
    fireEvent.click(within(filters).getByRole('button', { name: /^Professionnels/ }));
    expect(screen.getByRole('heading', { name: 'Le parrainage' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Horaires du service client' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Prix d\'Elyra Fixe 2 ans' })).not.toBeInTheDocument();
    // Un article sans public de la liste fermée (« Tarifs 2025 ») ne s'affiche que sans filtre.
    expect(screen.queryByRole('heading', { name: 'Tarifs 2025' })).not.toBeInTheDocument();
    fireEvent.click(within(filters).getByRole('button', { name: /^Tous les publics/ }));
    expect(screen.getByRole('heading', { name: 'Tarifs 2025' })).toBeInTheDocument();
  });

  it('construction 0.2.0 (18/11, Q2 a) : un bloc d\'un article commun dit son public, texte inchangé ; une rédaction 0.1.0 n\'en montre aucun', async () => {
    const build = JSON.parse(JSON.stringify(BUILD)) as typeof BUILD;
    (build as { schemaVersion: string }).schemaVersion = '0.2.0';
    const construction = build.construction as {
      schema_version: string;
      articles: Array<{ subject_id: string; audience: string | null; blocks: Array<{ kind: string; origin: string; text?: string; audience?: string }> }>;
    };
    construction.schema_version = '0.2.0';
    const horaires = construction.articles.find(a => a.subject_id === 'sub_horaires')!;
    horaires.audience = 'tous';
    const block = horaires.blocks.find(b => b.origin === 'document' && b.kind !== 'intertitle')!;
    block.audience = 'professionnels';
    mock([buildRow()]);
    vi.mocked(onboardingApi.getBuildContent).mockResolvedValue(build);
    show();
    await openTab('Articles rédigés');
    const article = (await screen.findByRole('heading', { name: 'Horaires du service client' })).closest('article')!;
    const mention = within(article).getByLabelText('Public de ce passage');
    expect(within(mention).getByText('Professionnels')).toHaveClass('obp-audience--professionnels');
    expect(within(article).getAllByLabelText('Public de ce passage')).toHaveLength(1);
    if (block.text) expect(article.textContent).toContain(block.text);
  });

  it('une rédaction 0.1.0 ne montre aucun public de passage', async () => {
    mock([buildRow()]);
    show();
    await openTab('Articles rédigés');
    await screen.findByRole('heading', { name: 'Horaires du service client' });
    expect(screen.queryByLabelText('Public de ce passage')).not.toBeInTheDocument();
  });

  it('étape 4 : une rédaction d\'un plan modifié le dit dans l\'en-tête ; sans modification, ou avant la migration du back, rien', async () => {
    mock([buildRow({ planEditCount: 3 })]);
    const { unmount } = show();
    await openTab('Articles rédigés');
    expect(await screen.findByRole('heading', { name: /^Articles rédigés le .*, à partir du plan du .*, modifié \(3 modifications\)$/ })).toBeInTheDocument();
    unmount();
    for (const count of [0, null]) {
      mock([buildRow({ planEditCount: count })]);
      const view = show();
      await openTab('Articles rédigés');
      expect(await screen.findByRole('heading', { name: /^Articles rédigés le / })).not.toHaveTextContent('modifié');
      view.unmount();
    }
  });

  it('étape 5 (voie A) : les passages qui se suivent forment un paragraphe, sources par phrase d\'origine ; redites retirées repliées', async () => {
    const BUILD_03 = BUILD_ELYRA_03 as unknown as BuildContent;
    mock([buildRow({ id: BUILD_03.buildId })]);
    vi.mocked(onboardingApi.getBuildContent).mockResolvedValue(BUILD_03);
    const { container } = show();
    await openTab('Articles rédigés');
    const fixe = (await screen.findByRole('heading', { name: 'Elyra Fixe 2 ans' })).closest('article')!;
    // Cinq passages de « Caractéristiques de l'offre », un seul paragraphe, mot pour mot.
    const paragraph = within(fixe).getByText(/^L'offre Elyra Fixe 2 ans s'adresse aux particuliers .* Il n'y a aucun engagement : le client peut résilier à tout moment\.$/);
    expect(paragraph.tagName).toBe('P');
    const sources = paragraph.closest('.obp-build-paragraph')!.querySelector('details')!;
    expect(within(sources as HTMLElement).getByText(/^Sources \(\d+\)$/)).toBeInTheDocument();
    expect(within(sources as HTMLElement).getAllByText(/^D'après « /)).toHaveLength(5);
    // La phrase à vérifier reste à part, surlignée.
    expect(within(fixe).getByText('Ces prix sont valables à partir du 1er septembre 2026 et n\'incluent pas les évolutions des taxes et du TURPE.').closest('mark')).not.toBeNull();

    const gamme = screen.getByRole('heading', { name: 'Gamme Professionnels 2026' }).closest('article')!;
    const dups = within(gamme).getByText('Redites retirées (2)').closest('details')!;
    expect(dups).not.toHaveAttribute('open');
    expect(within(dups as HTMLElement).getByText(/« L'offre Elyra Pro Flex est engagée pour 1 an\. » : déjà dans le tableau, ligne « Elyra Pro Flex \| Électricité \| Indexé spot \+ marge \| 1 an »\./)).toBeInTheDocument();
    expect(within(gamme).queryByText(/^Retiré de cet article/)).not.toBeInTheDocument();
    expect(within(gamme).queryByText('L\'offre Elyra Pro Flex est engagée pour 1 an.', { selector: 'p' })).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\b(card|sub|ch|doc|blk|pt)_|duplicate|kept_block/);
  });

  it('par catégorie, chaque article : question, public, blocs, sources, sans aucun code', async () => {
    mock([buildRow()]);
    const { container } = show();
    await openTab('Articles rédigés');
    expect(await screen.findByText('6 articles · 2 phrases à vérifier · 1 texte saisi par l\'expert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Articles rédigés le .*, à partir du plan du / })).toBeInTheDocument();
    expect(screen.getByText('Catégorie 1 · Offres et prix')).toBeInTheDocument();

    const prix = screen.getByRole('heading', { name: 'Prix d\'Elyra Fixe 2 ans' }).closest('article')!;
    expect(within(prix).getByText('Cet article répondra à : Quel est le prix du kWh d\'Elyra Fixe 2 ans ?')).toBeInTheDocument();
    expect(within(prix).getByText('Particuliers')).toHaveClass('obp-audience');
    // Une valeur libre d'une rédaction plus ancienne s'affiche comme avant.
    expect(screen.getByText('Public : conseillers')).toBeInTheDocument();
    expect(prix.querySelector('.obp-build-table')).toHaveTextContent('Elyra Fixe 2 ans');
    expect(within(prix).getAllByText('Sources (1)')).toHaveLength(2);
    expect(within(prix).getAllByText('Grille_Tarifaire_Particuliers_v2_2026-09-01.pdf').length).toBeGreaterThan(0);

    expect(container.textContent).not.toMatch(/[Cc]hapitre|[Ss]ujet/);
    expect(container.textContent).not.toMatch(TECHNICAL);
    // Lot D : la création de la base n'est proposée qu'avec le module « knowledge » (absent ici).
    expect(screen.queryByText('La création des articles dans votre base arrive bientôt.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Créer la base de connaissance' })).not.toBeInTheDocument();
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

  it('décision A (16/11) : « valeur non retenue », avec un lien vers la carte', async () => {
    mock([buildRow()]);
    const onGoToClarify = vi.fn();
    render(<BaseTab project={project} onGoToClarify={onGoToClarify} />);
    await openTab('Articles rédigés');
    const prix = (await screen.findByRole('heading', { name: 'Prix d\'Elyra Fixe 2 ans' })).closest('article')!;
    const removed = within(prix).getByText(/^Retiré de cet article/).closest('details')!;
    expect(removed).toHaveTextContent('« La fiche offre indique 0,1925 € TTC le kWh. » : valeur non retenue par votre réponse à la carte « Écart entre documents : ELYRA FIXE 2 ANS ».');
    fireEvent.click(within(removed).getByRole('button', { name: 'Écart entre documents : ELYRA FIXE 2 ANS' }));
    expect(onGoToClarify).toHaveBeenCalledWith('card_cb3ece6251e02e32');
  });

  it('un article sans texte le dit, sans renvoi ailleurs', async () => {
    mock([buildRow()]);
    show();
    await openTab('Articles rédigés');
    const tarifs = (await screen.findByRole('heading', { name: 'Tarifs 2025' })).closest('article')!;
    expect(tarifs).toHaveTextContent('Aucun texte gardé : toutes ses sources sont écartées par vos réponses.');
    expect(within(tarifs).queryByRole('button', { name: /points non couverts/i })).not.toBeInTheDocument();
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

describe('C-Q11 : les réponses de l\'expert qui ne figurent dans aucun article, rien d\'autre', () => {
  it('un encart en tête de « Articles rédigés » : le titre de chaque carte, avec un lien vers elle', async () => {
    mock([buildRow()]);
    const onGoToClarify = vi.fn();
    const { container } = render(<BaseTab project={project} onGoToClarify={onGoToClarify} />);
    await openTab('Articles rédigés');
    const box = await screen.findByRole('region', { name: '1 de vos réponses ne figure dans aucun article' });
    expect(box.compareDocumentPosition(screen.getByText('Catégorie 1 · Offres et prix')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(box).getAllByRole('listitem')).toHaveLength(1);
    fireEvent.click(within(box).getByRole('button', { name: 'Date d\'ouverture des souscriptions pour Elyra Vert Local' }));
    expect(onGoToClarify).toHaveBeenCalledWith(VERT_LOCAL);
    expect(container.textContent).not.toMatch(TECHNICAL);
  });

  it('les suggestions de l\'IA ne s\'affichent nulle part ; une phrase retirée reste sous son article', async () => {
    mock([buildRow()]);
    const { container } = show();
    await openTab('Articles rédigés');
    const article = (await screen.findByRole('heading', { name: 'Frais de résiliation' })).closest('article')!;
    expect(container.textContent).not.toMatch(/Précisions? à apporter|Points non couverts|Le délai de prise en compte/);
    expect(screen.queryByText(/Signalé(e)?s? par la rédaction/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Points non tranchés|Informations absentes/)).not.toBeInTheDocument();
    const removed = within(article).getByText(/^Retiré de cet article/).closest('details')!;
    expect(removed).toHaveTextContent('Une résiliation avant 12 mois coûte 75 € TTC.');
  });

  it('aucune réponse sans article : pas d\'encart', async () => {
    const built = JSON.parse(JSON.stringify(BUILD)) as BuildContent & { construction: { uncovered: Array<Record<string, unknown>> } };
    built.construction.uncovered = built.construction.uncovered.filter(p => p.kind !== 'card_without_article');
    mock([buildRow()]);
    vi.mocked(onboardingApi.getBuildContent).mockResolvedValue(built);
    show();
    await openTab('Articles rédigés');
    await screen.findByText('Catégorie 1 · Offres et prix');
    expect(screen.queryByText(/de vos réponses ne figur/)).not.toBeInTheDocument();
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

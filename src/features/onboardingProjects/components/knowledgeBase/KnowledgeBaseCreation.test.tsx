import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('../../api/onboardingApi', () => ({
  onboardingApi: {
    getValidation: vi.fn(), listAuditImages: vi.fn(), getAuditImage: vi.fn(), listValidations: vi.fn(), validateBase: vi.fn(),
    previewKnowledgeBase: vi.fn(), createKnowledgeBase: vi.fn(), getKnowledgeBaseCreation: vi.fn(), getLatestKnowledgeBaseCreation: vi.fn(),
  },
}));

import { onboardingApi } from '../../api/onboardingApi';
import { ApiError } from '../../../../shared/lib/apiClient';
import { KnowledgeBaseCreationView, KNOWLEDGE_BASE_POLL_MS } from './KnowledgeBaseCreationView';
import { CleanBaseView } from '../base/CleanBaseView';
import { ValidationPanel } from '../base/ValidationPanel';
import {
  creationErrorMessage, creationSteps, creationToReopen, type KnowledgeBaseCreation, type LatestKnowledgeBaseCreation,
} from '../../lib/knowledgeBase';
import type { Validation, ValidationSummary } from '../../lib/correction';

// Réponses réelles du back de main (9efcffe) lancé en local, enregistrées le 2026-10-20 : version propre
// v5 du pilote avec le chapitre 16 (tests/fixtures/knowledge-base du back), titres rejoués depuis
// l'enregistrement du lot 1 (0 $), stockage S3 local. Chaque fichier : { status, body }.
import PREVIEW from './fixtures/kb-preview-vide.response.json';
import CREATE from './fixtures/kb-create-vide.response.json';
import RUNNING from './fixtures/kb-get-running.response.json';
import SUCCEEDED from './fixtures/kb-get-succeeded.response.json';
import CREATE_RUNNING from './fixtures/kb-create-vide-encore.response.json';
import CREATE_DONE from './fixtures/kb-create-vide-deja.response.json';
import PREVIEW_NOT_EMPTY from './fixtures/kb-preview-non-vide.response.json';
import CREATE_NOT_EMPTY from './fixtures/kb-create-non-vide.response.json';
import PREVIEW_NO_MODULE from './fixtures/kb-preview-sans-module.response.json';
import PREVIEW_MANAGER from './fixtures/kb-preview-manager.response.json';
import CREATE_MANAGER from './fixtures/kb-create-manager.response.json';
import FAILED from './fixtures/kb-get-failed.response.json';
import RESUME from './fixtures/kb-resume-echec.response.json';
import RESUMED_SUCCEEDED from './fixtures/kb-get-resumed-succeeded.response.json';
import LIST_VALIDATIONS from './fixtures/kb-list-validations.response.json';
// Dernière création du projet (KnowDesk#55, back de la PR lancé en local) : un échec retrouvé malgré
// un aperçu préparé ensuite ailleurs, puis repris.
import LATEST_NULL from './fixtures/kb-latest-null.response.json';
import LATEST_PREVIEWED from './fixtures/kb-latest-previewed.response.json';
import LATEST_FAILED from './fixtures/kb-latest-failed.response.json';
import LATEST_FAILED_MANAGER from './fixtures/kb-latest-failed-manager.response.json';
import LATEST_SUCCEEDED from './fixtures/kb-latest-succeeded.response.json';
import LATEST_OTHER_ORG from './fixtures/kb-latest-other-org.response.json';
import PREVIEW_2 from './fixtures/kb-preview-echec2.response.json';
import PREVIEW_ELSEWHERE from './fixtures/kb-preview-echec-autre.response.json';
import FAILED_2 from './fixtures/kb-get-failed2.response.json';
import RESUME_2 from './fixtures/kb-resume-echec2.response.json';
import RESUMED_SUCCEEDED_2 from './fixtures/kb-get-resumed-succeeded2.response.json';

interface Recorded { status: number; body: { data: unknown; error: { code: string; message: string } | null } }
/** Ce que rend `apiClient` pour une réponse enregistrée : les données, ou l'ApiError du code. */
const ok = <T,>(r: Recorded) => r.body.data as T;
const refusal = (r: Recorded) => new ApiError(r.body.error!.code, r.body.error!.message, r.status);
const creation = (r: Recorded) => ok<KnowledgeBaseCreation>(r);

const VALIDATION_ID = (PREVIEW.body.data as { validation: { id: string } }).validation.id;
const CREATION_ID = (PREVIEW.body.data as { creationId: string }).creationId;
const validation = (upToDate: boolean | null): Validation => ({
  id: VALIDATION_ID, correctionId: 'c1', version: 1, validatedByName: 'Experte', validatedAt: '2026-10-20T16:00:00Z', upToDate,
  analysisId: 'a1', content: { format: 1, sheets: [] },
});
/** La liste des versions de la correction : seule elle dit si la version est à jour. */
const listed = (upToDate: boolean | null) => ok<ValidationSummary[]>(LIST_VALIDATIONS).map(v => ({ ...v, id: VALIDATION_ID, upToDate }));
const TECHNICAL = /costUsd|creation_failed|KNOWLEDGE_|FORBIDDEN|img_|table_of_contents|dryRun/;

function renderView(props: Partial<React.ComponentProps<typeof KnowledgeBaseCreationView>> = {}) {
  const onBack = vi.fn();
  const onOpenKnowledge = vi.fn();
  const utils = render(
    <KnowledgeBaseCreationView projectId="p1" validationId={VALIDATION_ID} isAdmin knowledgeEnabled
      onBack={onBack} onOpenKnowledge={onOpenKnowledge} {...props} />,
  );
  return { ...utils, onBack, onOpenKnowledge };
}

/** Avance d'un tour de relecture (usePolling). */
const tick = () => act(async () => { await vi.advanceTimersByTimeAsync(KNOWLEDGE_BASE_POLL_MS); });

describe('Créer la base de connaissance (plan-articles-v1, lot 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    // Comme le back : la version seule rend toujours upToDate nul ; la liste le calcule.
    vi.mocked(onboardingApi.getValidation).mockResolvedValue(validation(null));
    vi.mocked(onboardingApi.listValidations).mockResolvedValue(listed(true));
    vi.mocked(onboardingApi.previewKnowledgeBase).mockResolvedValue(ok(PREVIEW));
    vi.mocked(onboardingApi.getLatestKnowledgeBaseCreation).mockResolvedValue(ok(LATEST_NULL));
  });
  afterEach(() => { vi.useRealTimers(); });

  it('aperçu : nombres, catégories dans l\'ordre avec leurs articles, exemples de titres, ce qui n\'est pas importé, limite', async () => {
    const { container } = renderView();
    expect(await screen.findByRole('button', { name: 'Créer la base de connaissance' })).toBeEnabled();
    expect(onboardingApi.previewKnowledgeBase).toHaveBeenCalledWith('p1', VALIDATION_ID);

    const stats = container.querySelector('.obp-analysis__stats')!;
    expect(stats).toHaveTextContent('Catégories15');
    expect(stats).toHaveTextContent('Articles32');
    expect(stats).toHaveTextContent('FAQ23');
    expect(stats).toHaveTextContent('Synonymes6');

    const categories = within(screen.getByRole('region', { name: 'Catégories, dans l\'ordre' }))
      .getAllByRole('listitem').map(li => li.textContent);
    expect(categories).toHaveLength(15);
    expect(categories[0]).toBe('Présentation d\'Alviva Mutuelle et de l\'offre · 3 articles');
    expect(categories[5]).toBe('Réclamations et litiges · 1 article');
    expect(categories[13]).toBe('Cas pratiques résolus · 10 articles');
    expect(categories[14]).toBe('Téléconsultation médicale · 1 article');

    expect(screen.getByText('Adhésion et délais de carence : cas particuliers, documents et erreurs à éviter')).toBeInTheDocument();
    expect(screen.getByText(/10 articles regroupent plusieurs sections/)).toBeInTheDocument();
    expect(screen.getByText('Base de connaissance interne — Alviva Mutuelle (sommaire, avec « Comment utiliser cette base » et l\'historique)')).toBeInTheDocument();
    expect(screen.getByText('Chapitre 14 — FAQ transverse (importée question par question dans les FAQ)')).toBeInTheDocument();
    expect(screen.getByText(/0 aujourd'hui, 32 après la création \(limite de 50/)).toBeInTheDocument();
    expect(screen.getByText(/1 renvoi « chapitre N » n'a pas trouvé son article/)).toBeInTheDocument();
    expect(screen.getByText(/Aucune validation article par article/)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(TECHNICAL);
    // L'aperçu est retenu : la page rechargée le relit sans en préparer un autre.
    expect(window.localStorage.getItem(`knowdesk.kbCreation.${VALIDATION_ID}`)).toBe(CREATION_ID);
  });

  it('confirmation courte (publiés en interne, pas le chatbot public), puis progression et lien vers la base', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(onboardingApi.createKnowledgeBase).mockResolvedValue(creation(CREATE));
    const { onOpenKnowledge } = renderView();
    fireEvent.click(await screen.findByRole('button', { name: 'Créer la base de connaissance' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('32 articles et 23 FAQ seront publiés en interne : votre équipe les verra dans la base de connaissance, le chatbot public ne les verra pas.');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Annuler' }));
    expect(onboardingApi.createKnowledgeBase).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Créer la base de connaissance' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Créer' }));
    expect(await screen.findByRole('heading', { name: 'Création en attente de démarrage' })).toBeInTheDocument();
    expect(onboardingApi.createKnowledgeBase).toHaveBeenCalledWith('p1', VALIDATION_ID, CREATION_ID);
    expect(screen.getByText(/Vous pouvez quitter cette page/)).toBeInTheDocument();

    vi.mocked(onboardingApi.getKnowledgeBaseCreation).mockResolvedValue(creation(RUNNING));
    await tick();
    expect(await screen.findByRole('heading', { name: 'Création en cours' })).toBeInTheDocument();
    const steps = screen.getAllByRole('listitem').map(li => li.textContent);
    expect(steps).toEqual([
      'Catégories15 / 15 : terminée', 'Articles publiés2 / 32 : en cours', 'FAQ0 / 23 : à venir', 'Synonymes0 / 6 : à venir',
    ]);

    vi.mocked(onboardingApi.getKnowledgeBaseCreation).mockResolvedValue(creation(SUCCEEDED));
    await tick();
    const result = await screen.findByText(/^Base de connaissance créée le /);
    expect(result).toHaveTextContent('depuis la version validée n° 1 : 32 articles publiés, 23 FAQ, 15 catégories, 6 synonymes.');
    expect(screen.getByText(/le chatbot public ne les voit pas/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir la base de connaissance' }));
    expect(onOpenKnowledge).toHaveBeenCalled();
    // Plus de relecture une fois la création finie.
    const calls = vi.mocked(onboardingApi.getKnowledgeBaseCreation).mock.calls.length;
    await tick();
    expect(onboardingApi.getKnowledgeBaseCreation).toHaveBeenCalledTimes(calls);
  });

  it('base non vide et limite dépassée : bouton désactivé, avec chaque raison et le nombre de places qui manquent', async () => {
    vi.mocked(onboardingApi.previewKnowledgeBase).mockResolvedValue(ok(PREVIEW_NOT_EMPTY));
    renderView();
    expect(await screen.findByRole('button', { name: 'Créer la base de connaissance' })).toBeDisabled();
    const reasons = within(screen.getByRole('status')).getAllByRole('listitem').map(li => li.textContent);
    expect(reasons).toEqual([
      'La base de connaissance n\'est pas vide. La création depuis l\'onboarding ne se fait que dans une base vide : archivez ou supprimez d\'abord les articles et les FAQ existants.',
      'Limite de 50 articles dépassée : la base en compte déjà 20, la création en ajoute 32. Il manque 2 places.',
    ]);
    expect(screen.getByText(/20 aujourd'hui, 52 après la création/)).toBeInTheDocument();
  });

  it('refus du back au clic (base remplie entre l\'aperçu et la création) : message clair, l\'état est relu', async () => {
    vi.mocked(onboardingApi.createKnowledgeBase).mockRejectedValue(refusal(CREATE_NOT_EMPTY));
    vi.mocked(onboardingApi.getKnowledgeBaseCreation).mockResolvedValue({ ...creation(PREVIEW as Recorded), knowledgeBaseEmpty: false });
    renderView();
    fireEvent.click(await screen.findByRole('button', { name: 'Créer la base de connaissance' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Créer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('La base de connaissance n\'est plus vide : archivez ou supprimez ses articles et ses FAQ, puis réessayez.');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Créer la base de connaissance' })).toBeDisabled());
    expect(onboardingApi.getKnowledgeBaseCreation).toHaveBeenCalledWith('p1', CREATION_ID);
  });

  it('création déjà lancée ou déjà faite (409) : le message, puis l\'état relu', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(onboardingApi.createKnowledgeBase).mockRejectedValueOnce(refusal(CREATE_RUNNING));
    vi.mocked(onboardingApi.getKnowledgeBaseCreation).mockResolvedValue(creation(RUNNING));
    renderView();
    fireEvent.click(await screen.findByRole('button', { name: 'Créer la base de connaissance' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Créer' }));
    expect(await screen.findByRole('heading', { name: 'Création en cours' })).toBeInTheDocument();

    expect(creationErrorMessage(refusal(CREATE_RUNNING))).toBe('Une création est déjà en cours pour votre organisation.');
    expect(creationErrorMessage(refusal(CREATE_DONE))).toBe('Cette base de connaissance a déjà été créée.');
    vi.mocked(onboardingApi.getKnowledgeBaseCreation).mockResolvedValue(creation(SUCCEEDED));
    await tick();
    expect(await screen.findByRole('button', { name: 'Ouvrir la base de connaissance' })).toBeInTheDocument();
  });

  it('module base de connaissance désactivé : message, aucun appel ; le même message si le back le refuse', async () => {
    renderView({ knowledgeEnabled: false });
    expect(screen.getByRole('status')).toHaveTextContent('La base de connaissance n\'est pas activée pour votre organisation.');
    expect(screen.queryByRole('button', { name: 'Créer la base de connaissance' })).not.toBeInTheDocument();
    expect(onboardingApi.getValidation).not.toHaveBeenCalled();
    expect(onboardingApi.previewKnowledgeBase).not.toHaveBeenCalled();

    vi.mocked(onboardingApi.previewKnowledgeBase).mockRejectedValue(refusal(PREVIEW_NO_MODULE));
    const { unmount } = renderView();
    await waitFor(() => expect(screen.getAllByText(/n'est pas activée pour votre organisation/)).toHaveLength(2));
    unmount();
  });

  it('rôle insuffisant : l\'écran explique, sans bouton ni appel ; un 403 du back sur le rôle donne le même écran', async () => {
    renderView({ isAdmin: false });
    expect(screen.getByRole('status')).toHaveTextContent('Seul un administrateur de votre organisation peut créer la base de connaissance');
    expect(screen.queryByRole('button', { name: 'Créer la base de connaissance' })).not.toBeInTheDocument();
    expect(onboardingApi.previewKnowledgeBase).not.toHaveBeenCalled();

    vi.mocked(onboardingApi.previewKnowledgeBase).mockRejectedValue(refusal(PREVIEW_MANAGER));
    renderView();
    await waitFor(() => expect(screen.getAllByText(/Seul un administrateur/)).toHaveLength(2));
    expect(creationErrorMessage(refusal(CREATE_MANAGER))).toBe('Seul un administrateur peut créer la base de connaissance.');
  });

  it('limite d\'articles refusée au clic (403, message du back) : le nombre, sans « plan Pro »', () => {
    // Le back renvoie ce 403 (assertArticleQuota) ; il ne se produit pas dans une base vide, d'où ce
    // message tiré du code du back plutôt qu'enregistré.
    const err = new ApiError('FORBIDDEN', 'Limite de 50 articles atteinte. Passez au plan Pro.', 403);
    expect(creationErrorMessage(err)).toBe('Limite de 50 articles atteinte. Archivez des articles pour libérer de la place.');
  });

  it('échec puis reprise, retrouvé par l\'identifiant retenu quand la route de la dernière création manque (back plus ancien)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const failed = creation(FAILED);
    window.localStorage.setItem(`knowdesk.kbCreation.${VALIDATION_ID}`, failed.creationId);
    vi.mocked(onboardingApi.getLatestKnowledgeBaseCreation).mockRejectedValue(new ApiError('NOT_FOUND', 'Route introuvable.', 404));
    vi.mocked(onboardingApi.getKnowledgeBaseCreation).mockResolvedValue(failed);
    const { container } = renderView();

    expect(await screen.findByRole('heading', { name: 'Création interrompue' })).toBeInTheDocument();
    expect(onboardingApi.previewKnowledgeBase).not.toHaveBeenCalled();
    expect(screen.getByText('Articles publiés').parentElement).toHaveTextContent('3 / 32');
    expect(screen.getByRole('alert')).toHaveTextContent('Ce qui est déjà créé est gardé : la reprise continue là où elle s\'est arrêtée, sans doublon.');
    expect(container.textContent).not.toMatch(TECHNICAL);

    vi.mocked(onboardingApi.createKnowledgeBase).mockResolvedValue(creation(RESUME));
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre la création' }));
    expect(await screen.findByRole('heading', { name: 'Reprise de la création' })).toBeInTheDocument();
    expect(onboardingApi.createKnowledgeBase).toHaveBeenCalledWith('p1', VALIDATION_ID, failed.creationId);
    expect(screen.getByText(/Ce qui avait été créé avant l'interruption est gardé/)).toBeInTheDocument();
    expect(screen.getByText('Articles publiés').parentElement).toHaveTextContent('3 / 32');

    // La tâche reprise recompte depuis zéro (ce qui existe est sauté) : 2 au lieu de 3 un instant.
    vi.mocked(onboardingApi.getKnowledgeBaseCreation).mockResolvedValue({ ...creation(RUNNING), creationId: failed.creationId });
    await tick();
    expect(screen.getByText('Articles publiés').parentElement).toHaveTextContent('3 / 32');

    vi.mocked(onboardingApi.getKnowledgeBaseCreation).mockResolvedValue(creation(RESUMED_SUCCEEDED));
    await tick();
    expect(await screen.findByText(/^Base de connaissance créée le .*, après une reprise,/)).toHaveTextContent('32 articles publiés, 23 FAQ');
  });

  it('session neuve (aucun identifiant retenu) : la création en échec est retrouvée par le back et reprise jusqu\'au résultat', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const latest = ok<LatestKnowledgeBaseCreation>(LATEST_FAILED);
    const validationId = latest.validation.id!;
    vi.mocked(onboardingApi.getValidation).mockResolvedValue({ ...validation(null), id: validationId });
    vi.mocked(onboardingApi.listValidations).mockResolvedValue(listed(true).map(v => ({ ...v, id: validationId })));
    vi.mocked(onboardingApi.getLatestKnowledgeBaseCreation).mockResolvedValue(latest);
    vi.mocked(onboardingApi.getKnowledgeBaseCreation).mockResolvedValue(creation(FAILED_2));
    expect(window.localStorage.length).toBe(0);
    const { onOpenKnowledge } = renderView({ validationId });

    expect(await screen.findByRole('heading', { name: 'Création interrompue' })).toBeInTheDocument();
    // Un aperçu plus récent existe (préparé ailleurs) : ni lui ni un nouveau ne remplace l'échec.
    expect(latest.creationId).not.toBe(ok<{ creationId: string }>(PREVIEW_ELSEWHERE).creationId);
    expect(onboardingApi.getKnowledgeBaseCreation).toHaveBeenCalledWith('p1', latest.creationId);
    expect(onboardingApi.previewKnowledgeBase).not.toHaveBeenCalled();
    expect(screen.getByText('Articles publiés').parentElement).toHaveTextContent(`${latest.progress.articles} / 32`);

    vi.mocked(onboardingApi.createKnowledgeBase).mockResolvedValue(creation(RESUME_2));
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre la création' }));
    expect(await screen.findByRole('heading', { name: 'Reprise de la création' })).toBeInTheDocument();
    expect(onboardingApi.createKnowledgeBase).toHaveBeenCalledWith('p1', validationId, latest.creationId);

    vi.mocked(onboardingApi.getKnowledgeBaseCreation).mockResolvedValue(creation(RESUMED_SUCCEEDED_2));
    await tick();
    expect(await screen.findByText(/^Base de connaissance créée le .*, après une reprise,/)).toHaveTextContent('32 articles publiés, 23 FAQ');
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir la base de connaissance' }));
    expect(onOpenKnowledge).toHaveBeenCalled();
    // L'identifiant est retenu ensuite, en appoint.
    expect(window.localStorage.getItem(`knowdesk.kbCreation.${validationId}`)).toBe(latest.creationId);
  });

  it('aperçu de cette version déjà préparé ailleurs : réutilisé, sans nouvel aperçu (pas de nouveaux appels au modèle)', async () => {
    const latest = ok<LatestKnowledgeBaseCreation>(LATEST_PREVIEWED);
    const validationId = latest.validation.id!;
    vi.mocked(onboardingApi.getValidation).mockResolvedValue({ ...validation(null), id: validationId });
    vi.mocked(onboardingApi.listValidations).mockResolvedValue(listed(true).map(v => ({ ...v, id: validationId })));
    vi.mocked(onboardingApi.getLatestKnowledgeBaseCreation).mockResolvedValue(latest);
    vi.mocked(onboardingApi.getKnowledgeBaseCreation).mockResolvedValue({ ...ok<KnowledgeBaseCreation>(PREVIEW_2), creationId: latest.creationId, progress: {}, errorCode: null, startedAt: null, finishedAt: null });
    renderView({ validationId });
    expect(await screen.findByRole('button', { name: 'Créer la base de connaissance' })).toBeEnabled();
    expect(onboardingApi.previewKnowledgeBase).not.toHaveBeenCalled();
  });

  it('création à rouvrir : lancée, quelle que soit la version ; échec ou aperçu, seulement de cette version', () => {
    const failed = ok<LatestKnowledgeBaseCreation>(LATEST_FAILED);
    const succeeded = ok<LatestKnowledgeBaseCreation>(LATEST_SUCCEEDED);
    expect(creationToReopen(ok(LATEST_NULL), 'v')).toBeNull();
    expect(creationToReopen(failed, failed.validation.id!)).toBe(failed.creationId);
    expect(creationToReopen(failed, 'une-autre-version')).toBeNull();
    expect(creationToReopen(succeeded, 'une-autre-version')).toBe(succeeded.creationId);
    expect(creationToReopen(ok(LATEST_PREVIEWED), 'une-autre-version')).toBeNull();
    // Autre organisation : 404, sans rien de la création de A.
    expect((LATEST_OTHER_ORG as Recorded).status).toBe(404);
    expect(JSON.stringify(LATEST_OTHER_ORG)).not.toContain(failed.creationId);
  });

  it('manager : sans bouton, l\'état de la dernière création (échec à reprendre par un administrateur, ou base créée)', async () => {
    vi.mocked(onboardingApi.getLatestKnowledgeBaseCreation).mockResolvedValue(ok(LATEST_FAILED_MANAGER));
    const { unmount } = renderView({ isAdmin: false });
    expect(await screen.findByText(/un administrateur peut la reprendre depuis cet écran/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reprendre|Créer/ })).not.toBeInTheDocument();
    unmount();

    vi.mocked(onboardingApi.getLatestKnowledgeBaseCreation).mockResolvedValue(ok(LATEST_SUCCEEDED));
    const { onOpenKnowledge } = renderView({ isAdmin: false });
    expect(await screen.findByText(/^La base de connaissance a été créée le .*, depuis la\s+version validée n° 1\./)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir la base de connaissance' }));
    expect(onOpenKnowledge).toHaveBeenCalled();
    expect(onboardingApi.getKnowledgeBaseCreation).not.toHaveBeenCalled();
  });

  it('version qui n\'est plus à jour : rien n\'est préparé', async () => {
    vi.mocked(onboardingApi.listValidations).mockResolvedValue(listed(false));
    renderView();
    expect(await screen.findByText(/n'est plus la version validée à jour/)).toBeInTheDocument();
    expect(onboardingApi.previewKnowledgeBase).not.toHaveBeenCalled();
  });

  it('aperçu retenu disparu (404) : oublié, un nouvel aperçu est préparé', async () => {
    window.localStorage.setItem(`knowdesk.kbCreation.${VALIDATION_ID}`, '00000000-0000-4000-8000-000000000000');
    vi.mocked(onboardingApi.getKnowledgeBaseCreation).mockRejectedValue(new ApiError('NOT_FOUND', 'Création introuvable.', 404));
    renderView();
    expect(await screen.findByRole('button', { name: 'Créer la base de connaissance' })).toBeEnabled();
    expect(window.localStorage.getItem(`knowdesk.kbCreation.${VALIDATION_ID}`)).toBe(CREATION_ID);
  });

  it('étapes : rien en cours tant que la tâche attend, tout terminé une fois réussie', () => {
    expect(creationSteps(creation(CREATE)).map(s => s.state)).toEqual(['pending', 'pending', 'pending', 'pending']);
    expect(creationSteps(creation(SUCCEEDED)).map(s => `${s.done}/${s.total}`)).toEqual(['15/15', '32/32', '23/23', '6/6']);
  });
});

describe('Points d\'entrée : seulement sur la version validée à jour', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(onboardingApi.listAuditImages).mockResolvedValue([]);
  });

  it('version propre à jour : « Créer la base de connaissance » ouvre l\'écran ; version dépassée : pas de bouton', async () => {
    const open = vi.fn();
    vi.mocked(onboardingApi.getValidation).mockResolvedValue(validation(null));
    vi.mocked(onboardingApi.listValidations).mockResolvedValue(listed(true));
    const { unmount } = render(<CleanBaseView projectId="p1" validationId={VALIDATION_ID} onBack={() => {}} onCreateKnowledgeBase={open} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Créer la base de connaissance' }));
    expect(open).toHaveBeenCalledWith(VALIDATION_ID);
    unmount();

    vi.mocked(onboardingApi.listValidations).mockResolvedValue(listed(false));
    render(<CleanBaseView projectId="p1" validationId={VALIDATION_ID} onBack={() => {}} onCreateKnowledgeBase={open} />);
    expect(await screen.findByRole('button', { name: 'Imprimer / PDF' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Créer la base de connaissance' })).not.toBeInTheDocument();
  });

  it('panneau de validation : le bouton suit « Voir la version validée » quand elle est à jour, pas avant', async () => {
    const open = vi.fn();
    const summary = { id: VALIDATION_ID, correctionId: 'c1', version: 1, validatedByName: 'Experte', validatedAt: '2026-10-20T16:00:00Z' };
    vi.mocked(onboardingApi.listValidations).mockResolvedValue([{ ...summary, upToDate: true }]);
    const { unmount } = render(<ValidationPanel projectId="p1" correctionId="c1" reviews={new Map()} toReview={0} editable
      onOpen={() => {}} onCreateKnowledgeBase={open} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Créer la base de connaissance' }));
    expect(open).toHaveBeenCalledWith(VALIDATION_ID);
    unmount();

    vi.mocked(onboardingApi.listValidations).mockResolvedValue([{ ...summary, upToDate: false, changed: { reviews: true, sectionTexts: false } }]);
    render(<ValidationPanel projectId="p1" correctionId="c1" reviews={new Map()} toReview={0} editable
      onOpen={() => {}} onCreateKnowledgeBase={open} />);
    expect(await screen.findByRole('button', { name: 'Valider la nouvelle base' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Créer la base de connaissance' })).not.toBeInTheDocument();
  });

  it('aucune version validée : ni panneau ni bouton', async () => {
    vi.mocked(onboardingApi.listValidations).mockResolvedValue([]);
    render(<ValidationPanel projectId="p1" correctionId="c1" reviews={new Map()} toReview={3} editable
      onOpen={() => {}} onCreateKnowledgeBase={vi.fn()} />);
    expect(await screen.findByText(/Encore 3 avis à donner/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Créer la base de connaissance' })).not.toBeInTheDocument();
  });
});

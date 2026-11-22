import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('../../api/onboardingApi', () => ({
  onboardingApi: {
    getBuildKnowledgeBase: vi.fn(), previewBuildKnowledgeBase: vi.fn(), createBuildKnowledgeBase: vi.fn(), getBuildKnowledgeBaseCreation: vi.fn(),
  },
}));

import { onboardingApi } from '../../api/onboardingApi';
import { ApiError } from '../../../../shared/lib/apiClient';
import { BuildKnowledgeBase } from './BuildKnowledgeBase';
import { audienceTagsSummary, buildCreationBlockers, buildCreationSteps, type BuildKnowledgeBasePreview } from '../../lib/knowledgeBase';
// Réponses réelles du back (KnowDesk, pile #72 → #73 → #74) lancé en local le 2026-11-22, sur la
// rédaction Elyra du 22/11 (plan modifié, 31 articles, construction 0.3.0 rejouée sans appel).
import STATE from './fixtures/kb-build-state.response.json';
import PREVIEW from './fixtures/kb-build-preview.response.json';
import PREVIEW_NO_TAGS from './fixtures/kb-build-preview-sans-publics.response.json';
import CREATE from './fixtures/kb-build-create.response.json';
import SUCCEEDED from './fixtures/kb-build-succeeded.response.json';
import STATE_SUCCEEDED from './fixtures/kb-build-state-succeeded.response.json';
import PREVIEW_NOT_EMPTY from './fixtures/kb-build-preview-non-vide.response.json';

interface Recorded { status: number; body: { data: unknown; error: { code: string; message: string } | null } }
const ok = <T,>(r: Recorded) => r.body.data as T;
const api = vi.mocked(onboardingApi);
const TECHNICAL = /creation_failed|KNOWLEDGE_|ADMIN_ONLY|applyAudienceTags|subject_id|sub_\d/;

function renderBlock(props: Partial<React.ComponentProps<typeof BuildKnowledgeBase>> = {}) {
  const onOpenKnowledge = vi.fn();
  const utils = render(<BuildKnowledgeBase projectId="p1" buildId="b1" knowledgeEnabled onOpenKnowledge={onOpenKnowledge} {...props} />);
  return { ...utils, onOpenKnowledge };
}

describe('Base de connaissance depuis une rédaction (lot D)', () => {
  beforeEach(() => {
    for (const fn of Object.values(api)) fn.mockReset();
    api.getBuildKnowledgeBase.mockResolvedValue(ok(STATE));
  });

  it('bouton actif ; l\'aperçu donne catégories, articles, étiquettes de public cochées, phrases à vérifier', async () => {
    api.previewBuildKnowledgeBase.mockResolvedValue(ok(PREVIEW));
    renderBlock();
    fireEvent.click(await screen.findByRole('button', { name: 'Créer la base de connaissance' }));
    expect(api.previewBuildKnowledgeBase).toHaveBeenCalledWith('p1', 'b1', true);
    const box = await screen.findByRole('checkbox', { name: 'Appliquer les étiquettes de public (Particuliers / Professionnels)' });
    expect(box).toBeChecked();
    expect(screen.getByText(/Étiquettes de public : 12 « Particuliers », 8 « Professionnels », 11 avec les deux/)).toBeInTheDocument();
    const categories = screen.getAllByRole('listitem').filter(li => li.textContent?.includes(' · '));
    expect(categories).toHaveLength(13);
    expect(categories[0]).toHaveTextContent('Fonctionnement du secteur de l\'énergie · 3 articles');
    expect(screen.getByText('4 phrases à vérifier restent dans les articles')).toBeInTheDocument();
    // Sans limite d'articles (offre par défaut) : aucune ligne de limite.
    expect(screen.queryByText(/limite de/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Créer la base' })).toBeEnabled();
    expect(document.body.textContent).not.toMatch(TECHNICAL);
  });

  it('décocher la case : nouvel aperçu sans étiquette ni préfixe', async () => {
    api.previewBuildKnowledgeBase.mockResolvedValueOnce(ok(PREVIEW)).mockResolvedValueOnce(ok(PREVIEW_NO_TAGS));
    renderBlock();
    fireEvent.click(await screen.findByRole('button', { name: 'Créer la base de connaissance' }));
    fireEvent.click(await screen.findByRole('checkbox'));
    await waitFor(() => expect(api.previewBuildKnowledgeBase).toHaveBeenLastCalledWith('p1', 'b1', false));
    await waitFor(() => expect(screen.getByRole('checkbox')).not.toBeChecked());
    expect(screen.queryByText(/Étiquettes de public :/)).not.toBeInTheDocument();
  });

  it('rédaction sans public distingué : la case n\'est pas proposée', async () => {
    const data = ok<BuildKnowledgeBasePreview>(PREVIEW_NO_TAGS);
    api.previewBuildKnowledgeBase.mockResolvedValue({ ...data, audience: { ...data.audience, detected: false } });
    renderBlock();
    fireEvent.click(await screen.findByRole('button', { name: 'Créer la base de connaissance' }));
    await screen.findByText('Catégories, dans l\'ordre');
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('confirmation, avancement relu, résultat et « Ouvrir la base de connaissance »', async () => {
    api.previewBuildKnowledgeBase.mockResolvedValue(ok(PREVIEW));
    api.createBuildKnowledgeBase.mockResolvedValue(ok(CREATE));
    api.getBuildKnowledgeBaseCreation.mockResolvedValue(ok(SUCCEEDED));
    const { onOpenKnowledge } = renderBlock();
    fireEvent.click(await screen.findByRole('button', { name: 'Créer la base de connaissance' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Créer la base' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('31 articles seront publiés en interne, dans 13 catégories');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Créer la base' }));
    expect(await screen.findByText('Création en attente de démarrage')).toBeInTheDocument();
    const result = await screen.findByText(/^Base de connaissance créée/, {}, { timeout: 4000 });
    expect(result).toHaveTextContent('depuis la rédaction du 22/11/2026 : 31 articles publiés, 13 catégories.');
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir la base de connaissance' }));
    expect(onOpenKnowledge).toHaveBeenCalled();
  });

  it('déjà créée : le résultat, sans bouton de création', async () => {
    api.getBuildKnowledgeBase.mockResolvedValue(ok(STATE_SUCCEEDED));
    api.getBuildKnowledgeBaseCreation.mockResolvedValue(ok(SUCCEEDED));
    renderBlock();
    expect(await screen.findByText(/^Base de connaissance créée/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Créer la base de connaissance' })).not.toBeInTheDocument();
  });

  it('base non vide (nouvel aperçu après une création) : le message du back, bouton grisé', async () => {
    api.previewBuildKnowledgeBase.mockResolvedValue(ok(PREVIEW_NOT_EMPTY));
    renderBlock();
    fireEvent.click(await screen.findByRole('button', { name: 'Créer la base de connaissance' }));
    expect(await screen.findByText('La base de connaissance n\'est pas vide : archivez ou supprimez ses articles et ses FAQ avant de la créer.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Créer la base' })).toBeDisabled();
  });

  it('grisé par le back (plan modifié depuis la rédaction, manager) : son message, sans aperçu', async () => {
    api.getBuildKnowledgeBase.mockResolvedValue({
      ...ok<object>(STATE), launch: { allowed: false, code: 'PLAN_CHANGED', message: 'Le plan a été modifié depuis cette rédaction : rédigez à nouveau les articles, puis créez la base.' },
    } as never);
    renderBlock();
    expect(await screen.findByRole('button', { name: 'Créer la base de connaissance' })).toBeDisabled();
    expect(screen.getByText('Le plan a été modifié depuis cette rédaction : rédigez à nouveau les articles, puis créez la base.')).toBeInTheDocument();
  });

  it('refus au clic (409 avec message) : le message du back', async () => {
    api.previewBuildKnowledgeBase.mockRejectedValue(new ApiError('ANSWERS_CHANGED', 'Vos réponses dans « À clarifier » ont changé depuis ce plan : préparez le plan à nouveau, puis rédigez les articles.', 409));
    renderBlock();
    fireEvent.click(await screen.findByRole('button', { name: 'Créer la base de connaissance' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Vos réponses dans « À clarifier » ont changé depuis ce plan');
  });

  it('échec de la tâche : « Création interrompue » et « Reprendre la création »', async () => {
    const done = ok<Record<string, unknown>>(SUCCEEDED);
    api.getBuildKnowledgeBase.mockResolvedValue({ ...ok<object>(STATE), creation: { creationId: 'c1', status: 'failed' } } as never);
    api.getBuildKnowledgeBaseCreation.mockResolvedValue({ ...done, status: 'failed', errorCode: 'creation_failed', progress: { categories: 13, articles: 9 } } as never);
    renderBlock();
    expect(await screen.findByText('Création interrompue')).toBeInTheDocument();
    expect(screen.getByText('9 / 31')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reprendre la création' })).toBeEnabled();
  });

  it('module « knowledge » absent : rien n\'est proposé, aucun appel', () => {
    const { container } = renderBlock({ knowledgeEnabled: false });
    expect(container).toBeEmptyDOMElement();
    expect(api.getBuildKnowledgeBase).not.toHaveBeenCalled();
  });
});

describe('aides du lot D', () => {
  const preview = ok<BuildKnowledgeBasePreview>(PREVIEW);
  it('étapes : catégories puis articles publiés, sans FAQ ni synonymes', () => {
    expect(buildCreationSteps({ ...preview, progress: { categories: 13, articles: 4 }, status: 'running' }).map(s => [s.label, s.state]))
      .toEqual([['Catégories', 'done'], ['Articles publiés', 'current']]);
  });
  it('blocages : limite d\'une offre limitée, limite d\'étiquettes', () => {
    expect(buildCreationBlockers(preview)).toEqual([]);
    expect(buildCreationBlockers({ ...preview, quota: { limit: 30, current: 0, toCreate: 31, after: 31, allowed: false } }))
      .toEqual(['Limite de 30 articles dépassée : la base en compte déjà 0, la création en ajoute 31. Il manque 1 place.']);
    expect(buildCreationBlockers({ ...preview, tags: { ...preview.tags, allowed: false } })[0]).toMatch(/^Limite de 200 étiquettes/);
  });
  it('résumé des étiquettes : rien sans publics appliqués', () => {
    expect(audienceTagsSummary(ok(PREVIEW_NO_TAGS))).toBeNull();
    expect(audienceTagsSummary(preview)).toContain('13 passages d\'un article commun préfixés');
  });
});

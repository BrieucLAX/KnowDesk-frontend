import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('../../api/onboardingApi', () => ({
  onboardingApi: {
    listAnalyses: vi.fn(), getAudit: vi.fn(), listAuditImages: vi.fn(), getAuditImage: vi.fn(),
    listCorrections: vi.fn(), launchCorrection: vi.fn(), getBase: vi.fn(),
    listReviews: vi.fn(), review: vi.fn(), cancelReview: vi.fn(),
    listSectionComments: vi.fn(), commentSection: vi.fn(), cancelSectionComment: vi.fn(),
  },
}));

import { onboardingApi } from '../../api/onboardingApi';
import { ApiError } from '../../../../shared/lib/apiClient';
import { BaseTab } from './BaseTab';
import { CorrectionEntry } from './CorrectionEntry';
import type { BaseVersion, OnboardingCorrection, Review } from '../../lib/correction';
import type { Decision } from '../../lib/decisions';
import type { AuditResponse } from '../../lib/audit';
import type { ReadingCard } from '../../lib/reading';
import type { OnboardingAnalysis, OnboardingProject } from '../../types';
import BASE_PILOTE from './fixtures/base-0.1.0-pilote.response.json';
import CARDS_PILOTE from './fixtures/audit-0.9.0-pilote-cards.json';

/**
 * Base corrigée par le service sur le pilote (lancée en local depuis « À clarifier », réponses de
 * l'experte reprises sur les cartes équivalentes), réduite aux fiches modifiées et au sommaire.
 */
const PILOTE = BASE_PILOTE as unknown as BaseVersion;
const CARDS = (CARDS_PILOTE.cards as unknown as ReadingCard[]).map(c => ({
  ...c, mergedRanks: [], documentIds: [], sides: [], answers: [], unverifiedQuotes: [],
}));

/** Ce qu'aucun écran ne doit montrer : identifiants de modification, de carte, d'image, de section, codes. */
const TECHNICAL = /\b[MC]\d+\b|card_|img_|doc_|\b[a-z]+_[a-z_]+\b/;

const MB = 1024 * 1024;
const project: OnboardingProject = {
  id: 'p1', name: 'Pilote', createdAt: '', updatedAt: '', documentsCount: 1, totalBytes: MB, cadrageVersion: 1,
  limits: { maxFileBytes: 50 * MB, maxDocumentsPerProject: 50, maxProjectBytes: 300 * MB, maxFilesPerUpload: 10 },
};
const analysis = { id: 'a1', status: 'succeeded', createdAt: '2026-10-07T09:00:00Z', finishedAt: '2026-10-07T09:10:00Z' } as OnboardingAnalysis;

const correction = (over: Partial<OnboardingCorrection> = {}): OnboardingCorrection => ({
  id: PILOTE.correctionId, analysisId: 'a1', generation: 1, status: 'succeeded', stage: 'storing', done: 0, total: 0,
  errorCode: null, decisionCount: 9, createdAt: '2026-10-07T09:20:00Z', submittedAt: null, finishedAt: '2026-10-07T09:25:00Z', ...over,
});

const review = (itemId: string, over: Partial<Review> = {}): Review => ({
  id: `00000000-0000-4000-8000-00000000000${itemId.slice(1)}`, itemId, verdict: 'accept', correctedText: null, comment: null,
  supersedesId: null, authorName: 'Camille Martin', createdAt: '2026-10-07T10:00:00Z', cancellation: null, ...over,
});

const cardOf = (title: RegExp) => screen.getByRole('article', { name: title });

function mockBase(base: BaseVersion = PILOTE, corrections: OnboardingCorrection[] = [correction()]) {
  vi.mocked(onboardingApi.listAnalyses).mockResolvedValue({ data: [analysis], meta: { quota: { used: 1, max: 5 } } });
  vi.mocked(onboardingApi.listCorrections).mockResolvedValue({ data: corrections, meta: { quota: { used: 1, max: 30 } } });
  vi.mocked(onboardingApi.getBase).mockResolvedValue(base);
  vi.mocked(onboardingApi.getAudit).mockResolvedValue({ schemaVersion: '0.9.0', reading: { cards: CARDS } } as unknown as AuditResponse);
  vi.mocked(onboardingApi.listAuditImages).mockResolvedValue([]);
  vi.mocked(onboardingApi.listReviews).mockResolvedValue({ reviews: [], counts: { reviewed: 0, toReview: 6 } });
  vi.mocked(onboardingApi.listSectionComments).mockResolvedValue([]);
}

describe('Nouvelle base : relecture', () => {
  let toastAdd: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    vi.clearAllMocks();
    mockBase();
    toastAdd = vi.spyOn(window.__toastBus!, 'add');
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('montre chaque modification à sa place, dans l\'ordre du document, sans aucun code', async () => {
    const { container } = render(<BaseTab project={project} onGoToClarify={() => {}} />);
    expect(await screen.findByText('0 sur 6 relues')).toBeInTheDocument();

    // Les cartes suivent l'ordre des fiches, pas la numérotation des modifications.
    const titles = screen.getAllByRole('heading', { level: 4 }).map(h => h.textContent);
    expect(titles).toEqual([
      'Modification 4 · Votre réponse', 'Modification 6 · Votre réponse', 'Modification 1 · Votre réponse',
      'Modification 2 · Changement daté', 'Modification 3 · Votre réponse', 'Modification 7 · Complément', 'Modification 5 · Complément',
    ]);
    // Origine en clair : la réponse, sa date et la carte par son titre.
    expect(within(cardOf(/^Modification 2/)).getByText(/^Recommandation de l'IA suivie \(votre réponse du \d\d\/10\), carte « Procédure temporaire/)).toBeInTheDocument();
    // Une modification non appliquée : sa raison en clair, pas de verdict.
    const m5 = cardOf(/^Modification 5/);
    expect(m5).toHaveTextContent('Non appliquée');
    expect(m5).toHaveTextContent('Pourquoi :Le texte proposé allait au-delà de votre demande ; la fiche est restée telle quelle');
    expect(m5).not.toHaveTextContent('Chapitre 14 — FAQ transverse › Cotisations :');
    expect(within(m5).queryByRole('button', { name: 'Accepter' })).not.toBeInTheDocument();

    // Les sections inchangées repliées à leur place ; ajouts et retraits marqués.
    expect(container.querySelectorAll('details.obp-base-section--unchanged').length).toBeGreaterThan(10);
    expect(container.querySelectorAll('ins').length).toBeGreaterThan(0);
    // Informations en attente, par le titre de leur carte.
    expect(screen.getByText(/^Informations en attente, sans modification de la base : Chapitre 3 sur les cotisations/)).toBeInTheDocument();

    expect(container.textContent).not.toMatch(TECHNICAL);
  });

  it('titre chaque fiche par son premier titre, et chaque section une seule fois (Essai 5)', async () => {
    const { container } = render(<BaseTab project={project} onGoToClarify={() => {}} />);
    await screen.findByText('0 sur 6 relues');
    const chapters = [...container.querySelectorAll('.obp-base-chapter__title')].map(h => h.textContent);
    expect(chapters[0]).toBe('Base de connaissance interne — Alviva Mutuelle');
    expect(chapters).not.toContain('00-sommaire.md');
    // Une section ouverte : son titre une fois, dans le texte ; repliée : dans le résumé seulement.
    for (const s of container.querySelectorAll('.obp-base-section')) {
      const own = s.querySelector('summary .obp-base-section__title, h3.obp-base-section__title')?.textContent ?? '';
      const heads = [...s.querySelectorAll('.obp-base-h')].map(h => h.textContent);
      if (own) expect(heads).not.toContain(own);
    }
  });

  it('un paragraphe réécrit à plus de moitié : l\'ancien barré en entier, puis le nouveau', async () => {
    const old = 'La cotisation dépend de l\'âge, calculé au 1er janvier, et de la zone géographique du domicile.';
    const rewritten = 'Pour les souscriptions à partir du 1er janvier 2027, appliquer la grille fournie par la Direction Commerciale.';
    const sheet = PILOTE.base.sheets[1];
    const target = sheet.sections[1];
    const edited: BaseVersion = {
      ...PILOTE,
      base: {
        ...PILOTE.base,
        sheets: [{ ...sheet, sections: [{ ...target, original_markdown: old, corrected_markdown: rewritten, changes: [], modification_ids: ['M1'] }] }],
      },
    };
    mockBase(edited);
    const { container } = render(<BaseTab project={project} onGoToClarify={() => {}} />);
    await screen.findByText('0 sur 6 relues');
    const removed = container.querySelector('.obp-base-change--delete');
    const added = container.querySelector('.obp-base-change--insert');
    expect(removed).toHaveTextContent(old);
    expect(added).toHaveTextContent(rewritten);
    expect(container.querySelector('.obp-base-change--modify')).toBeNull();
  });

  it('une modification appliquée en partie le dit en une phrase ; trois raisons au plus, le reste repliable', async () => {
    const [first, ...others] = PILOTE.base.modifications;
    const key = PILOTE.base.sheets[1].sections[0].key;
    const partial: BaseVersion = {
      ...PILOTE,
      base: {
        ...PILOTE.base,
        modifications: [{
          ...first, outcome: 'applied',
          reasons: [
            `${key}: La nouvelle grille 2027 n'est pas dans vos documents. Seuls trois montants sont cités.`,
            `${key}: values_from_several_sources`, `${key}: duplicate_or_move`, `${key}: not_decided`,
            `${key}: value_without_source`, `${key}: qualifier_lost`, `${key}: duplicate_or_move`,
          ],
        }, ...others],
      },
    };
    mockBase(partial);
    render(<BaseTab project={project} onGoToClarify={() => {}} />);
    const card = await screen.findByRole('article', { name: /^Modification 1/ });
    expect(card).toHaveTextContent('Appliquée en partie : la nouvelle grille 2027 n\'est pas dans vos documents.');
    const outcome = card.querySelector('.obp-base-card__outcome')!;
    expect(outcome.querySelectorAll(':scope > ul > li')).toHaveLength(3);
    const more = within(outcome as HTMLElement).getByText('Voir les 2 autres raisons').closest('details')!;
    expect(more.querySelectorAll('li')).toHaveLength(2);
    expect(outcome.textContent).not.toMatch(/›/);
  });

  it('enregistre un verdict dès le clic, puis un commentaire sans perdre le verdict', async () => {
    vi.mocked(onboardingApi.review)
      .mockResolvedValueOnce(review('M1'))
      .mockResolvedValueOnce(review('M1', { id: '00000000-0000-4000-8000-000000000011', comment: 'À confirmer.', supersedesId: '00000000-0000-4000-8000-000000000001' }));
    render(<BaseTab project={project} onGoToClarify={() => {}} />);
    const m1 = await screen.findByRole('article', { name: /^Modification 1/ });

    fireEvent.click(within(m1).getByRole('button', { name: 'Accepter' }));
    await waitFor(() => expect(onboardingApi.review).toHaveBeenCalledWith('p1', PILOTE.correctionId, {
      itemId: 'M1', expectedCurrentId: null, verdict: 'accept', correctedText: null, comment: null,
    }));
    expect(await screen.findByText('1 sur 6 relues')).toBeInTheDocument();
    expect(within(m1).getByRole('button', { name: 'Accepter' })).toHaveAttribute('aria-pressed', 'true');

    const comment = within(m1).getByLabelText('Un commentaire ? (facultatif)');
    fireEvent.change(comment, { target: { value: 'À confirmer.' } });
    fireEvent.blur(comment);
    await waitFor(() => expect(onboardingApi.review).toHaveBeenLastCalledWith('p1', PILOTE.correctionId, {
      itemId: 'M1', expectedCurrentId: '00000000-0000-4000-8000-000000000001', verdict: 'accept', correctedText: null, comment: 'À confirmer.',
    }));
    expect(await within(m1).findByText('Enregistré')).toBeInTheDocument();
  });

  it('« Corriger » part du texte proposé et l\'enregistre corrigé', async () => {
    vi.mocked(onboardingApi.review).mockImplementation(async (_p, _c, body) => review(body.itemId, { verdict: body.verdict, correctedText: body.correctedText }));
    render(<BaseTab project={project} onGoToClarify={() => {}} />);
    const m3 = await screen.findByRole('article', { name: /^Modification 3/ });
    fireEvent.click(within(m3).getByRole('button', { name: 'Corriger' }));
    const field = within(m3).getByLabelText('Le texte tel que vous l\'écririez') as HTMLTextAreaElement;
    expect(field.value).toMatch(/1er octobre 2026/);
    await waitFor(() => expect(onboardingApi.review).toHaveBeenCalledWith('p1', PILOTE.correctionId, expect.objectContaining({ itemId: 'M3', verdict: 'fix', correctedText: field.value.trim() })));

    fireEvent.change(field, { target: { value: 'Mon texte.' } });
    fireEvent.blur(field);
    await waitFor(() => expect(onboardingApi.review).toHaveBeenLastCalledWith('p1', PILOTE.correctionId, expect.objectContaining({ verdict: 'fix', correctedText: 'Mon texte.' })));
  });

  it('commente une section inchangée, à sa place', async () => {
    vi.mocked(onboardingApi.commentSection).mockImplementation(async (_p, _c, body) => ({
      id: 'c1', sectionKey: body.sectionKey, comment: body.comment, supersedesId: null, authorName: 'Camille Martin', createdAt: '', cancellation: null,
    }));
    const { container } = render(<BaseTab project={project} onGoToClarify={() => {}} />);
    await screen.findByText('0 sur 6 relues');
    const folded = container.querySelector('details.obp-base-section--unchanged') as HTMLDetailsElement;
    const field = within(folded).getByLabelText(/^Un commentaire sur la section/);
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: 'Rien à signaler.' } });
    fireEvent.blur(field);
    await waitFor(() => expect(onboardingApi.commentSection).toHaveBeenCalledWith('p1', PILOTE.correctionId, {
      sectionKey: PILOTE.base.sheets[0].sections[0].key, expectedCurrentId: null, comment: 'Rien à signaler.',
    }));
    expect(await within(folded).findByText('commentée')).toBeInTheDocument();
  });

  it('un avis changé ailleurs : le dit, et relit tout', async () => {
    vi.mocked(onboardingApi.review).mockRejectedValue(new ApiError('REVIEW_CONFLICT', 'conflit', 409));
    render(<BaseTab project={project} onGoToClarify={() => {}} />);
    const m2 = await screen.findByRole('article', { name: /^Modification 2/ });
    fireEvent.click(within(m2).getByRole('button', { name: 'Refuser' }));
    await waitFor(() => expect(toastAdd).toHaveBeenCalledWith('Cet avis a été modifié entre-temps : la relecture a été rechargée.', 'error', 6000));
    await waitFor(() => expect(onboardingApi.listReviews).toHaveBeenCalledTimes(2));
  });

  it('une base précédente se consulte sans se relire', async () => {
    mockBase({ ...PILOTE, reviewable: false });
    vi.mocked(onboardingApi.listReviews).mockResolvedValue({ reviews: [review('M2', { verdict: 'refuse', comment: 'Non.' })], counts: { reviewed: 1, toReview: 6 } });
    render(<BaseTab project={project} onGoToClarify={() => {}} />);
    expect(await screen.findByText(/ses avis restent consultables/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accepter' })).not.toBeInTheDocument();
    expect(within(cardOf(/^Modification 2/)).getByText('Avis : Refusée')).toBeInTheDocument();
  });

  it('une convention se relit comme une modification', async () => {
    const withConvention: BaseVersion = {
      ...PILOTE,
      base: { ...PILOTE.base, conventions: [{ id: 'C1', rule: 'Listes datées : la plus récente en premier.', section_keys: [PILOTE.base.sheets[0].sections[0].key] }] },
    };
    mockBase(withConvention);
    vi.mocked(onboardingApi.review).mockResolvedValue(review('C1'));
    render(<BaseTab project={project} onGoToClarify={() => {}} />);
    const c1 = await screen.findByRole('article', { name: 'Convention 1' });
    expect(c1).toHaveTextContent('Listes datées : la plus récente en premier.');
    fireEvent.click(within(c1).getByRole('button', { name: 'Accepter' }));
    await waitFor(() => expect(onboardingApi.review).toHaveBeenCalledWith('p1', PILOTE.correctionId, expect.objectContaining({ itemId: 'C1', verdict: 'accept' })));
  });
});

describe('Nouvelle base : préparation', () => {
  beforeEach(() => { vi.clearAllMocks(); mockBase(); });

  it('suit l\'étape en cours et son avancement', async () => {
    mockBase(PILOTE, [correction({ status: 'running', stage: 'correction', done: 4, total: 11, finishedAt: null })]);
    render(<BaseTab project={project} onGoToClarify={() => {}} />);
    expect(await screen.findByRole('heading', { name: 'Nouvelle base en préparation' })).toBeInTheDocument();
    expect(screen.getByText('Correction des fiches').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('4 / 11')).toBeInTheDocument();
    expect(onboardingApi.getBase).not.toHaveBeenCalled();
  });

  it('dit un échec en clair et propose de relancer', async () => {
    mockBase(PILOTE, [correction({ status: 'failed', stage: 'correction', errorCode: 'rate_limited', finishedAt: null })]);
    vi.mocked(onboardingApi.launchCorrection).mockResolvedValue(correction({ status: 'queued', stage: null }));
    render(<BaseTab project={project} onGoToClarify={() => {}} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Le service d\'IA est saturé pour le moment.');
    expect(screen.getByRole('alert')).not.toHaveTextContent('rate_limited');
    fireEvent.click(screen.getByRole('button', { name: 'Relancer la préparation' }));
    await waitFor(() => expect(onboardingApi.launchCorrection).toHaveBeenCalledWith('p1', 'a1'));
  });

  it('sans préparation : renvoie vers « À clarifier »', async () => {
    mockBase(PILOTE, []);
    const go = vi.fn();
    render(<BaseTab project={project} onGoToClarify={go} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Aller à « À clarifier »' }));
    expect(go).toHaveBeenCalled();
  });
});

describe('« À clarifier » : Préparer la nouvelle base', () => {
  const blocking = CARDS.filter(c => c.nature !== 'incomplete_or_outdated');
  const decided = (type: string, cards = blocking) => new Map(cards.map(c => [c.id, { id: `d-${c.id}`, action: { type } } as unknown as Decision]));
  const entry = (current: ReadonlyMap<string, Decision>, onOpenBase = vi.fn(), schemaVersion = '0.9.0') =>
    render(<CorrectionEntry projectId="p1" analysisId="a1" schemaVersion={schemaVersion} cards={CARDS} current={current} onOpenBase={onOpenBase} />);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(onboardingApi.listCorrections).mockResolvedValue({ data: [], meta: { quota: { used: 0, max: 30 } } });
  });

  it('compte les cartes bloquantes qui restent, « Plus tard » compris', async () => {
    const current = decided('accept_side', blocking.slice(1));
    current.set(blocking[1].id, { id: 'x', action: { type: 'later' } } as unknown as Decision);
    entry(current);
    expect(await screen.findByText('Encore 2 cartes bloquantes à trancher avant de préparer la nouvelle base. « Plus tard » ne tranche pas une carte bloquante (1 sur 2).')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Préparer la nouvelle base' })).not.toBeInTheDocument();
  });

  it('toutes tranchées : lance la préparation et ouvre l\'onglet', async () => {
    vi.mocked(onboardingApi.launchCorrection).mockResolvedValue(correction({ status: 'queued', stage: null }));
    const open = vi.fn();
    entry(decided('accept_side'), open);
    fireEvent.click(await screen.findByRole('button', { name: 'Préparer la nouvelle base' }));
    await waitFor(() => expect(open).toHaveBeenCalled());
    expect(onboardingApi.launchCorrection).toHaveBeenCalledWith('p1', 'a1');
  });

  it('une préparation en cours y renvoie ; une base prête se relit ou se refait après confirmation', async () => {
    vi.mocked(onboardingApi.listCorrections).mockResolvedValueOnce({ data: [correction({ status: 'running', stage: 'parsing' })], meta: { quota: { used: 1, max: 30 } } });
    const { unmount } = entry(decided('accept_side'));
    expect(await screen.findByRole('button', { name: 'Voir l\'avancement' })).toBeInTheDocument();
    unmount();

    vi.mocked(onboardingApi.listCorrections).mockResolvedValue({ data: [correction()], meta: { quota: { used: 1, max: 30 } } });
    entry(decided('accept_side'));
    expect(await screen.findByRole('button', { name: 'Relire la nouvelle base' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Préparer à nouveau' }));
    expect(screen.getByText(/La relecture de la version actuelle restera consultable/)).toBeInTheDocument();
    expect(onboardingApi.launchCorrection).not.toHaveBeenCalled();
  });

  it('quota atteint, ou audit antérieur à 0.9.0 : le dit au lieu du bouton', async () => {
    vi.mocked(onboardingApi.listCorrections).mockResolvedValue({ data: [], meta: { quota: { used: 30, max: 30 } } });
    const { unmount } = entry(decided('accept_side'));
    expect(await screen.findByText(/a atteint son nombre de préparations \(30\)/)).toBeInTheDocument();
    unmount();
    entry(decided('accept_side'), vi.fn(), '0.8.0');
    expect(screen.getByText(/relancez une analyse pour préparer la nouvelle base/)).toBeInTheDocument();
  });
});

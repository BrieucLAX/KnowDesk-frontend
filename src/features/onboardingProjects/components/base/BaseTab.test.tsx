import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('../../api/onboardingApi', () => ({
  onboardingApi: {
    listAnalyses: vi.fn(), getAudit: vi.fn(), listAuditImages: vi.fn(), getAuditImage: vi.fn(), listDecisions: vi.fn(),
    listValidations: vi.fn(), validateBase: vi.fn(),
    listCorrections: vi.fn(), launchCorrection: vi.fn(), getBase: vi.fn(),
    listReviews: vi.fn(), review: vi.fn(), cancelReview: vi.fn(),
    listSectionComments: vi.fn(), commentSection: vi.fn(), cancelSectionComment: vi.fn(),
    listSectionFixes: vi.fn(), fixSection: vi.fn(), cancelSectionFix: vi.fn(),
  },
}));


// Ces tests rendent la vraie base du pilote (16 fiches, une relecture par section) : en suite
// complète, sous charge, 5 s ne suffisent pas toujours (déjà instable sur main, 2026-10-09).
vi.setConfig({ testTimeout: 15_000 });
import { onboardingApi } from '../../api/onboardingApi';
import { ApiError } from '../../../../shared/lib/apiClient';
import { BaseTab } from './BaseTab';
import { CorrectionEntry } from './CorrectionEntry';
import { CurrentUserContext } from './AuthorName';
import type { BaseVersion, OnboardingCorrection, Review } from '../../lib/correction';
import type { Decision } from '../../lib/decisions';
import type { AuditResponse } from '../../lib/audit';
import type { ReadingCard } from '../../lib/reading';
import type { OnboardingAnalysis, OnboardingProject } from '../../types';
import BASE_PILOTE from './fixtures/base-0.1.0-pilote.response.json';
import CARDS_PILOTE from './fixtures/audit-0.9.0-pilote-cards.json';
import BASE_PILOTE_02 from './fixtures/base-0.2.0-pilote.response.json';
import BASE_PILOTE_03 from './fixtures/base-0.3.0-pilote.response.json';
import BASE_BANC_04 from './fixtures/base-0.4.0-banc-v5-g1.response.json';
import CARDS_PILOTE_B9 from './fixtures/audit-pilote-b9a878c1-cards.json';
import BASE_BIENVENUE from './fixtures/base-0.4.0-offre-bienvenue.response.json';
import AUDIT_BIENVENUE from './fixtures/audit-0.11.0-offre-bienvenue.response.json';
import BANC_AVANT_G1 from './fixtures/base-0.3.0-banc-v5-avant-g1.response.json';
import BANC_AVANT_G2 from './fixtures/base-0.3.0-banc-v5-avant-g2.response.json';
import BANC_AVANT_G3 from './fixtures/base-0.3.0-banc-v5-avant-g3.response.json';

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
  vi.mocked(onboardingApi.listValidations).mockResolvedValue([]);
  vi.mocked(onboardingApi.listDecisions).mockResolvedValue({ decisions: [], counts: { decided: 0, later: 0, skipped: 0 }, arbitrable: true });
  vi.mocked(onboardingApi.listReviews).mockResolvedValue({ reviews: [], counts: { reviewed: 0, toReview: 6 } });
  vi.mocked(onboardingApi.listSectionComments).mockResolvedValue([]);
  vi.mocked(onboardingApi.listSectionFixes).mockResolvedValue([]);
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

  it('base 0.2.0 : les cartes répondues qu\'aucune section ne porte sont à part, avec ce qu\'il faut faire', async () => {
    const [first, second] = CARDS;
    mockBase({ ...PILOTE, schemaVersion: '0.2.0', base: { ...PILOTE.base, schema_version: '0.2.0', pending: [
      { card_id: first.id, card_rank: first.rank, reason: 'unanswered' },
      { card_id: second.id, card_rank: second.rank, reason: 'no_section' },
    ] } });
    render(<BaseTab project={project} onGoToClarify={() => {}} />);
    expect(await screen.findByText(/^Non répondues, sans modification de la base : /)).toBeInTheDocument();
    expect(screen.getByText(/^Répondues, mais aucune section de la base ne les porte : /)).toBeInTheDocument();
    expect(screen.getByText(/^Pour les ajouter, nommez la section dans une précision de votre réponse/)).toBeInTheDocument();
    expect(screen.queryByText(/^Informations en attente/)).not.toBeInTheDocument();
  });

  it('base 0.2.0 réelle (correction du pilote rejouée par le pipeline 30ce86e) : affichée, pas « format inconnu »', async () => {
    const base = BASE_PILOTE_02 as unknown as BaseVersion;
    mockBase(base, [correction({ id: base.correctionId })]);
    render(<BaseTab project={project} onGoToClarify={() => {}} />);
    expect(await screen.findByText('0 sur 6 relues')).toBeInTheDocument();
    expect(screen.queryByText(/ne sait pas afficher/)).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 4 }).length).toBe(base.base.modifications.length + base.base.conventions.length);
  });

  it('base 0.3.0 réelle (pilote, KnowDesk-pipeline#56) : M1 à M10 sans trou, M4 en attente à son rang, raisons en clair', async () => {
    const base = BASE_PILOTE_03 as unknown as BaseVersion;
    mockBase(base, [correction({ id: base.correctionId })]);
    const cards = (CARDS_PILOTE_B9.cards as unknown as ReadingCard[]).map(c => ({
      ...c, mergedRanks: [], documentIds: [], sides: [], answers: [], unverifiedQuotes: [],
    }));
    vi.mocked(onboardingApi.getAudit).mockResolvedValue({ schemaVersion: '0.8.0', reading: { cards } } as unknown as AuditResponse);
    const { container } = render(<BaseTab project={project} onGoToClarify={() => {}} />);
    await screen.findByText('0 sur 6 relues');
    expect(screen.queryByText(/ne sait pas afficher/)).not.toBeInTheDocument();

    // Le pipeline a réservé M4 à la carte qui demande un chapitre : aucune modification ne le porte.
    expect(base.base.modifications.map(m => m.id)).not.toContain('M4');
    // À l'écran, toutes les modifications de M1 à M10, sans trou ; M4 telle que transmise.
    const numbers = screen.getAllByRole('heading', { level: 4 })
      .map(h => /^Modification (\d+)\b/.exec(h.textContent ?? '')?.[1])
      .filter((n): n is string => n !== undefined).map(Number).sort((a, b) => a - b);
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const m4 = screen.getByRole('article', { name: 'Modification 4' });
    expect(within(m4).getByRole('heading', { level: 4 })).toHaveTextContent('Modification 4 — en attente : création de chapitre');
    expect(m4).toHaveTextContent('Carte « Service de téléconsultation médicale »');
    // À son rang, parmi les modifications sans emplacement dans la base.
    const unplaced = screen.getByRole('heading', { level: 2, name: 'Modifications sans emplacement dans la base' }).closest('section')!;
    expect(within(unplaced).getByRole('article', { name: 'Modification 4' })).toBe(m4);
    expect(screen.getByText(/^Répondues, mais elles demandent un chapitre qui n'existe pas encore dans la base : Service de téléconsultation/)).toBeInTheDocument();
    expect(screen.getByText('La préparation ne crée pas de nouveau chapitre. Pour ajouter ce contenu, utilisez « Corriger cette section » sur la section la plus proche. Attention : relancer l\'analyse repart d\'un nouvel audit, et les réponses actuelles n\'y seraient pas reprises.')).toBeInTheDocument();
    expect(m4).toHaveTextContent('Cette réponse demande un chapitre qui n\'existe pas encore dans la base. Elle reste enregistrée dans « À clarifier ». Pour en reprendre le contenu, utilisez « Corriger cette section » sur la section la plus proche et ajoutez-le au texte.');

    // Les raisons de la 0.3.0, en clair : la note d'image mot pour mot, la note de travail.
    expect(container.textContent).toContain('L\'IA signale que l\'image ou le schéma ci-dessus devrait être mis à jour. Elle ne peut pas modifier une image : à vous de le faire si besoin.');
    expect(container.textContent).toContain('le texte proposé contenait une note de travail ; il n\'a pas été repris');
    expect(container.textContent).not.toMatch(TECHNICAL);
  });

  it('point 13 : la carte en attente d\'un chapitre montre la réponse enregistrée, son auteur, sa date, et la copie', async () => {
    const base = BASE_PILOTE_03 as unknown as BaseVersion;
    mockBase(base, [correction({ id: base.correctionId })]);
    const cards = (CARDS_PILOTE_B9.cards as unknown as ReadingCard[]).map(c => ({
      ...c, mergedRanks: [], documentIds: [], sides: [], answers: [], unverifiedQuotes: [],
    }));
    vi.mocked(onboardingApi.getAudit).mockResolvedValue({ schemaVersion: '0.8.0', reading: { cards } } as unknown as AuditResponse);
    const [chapter] = base.base.pending!;
    const recommendation = 'Créer un nouveau chapitre dans la base de connaissance dédié à la téléconsultation médicale.';
    vi.mocked(onboardingApi.listDecisions).mockResolvedValue({
      decisions: [{
        id: 'd4', questionId: chapter.card_id, cardId: chapter.card_id, groupId: null, conflictIds: null, supersedesId: null,
        action: { type: 'follow_recommendation', recommendation, effect: { type: 'complete' }, precisions: 'Lancement le 1er mars 2027.' },
        decidedBy: { id: 'u-moi', name: 'un membre de l\'équipe' }, decidedAt: '2026-10-04T09:00:00Z', cancelledAt: null, cancelledBy: null,
      }] as unknown as Decision[],
      counts: { decided: 1, later: 0, skipped: 0 }, arbitrable: true,
    });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<CurrentUserContext.Provider value="u-moi"><BaseTab project={project} onGoToClarify={() => {}} /></CurrentUserContext.Provider>);
    const m4 = await screen.findByRole('article', { name: 'Modification 4' });
    await waitFor(() => expect(m4).toHaveTextContent('Réponse enregistrée par un membre de l\'équipe'));
    expect(m4).toHaveTextContent(/le \d{1,2} octobre 2026/);
    expect(within(m4).getByRole('link', { name: 'Ajoutez votre nom à votre profil' })).toHaveAttribute('href', '/account');
    const quote = m4.querySelector('.obp-base-answer__text')!;
    expect(quote.textContent).toBe(`${recommendation}\n\nPrécision : Lancement le 1er mars 2027.`);
    fireEvent.click(within(m4).getByRole('button', { name: 'Copier la réponse' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(quote.textContent));
    expect(await within(m4).findByRole('button', { name: 'Copiée' })).toBeInTheDocument();
  });

  it('base 0.4.0 (banc v5, G1, validée par le back) : phrases à vérifier comptées et surlignées, chapitre créé comme une modification ordinaire', async () => {
    const base = BASE_BANC_04 as unknown as BaseVersion;
    mockBase(base, [correction({ id: base.correctionId })]);
    const { container } = render(<BaseTab project={project} onGoToClarify={() => {}} />);
    await screen.findByText('0 sur 6 relues');
    expect(screen.queryByText(/ne sait pas afficher/)).not.toBeInTheDocument();

    // Le chapitre créé : une modification ordinaire, avec ses trois boutons d'avis.
    const m4 = cardOf(/^Modification 4/);
    expect(within(m4).getByRole('heading', { level: 4 })).toHaveTextContent('Modification 4 · Nouveau chapitre');
    for (const name of ['Accepter', 'Corriger l\'ajout', 'Refuser']) expect(within(m4).getByRole('button', { name })).toBeInTheDocument();
    expect(m4).not.toHaveTextContent('en attente');
    expect(screen.queryByRole('heading', { level: 2, name: 'Modifications sans emplacement dans la base' })).not.toBeInTheDocument();

    // Le compteur, à côté des boutons d'avis : une phrase sous le seuil dans le chapitre (M4), la ligne A1 (M7).
    const counter = (card: HTMLElement) => card.querySelector('.obp-base-verify-count');
    expect(counter(m4)).toHaveTextContent(/^1 phrase à vérifier$/);
    expect(counter(m4)!.nextElementSibling).toBe(within(m4).getByRole('group', { name: /^Votre avis sur/ }));
    expect(counter(cardOf(/^Modification 7/))).toHaveTextContent(/^1 phrase à vérifier$/);
    // Les autres modifications n'ont pas de compteur.
    for (const id of ['1', '3', '8']) expect(counter(cardOf(new RegExp(`^Modification ${id} `)))).toBeNull();

    // Les phrases surlignées dans le texte, mot pour mot, et elles seules.
    const marked = [...container.querySelectorAll('.obp-base-doc mark.obp-base-verify')]
      .map(m => [...m.childNodes].filter(n => !(n instanceof HTMLElement && n.classList.contains('sr-only'))).map(n => n.textContent).join(''))
      .join('');
    expect(marked).toContain('Dans 90 % des cas, le délai est inférieur à 30 minutes.');
    expect(marked).toContain('une réponse motivée sous 2 mois maximum à compter de la réception (délai cible interne pour apporter une réponse motivée à l\'adhérent : 10 jours ouvrés) ;');
    expect(marked).not.toContain('La mise en relation avec un médecin généraliste');
    expect(container.querySelectorAll('.obp-base-doc .sr-only')).not.toHaveLength(0);
    expect([...container.querySelectorAll('.obp-base-doc mark .sr-only')].map(n => n.textContent)).toEqual(['À vérifier : ', 'À vérifier : ']);
    expect(container.querySelector('.obp-base-legend mark')).toHaveTextContent('Phrase à vérifier');

    // Le chapitre, en dernière fiche, titré par son premier titre ; la ligne du sommaire marquée « Modification 4 ».
    const chapters = [...container.querySelectorAll('.obp-base-chapter__title')].map(h => h.textContent);
    expect(chapters[chapters.length - 1]).toBe('Chapitre 16 — Téléconsultation médicale');
    expect(screen.getByText('Nouveau chapitre, créé par la modification 4 · 16-teleconsultation-medicale.md')).toBeInTheDocument();
    const tocRow = [...container.querySelectorAll('tr.obp-base-row--insert')].find(r => r.textContent?.includes('Téléconsultation médicale'))!;
    expect(tocRow).toHaveTextContent('16Téléconsultation médicale10/2026');
    expect(tocRow).toHaveTextContent('Modification 4');
    expect(screen.getAllByText((_, el) => el?.className === 'obp-base-follow' && /^Suite de la modification 4/.test(el.textContent ?? '')).length).toBe(1);

    expect(container.textContent).not.toMatch(TECHNICAL);
  });

  it('point 9 : « Corriger cette section » est un bouton secondaire, sur chaque section, modifiée ou non', async () => {
    const { container } = render(<BaseTab project={project} onGoToClarify={() => {}} />);
    await screen.findByText('0 sur 6 relues');
    const sections = container.querySelectorAll('.obp-base-section');
    const buttons = [...container.querySelectorAll('.obp-base-section-fix button')].filter(b => b.textContent === 'Corriger cette section');
    expect(sections.length).toBeGreaterThan(1);
    expect(buttons).toHaveLength(sections.length);
    // Sur une section changée, c'est l'un des trois gestes de la section (plan v6, D3).
    for (const b of buttons) {
      if (b.closest('.obp-base-section--open')) expect(b.closest('[role="group"]')).toHaveAccessibleName(/^Votre choix pour la section/);
      else expect(b.className).toMatch(/secondary/);
    }
  });

  it('base d\'une version inconnue : le dit, sans rien afficher d\'autre', async () => {
    mockBase({ ...PILOTE, schemaVersion: '0.5.0' });
    render(<BaseTab project={project} onGoToClarify={() => {}} />);
    expect(await screen.findByText(/Cette base est dans un format que cette version de l'application ne sait pas afficher/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 4 })).not.toBeInTheDocument();
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

  it('une modification ne montre que ce qu\'elle écrit : une mesure expirée n\'emprunte pas les lignes d\'une autre (Base de co 2026 v3, M3)', async () => {
    const sheet = PILOTE.base.sheets[1];
    const key = sheet.sections[0].key;
    const procedure = 'Du 1er octobre au 30 novembre 2026, pour les pharmacies uniquement : sélectionnez le statut « Incident TP — Priorité Flux ».';
    const [, m2, m3] = PILOTE.base.modifications;
    const shared: BaseVersion = {
      ...PILOTE,
      base: {
        ...PILOTE.base,
        sheets: [{ ...sheet, sections: [{
          ...sheet.sections[0], key, original_markdown: '### Vérifier les droits d\'un adhérent\n',
          corrected_markdown: `### Vérifier les droits d'un adhérent\n\n${procedure}\n`, modification_ids: ['M2'],
          changes: [{ kind: 'insert', line_kind: 'paragraph', before: '', after: procedure, modification_id: 'M2', kept: true }],
        }] }],
        modifications: [
          { ...m2, outcome: 'applied', reasons: [], section_keys: [key] },
          { ...m3, expert_text: null, origin: { ...m3.origin, action_type: 'follow_recommendation' }, outcome: 'not_applicable', section_keys: [key], reasons: ['Mesure temporaire du dimanche 28 septembre 2026 à 20h00 au lundi 29 septembre 2026 à 06h00, expirée à la date de préparation de la base (08/10/2026) : elle n\'est pas insérée.'] },
        ],
      },
    };
    mockBase(shared);
    render(<BaseTab project={project} onGoToClarify={() => {}} />);
    const expired = await screen.findByRole('article', { name: /^Modification 3/ });
    expect(expired).toHaveTextContent('Non appliquée');
    expect(expired).toHaveTextContent('Elle n\'écrit rien dans la base. Les changements de « ');
    expect(expired).toHaveTextContent('viennent de la modification 2.');
    expect(expired).not.toHaveTextContent('Incident TP');
    expect(cardOf(/^Modification 2/)).toHaveTextContent('Ses lignes sont marquées « Modification 2 » dans le texte.');
  });

  it('enregistre un verdict dès le clic, puis un commentaire sans perdre le verdict', async () => {
    vi.mocked(onboardingApi.review)
      .mockResolvedValueOnce(review('M1'))
      .mockResolvedValueOnce(review('M1', { id: '00000000-0000-4000-8000-000000000011', comment: 'À confirmer.', supersedesId: '00000000-0000-4000-8000-000000000001' }));
    render(<BaseTab project={project} onGoToClarify={() => {}} />);
    const m1 = await screen.findByRole('article', { name: /^Modification 1/ });

    fireEvent.click(within(m1).getByRole('button', { name: 'Accepter' }));
    await waitFor(() => expect(onboardingApi.review).toHaveBeenCalledWith('p1', PILOTE.correctionId, {
      itemId: 'M1', expectedCurrentId: null, verdict: 'accept', correctedText: null, correctedTexts: null, comment: null,
    }));
    expect(await screen.findByText('1 sur 6 relues')).toBeInTheDocument();
    expect(within(m1).getByRole('button', { name: 'Accepter' })).toHaveAttribute('aria-pressed', 'true');

    const comment = within(m1).getByLabelText('Un commentaire ? (facultatif)');
    fireEvent.change(comment, { target: { value: 'À confirmer.' } });
    fireEvent.blur(comment);
    await waitFor(() => expect(onboardingApi.review).toHaveBeenLastCalledWith('p1', PILOTE.correctionId, {
      itemId: 'M1', expectedCurrentId: '00000000-0000-4000-8000-000000000001', verdict: 'accept', correctedText: null, correctedTexts: null, comment: 'À confirmer.',
    }));
    expect(await within(m1).findByText('Enregistré')).toBeInTheDocument();
  });

  it('« Corriger » part du texte proposé et l\'enregistre corrigé', async () => {
    vi.mocked(onboardingApi.review).mockImplementation(async (_p, _c, body) => review(body.itemId, { verdict: body.verdict, correctedTexts: body.correctedTexts }));
    const m3Key = PILOTE.base.modifications.find(m => m.id === 'M3')!.section_keys[0];
    render(<BaseTab project={project} onGoToClarify={() => {}} />);
    const m3 = await screen.findByRole('article', { name: /^Modification 3/ });
    fireEvent.click(within(m3).getByRole('button', { name: 'Corriger l\'ajout' }));
    const field = within(m3).getByLabelText('Le texte tel que vous l\'écririez') as HTMLTextAreaElement;
    expect(field.value).toMatch(/1er octobre 2026/);
    await waitFor(() => expect(onboardingApi.review).toHaveBeenCalledWith('p1', PILOTE.correctionId, expect.objectContaining({ itemId: 'M3', verdict: 'fix', correctedText: null, correctedTexts: { [m3Key]: field.value.trim() } })));

    fireEvent.change(field, { target: { value: 'Mon texte.' } });
    fireEvent.blur(field);
    await waitFor(() => expect(onboardingApi.review).toHaveBeenLastCalledWith('p1', PILOTE.correctionId, expect.objectContaining({ verdict: 'fix', correctedTexts: { [m3Key]: 'Mon texte.' } })));
  });

  it('« Corriger » déplace un ajout : la phrase le dit, une section vidée garde son texte d\'origine et n\'est pas envoyée', async () => {
    vi.mocked(onboardingApi.review).mockImplementation(async (_p, _c, body) => review(body.itemId, { verdict: body.verdict, correctedTexts: body.correctedTexts }));
    const [first, second] = PILOTE.base.modifications.find(m => m.id === 'M1')!.section_keys;
    render(<BaseTab project={project} onGoToClarify={() => {}} />);
    const m1 = await screen.findByRole('article', { name: /^Modification 1/ });
    fireEvent.click(within(m1).getByRole('button', { name: 'Corriger l\'ajout' }));
    expect(within(m1).getByText(/Une section laissée vide garde son texte d'origine/)).toBeInTheDocument();
    const [from, to] = within(m1).getAllByLabelText(/le texte tel que vous l'écririez/) as HTMLTextAreaElement[];
    fireEvent.change(from, { target: { value: '' } });
    fireEvent.change(to, { target: { value: 'L\'ajout, à sa place.' } });
    fireEvent.blur(to);
    await waitFor(() => expect(onboardingApi.review).toHaveBeenLastCalledWith('p1', PILOTE.correctionId, expect.objectContaining({
      itemId: 'M1', verdict: 'fix', correctedTexts: { [second]: 'L\'ajout, à sa place.' },
    })));
    expect(Object.keys(vi.mocked(onboardingApi.review).mock.lastCall![2].correctedTexts!)).not.toContain(first);
  });

  it('« Corriger cette section » sur une section inchangée : part du texte proposé, l\'enregistre, puis revient au texte de la base', async () => {
    const sheet = PILOTE.base.sheets.find(sh => sh.sections.some(x => !(x.modification_ids ?? []).length && !(x.convention_ids ?? []).length))!;
    const target = sheet.sections.find(x => !(x.modification_ids ?? []).length && !(x.convention_ids ?? []).length)!;
    const saved = { id: '00000000-0000-4000-8000-0000000000f1', sectionKey: target.key, correctedText: 'Mon texte de la section.', supersedesId: null, authorName: 'Camille Martin', createdAt: '2026-10-09T10:00:00Z', cancellation: null };
    vi.mocked(onboardingApi.fixSection).mockResolvedValue(saved);
    vi.mocked(onboardingApi.cancelSectionFix).mockResolvedValue({ cancelled: saved, current: null });
    const { container } = render(<BaseTab project={project} onGoToClarify={() => {}} />);
    await screen.findByText('0 sur 6 relues');
    const folded = [...container.querySelectorAll('details.obp-base-section--unchanged')]
      .find(d => d.querySelector('textarea, button') && within(d as HTMLElement).queryByRole('button', { name: 'Corriger cette section' })) as HTMLElement;
    fireEvent.click(within(folded).getByRole('button', { name: 'Corriger cette section' }));
    const field = within(folded).getByLabelText(/le texte de la section tel que vous l'écririez/) as HTMLTextAreaElement;
    expect(field.value.length).toBeGreaterThan(0);
    fireEvent.change(field, { target: { value: 'Mon texte de la section.' } });
    fireEvent.click(within(folded).getByRole('button', { name: 'Enregistrer ce texte' }));
    await waitFor(() => expect(onboardingApi.fixSection).toHaveBeenCalledWith('p1', PILOTE.correctionId, expect.objectContaining({
      expectedCurrentId: null, correctedText: 'Mon texte de la section.',
    })));
    // Point 8 du plan v4 : la section affiche le texte enregistré, et qui l'a corrigée.
    expect(await within(folded).findByText('corrigée')).toBeInTheDocument();
    expect(within(folded).getByText(/^Texte corrigé par Camille Martin, le /)).toBeInTheDocument();
    expect(folded.querySelector('.obp-base-fixed pre')!.textContent).toBe('Mon texte de la section.');
    expect(within(folded).getByText('Ce texte remplace la section dans la version propre.')).toBeInTheDocument();

    fireEvent.click(within(folded).getByRole('button', { name: 'Modifier le texte corrigé' }));
    fireEvent.click(within(folded).getByRole('button', { name: 'Revenir au texte de la base' }));
    await waitFor(() => expect(onboardingApi.cancelSectionFix).toHaveBeenCalledWith('p1', PILOTE.correctionId, saved.id));
    await waitFor(() => expect(within(folded).queryByText('corrigée')).not.toBeInTheDocument());
    expect(within(folded).queryByText(/^Texte corrigé par/)).not.toBeInTheDocument();
  });

  it('un back sans « Corriger cette section » (avant la migration 57) : la relecture se charge quand même', async () => {
    vi.mocked(onboardingApi.listSectionFixes).mockRejectedValue(new ApiError('NOT_FOUND', 'Introuvable.', 404));
    render(<BaseTab project={project} onGoToClarify={() => {}} />);
    expect(await screen.findByText('0 sur 6 relues')).toBeInTheDocument();
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

  it('point 12 : sans préparation, les cartes qui bloquent sont nommées, chacune ouvrable dans « À clarifier »', async () => {
    mockBase(PILOTE, []);
    const blocking = CARDS.filter(c => ['dated_change', 'contradiction', 'probable_error'].includes(c.nature));
    const [answered, later, ...open] = blocking;
    vi.mocked(onboardingApi.listDecisions).mockResolvedValue({
      decisions: [
        { id: 'd1', questionId: answered.id, cardId: answered.id, action: { type: 'out_of_scope' } },
        { id: 'd2', questionId: later.id, cardId: later.id, action: { type: 'later' } },
      ] as unknown as Decision[],
      counts: { decided: 1, later: 1, skipped: 0 }, arbitrable: true,
    });
    const go = vi.fn();
    render(<BaseTab project={project} onGoToClarify={go} />);
    const list = await screen.findByRole('region', { name: 'Cartes qui bloquent la préparation' });
    await waitFor(() => expect(within(list).getAllByRole('button')).toHaveLength(open.length + 1));
    expect(list).toHaveTextContent(`${open.length + 1} cartes bloquent encore la préparation :`);
    expect(list).not.toHaveTextContent(answered.analysis.subject);
    const laterItem = within(list).getByRole('button', { name: later.analysis.subject }).closest('li')!;
    expect(laterItem).toHaveTextContent('laissée « Plus tard »');
    fireEvent.click(within(list).getByRole('button', { name: open[0].analysis.subject }));
    expect(go).toHaveBeenCalledWith(open[0].id);
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

  it('audit 0.10.0 : « Préparer la nouvelle base » comme sur un 0.9.0', async () => {
    entry(decided('accept_side'), vi.fn(), '0.10.0');
    expect(await screen.findByRole('button', { name: 'Préparer la nouvelle base' })).toBeInTheDocument();
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

/**
 * « Retirés comme obsolètes » (plan v6, lot C). La base est la fixture réelle de KnowDesk#44
 * (`correction-0.4.0-offre-bienvenue.json` : code de correction du pipeline, réponse « retirer » sur
 * « Offre de bienvenue : -10 % … jusqu'au 30/06/2026 ») ; l'audit, sa carte « Contenu périmé »
 * (`card_perime`), écrite au format 0.11.0 et passée par la lecture du back (`readReading`, 0f459a1).
 */
describe('Nouvelle base : retirés comme obsolètes (audit 0.11.0)', () => {
  const BIENVENUE = BASE_BIENVENUE as unknown as BaseVersion;
  const AUDIT = AUDIT_BIENVENUE as unknown as AuditResponse;

  function mockWelcome(reviews: Review[], audit: AuditResponse = AUDIT) {
    mockBase(BIENVENUE, [correction({ id: BIENVENUE.correctionId })]);
    vi.mocked(onboardingApi.getAudit).mockResolvedValue(audit);
    vi.mocked(onboardingApi.listReviews).mockResolvedValue({ reviews, counts: { reviewed: reviews.length, toReview: 1 } });
  }

  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('retrait accepté d\'un contenu périmé : le texte retiré, sa section, sa modification et sa carte', async () => {
    mockWelcome([review('M1')]);
    const { container } = render(<BaseTab project={project} onGoToClarify={() => {}} />);
    const view = await screen.findByRole('region', { name: 'Retirés comme obsolètes' });
    const items = within(view).getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(within(items[0]).getByText('Chapitre 1 — Offres et avantages › 1.1 Offre de bienvenue')).toBeInTheDocument();
    expect(within(items[0]).getByText('Offre de bienvenue : -10 % sur la première cotisation, adhésion signée jusqu\'au 30/06/2026.').tagName).toBe('DEL');
    expect(within(items[0]).getByRole('link', { name: 'Modification 1' })).toHaveAttribute('href', '#obp-base-m1');
    expect(items[0]).toHaveTextContent('Modification 1, carte « Contenu périmé »');
    expect(container.textContent).not.toMatch(/card_|doc_|outdated_content/);
  });

  it.each([
    ['sans avis', [] as Review[]],
    ['refusé', [review('M1', { verdict: 'refuse' })]],
    ['avis annulé', [review('M1', { cancellation: { cancelledAt: '2026-10-07T11:00:00Z', cancelledByName: 'Camille Martin' } })]],
  ])('retrait %s : le passage reste dans la base, la vue n\'apparaît pas', async (_, reviews) => {
    mockWelcome(reviews);
    render(<BaseTab project={project} onGoToClarify={() => {}} />);
    await screen.findByRole('article', { name: /^Modification 1/ });
    expect(screen.queryByRole('region', { name: 'Retirés comme obsolètes' })).not.toBeInTheDocument();
  });

  it('« Accepter » le retrait fait apparaître le passage dans la vue', async () => {
    mockWelcome([]);
    vi.mocked(onboardingApi.review).mockImplementation(async (_p, _c, body) => review(body.itemId, { verdict: body.verdict }));
    render(<BaseTab project={project} onGoToClarify={() => {}} />);
    const m1 = await screen.findByRole('article', { name: /^Modification 1/ });
    expect(screen.queryByRole('region', { name: 'Retirés comme obsolètes' })).not.toBeInTheDocument();
    fireEvent.click(within(m1).getByRole('button', { name: 'Accepter' }));
    expect(await screen.findByRole('region', { name: 'Retirés comme obsolètes' })).toHaveTextContent('Offre de bienvenue : -10 %');
  });

  it('retrait accepté sur une carte du modèle (pas un contenu périmé) : pas dans la vue', async () => {
    const reading = AUDIT.reading!;
    const modelCard = { ...reading.cards[0], origin: 'model' as const, check: null };
    mockWelcome([review('M1')], { ...AUDIT, schemaVersion: '0.10.0', reading: { ...reading, cards: [modelCard] } });
    render(<BaseTab project={project} onGoToClarify={() => {}} />);
    const m1 = await screen.findByRole('article', { name: /^Modification 1/ });
    // L'audit est lu : la modification nomme sa carte.
    expect(await within(m1).findByText(/carte « Contenu périmé »/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Retirés comme obsolètes' })).not.toBeInTheDocument();
  });
});

/**
 * Plan v6, D3 : les bases du banc v5 « avant » (KnowDesk-pipeline#58, `out/plan-v6/rejeu/avant`,
 * trois générations), validées par le back (`checkBaseCorrection`, main dd09e7d) ; la réponse de
 * GET …/base les rend telles quelles. M10 y change la 1.3 et le glossaire ; Zone 1 est à moitié
 * annotée en G1 ; M5 (CONFORT) et M6 (2.3) ne gardent aucune ligne.
 */
const BANC_AVANT = [BANC_AVANT_G1, BANC_AVANT_G2, BANC_AVANT_G3] as unknown as BaseVersion[];
const sectionOf = (base: BaseVersion, suffix: string) => base.base.sheets.flatMap(sh => sh.sections).find(x => x.key.endsWith(suffix))!;
const S13 = 'b64fd789:7', GLOSSAIRE = 'aed291d9:0', ZONE1 = 'c162a4e7:3', CONFORT = 'b64fd789:5', S23 = '832c4545:4';
const choiceOf = (title: string) => screen.getByRole('group', { name: `Votre choix pour la section « ${title} »` });
const fixOf = (sectionKey: string, correctedText: string) => ({
  id: '00000000-0000-4000-8000-0000000000d3', sectionKey, correctedText, supersedesId: null,
  authorName: 'Camille Martin', createdAt: '2026-10-18T10:00:00Z', cancellation: null,
});

describe('Nouvelle base : accepter, corriger ou refuser chaque section touchée (plan v6, D3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(onboardingApi.review).mockImplementation(async (_p, _c, body) => review(body.itemId, { verdict: body.verdict }));
    vi.mocked(onboardingApi.fixSection).mockImplementation(async (_p, _c, body) => fixOf(body.sectionKey, body.correctedText));
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it.each([1, 2, 3])('G%i, M10 : la 1.3 refusée (son texte d\'origine, à l\'identique), le glossaire accepté', async n => {
    const base = BANC_AVANT[n - 1];
    mockBase(base, [correction({ id: base.correctionId })]);
    const s13 = sectionOf(base, S13), glossaire = sectionOf(base, GLOSSAIRE);
    render(<BaseTab project={project} onGoToClarify={() => {}} />);
    const m10 = await screen.findByRole('article', { name: /^Modification 10 / });
    fireEvent.click(within(m10).getByRole('button', { name: 'Accepter' }));
    await waitFor(() => expect(onboardingApi.review).toHaveBeenCalledWith('p1', base.correctionId, expect.objectContaining({ itemId: 'M10', verdict: 'accept' })));

    // Accepter est le geste par défaut de chaque section touchée.
    const choice = choiceOf('1.3 L\'offre collective entreprise');
    expect(within(choice).getByRole('button', { name: 'Accepter' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(choice).getByRole('button', { name: 'Refuser' }));
    await waitFor(() => expect(onboardingApi.fixSection).toHaveBeenCalledWith('p1', base.correctionId, {
      sectionKey: s13.key, expectedCurrentId: null, correctedText: s13.original_markdown,
    }));
    const section = screen.getByRole('region', { name: '1.3 L\'offre collective entreprise' });
    expect(await within(section).findByText(/^Texte d'origine conservé par Camille Martin, le /)).toBeInTheDocument();
    expect(section.querySelector('.obp-base-fixed pre')!.textContent).toBe(s13.original_markdown);
    expect(within(choiceOf('1.3 L\'offre collective entreprise')).getByRole('button', { name: 'Refuser' })).toHaveAttribute('aria-pressed', 'true');

    // Le glossaire garde l'avis de M10 : aucun texte de section, Accepter toujours choisi.
    expect(vi.mocked(onboardingApi.fixSection).mock.calls.map(c => c[2].sectionKey)).not.toContain(glossaire.key);
    expect(within(choiceOf('Chapitre 13 — Glossaire et acronymes métier')).getByRole('button', { name: 'Accepter' })).toHaveAttribute('aria-pressed', 'true');
    // La modification et sa raison restent visibles.
    expect(within(m10).getByRole('button', { name: 'Accepter' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('G1, Zone 1 à moitié annotée : « Refuser » enregistre exactement le texte d\'origine ; « Accepter » le retire', async () => {
    const base = BANC_AVANT[0];
    mockBase(base, [correction({ id: base.correctionId })]);
    const zone1 = sectionOf(base, ZONE1);
    expect(zone1.corrected_markdown).not.toBe(zone1.original_markdown);
    const saved = fixOf(zone1.key, zone1.original_markdown);
    vi.mocked(onboardingApi.cancelSectionFix).mockResolvedValue({ cancelled: saved, current: null });
    render(<BaseTab project={project} onGoToClarify={() => {}} />);
    await screen.findByRole('article', { name: /^Modification 1 / });
    const title = '3.2 Grille tarifaire indicative (base 06/2024 — non fiable, voir avertissement ci-dessus) › Zone 1 (Île-de-France et grandes métropoles)';
    fireEvent.click(within(choiceOf(title)).getByRole('button', { name: 'Refuser' }));
    await waitFor(() => expect(onboardingApi.fixSection).toHaveBeenCalledTimes(1));
    expect(vi.mocked(onboardingApi.fixSection).mock.calls[0][2].correctedText).toBe(zone1.original_markdown);
    const section = screen.getByRole('region', { name: title });
    expect(await within(section).findByText(/^Texte d'origine conservé par /)).toBeInTheDocument();
    expect(section.querySelector('.obp-base-fixed pre')!.textContent).toBe(zone1.original_markdown);
    // Le texte proposé, et ce que la modification a fait, restent lisibles.
    expect(within(section).getByText('Texte proposé par la préparation')).toBeInTheDocument();
    expect(cardOf(/^Modification 1 /)).toHaveTextContent('Ce qui n\'a pas été repris');

    fireEvent.click(within(choiceOf(title)).getByRole('button', { name: 'Accepter' }));
    await waitFor(() => expect(onboardingApi.cancelSectionFix).toHaveBeenCalledWith('p1', base.correctionId, saved.id));
    await waitFor(() => expect(within(section).queryByText(/^Texte d'origine conservé/)).not.toBeInTheDocument());
  });

  it('« Corriger cette section » sur une section touchée : part du texte proposé, et ce n\'est pas un refus', async () => {
    const base = BANC_AVANT[0];
    mockBase(base, [correction({ id: base.correctionId })]);
    const s13 = sectionOf(base, S13);
    render(<BaseTab project={project} onGoToClarify={() => {}} />);
    await screen.findByRole('article', { name: /^Modification 10 / });
    fireEvent.click(within(choiceOf('1.3 L\'offre collective entreprise')).getByRole('button', { name: 'Corriger cette section' }));
    const section = screen.getByRole('region', { name: '1.3 L\'offre collective entreprise' });
    const field = within(section).getByLabelText(/le texte de la section tel que vous l'écririez/) as HTMLTextAreaElement;
    expect(field.value).toBe(s13.corrected_markdown);
    expect(within(section).queryByRole('button', { name: 'Revenir au texte de la base' })).not.toBeInTheDocument();
    fireEvent.change(field, { target: { value: 'Mon texte de la 1.3.' } });
    fireEvent.click(within(section).getByRole('button', { name: 'Enregistrer ce texte' }));
    expect(await within(section).findByText(/^Texte corrigé par Camille Martin/)).toBeInTheDocument();
    const choice = choiceOf('1.3 L\'offre collective entreprise');
    expect(within(choice).getByRole('button', { name: 'Corriger cette section' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(choice).getByRole('button', { name: 'Refuser' })).toHaveAttribute('aria-pressed', 'false');
  });

  it.each([1, 2, 3])('G%i : CONFORT et la 2.3, sans ligne gardée, restent repliées « inchangée » ; M5 et M6 restent visibles avec leur raison', async n => {
    const base = BANC_AVANT[n - 1];
    mockBase(base, [correction({ id: base.correctionId })]);
    const { container } = render(<BaseTab project={project} onGoToClarify={() => {}} />);
    await screen.findByRole('article', { name: /^Modification 5 / });
    const folded = (title: string) => [...container.querySelectorAll('details.obp-base-section--unchanged')]
      .find(d => d.querySelector('summary')!.textContent === `${title} · inchangée`);
    for (const [suffix, title, id] of [[CONFORT, '1.2 Les gammes de contrats santé individuels › Formule CONFORT', '5'], [S23, '2.3 Délai de carence', '6']]) {
      expect(sectionOf(base, suffix).corrected_markdown).toBe(sectionOf(base, suffix).original_markdown);
      expect(folded(title)).toBeDefined();
      expect(screen.queryByRole('region', { name: title })).not.toBeInTheDocument();
      const card = cardOf(new RegExp(`^Modification ${id} `));
      expect(card.closest('details')).toBeNull();
      expect(card.querySelector('.obp-base-card__outcome')).toHaveTextContent(/^(Non appliquée|Réglée sans modification)Pourquoi :.+/);
    }
  });

  it('Q6a : une section vide à l\'origine (chapitre créé, banc v5 G1 en 0.4.0) ne se refuse pas : « refusez la modification »', async () => {
    const base = BASE_BANC_04 as unknown as BaseVersion;
    mockBase(base, [correction({ id: base.correctionId })]);
    render(<BaseTab project={project} onGoToClarify={() => {}} />);
    await screen.findByRole('article', { name: /^Modification 4 / });
    const choice = choiceOf('Chapitre 16 — Téléconsultation médicale');
    expect(within(choice).getByRole('button', { name: 'Refuser' })).toBeDisabled();
    expect(choice.parentElement).toHaveTextContent('Le texte d\'origine de cette section est vide : refusez la modification.');
    fireEvent.click(within(choice).getByRole('button', { name: 'Refuser' }));
    expect(onboardingApi.fixSection).not.toHaveBeenCalled();
  });
});

describe('Nouvelle base : « Corriger l\'ajout » et le texte autour (plan v6, D4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(onboardingApi.review).mockImplementation(async (_p, _c, body) => review(body.itemId, { verdict: body.verdict, correctedTexts: body.correctedTexts }));
    vi.mocked(onboardingApi.fixSection).mockImplementation(async (_p, _c, body) => fixOf(body.sectionKey, body.correctedText));
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('M1 (banc v5, G1) : « Corriger l\'ajout » ne montre que l\'ajout ; « Modifier aussi le texte autour » ouvre la section, avertissement compris', async () => {
    const base = BANC_AVANT[0];
    mockBase(base, [correction({ id: base.correctionId })]);
    const intro = sectionOf(base, 'c162a4e7:0');
    const chapter = 'Chapitre 3 — Cotisations et tarification';
    render(<BaseTab project={project} onGoToClarify={() => {}} />);
    const m1 = await screen.findByRole('article', { name: /^Modification 1 / });
    expect(within(m1).queryByRole('button', { name: 'Corriger' })).not.toBeInTheDocument();
    fireEvent.click(within(m1).getByRole('button', { name: 'Corriger l\'ajout' }));

    // L'ajout seul : l'avertissement du chapitre 3 n'y est pas (« Je ne peux modifier que le passage ajouté par l'IA »).
    const addition = within(m1).getByLabelText(`« ${chapter} » : le texte tel que vous l'écririez`) as HTMLTextAreaElement;
    expect(addition.value).toMatch(/^Pour toute souscription avant le 31 décembre 2026/);
    expect(addition.value).not.toContain('FICHE NON ACTUALISÉE');

    fireEvent.click(within(m1).getByRole('button', { name: `Modifier aussi le texte autour, dans « ${chapter} »` }));
    // La fiche et sa première section portent le même titre : la section est celle de la classe « open ».
    const section = screen.getAllByRole('region', { name: chapter }).find(r => r.classList.contains('obp-base-section--open'))!;
    const field = await within(section).findByLabelText(`« ${chapter} » : le texte de la section tel que vous l'écririez`) as HTMLTextAreaElement;
    expect(field.value).toBe(intro.corrected_markdown);
    expect(field).toHaveFocus();

    const fixed = intro.corrected_markdown.replace('**⚠ FICHE NON ACTUALISÉE — dernière mise à jour 06/2024.**', '**Grille 2024, en vigueur jusqu\'au 31/12/2026.**');
    fireEvent.change(field, { target: { value: fixed } });
    fireEvent.click(within(section).getByRole('button', { name: 'Enregistrer ce texte' }));
    await waitFor(() => expect(onboardingApi.fixSection).toHaveBeenCalledWith('p1', base.correctionId, {
      sectionKey: intro.key, expectedCurrentId: null, correctedText: fixed,
    }));
    expect(await within(section).findByText(/^Texte corrigé par Camille Martin/)).toBeInTheDocument();
  });

  it('M8 (G1) : le texte autour d\'une section repliée « inchangée » la déplie, l\'éditeur ouvert', async () => {
    const base = BANC_AVANT[0];
    mockBase(base, [correction({ id: base.correctionId })]);
    const { container } = render(<BaseTab project={project} onGoToClarify={() => {}} />);
    const m8 = await screen.findByRole('article', { name: /^Modification 8 / });
    const title = '4.5 Devis et accord préalable';
    const folded = [...container.querySelectorAll('details.obp-base-section--unchanged')]
      .find(d => d.querySelector('summary')!.textContent === `${title} · inchangée`) as HTMLDetailsElement;
    expect(folded.open).toBe(false);
    fireEvent.click(within(m8).getByRole('button', { name: 'Corriger l\'ajout' }));
    fireEvent.click(within(m8).getByRole('button', { name: `Modifier aussi le texte autour, dans « Chapitre 4 — Remboursements santé › ${title} »` }));
    const field = await within(folded).findByLabelText(`« ${title} » : le texte de la section tel que vous l'écririez`) as HTMLTextAreaElement;
    expect(folded.open).toBe(true);
    expect(field).toHaveFocus();
    expect(field.value).toBe(sectionOf(base, '557eea2c:6').corrected_markdown);
  });

  it('une seule section touchée : le lien dit seulement « Modifier aussi le texte autour »', async () => {
    const base = BANC_AVANT[0];
    mockBase(base, [correction({ id: base.correctionId })]);
    render(<BaseTab project={project} onGoToClarify={() => {}} />);
    const m7 = await screen.findByRole('article', { name: /^Modification 7 / });
    fireEvent.click(within(m7).getByRole('button', { name: 'Corriger l\'ajout' }));
    fireEvent.click(within(m7).getByRole('button', { name: 'Modifier aussi le texte autour' }));
    const section = screen.getByRole('region', { name: '6.1 Définition et cadre réglementaire' });
    expect(await within(section).findByLabelText(/le texte de la section tel que vous l'écririez/)).toHaveFocus();
  });
});

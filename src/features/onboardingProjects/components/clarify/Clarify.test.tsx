import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('../../api/onboardingApi', () => ({
  onboardingApi: {
    listAnalyses: vi.fn(), getAudit: vi.fn(), getAuditImage: vi.fn(), listDecisions: vi.fn(),
    cardHistory: vi.fn(), answerCard: vi.fn(), cancelDecision: vi.fn(),
  },
}));

import { onboardingApi } from '../../api/onboardingApi';
import { AuditTab } from '../audit/AuditTab';
import { ClarifyQuote } from './ReadingCardView';
import type { Audit, AuditResponse } from '../../lib/audit';
import { orderedCards, unverifiedReasonLabel } from '../../lib/reading';
import type { Decision, DecisionsState } from '../../lib/decisions';
import type { OnboardingAnalysis, OnboardingProject } from '../../types';
import PILOTE_2 from './fixtures/audit-0.8.0-pilote-2.response.json';
import PILOTE_3 from './fixtures/audit-0.8.0-pilote-3.response.json';

/**
 * Réponses de GET …/audit sur deux audits 0.8.0 rejoués par le pipeline (pilote, lectures 2 et 3),
 * produites par la lecture du back (`readReading`).
 */
const RESPONSE_2 = PILOTE_2 as unknown as AuditResponse;
const RESPONSE_3 = PILOTE_3 as unknown as AuditResponse;
const reading2 = RESPONSE_2.reading!;
const dated = reading2.cards.find(c => c.rank === 1)!;
const incomplete = reading2.cards.find(c => c.nature === 'incomplete_or_outdated')!;
const ordered2 = orderedCards(reading2.cards);
/** Carte à un seul côté retrouvé, dont la citation refusée de l'autre côté est rendue (pilote 2). */
const oneSidedWithRefused = reading2.cards.find(c => c.nature === 'dated_change' && c.sides.length === 1)!;
/** Carte à un seul côté retrouvé, sans citation refusée rendue (pilote 3). */
const oneSidedBare = RESPONSE_3.reading!.cards.find(c => c.nature === 'probable_error' && c.sides.length === 1)!;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Ouvre une carte depuis la navigation de la session, par son sujet. */
const goTo = (subject: string) => fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${escape(subject)}`) }));

const MB = 1024 * 1024;
const project: OnboardingProject = {
  id: 'p1', name: 'Pilote', createdAt: '', updatedAt: '', documentsCount: 20, totalBytes: 2 * MB, cadrageVersion: 1,
  limits: { maxFileBytes: 50 * MB, maxDocumentsPerProject: 50, maxProjectBytes: 300 * MB, maxFilesPerUpload: 10 },
};

const analysis: OnboardingAnalysis = {
  id: 'a1', status: 'succeeded', stage: 'storing', done: 0, total: 0, llmCalls: 3, llmRetries: 0, cadrageVersion: 1,
  documents: [{ id: 'd1', filename: 'notion.zip' }], errorCode: null, pipelineVersion: null, createdAt: '2026-10-02T10:00:00Z', createdBy: 'u1',
  submittedAt: null, finishedAt: '2026-10-02T10:04:00Z', deadlineAt: '2026-10-02T11:00:00Z',
};

const state = (decisions: Decision[], arbitrable = true): DecisionsState => ({
  decisions, counts: { decided: decisions.length, later: 0, skipped: 0, cards: reading2.cards.length }, arbitrable,
});

const answer = (cardId: string, action: Decision['action'], extra: Partial<Decision> = {}): Decision => ({
  id: `d-${cardId}`, questionId: cardId, cardId, groupId: null, conflictIds: null, action, supersedesId: null,
  decidedBy: { id: 'u1', name: 'Camille Martin' }, decidedAt: '2026-10-02T11:00:00Z', cancelledAt: null, cancelledBy: null, ...extra,
});

async function openSession() {
  render(<AuditTab project={project} onGoToAnalysis={() => {}} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Commencer' }));
  return screen.findByRole('article', { name: /^Carte 1 sur/ });
}

describe('À clarifier (audit 0.8.0)', () => {
  beforeEach(() => {
    vi.mocked(onboardingApi.listAnalyses).mockReset().mockResolvedValue({ data: [analysis], meta: { quota: { used: 1, max: 5 } } });
    vi.mocked(onboardingApi.getAudit).mockReset().mockResolvedValue(RESPONSE_2);
    vi.mocked(onboardingApi.listDecisions).mockReset().mockResolvedValue(state([]));
    vi.mocked(onboardingApi.cardHistory).mockReset().mockResolvedValue([]);
    vi.mocked(onboardingApi.answerCard).mockReset();
    vi.mocked(onboardingApi.cancelDecision).mockReset();
    vi.mocked(onboardingApi.getAuditImage).mockReset().mockResolvedValue(new Blob([new Uint8Array([1])], { type: 'image/png' }));
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:image'), revokeObjectURL: vi.fn() });
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('annonce le nombre de cartes et les regroupe par nature ; une détection absente ne se montre que dans les détails, en clair', async () => {
    render(<AuditTab project={project} onGoToAnalysis={() => {}} />);
    expect(await screen.findByRole('heading', { name: '9 cartes à clarifier' })).toBeInTheDocument();
    expect(screen.getByText('9 cartes : 3 changements datés, 1 erreur probable et 5 incomplets ou périmés.')).toBeInTheDocument();
    expect(await screen.findByText(/^\d+ bloquent la publication tant qu'elles n'ont pas de réponse, dont \d+ encore à traiter\.$/)).toBeInTheDocument();

    const headings = screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);
    expect(headings).toEqual(expect.arrayContaining(['Changements datés 3', 'Erreurs probables 1', 'Incomplets ou périmés 5']));
    // Les natures qui bloquent la publication d'abord.
    expect(headings.indexOf('Changements datés 3')).toBeLessThan(headings.indexOf('Incomplets ou périmés 5'));

    // Les notes temporaires ne sont pas encore repérées : rien dans la vue d'ensemble.
    const details = screen.getByText('Détails de l\'analyse').closest('details')!;
    expect(screen.queryAllByText(/non disponible|Notes temporaires/i)).toHaveLength(0);
    expect(screen.queryByRole('heading', { name: 'Notes temporaires' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Aucune note temporaire/)).not.toBeInTheDocument();
    expect(within(details).getByRole('heading', { name: 'Ce que l\'analyse ne repère pas encore' })).toBeInTheDocument();
    expect(details).toHaveTextContent('Les situations temporaires (maintenance, offre limitée dans le temps) : si aucune n\'est signalée, cela ne veut pas dire qu\'il n\'y en a pas.');
    expect(details).not.toHaveTextContent(/non disponible/i);

    // L'en-tête compte les documents lus par l'analyse, pas les fichiers importés.
    expect(screen.getByText('Fiche de cadrage version 1, 21 documents lus (dans 1 fichier importé).')).toBeInTheDocument();

    // Les documents d'une carte, par leur nom de fichier, le chemin de l'archive en infobulle.
    const row = screen.getByRole('button', { name: new RegExp(`^${escape(dated.analysis.subject)}`) });
    const doc = within(row).getByText('03-cotisations-tarification.docx');
    expect(doc).toHaveAttribute('title', 'base-connaissance-mutuelle-notion/03-cotisations-tarification.docx');
    expect(row).not.toHaveTextContent('base-connaissance-mutuelle-notion/');

    // Chaque carte nommée par son sujet, jamais « Carte N ».
    for (const c of reading2.cards) expect(screen.getByRole('button', { name: new RegExp(`^${escape(c.analysis.subject)}`) })).toBeInTheDocument();
    expect(screen.queryByText(/^Carte \d+$/)).not.toBeInTheDocument();
  });

  it('une carte : documents par nom de fichier, citations de chaque côté, analyse de l\'IA à part', async () => {
    const card = await openSession();
    expect(within(card).getByRole('heading', { level: 4 })).toHaveTextContent(dated.analysis.subject);
    expect(within(card).getByText('Carte 1 sur 9')).toBeInTheDocument();
    expect(within(card).getByText('Changement daté')).toBeInTheDocument();
    const sideA = within(card).getByRole('region', { name: 'Côté A' });
    expect(sideA).toHaveTextContent('03-cotisations-tarification.docx');
    expect(sideA).not.toHaveTextContent('base-connaissance-mutuelle-notion/');
    expect(within(sideA).getAllByText('03-cotisations-tarification.docx')[0])
      .toHaveAttribute('title', 'base-connaissance-mutuelle-notion/03-cotisations-tarification.docx');
    expect(within(card).getByText(/^Documents :/).parentElement).not.toHaveTextContent('base-connaissance-mutuelle-notion/');
    expect(within(card).getByRole('region', { name: 'Côté B' })).toHaveTextContent('email-3-changement-tarifaire.docx');
    // Le nom du fichier au-dessus de chaque citation seulement, pas dans le titre du côté.
    expect(within(sideA).getByRole('heading', { level: 5 })).toHaveTextContent(/^Côté A$/);

    // Citation tirée d'un tableau : lignes et cellules, sans barres verticales ni tirets.
    const grid = within(sideA).getAllByRole('table')[0];
    expect(within(grid).getAllByRole('columnheader').map(h => h.textContent)).toEqual(['Tranche d\'âge', 'ESSENTIELLE', 'CONFORT', 'SÉRÉNITÉ+']);
    expect(within(grid).getByRole('cell', { name: '45,80 €' })).toBeInTheDocument();
    for (const quote of card.querySelectorAll('blockquote')) expect(quote.textContent).not.toMatch(/\||---|\*\*/);

    const ai = within(card).getByRole('complementary', { name: 'Analyse proposée par l\'IA' });
    const proposal = dated.analysis.proposal.slice(0, 60);
    expect(ai.textContent).toContain(proposal);
    // Le texte du modèle n'est jamais dans une citation.
    for (const quote of card.querySelectorAll('blockquote')) expect(quote.textContent).not.toContain(proposal);
  });

  it('extrait lu par vision : la mention et l\'image à côté ; citation de la fiche de cadrage nommée comme telle', async () => {
    await openSession();
    goTo(ordered2[1].analysis.subject);
    const card = await screen.findByRole('article', { name: /^Carte 2 sur/ });
    expect(within(card).getAllByText('Extrait transcrit par vision, non vérifié').length).toBeGreaterThan(0);
    expect(await within(card).findAllByRole('img')).not.toHaveLength(0);
    expect(onboardingApi.getAuditImage).toHaveBeenCalledWith('p1', 'a1', 'img_9d517478bad6ba9c');

    const withBriefing = reading2.cards.find(c => c.sides.some(s => s.quotes.some(q => q.kind === 'briefing')))!;
    goTo(withBriefing.analysis.subject);
    const other = await screen.findByRole('article', { name: `Carte ${ordered2.indexOf(withBriefing) + 1} sur 9` });
    // Le côté de la fiche se présente comme la fiche de l'utilisateur, pas comme un document de la base.
    const fiche = within(other).getByRole('region', { name: 'Votre fiche de cadrage' });
    expect(fiche).toHaveTextContent('Ce que vous avez écrit, pas un document de la base.');
    expect(within(other).queryByRole('region', { name: 'Côté B' })).not.toBeInTheDocument();
  });

  it('citation de la fiche de cadrage : les lignes d\'un même paragraphe rejointes à l\'affichage', () => {
    const excerpt = 'Les TNS ne peuvent pas\nrésilier en cours\nd\'année.\n\nLes particuliers, si.';
    const { container } = render(<ClarifyQuote audit={{} as Audit} quote={{ kind: 'briefing', excerpt, realigned: false }} />);
    expect(container.querySelector('blockquote')!.textContent)
      .toBe('Les TNS ne peuvent pas résilier en cours d\'année.\n\nLes particuliers, si.');
  });

  it('un seul côté retrouvé, citation refusée rendue : le dire, la citer comme texte de l\'IA, une question sur ce passage', async () => {
    vi.mocked(onboardingApi.answerCard).mockResolvedValue(answer(oneSidedWithRefused.id, { type: 'accept_side', side: 'A' }));
    await openSession();
    goTo(oneSidedWithRefused.analysis.subject);
    const card = await screen.findByRole('article', { name: `Carte ${ordered2.indexOf(oneSidedWithRefused) + 1} sur 9` });
    const missing = within(card).getByRole('region', { name: 'Passage non retrouvé' });
    expect(missing).toHaveTextContent('L\'autre passage cité n\'a pas pu être retrouvé dans vos documents.');
    const [refused] = oneSidedWithRefused.unverifiedQuotes;
    expect(missing).toHaveTextContent(`Texte rendu par l'IA (${refused.document}, ${refused.location}, ${unverifiedReasonLabel(refused.reason)}), qui n'est pas une citation`);
    expect(missing.querySelector('blockquote')).toBeNull();

    expect(screen.getByText('Changement daté : Ce passage est-il juste ?')).toBeInTheDocument();
    const answers = screen.getByRole('group', { name: 'Répondre à la carte' });
    expect(within(answers).getAllByRole('button').map(b => b.textContent)).toEqual([
      'Oui, mais la date ou le périmètre est différent', 'Autre réponse', 'Plus tard', 'Autres réponses…',
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Oui, ce passage est juste' }));
    await waitFor(() => expect(onboardingApi.answerCard).toHaveBeenCalledWith('p1', 'a1', expect.objectContaining({
      action: { type: 'accept_side', side: 'A' },
    })));
    expect(await screen.findByText(/^Passage jugé juste : /)).toBeInTheDocument();
  });

  it('un seul côté retrouvé, sans citation refusée rendue : le dire quand même', async () => {
    vi.mocked(onboardingApi.getAudit).mockResolvedValue(RESPONSE_3);
    await openSession();
    goTo(oneSidedBare.analysis.subject);
    const position = orderedCards(RESPONSE_3.reading!.cards).indexOf(oneSidedBare) + 1;
    const card = await screen.findByRole('article', { name: `Carte ${position} sur ${RESPONSE_3.reading!.cards.length}` });
    const missing = within(card).getByRole('region', { name: 'Passage non retrouvé' });
    expect(missing).toHaveTextContent('L\'autre passage cité n\'a pas pu être retrouvé dans vos documents.');
    expect(missing).not.toHaveTextContent('Texte rendu par l\'IA');
    expect(screen.getByText('Erreur probable : Ce passage est-il juste ?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Oui, ce passage est juste' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ce sont deux sujets différents' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'C\'est un exemple, pas une règle' })).toBeInTheDocument();
  });

  it('changement daté : « Retenir A / B » avec les fichiers et la nature en sous-titre, puis les réponses de la nature', async () => {
    const saved = answer(dated.id, { type: 'accept_side', side: 'B' });
    vi.mocked(onboardingApi.answerCard).mockResolvedValue(saved);
    await openSession();

    expect(screen.getByText('Changement daté : Quel côté dit ce qui vaut aujourd\'hui ?')).toBeInTheDocument();
    const answers = screen.getByRole('group', { name: 'Répondre à la carte' });
    expect(within(answers).getAllByRole('button').map(b => b.textContent)).toEqual([
      'Oui, mais la date ou le périmètre est différent', 'Ils disent la même chose', 'Ce sont deux sujets différents',
      'Autre réponse', 'Plus tard', 'Autres réponses…',
    ]);
    expect(screen.queryByRole('button', { name: 'C\'est un exemple, pas une règle' })).not.toBeInTheDocument();
    // Le chemin de l'archive en infobulle, le nom de fichier seul sur le bouton.
    expect(screen.getByRole('button', { name: 'Retenir A : 03-cotisations-tarification.docx' }))
      .toHaveAttribute('title', 'Retenir A : base-connaissance-mutuelle-notion/03-cotisations-tarification.docx');
    expect(screen.getByRole('button', { name: 'Retenir B : email-3-changement-tarifaire.docx' })).not.toHaveAttribute('title');

    fireEvent.click(screen.getByRole('button', { name: 'Retenir B : email-3-changement-tarifaire.docx' }));
    await waitFor(() => expect(onboardingApi.answerCard).toHaveBeenCalledWith('p1', 'a1', {
      cardId: dated.id, expectedCurrentId: null, action: { type: 'accept_side', side: 'B' },
    }));
    expect(await screen.findByText('Côté B retenu : email-3-changement-tarifaire.docx')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument();
  });

  it('« Ce sujet n\'a pas sa place dans la base » : dans un menu secondaire seulement', async () => {
    vi.mocked(onboardingApi.answerCard).mockResolvedValue(answer(dated.id, { type: 'out_of_scope' }));
    await openSession();
    expect(screen.queryByRole('button', { name: 'Ce sujet n\'a pas sa place dans la base' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Autres réponses…' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ce sujet n\'a pas sa place dans la base' }));
    await waitFor(() => expect(onboardingApi.answerCard).toHaveBeenCalledWith('p1', 'a1', expect.objectContaining({
      action: { type: 'out_of_scope' },
    })));
  });

  it('réponse saisie : un texte obligatoire, enregistré « saisi par X le Y »', async () => {
    vi.mocked(onboardingApi.answerCard).mockResolvedValue(answer(dated.id, { type: 'other_answer', text: 'Voir la direction.' }));
    await openSession();
    fireEvent.click(screen.getByRole('button', { name: 'Autre réponse' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Saisissez votre réponse.');
    expect(onboardingApi.answerCard).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Votre réponse'), { target: { value: '  Voir la direction. ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(onboardingApi.answerCard).toHaveBeenCalledWith('p1', 'a1', expect.objectContaining({
      action: { type: 'other_answer', text: 'Voir la direction.' },
    })));
    expect(await screen.findByText('Autre réponse : « Voir la direction. »')).toBeInTheDocument();
    expect(screen.getByText(/saisi par Camille Martin le/)).toBeInTheDocument();
  });

  it('incomplet ou périmé : ni côté à retenir, mais « À compléter », « À retirer de la base »…', async () => {
    vi.mocked(onboardingApi.listDecisions).mockResolvedValue(state(
      reading2.cards.filter(c => c.nature !== 'incomplete_or_outdated').map(c => answer(c.id, { type: 'same_meaning' })),
    ));
    render(<AuditTab project={project} onGoToAnalysis={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Reprendre' }));
    // Reprise sur la première carte à traiter : le premier « incomplet ou périmé ».
    const card = await screen.findByRole('article', { name: /^Carte 5 sur 9/ });
    expect(within(card).getByText('Incomplet ou périmé')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Retenir un côté' })).not.toBeInTheDocument();
    const answers = screen.getByRole('group', { name: 'Répondre à la carte' });
    expect(within(answers).getAllByRole('button').map(b => b.textContent).slice(0, 4)).toEqual([
      'À compléter', 'À retirer de la base', 'C\'est à jour', 'Ce n\'est pas un problème pour la base',
    ]);
    expect(incomplete.answers).toContain('complete');
  });

  it('progression : cartes répondues, « Plus tard » à part', async () => {
    vi.mocked(onboardingApi.listDecisions).mockResolvedValue(state([
      answer(reading2.cards[0].id, { type: 'same_meaning' }),
      answer(reading2.cards[1].id, { type: 'later' }),
    ]));
    render(<AuditTab project={project} onGoToAnalysis={() => {}} />);
    expect(await screen.findByText('1 sur 9 cartes répondues, 1 pour plus tard')).toBeInTheDocument();
  });

  it('audit d\'une analyse précédente : les réponses se consultent, sans bouton de réponse', async () => {
    vi.mocked(onboardingApi.listDecisions).mockResolvedValue(state([answer(dated.id, { type: 'same_meaning' })], false));
    render(<AuditTab project={project} onGoToAnalysis={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Consulter les cartes' }));
    // Ouverte sur la première carte sans réponse ; la carte 1 se consulte depuis la vue d'ensemble.
    await screen.findByRole('article', { name: /^Carte 2 sur/ });
    goTo(dated.analysis.subject);
    await screen.findByRole('article', { name: /^Carte 1 sur/ });
    expect(screen.getByText('Ils disent la même chose')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Répondre à la carte' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Annuler' })).not.toBeInTheDocument();
  });

  it('détails de l\'analyse : points écartés avec leur raison, citations non vérifiées comptées, jamais citées', async () => {
    vi.mocked(onboardingApi.getAudit).mockResolvedValue(RESPONSE_3);
    render(<AuditTab project={project} onGoToAnalysis={() => {}} />);
    await screen.findByRole('heading', { name: /cartes à clarifier/ });
    const details = screen.getByText('Détails de l\'analyse').closest('details')!;
    expect(details).toHaveTextContent('Incomplet ou périmé · Ne cite que la fiche de cadrage');
    expect(details).toHaveTextContent('1 introuvable dans le corpus');
  });

  it('détails de l\'analyse : description d\'image et « autre raison », comptées et nommées', async () => {
    const reading3 = RESPONSE_3.reading!;
    const [point] = reading3.rejectedPoints;
    vi.mocked(onboardingApi.getAudit).mockResolvedValue({
      ...RESPONSE_3,
      reading: {
        ...reading3,
        rejectedPoints: [{ ...point, unverifiedQuotes: [
          { side: 'A', document: 'doc.pdf', location: 'p. 1', text: 'Schéma des garanties.', reason: 'image_description_only' },
          { side: 'B', document: 'doc.pdf', location: 'p. 2', text: 'Texte rendu.', reason: 'other' },
        ] }],
        unverifiedQuotes: { other: 2, image_description_only: 1, not_found: 1 },
      },
    });
    render(<AuditTab project={project} onGoToAnalysis={() => {}} />);
    await screen.findByRole('heading', { name: /cartes à clarifier/ });
    const details = screen.getByText('Détails de l\'analyse').closest('details')!;
    expect(details).toHaveTextContent('Texte rendu par l\'IA (doc.pdf, reprend seulement la description d\'une image, pas son texte), qui n\'est pas une citation : Schéma des garanties.');
    expect(details).toHaveTextContent('Texte rendu par l\'IA (doc.pdf, autre raison), qui n\'est pas une citation : Texte rendu.');
    const counts = [...details.querySelectorAll('.obp-clarify-counts')][0];
    expect([...counts.querySelectorAll('li')].map(li => li.textContent)).toEqual([
      '1 reprend seulement la description d\'une image, pas son texte', '1 introuvable dans le corpus', '2 autre raison',
    ]);
  });

  it('détails de l\'analyse : les fichiers d\'une archive que l\'analyse n\'a pas lus, avec leur raison', async () => {
    const audit = RESPONSE_3.audit as { inventory: object[] };
    vi.mocked(onboardingApi.getAudit).mockResolvedValue({
      ...RESPONSE_3,
      audit: { ...audit, inventory: [
        ...audit.inventory,
        { document_id: 'doc_csv', path: 'notion.zip/Export/Base 9c8d.csv', format: 'other', size_bytes: 4,
          sha256: 'a'.repeat(64), unit_count: 0, status: 'failed', error: 'unsupported_file: format non lu' },
      ] },
    } as AuditResponse);
    render(<AuditTab project={project} onGoToAnalysis={() => {}} />);
    await screen.findByRole('heading', { name: /cartes à clarifier/ });
    const details = screen.getByText('Détails de l\'analyse').closest('details')!;
    expect(details).toHaveTextContent('L\'analyse n\'a pas lu ces fichiers');
    expect(details).toHaveTextContent('Base 9c8d.csv : format non lu');
    expect(within(details).getByText('Base 9c8d.csv')).toHaveAttribute('title', 'notion.zip/Export/Base 9c8d.csv');
  });

  it('détails de l\'analyse : tous les fichiers lus, dit comme tel', async () => {
    vi.mocked(onboardingApi.getAudit).mockResolvedValue(RESPONSE_3);
    render(<AuditTab project={project} onGoToAnalysis={() => {}} />);
    await screen.findByRole('heading', { name: /cartes à clarifier/ });
    expect(screen.getByText('Détails de l\'analyse').closest('details')!).toHaveTextContent('Tous les fichiers importés ont été lus.');
  });
});

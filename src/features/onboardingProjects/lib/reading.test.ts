import { describe, it, expect } from 'vitest';
import {
  cardProgress, cardTitle, clarifySummary, describeCardAnswer, describeSummary, firstOpenCard, groupByNature, isBlocking,
  isReadingAudit, readsImageOnly, recommendationOutcome,
  missingSide, orderedCards, sideDocuments, sidesQuestion, substantiveAnswers, toQuotes, unreadFiles, unreadReasonLabel, unverifiedCounts, unverifiedReasonLabel, type ReadingCard,
} from './reading';
import type { Audit } from './audit';
import type { Decision } from './decisions';

const doc = (documentId: string, extra: object = {}) =>
  ({ kind: 'document' as const, excerptRealigned: false, source: { format: 'pdf', document_id: documentId, page: 1, excerpt: 'Texte.', ...extra } });
const briefing = { kind: 'briefing' as const, excerptRealigned: false, excerpt: 'Fiche.' };
const vision = (documentId: string) => doc(documentId, { zone: 'image', image_id: 'img-1', excerpt_origin: 'vision_unverified' });

const card = (id: string, nature: ReadingCard['nature'], rank: number, sides: ReadingCard['sides'] = [
  { label: 'A', quotes: [doc('d1')] }, { label: 'B', quotes: [doc('d2')] },
]): ReadingCard => ({
  id, nature, rank, mergedRanks: [], documentIds: ['d1', 'd2'], sides,
  analysis: { subject: 's', reason: 'r', proposal: 'p' },
  answers: nature === 'incomplete_or_outdated'
    ? ['complete', 'remove', 'up_to_date', 'not_a_problem', 'other_answer', 'later', 'out_of_scope']
    : ['accept_side', 'adjust', 'same_meaning', 'different_subjects', 'other_answer', 'later', 'out_of_scope'],
  unverifiedQuotes: [],
});

const decision = (cardId: string, action: Decision['action']): Decision => ({
  id: `d-${cardId}`, questionId: cardId, cardId, groupId: null, conflictIds: null, action, supersedesId: null,
  decidedBy: { id: 'u1', name: 'X' }, decidedAt: '2026-10-02T10:00:00Z', cancelledAt: null, cancelledBy: null,
});

describe('reading', () => {
  const cards = [card('i1', 'incomplete_or_outdated', 1), card('d2', 'dated_change', 3), card('c1', 'contradiction', 4), card('d1', 'dated_change', 2)];

  it('ordre : natures qui bloquent d\'abord, puis le rang du modèle ; regroupement par nature', () => {
    expect(orderedCards(cards).map(c => c.id)).toEqual(['c1', 'd1', 'd2', 'i1']);
    expect(groupByNature(cards).map(g => [g.nature, g.cards.map(c => c.id)])).toEqual([
      ['contradiction', ['c1']], ['dated_change', ['d1', 'd2']], ['incomplete_or_outdated', ['i1']],
    ]);
  });

  it('progression et reprise : « Plus tard » compté à part et toujours à traiter', () => {
    const current = new Map([['c1', decision('c1', { type: 'same_meaning' })], ['d1', decision('d1', { type: 'later' })]]);
    expect(cardProgress(cards, current)).toEqual({ answered: 1, later: 1, total: 4 });
    expect(firstOpenCard(orderedCards(cards), current)).toBe(1);
  });

  it('bloque selon sa nature seule, comme le back : une lecture d\'image à confirmer ne l\'exempte pas', () => {
    expect(isBlocking(card('c', 'contradiction', 1))).toBe(true);
    expect(isBlocking(card('i', 'incomplete_or_outdated', 1))).toBe(false);
    // Essai 5 : changement daté (pharmacies) dont un côté ne repose que sur une image.
    const vision1 = card('v', 'dated_change', 1, [{ label: 'A', quotes: [vision('d1')] }, { label: 'B', quotes: [doc('d2')] }]);
    expect(isBlocking(vision1)).toBe(true);
    expect(readsImageOnly(vision1)).toBe(true);
    expect(readsImageOnly(card('m', 'contradiction', 1, [{ label: 'A', quotes: [vision('d1'), doc('d1')] }, { label: 'B', quotes: [doc('d2')] }]))).toBe(false);
  });

  it('réponses de fond hors côtés, « Autre réponse », « Plus tard » et menu secondaire', () => {
    expect(substantiveAnswers(card('d', 'dated_change', 1))).toEqual(['adjust', 'same_meaning', 'different_subjects']);
    expect(substantiveAnswers(card('i', 'incomplete_or_outdated', 1))).toEqual(['complete', 'remove', 'up_to_date', 'not_a_problem']);
  });

  it('documents d\'un côté par nom de fichier, sans doublon ; la fiche de cadrage nommée comme telle', () => {
    const quotes = toQuotes([doc('d1'), doc('d1'), { kind: 'briefing', excerptRealigned: false, excerpt: 'Fiche.' }]);
    expect(sideDocuments(quotes, id => `${id}.pdf`)).toEqual(['d1.pdf', 'votre fiche de cadrage']);
    expect(toQuotes([{ kind: 'document', excerptRealigned: false, source: {} }])).toEqual([]);
  });

  it('réponse en clair : côté retenu avec ses fichiers, texte saisi entre guillemets', () => {
    const c = card('c', 'contradiction', 1);
    const name = (id: string) => `${id}.pdf`;
    expect(describeCardAnswer({ type: 'accept_side', side: 'B' }, c, name)).toBe('Côté B retenu : d2.pdf');
    expect(describeCardAnswer({ type: 'distinct_cases', text: 'A en Corse.' }, c, name)).toBe('Les deux sont vraies, selon le cas : « A en Corse. »');
    expect(describeCardAnswer({ type: 'later' }, c, name)).toBe('Plus tard');
    const withBriefing = card('b', 'contradiction', 1, [{ label: 'A', quotes: [doc('d1')] }, { label: 'B', quotes: [briefing] }]);
    expect(describeCardAnswer({ type: 'accept_side', side: 'B' }, withBriefing, name)).toBe('Votre fiche de cadrage retenue');
    const oneSided = card('o', 'probable_error', 1, [{ label: 'A', quotes: [doc('d1')] }]);
    expect(describeCardAnswer({ type: 'accept_side', side: 'A' }, oneSided, name)).toBe('Passage jugé juste : d1.pdf');
  });

  it('un seul côté retrouvé : le côté manquant, une question sur ce passage, sans les réponses qui comparent', () => {
    const oneSided = card('o', 'dated_change', 1, [{ label: 'B', quotes: [doc('d2')] }]);
    expect(missingSide(oneSided)).toBe('A');
    expect(missingSide(card('a', 'probable_error', 1, [{ label: 'A', quotes: [doc('d1')] }]))).toBe('B');
    expect(missingSide(card('c', 'contradiction', 1))).toBeNull();
    // « Incomplet ou périmé » n'a pas à comparer deux côtés.
    expect(missingSide(card('i', 'incomplete_or_outdated', 1, [{ label: 'A', quotes: [doc('d1')] }]))).toBeNull();
    expect(sidesQuestion(oneSided)).toBe('Ce passage est-il juste ?');
    expect(sidesQuestion(card('c', 'contradiction', 1))).toBe('Quel côté est juste ?');
    expect(substantiveAnswers(oneSided)).toEqual(['adjust']);
  });

  it('titre : le sujet de la carte, sinon « Carte N »', () => {
    const c = card('c', 'contradiction', 1);
    expect(cardTitle({ ...c, analysis: { ...c.analysis, subject: ' Forfait optique ' } }, 3)).toBe('Forfait optique');
    expect(cardTitle({ ...c, analysis: { ...c.analysis, subject: '' } }, 3)).toBe('Carte 3');
  });

  it('résumé : cartes par nature, celles qui bloquent la publication et celles encore à traiter', () => {
    const v = card('v', 'probable_error', 5, [{ label: 'A', quotes: [vision('d1')] }, { label: 'B', quotes: [doc('d2')] }]);
    const all = [...cards, v];
    const none = new Map<string, Decision>();
    expect(describeSummary(clarifySummary(all, none), true)).toEqual([
      '5 cartes : 1 contradiction, 2 changements datés, 1 erreur probable et 1 incomplet ou périmé.',
      '4 bloquent la publication tant qu\'elles n\'ont pas de réponse, dont 4 encore à traiter.',
    ]);
    const some = new Map([['c1', decision('c1', { type: 'same_meaning' })], ['d1', decision('d1', { type: 'later' })]]);
    expect(describeSummary(clarifySummary(all, some), true)[1]).toBe('4 bloquent la publication tant qu\'elles n\'ont pas de réponse, dont 3 encore à traiter.');
    expect(describeSummary(clarifySummary(all, some), false)[1]).toBe('4 bloquent la publication tant qu\'elles n\'ont pas de réponse.');
    const done = new Map(['c1', 'd1', 'd2', 'v'].map(id => [id, decision(id, { type: 'same_meaning' })]));
    expect(describeSummary(clarifySummary(all, done), true)[1]).toBe('Les 4 cartes qui bloquaient la publication ont toutes une réponse.');
    expect(describeSummary(clarifySummary([card('c', 'contradiction', 1)], none), true)).toEqual([
      '1 carte : 1 contradiction.', '1 bloque la publication tant qu\'elle n\'a pas de réponse, dont 1 encore à traiter.',
    ]);
    expect(describeSummary(clarifySummary([card('i', 'incomplete_or_outdated', 1)], none), true)[1]).toBe('Aucune ne bloque la publication.');
    expect(describeSummary(clarifySummary([], none), true)).toEqual([]);
  });

  it('raisons des citations non vérifiées : description d\'image, « autre raison » en dernier', () => {
    expect(unverifiedReasonLabel('image_description_only')).toBe('reprend seulement la description d\'une image, pas son texte');
    expect(unverifiedReasonLabel('other')).toBe('autre raison');
    expect(unverifiedReasonLabel('inconnue')).toBe('autre raison');
    expect(unverifiedCounts({ other: 2, image_description_only: 1, not_found: 3 }))
      .toEqual([['image_description_only', 1], ['not_found', 3], ['other', 2]]);
  });
});

describe('fichiers non lus', () => {
  it('chaque raison du pipeline a son libellé ; un échec de lecture, « document illisible »', () => {
    expect(unreadReasonLabel('unsupported_file: format non lu')).toBe('format non lu');
    expect(unreadReasonLabel('unreferenced_image: image citée par aucun document')).toBe('image citée par aucun document');
    expect(unreadReasonLabel('nested_archive: archive dans une archive, non lue')).toBe('archive contenue dans une archive, non lue');
    expect(unreadReasonLabel('unsafe_archive: chemin qui sort de l\'archive')).toContain('archive refusée');
    expect(unreadReasonLabel('unreadable_archive: archive chiffrée')).toBe('archive illisible ou chiffrée');
    expect(unreadReasonLabel('UnicodeDecodeError: invalid start byte')).toBe('document illisible');
    expect(unreadReasonLabel(null)).toBe('document illisible');
  });

  it('seuls les fichiers en échec, dans l\'ordre de l\'inventaire', () => {
    const audit = { inventory: [
      { documentId: 'a', path: 'export.zip/Export/Page.md', format: 'md', status: 'parsed', error: null },
      { documentId: 'b', path: 'export.zip/Export/Base.csv', format: 'other', status: 'failed', error: 'unsupported_file: format non lu' },
      { documentId: 'c', path: 'vieux.md', format: 'md', status: 'failed', error: 'UnicodeDecodeError: x' },
    ] } as unknown as Audit;
    expect(unreadFiles(audit)).toEqual([
      { path: 'export.zip/Export/Base.csv', reason: 'format non lu' },
      { path: 'vieux.md', reason: 'document illisible' },
    ]);
  });
});

describe('« Je suis la recommandation de l\'IA »', () => {
  const name = (id: string) => `${id}.docx`;
  const reco = (c: ReadingCard, effect: NonNullable<ReadingCard['recommendation']>['effect']): ReadingCard =>
    ({ ...c, recommendation: { text: 'Mettre à jour.', effect, basis: 'x' } });

  it('l\'audit 0.9.0 est un audit à cartes, comme 0.8.0', () => {
    expect(isReadingAudit('0.8.0')).toBe(true);
    expect(isReadingAudit('0.9.0')).toBe(true);
    expect(isReadingAudit('0.7.0')).toBe(false);
  });

  it('ce que la réponse fera dans la base, selon l\'effet', () => {
    const dated = card('c1', 'dated_change', 1, [{ label: 'A', quotes: [doc('fiche')] }, { label: 'B', quotes: [doc('email')] }]);
    expect(recommendationOutcome(reco(dated, { type: 'accept_side', side: 'B' }), name))
      .toBe('Le changement daté sera retenu : la base suivra le côté B (email.docx).');
    const error = card('c2', 'probable_error', 1, [{ label: 'A', quotes: [doc('fiche')] }, { label: 'B', quotes: [doc('faq')] }]);
    expect(recommendationOutcome(reco(error, { type: 'accept_side', side: 'A' }), name)).toBe('Le côté A (fiche.docx) sera retenu dans la base.');
    expect(recommendationOutcome(reco(dated, { type: 'complete' }), name)).toBe('Le passage sera complété dans la base, en suivant la recommandation.');
    expect(recommendationOutcome(reco(dated, null), name)).toMatch(/^Consigne seule : rien n'est ajouté ni tranché/);
  });

  it('le libellé de la réponse, avec sa précision', () => {
    const dated = card('c1', 'dated_change', 1);
    const follow = (effect: unknown, precisions: string | null) =>
      ({ type: 'follow_recommendation', recommendation: 'Mettre à jour.', effect, precisions }) as unknown as Decision['action'];
    expect(describeCardAnswer(follow({ type: 'accept_side', side: 'B' }, null), dated, name)).toBe('Recommandation de l\'IA suivie (changement daté retenu)');
    expect(describeCardAnswer(follow({ type: 'complete' }, 'Pour 2027.'), dated, name))
      .toBe('Recommandation de l\'IA suivie (passage à compléter) — précision : « Pour 2027. »');
    expect(describeCardAnswer(follow(null, null), dated, name)).toBe('Recommandation de l\'IA suivie (consigne seule)');
    expect(describeCardAnswer(follow({ type: 'accept_side', side: 'A' }, null), card('c2', 'probable_error', 1), name))
      .toBe('Recommandation de l\'IA suivie (côté A retenu)');
  });
});


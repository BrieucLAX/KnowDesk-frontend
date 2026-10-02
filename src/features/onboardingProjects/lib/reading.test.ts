import { describe, it, expect } from 'vitest';
import {
  cardProgress, describeCardAnswer, firstOpenCard, groupByNature, isBlocking, orderedCards, sideDocuments,
  substantiveAnswers, toQuotes, type ReadingCard,
} from './reading';
import type { Decision } from './decisions';

const doc = (documentId: string, extra: object = {}) =>
  ({ kind: 'document' as const, excerptRealigned: false, source: { format: 'pdf', document_id: documentId, page: 1, excerpt: 'Texte.', ...extra } });
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

  it('bloque la publication, sauf incomplet ou périmé, ou un côté qui ne repose que sur une lecture d\'image', () => {
    expect(isBlocking(card('c', 'contradiction', 1))).toBe(true);
    expect(isBlocking(card('i', 'incomplete_or_outdated', 1))).toBe(false);
    expect(isBlocking(card('v', 'contradiction', 1, [{ label: 'A', quotes: [vision('d1')] }, { label: 'B', quotes: [doc('d2')] }]))).toBe(false);
    expect(isBlocking(card('m', 'contradiction', 1, [{ label: 'A', quotes: [vision('d1'), doc('d1')] }, { label: 'B', quotes: [doc('d2')] }]))).toBe(true);
  });

  it('réponses de fond hors côtés, « Autre réponse », « Plus tard » et menu secondaire', () => {
    expect(substantiveAnswers(card('d', 'dated_change', 1))).toEqual(['adjust', 'same_meaning', 'different_subjects']);
    expect(substantiveAnswers(card('i', 'incomplete_or_outdated', 1))).toEqual(['complete', 'remove', 'up_to_date', 'not_a_problem']);
  });

  it('documents d\'un côté par nom de fichier, sans doublon ; la fiche de cadrage nommée comme telle', () => {
    const quotes = toQuotes([doc('d1'), doc('d1'), { kind: 'briefing', excerptRealigned: false, excerpt: 'Fiche.' }]);
    expect(sideDocuments(quotes, id => `${id}.pdf`)).toEqual(['d1.pdf', 'fiche de cadrage']);
    expect(toQuotes([{ kind: 'document', excerptRealigned: false, source: {} }])).toEqual([]);
  });

  it('réponse en clair : côté retenu avec ses fichiers, texte saisi entre guillemets', () => {
    const c = card('c', 'contradiction', 1);
    const name = (id: string) => `${id}.pdf`;
    expect(describeCardAnswer({ type: 'accept_side', side: 'B' }, c, name)).toBe('Côté B retenu : d2.pdf');
    expect(describeCardAnswer({ type: 'distinct_cases', text: 'A en Corse.' }, c, name)).toBe('Les deux sont vraies, selon le cas : « A en Corse. »');
    expect(describeCardAnswer({ type: 'later' }, c, name)).toBe('Plus tard');
  });
});

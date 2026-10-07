import { describe, it, expect } from 'vitest';
import {
  blockingCardsLeft, blockingLeftLabel, correctionFailureMessage, correctionStepStates, itemLabel, originLabel,
  reasonLabel, reviewProgressLabel, type Modification,
} from './correction';
import type { Decision } from './decisions';
import type { ReadingCard } from './reading';

const card = (id: string, nature: ReadingCard['nature'], visionOnly = false): ReadingCard => ({
  id, nature, rank: 1, mergedRanks: [], documentIds: [], answers: [], unverifiedQuotes: [],
  analysis: { subject: `Sujet ${id}`, reason: '', proposal: '' },
  sides: visionOnly
    ? [{ label: 'A', quotes: [{ kind: 'document', excerptRealigned: false, source: { document_id: 'd1', excerpt: 'x', vision_unverified: true, image_id: 'img_1' } }] }]
    : [],
});

const decision = (cardId: string, type: string): Decision => ({
  id: `d-${cardId}`, questionId: cardId, cardId, groupId: null, conflictIds: null,
  action: { type } as Decision['action'], supersedesId: null, decidedBy: { id: 'u1', name: 'X' },
  decidedAt: '2026-10-05T10:00:00Z', cancelledAt: null, cancelledBy: null,
});

describe('lancement : règle du back', () => {
  it('compte les cartes de nature bloquante sans décision ou laissées « Plus tard », image seule comprise', () => {
    const cards = [card('c1', 'dated_change'), card('c2', 'contradiction', true), card('c3', 'probable_error'), card('c4', 'incomplete_or_outdated')];
    const current = new Map([['c1', decision('c1', 'accept_side')], ['c3', decision('c3', 'later')]]);
    expect(blockingCardsLeft(cards, current)).toEqual({ left: 2, later: 1 });
    expect(blockingLeftLabel({ left: 2, later: 1 })).toBe(
      'Encore 2 cartes bloquantes à trancher avant de préparer la nouvelle base. « Plus tard » ne tranche pas une carte bloquante (1 sur 2).',
    );
    expect(blockingLeftLabel({ left: 1, later: 0 })).toBe('Encore 1 carte bloquante à trancher avant de préparer la nouvelle base.');
  });

  it('une carte non bloquante laissée « Plus tard » ne retient pas la préparation', () => {
    const cards = [card('c1', 'dated_change'), card('c4', 'incomplete_or_outdated')];
    const current = new Map([['c1', decision('c1', 'other_answer')], ['c4', decision('c4', 'later')]]);
    expect(blockingCardsLeft(cards, current).left).toBe(0);
  });
});

describe('progression', () => {
  it('place l\'étape du pipeline dans les trois étapes affichées', () => {
    expect(correctionStepStates({ status: 'queued', stage: null })).toEqual(['pending', 'pending', 'pending']);
    expect(correctionStepStates({ status: 'running', stage: 'parsing' })).toEqual(['current', 'pending', 'pending']);
    expect(correctionStepStates({ status: 'running', stage: 'correction' })).toEqual(['done', 'current', 'pending']);
    expect(correctionStepStates({ status: 'running', stage: 'storing' })).toEqual(['done', 'done', 'current']);
    expect(correctionStepStates({ status: 'running', stage: 'nouvelle_etape' })).toEqual(['current', 'pending', 'pending']);
    expect(correctionStepStates({ status: 'succeeded', stage: 'storing' })).toEqual(['done', 'done', 'done']);
  });

  it('dit un échec en clair, jamais par son code', () => {
    expect(correctionFailureMessage('rate_limited')).toBe('Le service d\'IA est saturé pour le moment. Elle ne compte pas dans votre quota : vous pouvez la relancer.');
    expect(correctionFailureMessage('correction_invalid')).toMatch(/de notre côté/);
    expect(correctionFailureMessage('code_inconnu')).not.toMatch(/code_inconnu/);
  });
});

describe('libellés', () => {
  it('nomme les éléments sans leur code', () => {
    expect(itemLabel('M3')).toBe('Modification 3');
    expect(itemLabel('C1')).toBe('Convention 1');
    expect(reviewProgressLabel(1, 12)).toBe('1 sur 12 relues');
  });

  it('dit d\'où vient une modification : la réponse, sa date, la carte par son titre', () => {
    const m = {
      id: 'M1', kind: 'expert_answer', instruction: 'x', section_keys: [], outcome: 'applied',
      origin: { card_id: 'card_1', card_rank: 1, decision_id: 'd', action_type: 'other_answer', decided_at: '2026-10-05T09:00:00Z' },
    } as Modification;
    expect(originLabel(m, new Map([['card_1', 'Grille 2027']]))).toBe('Votre réponse du 05/10, carte « Grille 2027 »');
    const followed = { ...m, origin: { ...m.origin, action_type: 'follow_recommendation', decided_at: '2026-10-04T09:00:00Z' } };
    expect(originLabel(followed, new Map())).toBe('Recommandation de l\'IA suivie (votre réponse du 04/10)');
  });

  it('traduit une raison : la clé de section devient son titre, le code une phrase', () => {
    const title = (k: string) => (k === 'doc_1:3' ? 'Chapitre 3 › 3.2 Tranches' : null);
    expect(reasonLabel('doc_1:3: qualifier_lost', title)).toBe(
      'Chapitre 3 › 3.2 Tranches : une précision (date, périmètre, condition) aurait disparu : le changement a été annulé',
    );
    expect(reasonLabel('doc_1:3: La fiche ne parle pas de ce tarif.', title)).toBe('Chapitre 3 › 3.2 Tranches : La fiche ne parle pas de ce tarif.');
    expect(reasonLabel('no_change_kept', title)).toBe('Aucun changement n\'a été retenu');
    expect(reasonLabel('doc_9:1: un_code_futur', title)).not.toMatch(/doc_9|un_code_futur/);
  });
});

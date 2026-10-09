import { describe, it, expect } from 'vitest';
import {
  blockingCardsLeft, blockingLeftLabel, correctionFailureMessage, correctionStepStates, firstSentence, itemLabel, originLabel, outcomeLabel,
  partialSummary, pendingSentences, reasonGroups,
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

  it('une réponse « Autre » dont rien n\'est repris est réglée, visible avec sa raison', () => {
    const base = {
      id: 'M5', kind: 'expert_answer', instruction: 'x', section_keys: [], outcome: 'not_applicable',
      reasons: ['votre réponse ne contenait pas de texte à intégrer dans la base'],
      origin: { card_id: 'c', card_rank: 5, decision_id: 'd', action_type: 'other_answer', decided_at: '2026-10-07T09:00:00Z' },
    } as Modification;
    expect(outcomeLabel(base)).toBe('Réglée sans modification');
    expect(reasonLabel(base.reasons![0], () => null)).toBe('Votre réponse ne contenait pas de texte à intégrer dans la base');
    expect(outcomeLabel({ ...base, origin: { ...base.origin, action_type: 'follow_recommendation' } })).toBe('Non appliquée');
    expect(outcomeLabel({ ...base, outcome: 'applied', reasons: [] })).toBe('Appliquée');
    expect(outcomeLabel({ ...base, outcome: 'applied' })).toBe('Appliquée en partie');
  });

  it('regroupe les raisons identiques sans répéter le chemin de section (Essai 5, chapitre 3)', () => {
    const title = (k: string) => ({ 'd:1': 'Chapitre 3 › Zone 1', 'd:2': 'Chapitre 3 › Zone 2', 'd:3': 'Chapitre 3 › Zone 3' }[k] ?? null);
    const groups = reasonGroups([
      'd:1: values_from_several_sources', 'd:2: values_from_several_sources', 'd:3: values_from_several_sources',
      'd:1: La nouvelle grille 2027 n\'est pas dans vos documents. Seuls trois montants sont cités.',
      'd:2: duplicate_or_move',
    ], title);
    expect(groups).toEqual([
      { text: 'Le texte proposé mélangeait des chiffres de documents différents ; il n\'a pas été repris', sections: 3, fromModel: false },
      { text: 'La nouvelle grille 2027 n\'est pas dans vos documents. Seuls trois montants sont cités.', sections: 1, fromModel: true },
      { text: 'Le texte proposé répétait un passage déjà présent dans la fiche ; il n\'a pas été repris', sections: 1, fromModel: false },
    ]);
    expect(groups.map(g => g.text).join(' ')).not.toMatch(/Chapitre 3 ›/);
    // En une phrase, ce qui n'a pas pu être fait : celle de l'IA d'abord.
    expect(firstSentence(partialSummary(groups)!.text)).toBe('La nouvelle grille 2027 n\'est pas dans vos documents');
    expect(partialSummary([])).toBeNull();
  });

  it('traduit une raison : la clé de section devient son titre, le code une phrase', () => {
    const title = (k: string) => (k === 'doc_1:3' ? 'Chapitre 3 › 3.2 Tranches' : null);
    expect(reasonLabel('doc_1:3: qualifier_lost', title)).toBe(
      'Chapitre 3 › 3.2 Tranches : le texte proposé perdait une précision (date, formule, période) ; il n\'a pas été repris',
    );
    expect(reasonLabel('doc_1:3: La fiche ne parle pas de ce tarif.', title)).toBe('Chapitre 3 › 3.2 Tranches : La fiche ne parle pas de ce tarif.');
    expect(reasonLabel('no_change_kept', title)).toBe('Aucun texte proposé n\'a pu être repris');
    expect(reasonLabel('doc_9:1: un_code_futur', title)).not.toMatch(/doc_9|un_code_futur/);
  });

  it('dit les raisons en langage clair, sans formule de contrôle (Essai 5)', () => {
    const codes = ['not_decided', 'deletion_not_decided', 'heading_or_image_changed', 'qualifier_lost', 'value_without_source',
      'values_from_several_sources', 'duplicate_or_move', 'introduction_without_content', 'invalid_output', 'no_change_kept'];
    for (const code of codes) {
      const said = reasonLabel(code, () => null);
      expect(said).not.toMatch(/a été annulée?|vos réponses ne demandaient|_/);
    }
    expect(reasonLabel('doc_1:3: not_decided', () => 'Chapitre 14 › Cotisations')).toBe(
      'Chapitre 14 › Cotisations : le texte proposé allait au-delà de votre demande ; la fiche est restée telle quelle',
    );
    // Une phrase rendue par le pipeline, déjà en clair : telle quelle.
    const expired = 'Mesure temporaire du dimanche 28 septembre 2026 à 20h00 au lundi 29 septembre 2026 à 06h00, expirée à la date de préparation de la base (07/10/2026) : elle n\'est pas insérée.';
    expect(reasonLabel(expired, () => null)).toBe(expired);
  });
});

describe('pendingSentences', () => {
  const titles: Record<string, string> = {
    card_4: 'Service de téléconsultation médicale', card_6: 'Délai de carence pour les téléconsultations',
    card_7: 'Gestion des réclamations liées à la téléconsultation', card_8: 'Accès à l\'historique des téléconsultations dans GESTOR',
  };
  const title = (id: string) => titles[id];

  it('base 0.1.0, sans raison : une phrase, comme avant', () => {
    expect(pendingSentences([{ card_id: 'card_7', card_rank: 7 }], title))
      .toEqual(['Informations en attente, sans modification de la base : Gestion des réclamations liées à la téléconsultation.']);
    expect(pendingSentences([], title)).toEqual(['Aucune information en attente.']);
  });

  it('base 0.2.0 : non répondues à part des répondues qu\'aucune section ne porte, et ce qu\'il faut faire (Base de co 2026 v3)', () => {
    const pending = [
      { card_id: 'card_4', card_rank: 4, reason: 'no_section' as const },
      { card_id: 'card_6', card_rank: 6, reason: 'no_section' as const },
      { card_id: 'card_7', card_rank: 7, reason: 'unanswered' as const },
      { card_id: 'card_8', card_rank: 8, reason: 'no_section' as const },
    ];
    expect(pendingSentences(pending, title)).toEqual([
      'Non répondues, sans modification de la base : Gestion des réclamations liées à la téléconsultation.',
      'Répondues, mais aucune section de la base ne les porte : Service de téléconsultation médicale ; Délai de carence pour les téléconsultations ; Accès à l\'historique des téléconsultations dans GESTOR.',
      'Pour les ajouter, nommez la section dans une précision de votre réponse (par exemple « 2.3 »), puis relancez la préparation de la nouvelle base.',
    ]);
  });

  it('une carte sans titre connu est comptée', () => {
    expect(pendingSentences([{ card_id: 'x', card_rank: 1, reason: 'no_modification' }], title))
      .toEqual(['Répondues, sans modification possible de la base : 1 information.']);
  });
});

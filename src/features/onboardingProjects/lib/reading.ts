/**
 * « À clarifier » : l'audit 0.8.0 de la lecture globale (plan-lecture-globale.md §3.4 et §3.7).
 *
 * Le back lit l'audit défensivement et renvoie `reading` à côté de lui : les cartes (nature,
 * documents, citations vérifiées de chaque côté, analyse du modèle, réponses de la nature), les
 * notes temporaires, les points écartés. Ici : les libellés, l'ordre des natures, la progression
 * et la forme des réponses envoyées (decision-0.8.0).
 *
 * L'analyse du modèle (raison, proposition) ne s'affiche que sous « Analyse proposée par l'IA » :
 * elle aide à répondre, elle n'entre jamais dans une réponse. Seul son sujet sert aussi de libellé
 * de repérage à la carte (cardTitle). Exception voulue : « Je suis la recommandation de l'IA »
 * (audit 0.9.0, et en consigne seule sur 0.8.0) fige la proposition dans la décision ; le back la
 * recopie depuis l'audit, elle sert de consigne de rédaction et n'est jamais recopiée dans la base.
 */
import { sourceRef, type Audit, type SourceRef } from './audit';
import type { Decision } from './decisions';

/** Audits à cartes : 0.8.0, et 0.9.0 qui ajoute « Je suis la recommandation de l'IA ». */
export const READING_AUDIT_SCHEMAS: readonly string[] = ['0.8.0', '0.9.0'];
export const isReadingAudit = (version: string): boolean => READING_AUDIT_SCHEMAS.includes(version);

// ── Contrat (GET …/audit, champ `reading`) ────────────────────

export type CardNature = 'dated_change' | 'contradiction' | 'probable_error' | 'incomplete_or_outdated';
export type SideLabel = 'A' | 'B';

export type CardAnswerCode =
  | 'accept_side' | 'adjust' | 'distinct_cases' | 'same_meaning' | 'different_subjects' | 'example_only'
  | 'complete' | 'remove' | 'up_to_date' | 'not_a_problem' | 'out_of_scope' | 'other_answer' | 'later';

/** Citation vérifiée : un passage d'un document (son SourceRef), ou de la fiche de cadrage. */
export type RawQuote =
  | { kind: 'document'; excerptRealigned: boolean; source: unknown }
  | { kind: 'briefing'; excerptRealigned: boolean; excerpt: string };

export interface ModelAnalysis { subject: string; reason: string; proposal: string }

export interface UnverifiedQuote { side: SideLabel; document: string; location: string; text: string; reason: string }

/** L'effet de « Je suis la recommandation de l'IA », lu par le pipeline ; null : consigne seule. */
export type RecommendedEffect = { type: 'accept_side'; side: SideLabel } | { type: 'complete' };

/** La recommandation d'une carte, telle que le back la recopiera dans la décision. */
export interface CardRecommendation { text: string; effect: RecommendedEffect | null; basis: string }

export interface ReadingCard {
  id:               string;
  nature:           CardNature;
  rank:             number;
  mergedRanks:      number[];
  documentIds:      string[];
  sides:            Array<{ label: SideLabel; quotes: RawQuote[] }>;
  analysis:         ModelAnalysis;
  answers:          CardAnswerCode[];
  unverifiedQuotes: UnverifiedQuote[];
  /** « Je suis la recommandation de l'IA » : absente d'un back plus ancien, null sans recommandation. */
  recommendation?:  CardRecommendation | null;
  /**
   * Audit 0.10.0 : les citations qui renvoient à un contenu absent de vos documents (« voir grille
   * complète en pièce jointe »), leur extrait mot pour mot ; absent d'un back plus ancien.
   */
  absentReferences?: Array<{ documentId: string; excerpt: string }>;
}

export interface TemporaryNote {
  id:          string;
  rank:        number;
  documentIds: string[];
  window:      { start: string | null; end: string | null };
  quotes:      RawQuote[];
  analysis:    ModelAnalysis;
}

export interface RejectedPoint {
  rank:             number;
  nature:           string;
  documents:        string[];
  reason:           string;
  briefingQuotes:   RawQuote[];
  unverifiedQuotes: UnverifiedQuote[];
  analysis:         ModelAnalysis;
}

export interface Reading {
  readingDate:           string | null;
  briefingGiven:         boolean;
  cards:                 ReadingCard[];
  temporaryNotes:        TemporaryNote[];
  rejectedPoints:        RejectedPoint[];
  unverifiedQuotes:      Partial<Record<string, number>>;
  unavailableDetections: string[];
}

// ── Citations ─────────────────────────────────────────────────

/** Citation prête à afficher ; null pour un SourceRef illisible (le back l'a déjà écarté). */
export type Quote =
  | { kind: 'document'; source: SourceRef; realigned: boolean }
  | { kind: 'briefing'; excerpt: string; realigned: boolean };

export function toQuote(q: RawQuote): Quote | null {
  if (q.kind === 'briefing') return { kind: 'briefing', excerpt: q.excerpt, realigned: q.excerptRealigned };
  const source = sourceRef(q.source);
  return source ? { kind: 'document', source, realigned: q.excerptRealigned } : null;
}

export const toQuotes = (quotes: RawQuote[]): Quote[] => quotes.map(toQuote).filter((q): q is Quote => q !== null);

/** Un côté qui ne cite que la fiche de cadrage : il se présente comme « Votre fiche de cadrage ». */
export const isBriefingOnly = (quotes: Quote[]): boolean => quotes.length > 0 && quotes.every(q => q.kind === 'briefing');

/** Une citation lue par vision, non vérifiée. */
const isVision = (q: Quote) => q.kind === 'document' && q.source.visionUnverified;

// ── Natures et réponses ───────────────────────────────────────

/** Ordre d'affichage : les natures qui bloquent la publication d'abord, puis le rang du modèle. */
export const NATURE_ORDER: readonly CardNature[] = ['contradiction', 'dated_change', 'probable_error', 'incomplete_or_outdated'];

export const NATURES: Readonly<Record<CardNature, { label: string; plural: string; sides: string; blocking: boolean }>> = {
  contradiction:          { label: 'Contradiction',         plural: 'Contradictions',         sides: 'Quel côté est juste ?',                          blocking: true },
  dated_change:           { label: 'Changement daté',       plural: 'Changements datés',      sides: 'Quel côté dit ce qui vaut aujourd\'hui ?',      blocking: true },
  probable_error:         { label: 'Erreur probable',       plural: 'Erreurs probables',      sides: 'Quel côté porte la bonne valeur ?',              blocking: true },
  incomplete_or_outdated: { label: 'Incomplet ou périmé',   plural: 'Incomplets ou périmés',  sides: '',                                               blocking: false },
};

/** Libellé de la nature, avec un repli pour une valeur inconnue. */
export const natureLabel = (n: string): string => (n in NATURES ? NATURES[n as CardNature].label : 'Point à clarifier');

/** Natures du modèle d'un point écarté (avant conversion en carte). */
const MODEL_NATURES: Readonly<Record<string, string>> = {
  changement_date: 'Changement daté', contradiction: 'Contradiction', erreur_probable: 'Erreur probable',
  incomplet_ou_perime: 'Incomplet ou périmé', note_temporaire: 'Note temporaire',
};
export const modelNatureLabel = (n: string): string => MODEL_NATURES[n] ?? natureLabel(n);

/**
 * Une carte bloque tant qu'elle n'est pas tranchée selon sa nature seule (contradiction,
 * changement daté, erreur probable) : la règle du back, qui refuse de préparer la nouvelle base
 * tant qu'une telle carte reste ouverte (aligné le 2026-10-07, premier essai en production).
 */
export function isBlocking(card: ReadingCard): boolean {
  return NATURES[card.nature].blocking;
}

/** Un côté de la carte ne repose que sur une lecture d'image, à confirmer : une mention, pas une exemption. */
export function readsImageOnly(card: ReadingCard): boolean {
  return card.sides.some(s => {
    const quotes = toQuotes(s.quotes);
    return quotes.length > 0 && quotes.every(isVision);
  });
}

/** Réponses saisies : un texte enregistré « saisi par X le Y ». */
export type TypedAnswer = 'adjust' | 'distinct_cases' | 'complete' | 'other_answer';
export const TYPED_ANSWERS: readonly CardAnswerCode[] = ['adjust', 'distinct_cases', 'complete', 'other_answer'];

/**
 * Libellé de chaque réponse de fond, et, pour une réponse saisie, ce qu'on demande de saisir.
 * `accept_side` est libellé par côté (« Retenir A : fichiers ») : la consigne de lecture ne fixe
 * pas encore quel côté est l'ancien ou le cité (plan-lecture-globale.md §3.4).
 */
export const ANSWERS: Readonly<Record<Exclude<CardAnswerCode, 'accept_side'>, { label: string; field?: string }>> = {
  adjust:             { label: 'Oui, mais la date ou le périmètre est différent', field: 'Date ou périmètre exacts' },
  distinct_cases:     { label: 'Les deux sont vraies, selon le cas', field: 'Dans quel cas chaque côté s\'applique' },
  same_meaning:       { label: 'Ils disent la même chose' },
  different_subjects: { label: 'Ce sont deux sujets différents' },
  example_only:       { label: 'C\'est un exemple, pas une règle' },
  complete:           { label: 'À compléter', field: 'Ce qu\'il faut ajouter ou corriger' },
  remove:             { label: 'À retirer de la base' },
  up_to_date:         { label: 'C\'est à jour' },
  not_a_problem:      { label: 'Ce n\'est pas un problème pour la base' },
  out_of_scope:       { label: 'Ce sujet n\'a pas sa place dans la base' },
  other_answer:       { label: 'Autre réponse', field: 'Votre réponse' },
  later:              { label: 'Plus tard' },
};

/**
 * Côté manquant d'une carte qui compare deux côtés (contradiction, changement daté, erreur
 * probable) : le back retire un côté dont aucune citation n'a été retrouvée dans les documents.
 * Null pour une carte complète, ou d'une nature qui n'a pas à comparer deux côtés.
 */
export function missingSide(card: ReadingCard): SideLabel | null {
  if (!NATURES[card.nature].blocking || card.sides.length !== 1) return null;
  return card.sides[0].label === 'A' ? 'B' : 'A';
}

/** Réponses qui comparent deux côtés : sans objet quand l'un d'eux manque. */
const TWO_SIDED: ReadonlySet<CardAnswerCode> = new Set(['distinct_cases', 'same_meaning', 'different_subjects']);

/** Question posée sur une carte qui compare deux côtés, ou sur son seul côté retrouvé. */
export const sidesQuestion = (card: ReadingCard): string =>
  missingSide(card) ? 'Ce passage est-il juste ?' : NATURES[card.nature].sides;

/** Réponses de fond de la carte, hors côtés, « Autre réponse », « Plus tard » et menu secondaire. */
export function substantiveAnswers(card: ReadingCard): Array<Exclude<CardAnswerCode, 'accept_side'>> {
  const secondary = new Set<CardAnswerCode>(['accept_side', 'other_answer', 'later', 'out_of_scope']);
  const oneSided = missingSide(card) !== null;
  return card.answers.filter((a): a is Exclude<CardAnswerCode, 'accept_side'> => !secondary.has(a) && !(oneSided && TWO_SIDED.has(a)));
}

/** Noms de fichier des documents d'un côté, sans doublon ; « votre fiche de cadrage » pour une citation de la fiche. */
export function sideDocuments(quotes: Quote[], name: (documentId: string) => string): string[] {
  const names = quotes.map(q => (q.kind === 'document' ? name(q.source.documentId) : 'votre fiche de cadrage'));
  return [...new Set(names)];
}

/** Libellé de repérage d'une carte : son sujet (rédigé par l'IA), sinon « Carte N ». */
export const cardTitle = (card: ReadingCard, position: number): string => card.analysis.subject.trim() || `Carte ${position}`;

// ── Réponses (decision-0.8.0) ─────────────────────────────────

export type CardAction =
  | { type: 'follow_recommendation'; precisions: string | null }
  | { type: 'accept_side'; side: SideLabel }
  | { type: TypedAnswer; text: string }
  | { type: Exclude<CardAnswerCode, 'accept_side' | TypedAnswer> };

export type CardStatus = 'open' | 'answered' | 'later';

export function cardStatus(current: Decision | undefined): CardStatus {
  if (!current) return 'open';
  return current.action.type === 'later' ? 'later' : 'answered';
}

export const CARD_STATUS_LABEL: Record<CardStatus, string> = { open: 'À traiter', answered: 'Répondue', later: 'Plus tard' };

/** Cartes dans l'ordre d'affichage : par nature (NATURE_ORDER), puis rang du modèle. */
export function orderedCards(cards: ReadingCard[]): ReadingCard[] {
  return [...cards].sort((a, b) => NATURE_ORDER.indexOf(a.nature) - NATURE_ORDER.indexOf(b.nature) || a.rank - b.rank);
}

/** Cartes regroupées par nature, dans l'ordre d'affichage ; une nature sans carte est omise. */
export function groupByNature(cards: ReadingCard[]): Array<{ nature: CardNature; cards: ReadingCard[] }> {
  const ordered = orderedCards(cards);
  return NATURE_ORDER
    .map(nature => ({ nature, cards: ordered.filter(c => c.nature === nature) }))
    .filter(g => g.cards.length > 0);
}

/** Progression : cartes répondues (« Plus tard » à part) sur le nombre de cartes. */
export function cardProgress(cards: ReadingCard[], current: ReadonlyMap<string, Decision>) {
  const statuses = cards.map(c => cardStatus(current.get(c.id)));
  return {
    answered: statuses.filter(s => s === 'answered').length,
    later:    statuses.filter(s => s === 'later').length,
    total:    cards.length,
  };
}

/**
 * Résumé de la vue d'ensemble : cartes par nature, dans l'ordre d'affichage ; celles qui bloquent
 * la publication (isBlocking), dont celles encore à traiter (« Plus tard » compris).
 */
export function clarifySummary(cards: ReadingCard[], current: ReadonlyMap<string, Decision>) {
  const blocking = cards.filter(isBlocking);
  return {
    total:          cards.length,
    byNature:       groupByNature(cards).map(g => ({ nature: g.nature, count: g.cards.length })),
    blocking:       blocking.length,
    blockingOpen:   blocking.filter(c => cardStatus(current.get(c.id)) !== 'answered').length,
  };
}

/** Le résumé en clair : « 10 cartes : 2 contradictions, 1 erreur probable et 7 incomplets ou périmés. » */
export function describeSummary(s: ReturnType<typeof clarifySummary>, withStatus: boolean): string[] {
  if (s.total === 0) return [];
  const parts = s.byNature.map(({ nature, count }) =>
    `${count} ${(count > 1 ? NATURES[nature].plural : NATURES[nature].label).toLowerCase()}`);
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} et ${parts[parts.length - 1]}` : parts[0];
  const lines = [`${s.total} ${s.total > 1 ? 'cartes' : 'carte'} : ${list}.`];

  if (s.blocking === 0) lines.push('Aucune ne bloque la publication.');
  else if (withStatus && s.blockingOpen === 0) {
    lines.push(s.blocking > 1
      ? `Les ${s.blocking} cartes qui bloquaient la publication ont toutes une réponse.`
      : 'La carte qui bloquait la publication a une réponse.');
  } else {
    const head = s.blocking > 1
      ? `${s.blocking} bloquent la publication tant qu'elles n'ont pas de réponse`
      : '1 bloque la publication tant qu\'elle n\'a pas de réponse';
    lines.push(withStatus ? `${head}, dont ${s.blockingOpen} encore à traiter.` : `${head}.`);
  }
  return lines;
}

/** Première carte à traiter (« Plus tard » compris) dans l'ordre d'affichage, sinon la première. */
export function firstOpenCard(ordered: ReadingCard[], current: ReadonlyMap<string, Decision>): number {
  const i = ordered.findIndex(c => cardStatus(current.get(c.id)) !== 'answered');
  return i === -1 ? 0 : i;
}

export const FOLLOW_RECOMMENDATION_LABEL = 'Je suis la recommandation de l\'IA';

/**
 * Ce que « Je suis la recommandation de l'IA » fera dans la base, en clair, selon l'effet que le
 * pipeline a lu dans la recommandation.
 */
export function recommendationOutcome(card: ReadingCard, name: (documentId: string) => string): string {
  const effect = card.recommendation?.effect ?? null;
  if (effect?.type === 'accept_side') {
    const side = card.sides.find(s => s.label === effect.side);
    const docs = side ? sideDocuments(toQuotes(side.quotes), name) : [];
    const where = docs.length > 0 ? ` (${docs.join(', ')})` : '';
    return card.nature === 'dated_change'
      ? `Le changement daté sera retenu : la base suivra le côté ${effect.side}${where}.`
      : `Le côté ${effect.side}${where} sera retenu dans la base.`;
  }
  if (effect?.type === 'complete') return 'Le passage sera complété dans la base, en suivant la recommandation.';
  if ((card.absentReferences ?? []).length > 0) {
    return 'La base restera telle quelle, avec son avertissement : la source renvoie à un contenu absent de vos documents. Une précision de votre part s\'appliquera seule.';
  }
  return 'Consigne seule : rien n\'est ajouté ni tranché dans la base par cette réponse ; la recommandation sert de consigne.';
}

const FOLLOWED_EFFECT: Record<string, string> = {
  dated_change: 'changement daté retenu', complete: 'passage à compléter', none: 'consigne seule',
};

/** La réponse en clair. Un texte saisi est cité entre guillemets ; l'auteur et la date s'affichent à côté. */
export function describeCardAnswer(action: Decision['action'], card: ReadingCard | undefined, name: (documentId: string) => string): string {
  const a = action as { type: string; side?: SideLabel; text?: string; precisions?: string | null; effect?: RecommendedEffect | null };
  if (a.type === 'follow_recommendation') {
    const effect = a.effect ?? null;
    const what = effect === null ? FOLLOWED_EFFECT.none
      : effect.type === 'complete' ? FOLLOWED_EFFECT.complete
      : card?.nature === 'dated_change' ? FOLLOWED_EFFECT.dated_change
      : `côté ${effect.side} retenu`;
    return `Recommandation de l'IA suivie (${what})${a.precisions ? ` — précision : « ${a.precisions} »` : ''}`;
  }
  if (a.type === 'accept_side' && a.side) {
    const side = card?.sides.find(s => s.label === a.side);
    const quotes = side ? toQuotes(side.quotes) : [];
    if (isBriefingOnly(quotes)) return 'Votre fiche de cadrage retenue';
    const docs = sideDocuments(quotes, name);
    const label = card && missingSide(card) ? 'Passage jugé juste' : `Côté ${a.side} retenu`;
    return `${label}${docs.length > 0 ? ` : ${docs.join(', ')}` : ''}`;
  }
  const known = a.type in ANSWERS ? ANSWERS[a.type as keyof typeof ANSWERS] : null;
  if (!known) return 'Réponse';
  return a.text ? `${known.label} : « ${a.text} »` : known.label;
}

// ── Détails de l'analyse ──────────────────────────────────────

const REJECTION_REASONS: Readonly<Record<string, string>> = {
  no_verified_quote: 'Aucune citation retrouvée dans les documents',
  briefing_only:     'Ne cite que la fiche de cadrage',
};
export const rejectionReasonLabel = (r: string) => REJECTION_REASONS[r] ?? 'Autre raison';

/**
 * `other` : une raison que le back ne connaît pas encore ; il la compte et la journalise
 * plutôt que de l'écarter.
 */
const UNVERIFIED_REASONS: Readonly<Record<string, string>> = {
  not_found:              'introuvable dans le corpus',
  wrong_document:         'trouvée dans un autre document que celui nommé',
  punctuation_only:       'ne se retrouve dans la source qu\'en ignorant la ponctuation',
  found_in_briefing:      'trouvée seulement dans la fiche de cadrage',
  image_description_only: 'reprend seulement la description d\'une image, pas son texte',
  other:                  'autre raison',
};
export const unverifiedReasonLabel = (r: string) => UNVERIFIED_REASONS[r] ?? UNVERIFIED_REASONS.other;

/** Les décomptes par raison, « autre raison » en dernier. */
export const unverifiedCounts = (counts: Reading['unverifiedQuotes']): Array<[string, number]> =>
  Object.entries(counts)
    .flatMap(([reason, n]): Array<[string, number]> => (n === undefined ? [] : [[reason, n]]))
    .sort(([a], [b]) => Number(a === 'other') - Number(b === 'other'));

/**
 * Fichiers que l'analyse n'a pas lus (inventaire en échec) : un document
 * illisible, ou ce qu'une archive d'export Notion contient sans être lu. Le
 * pipeline les liste avec leur raison (`code: détail`), pour que rien ne soit
 * écarté en silence.
 */
const UNREAD_REASONS: Readonly<Record<string, string>> = {
  unsafe_archive:     'archive refusée : chemin qui en sort, lien symbolique ou taille excessive',
  unreadable_archive: 'archive illisible ou chiffrée',
  nested_archive:     'archive contenue dans une archive, non lue',
  unsupported_file:   'format non lu',
  unreferenced_image: 'image citée par aucun document',
};

export function unreadReasonLabel(error: string | null): string {
  const code = (error ?? '').split(':', 1)[0].trim();
  return UNREAD_REASONS[code] ?? 'document illisible';
}

/** Les fichiers non lus, dans l'ordre de l'inventaire. */
export const unreadFiles = (audit: Audit): Array<{ path: string; reason: string }> =>
  audit.inventory
    .filter(i => i.status === 'failed')
    .map(i => ({ path: i.path, reason: unreadReasonLabel(i.error) }));

/** Ce que la lecture ne produit pas encore, en clair : rien n'en est montré dans la vue d'ensemble. */
const UNAVAILABLE: Readonly<Record<string, string>> = {
  temporary_notes: 'Les situations temporaires (maintenance, offre limitée dans le temps) : '
    + 'si aucune n\'est signalée, cela ne veut pas dire qu\'il n\'y en a pas.',
  corpus_split:    'Les ensembles de documents trop volumineux pour être lus en une seule fois : '
    + 'ils ne sont pas encore découpés en plusieurs lectures.',
};
export const unavailableLabel = (d: string) => UNAVAILABLE[d] ?? d;

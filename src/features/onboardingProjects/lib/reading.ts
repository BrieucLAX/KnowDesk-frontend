/**
 * « À clarifier » : l'audit 0.8.0 de la lecture globale (plan-lecture-globale.md §3.4 et §3.7).
 *
 * Le back lit l'audit défensivement et renvoie `reading` à côté de lui : les cartes (nature,
 * documents, citations vérifiées de chaque côté, analyse du modèle, réponses de la nature), les
 * notes temporaires, les points écartés. Ici : les libellés, l'ordre des natures, la progression
 * et la forme des réponses envoyées (decision-0.8.0).
 *
 * L'analyse du modèle (sujet, raison, proposition) ne s'affiche que sous « Analyse proposée par
 * l'IA » : elle aide à répondre, elle n'entre jamais dans une réponse.
 */
import { sourceRef, type SourceRef } from './audit';
import type { Decision } from './decisions';

export const READING_AUDIT_SCHEMA = '0.8.0';

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
 * Une carte bloque la publication tant qu'elle n'est pas tranchée, sauf si un de ses côtés ne
 * repose que sur une lecture d'image : elle ne bloque pas tant qu'un humain ne l'a pas confirmée.
 */
export function isBlocking(card: ReadingCard): boolean {
  if (!NATURES[card.nature].blocking) return false;
  return !card.sides.some(s => {
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

/** Réponses de fond de la carte, hors côtés, « Autre réponse », « Plus tard » et menu secondaire. */
export function substantiveAnswers(card: ReadingCard): Array<Exclude<CardAnswerCode, 'accept_side'>> {
  const secondary = new Set<CardAnswerCode>(['accept_side', 'other_answer', 'later', 'out_of_scope']);
  return card.answers.filter((a): a is Exclude<CardAnswerCode, 'accept_side'> => !secondary.has(a));
}

/** Noms de fichier des documents d'un côté, sans doublon ; « fiche de cadrage » pour une citation de la fiche. */
export function sideDocuments(quotes: Quote[], name: (documentId: string) => string): string[] {
  const names = quotes.map(q => (q.kind === 'document' ? name(q.source.documentId) : 'fiche de cadrage'));
  return [...new Set(names)];
}

// ── Réponses (decision-0.8.0) ─────────────────────────────────

export type CardAction =
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

/** Première carte à traiter (« Plus tard » compris) dans l'ordre d'affichage, sinon la première. */
export function firstOpenCard(ordered: ReadingCard[], current: ReadonlyMap<string, Decision>): number {
  const i = ordered.findIndex(c => cardStatus(current.get(c.id)) !== 'answered');
  return i === -1 ? 0 : i;
}

/** La réponse en clair. Un texte saisi est cité entre guillemets ; l'auteur et la date s'affichent à côté. */
export function describeCardAnswer(action: Decision['action'], card: ReadingCard | undefined, name: (documentId: string) => string): string {
  const a = action as { type: string; side?: SideLabel; text?: string };
  if (a.type === 'accept_side' && a.side) {
    const side = card?.sides.find(s => s.label === a.side);
    const docs = side ? sideDocuments(toQuotes(side.quotes), name) : [];
    return `Côté ${a.side} retenu${docs.length > 0 ? ` : ${docs.join(', ')}` : ''}`;
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

const UNAVAILABLE: Readonly<Record<string, string>> = {
  temporary_notes: 'Notes temporaires',
  corpus_split:    'Découpage d\'un corpus trop grand pour une lecture',
};
export const unavailableLabel = (d: string) => UNAVAILABLE[d] ?? d;

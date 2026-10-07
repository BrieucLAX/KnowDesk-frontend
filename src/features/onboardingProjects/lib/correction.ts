/**
 * Correction de la base (plan-correction-produit.md, lot 3), côté front.
 *
 * Le back lance la correction quand toutes les cartes bloquantes ont une décision, la suit chez
 * le pipeline, puis stocke la base rendue (correction-0.1.0) telle quelle. Ici : le contrat lu,
 * la règle de lancement (celle du back), la progression et les libellés en clair. Aucun code
 * (identifiant de modification, de carte, de section, code de raison) ne sort de ce module vers
 * l'écran.
 */
import type { Decision } from './decisions';
import { cardTitle, NATURES, orderedCards, type ReadingCard } from './reading';

// ── Contrat du back (onboarding.corrections.ts) ───────────────

export type CorrectionStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface OnboardingCorrection {
  id:            string;
  analysisId:    string;
  /** 1, 2… : chaque nouvelle préparation sur la même analyse. */
  generation:    number;
  status:        CorrectionStatus;
  /** Étape du pipeline (`download`, `parsing`, `correction`…), ou `storing` côté back. */
  stage:         string | null;
  done:          number;
  total:         number;
  /** Code seul, jamais de message. */
  errorCode:     string | null;
  decisionCount: number;
  createdAt:     string;
  submittedAt:   string | null;
  finishedAt:    string | null;
}

export interface CorrectionQuota { used: number; max: number }

/** Audits que le back sait corriger (422 AUDIT_NOT_CORRECTABLE sinon). */
export const CORRECTABLE_AUDIT_SCHEMAS: readonly string[] = ['0.9.0'];

// Base corrigée, correction.schema.json 0.1.0.

export type LineKind = 'heading' | 'paragraph' | 'list_item' | 'table_row' | 'image' | 'other';

export interface LineChange {
  kind:            'insert' | 'delete' | 'modify';
  line_kind:       LineKind;
  before:          string;
  after:           string;
  modification_id: string | null;
  kept:            boolean;
  undo_reason?:    string | null;
}

export interface CorrectedSection {
  key:                string;
  heading_path:       string[];
  original_markdown:  string;
  corrected_markdown: string;
  changes?:           LineChange[];
  modification_ids?:  string[];
  convention_ids?:    string[];
}

export interface CorrectedSheet {
  document_id:   string;
  document_path: string;
  markdown:      string;
  sections:      CorrectedSection[];
}

export type ModificationKind = 'dated_change' | 'kept_side' | 'expert_answer' | 'complete' | 'remove';

export interface Modification {
  id:          string;
  kind:        ModificationKind;
  origin:      { card_id: string; card_rank: number; decision_id: string; action_type: string; decided_at: string };
  instruction: string;
  expert_text?: string | null;
  section_keys: string[];
  outcome:     'applied' | 'not_applicable';
  reasons?:    string[];
}

export interface Convention { id: string; rule: string; section_keys: string[] }

export interface BaseCorrection {
  schema_version: string;
  sheets:         CorrectedSheet[];
  modifications:  Modification[];
  conventions?:   Convention[];
  pending?:       Array<{ card_id: string; card_rank: number }>;
}

/** GET …/corrections/:id/base. */
export interface BaseVersion {
  correctionId:  string;
  schemaVersion: string;
  base:          BaseCorrection;
  createdAt:     string;
  /** Seule la dernière correction réussie du projet se relit ; les précédentes se consultent. */
  reviewable:    boolean;
}

export type Verdict = 'accept' | 'fix' | 'refuse';

export interface Cancellation { cancelledAt: string; cancelledByName: string | null }

/** Avis sur une modification ou une convention (journal en ajout seul). */
export interface Review {
  id:            string;
  itemId:        string;
  verdict:       Verdict | null;
  correctedText: string | null;
  comment:       string | null;
  supersedesId:  string | null;
  authorName:    string | null;
  createdAt:     string;
  cancellation:  Cancellation | null;
}

/** GET …/reviews : l'avis courant de chaque élément, et les compteurs. */
export interface ReviewsState {
  reviews: Review[];
  counts:  { reviewed: number; toReview: number };
}

export interface SectionComment {
  id:           string;
  sectionKey:   string;
  comment:      string;
  supersedesId: string | null;
  authorName:   string | null;
  createdAt:    string;
  cancellation: Cancellation | null;
}

export interface ChainCancelResult<T> { cancelled: T; current: T | null }

export const isCorrectionActive = (c: Pick<OnboardingCorrection, 'status'>) => c.status === 'queued' || c.status === 'running';

// ── Lancement (règle du back : onboarding.corrections.ts, launchCorrection) ──

/**
 * Cartes qui empêchent encore la préparation : d'une nature bloquante (changement daté,
 * contradiction, erreur probable), sans décision ou laissées « Plus tard ». La règle est celle
 * du back, sur la nature seule : une carte dont un côté ne repose que sur une image compte aussi.
 */
export function blockingCardsLeft(cards: ReadingCard[], current: ReadonlyMap<string, Decision>): { left: number; later: number } {
  const blocking = cards.filter(c => NATURES[c.nature].blocking);
  const open = blocking.filter(c => { const d = current.get(c.id); return !d || d.action.type === 'later'; });
  return { left: open.length, later: open.filter(c => current.get(c.id)?.action.type === 'later').length };
}

export function blockingLeftLabel({ left, later }: { left: number; later: number }): string {
  const head = left > 1
    ? `Encore ${left} cartes bloquantes à trancher avant de préparer la nouvelle base.`
    : 'Encore 1 carte bloquante à trancher avant de préparer la nouvelle base.';
  if (later === 0) return head;
  return `${head} « Plus tard » ne tranche pas une carte bloquante${later < left ? ` (${later} sur ${left})` : ''}.`;
}

// ── Progression ───────────────────────────────────────────────

export interface CorrectionStep { label: string; stages: readonly string[]; counts?: boolean }

/**
 * Étapes affichées : le pipeline relit les documents (`download`, puis les étapes de lecture),
 * corrige section par section (`correction`, i/n), puis le back enregistre (`storing`). Une
 * étape inconnue compte comme la lecture des documents.
 */
export const CORRECTION_STEPS: readonly CorrectionStep[] = [
  { label: 'Lecture de vos documents',            stages: ['download', 'parsing', 'images'], counts: true },
  { label: 'Correction des fiches',               stages: ['correction'], counts: true },
  { label: 'Enregistrement de la nouvelle base',  stages: ['storing'] },
];

export type StepState = 'done' | 'current' | 'pending';

export function correctionStepStates(c: Pick<OnboardingCorrection, 'status' | 'stage'>): StepState[] {
  if (c.status === 'succeeded') return CORRECTION_STEPS.map(() => 'done');
  if (c.stage === null) return CORRECTION_STEPS.map(() => 'pending');
  const found = CORRECTION_STEPS.findIndex(s => s.stages.includes(c.stage!));
  const current = found === -1 ? 0 : found;
  return CORRECTION_STEPS.map((_, i) => {
    if (i < current) return 'done';
    if (i > current) return 'pending';
    return c.status === 'running' ? 'current' : 'pending';
  });
}

const FAILURES = new Map<string, string>(Object.entries({
  time_limit_exceeded:  'La préparation a dépassé sa durée maximale.',
  call_limit_exceeded:  'La préparation a atteint le nombre maximal d\'appels à l\'IA.',
  download_failed:      'Le service n\'a pas pu relire vos documents.',
  checksum_mismatch:    'Un document a changé pendant son envoi.',
  document_too_large:   'Un document dépasse la taille acceptée.',
  rate_limited:         'Le service d\'IA est saturé pour le moment.',
  provider_error:       'Le service d\'IA est indisponible pour le moment.',
  model_output_invalid: 'L\'IA a renvoyé une réponse inexploitable.',
  pipeline_restarted:   'Le service a redémarré pendant la préparation.',
  input_missing:        'Un document, l\'audit ou vos réponses ont disparu avant l\'envoi.',
  cancelled:            'La préparation a été annulée.',
  corpus_too_large:     'Les documents dépassent le volume de texte accepté.',
}));

/** Échecs de notre fait : relancer n'y change rien, nous sommes prévenus. */
const OUR_SIDE = new Set(['provider_auth', 'pipeline_invalid_error_code', 'correction_invalid', 'schema_mismatch', 'invalid_request', 'internal_error']);

export function correctionFailureMessage(code: string | null): string {
  if (code !== null && OUR_SIDE.has(code)) {
    return 'La préparation a échoué à cause d\'un problème de notre côté. Nous sommes prévenus. Elle ne compte pas dans votre quota.';
  }
  const what = (code !== null && FAILURES.get(code)) || 'La préparation a échoué.';
  return `${what} Elle ne compte pas dans votre quota : vous pouvez la relancer.`;
}

// ── Libellés en clair ─────────────────────────────────────────

export const KIND_LABEL: Record<ModificationKind, string> = {
  dated_change:  'Changement daté',
  kept_side:     'Version retenue',
  expert_answer: 'Votre réponse',
  complete:      'Complément',
  remove:        'Retrait',
};

export const kindLabel = (k: string): string => KIND_LABEL[k as ModificationKind] ?? 'Modification';

/** « Modification 3 » pour M3, « Convention 1 » pour C1 : jamais le code lui-même. */
export function itemLabel(id: string): string {
  const m = /^([MC])(\d+)$/.exec(id);
  if (!m) return 'Modification';
  return `${m[1] === 'M' ? 'Modification' : 'Convention'} ${m[2]}`;
}

const dayMonth = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Paris' });
};

/** Titre de chaque carte de l'audit, tel que « À clarifier » l'affiche. */
export function cardTitles(cards: ReadingCard[]): Map<string, string> {
  const ordered = orderedCards(cards);
  return new Map(ordered.map((c, i) => [c.id, cardTitle(c, i + 1)]));
}

/**
 * D'où vient une modification : « Votre réponse du 05/10 » ou « Recommandation de l'IA suivie
 * (votre réponse du 04/10) », puis la carte par son titre quand l'audit est chargé.
 */
export function originLabel(m: Modification, titles: ReadonlyMap<string, string>): string {
  const date = dayMonth(m.origin.decided_at);
  const answer = date ? `votre réponse du ${date}` : 'votre réponse';
  const head = m.origin.action_type === 'follow_recommendation'
    ? `Recommandation de l'IA suivie (${answer})`
    : answer.charAt(0).toUpperCase() + answer.slice(1);
  const title = titles.get(m.origin.card_id);
  return title ? `${head}, carte « ${title} »` : head;
}

/** Ce que disent les contrôles, à la place de leur code (correction-0.1.0, `UndoReason`). */
const REASON_LABEL: Record<string, string> = {
  not_decided:                  'un changement que vos réponses ne demandaient pas a été annulé',
  deletion_not_decided:         'une suppression que vos réponses ne demandaient pas a été annulée',
  heading_or_image_changed:     'un titre ou une image aurait changé : le changement a été annulé',
  qualifier_lost:               'une précision (date, périmètre, condition) aurait disparu : le changement a été annulé',
  value_without_source:         'une valeur absente de vos documents a été écartée',
  values_from_several_sources:  'des valeurs venues de plusieurs documents ont été écartées',
  duplicate_or_move:            'un doublon ou un déplacement de texte a été annulé',
  introduction_without_content: 'une introduction sans contenu a été retirée',
  invalid_output:               'l\'IA n\'a pas rendu de texte exploitable pour cette section',
  no_change_kept:               'aucun changement n\'a été retenu',
};

/**
 * Une raison en clair. Le pipeline écrit « clé de section : texte », le texte étant un code des
 * contrôles ou une phrase du modèle ; une clé de section n'a pas d'espace, le découpage au premier
 * « : » est donc sûr. La clé devient le titre de la section ; un code inconnu, une phrase générique.
 */
export function reasonLabel(raw: string, sectionTitle: (key: string) => string | null): string {
  const cut = raw.indexOf(': ');
  const key = cut > 0 ? raw.slice(0, cut) : '';
  // Une clé de section (jamais affichée, même inconnue de l'écran) : `^[A-Za-z0-9_.:-]+$`.
  const isKey = /^[A-Za-z0-9_.:-]+$/.test(key);
  const where = isKey ? sectionTitle(key) : null;
  const text = (isKey ? raw.slice(cut + 2) : raw).trim();
  const said = /^[a-z_]+$/.test(text)
    ? REASON_LABEL[text] ?? 'un changement a été annulé par les contrôles'
    : text;
  return where ? `${where} : ${said}` : said.charAt(0).toUpperCase() + said.slice(1);
}

export function reasonLabels(raws: string[], sectionTitle: (key: string) => string | null): string[] {
  return [...new Set(raws.map(r => reasonLabel(r, sectionTitle)))];
}

export function outcomeLabel(m: Modification): string {
  return m.outcome === 'applied' ? 'Appliquée' : 'Non appliquée';
}

/** Progression de la relecture : « 3 sur 12 relues ». */
export function reviewProgressLabel(reviewed: number, total: number): string {
  return `${reviewed} sur ${total} ${total > 1 ? 'relues' : 'relue'}`;
}

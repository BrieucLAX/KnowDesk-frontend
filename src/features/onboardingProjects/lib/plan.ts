/**
 * Plan d'une base à construire (plan-construire-v1, lot B ; décisions du porteur du 2026-11-14),
 * côté front.
 *
 * Un projet sans base existante (`base.mode: build`, audit 0.16.0) reçoit un plan : chapitres,
 * sujets et leurs sources, points d'attention. Il se lance depuis « À clarifier » quand les cartes
 * bloquantes ont une vraie réponse, et se lit dans « Nouvelle base », en lecture seule ; l'expert le
 * commente (un commentaire par sujet, un pour le plan), sans le modifier. Ici : le contrat lu (plan
 * 0.1.0, tel que le back le rend), les étapes, les libellés en clair. Aucun code (identifiant de
 * sujet, de carte, de raison) ne sort de ce module vers l'écran.
 */
import VERSIONS from './contract-versions.json';
import { sourceRef, type SourceRef } from './audit';
import type { ExistingBase } from './reading';

// ── Contrat du back (onboarding.plans.ts) ─────────────────────

export type PlanStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface OnboardingPlan {
  id:            string;
  analysisId:    string;
  /** 1, 2… : chaque nouveau plan sur la même analyse. */
  generation:    number;
  status:        PlanStatus;
  /** Étape du pipeline, ou `storing` côté back. */
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

export interface PlanQuota { used: number; max: number }

/** Le plan tel que livré (contrat plan 0.1.0), et s'il se commente encore (dernier plan réussi). */
export interface PlanContent {
  planId:        string;
  schemaVersion: string;
  plan:          unknown;
  createdAt:     string;
  commentable:   boolean;
}

/** Un commentaire du plan : sur un sujet, ou sur le plan entier (`subjectId: null`). */
export interface PlanComment {
  id:           string;
  subjectId:    string | null;
  comment:      string;
  supersedesId: string | null;
  author:       { id: string | null; name: string };
  createdAt:    string;
  cancelledAt:  string | null;
  cancelledBy:  { id: string | null; name: string } | null;
}

/** Plans que l'écran sait afficher, lus dans la copie de `contract-versions.json` du back. */
export const SUPPORTED_PLAN_SCHEMAS: readonly string[] = VERSIONS.plans.accepted;

/** Seul un audit 0.16.0 a un plan (le back : 422 AUDIT_NOT_PLANNABLE sinon). */
export const PLANNABLE_AUDIT_SCHEMAS: readonly string[] = ['0.16.0'];

/**
 * Le plan remplace la préparation en mode construire seulement, sur un audit 0.16.0 (B-Q4 : sans
 * interrupteur). Ailleurs, rien ne change : correction, ou message d'avant pour un audit plus ancien.
 */
export const hasPlan = (schemaVersion: string, base: ExistingBase | null | undefined): boolean =>
  base?.mode === 'build' && PLANNABLE_AUDIT_SCHEMAS.includes(schemaVersion);

export const isPlanActive = (p: Pick<OnboardingPlan, 'status'>) => p.status === 'queued' || p.status === 'running';

// ── Plan 0.1.0, lu ────────────────────────────────────────────

export type UncoveredReason = 'internal' | 'out_of_scope' | 'duplicate' | 'no_content' | 'other';

/** Pourquoi un passage n'a pas de sujet (liste fermée du contrat), en clair. */
export const UNCOVERED_REASON_LABEL: Readonly<Record<UncoveredReason, string>> = {
  internal:     'note de travail interne',
  out_of_scope: 'hors du service client',
  duplicate:    'déjà dit ailleurs',
  no_content:   'rien à reprendre (page de garde, sommaire, titre seul)',
  other:        'autre raison',
};

export interface PlanSubject {
  id:        string;
  title:     string;
  question:  string;
  audience:  string | null;
  sources:   SourceRef[];
  cardIds:   string[];
  /** Proposé au second passage, sur les passages qu'aucun sujet du premier ne couvrait. */
  fromComplement: boolean;
}

export interface PlanChapter { id: string; title: string; subjects: PlanSubject[] }

export interface UncoveredUnit { documentId: string; documentPath: string; where: string; excerpt: string; reason: string }

export interface RetiredDocument { documentPath: string; replacedByPath: string; cardId: string }

export interface Plan {
  chapters:  PlanChapter[];
  coverage:  { total: number; covered: number };
  /** null : la détection n'a pas tourné (lecture v1), « non disponible », jamais « aucun ». */
  retired:   RetiredDocument[] | null;
  uncovered: UncoveredUnit[];
  merged:    Array<{ subjectId: string; titles: string[] }>;
  unattachedCardIds: string[];
  rejectedTitles:    string[];
  unverifiedQuotes:  number;
  subjectCount:      number;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const objs  = (v: unknown): Obj[] => (Array.isArray(v) ? v.filter(isObj) : []);
const str   = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);
const strs  = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const num   = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** Le nom de fichier d'un chemin (archive comprise). */
const fileOf = (path: string) => path.split('/').pop() || path;

/** L'emplacement d'une unité, comme une source : « page 3 », « diapositive 2 », ou le chemin de titres. */
function unitWhere(unit: Obj): string {
  if (unit.kind === 'page') return `page ${num(unit.number)}`;
  if (unit.kind === 'slide') return `diapositive ${num(unit.number)}`;
  const path = strs(unit.heading_path);
  return path.length > 0 ? path.join(' › ') : 'début du document';
}

const REASONS = new Set<string>(Object.keys(UNCOVERED_REASON_LABEL));

/** Le plan stocké (plan 0.1.0, validé par le back), lu pour l'écran ; null s'il est illisible. */
export function readPlan(raw: unknown): Plan | null {
  if (!isObj(raw) || !isObj(raw.coverage) || !isObj(raw.attention)) return null;
  const subjects = new Map(objs(raw.subjects).map(s => [str(s.id), s]));
  const chapters: PlanChapter[] = objs(raw.chapters).map(c => ({
    id:       str(c.id),
    title:    str(c.title),
    subjects: strs(c.subject_ids).map(id => subjects.get(id)).filter(isObj).map(s => ({
      id:             str(s.id),
      title:          str(s.title),
      question:       str(s.question),
      audience:       typeof s.audience === 'string' && s.audience.trim() !== '' ? s.audience : null,
      sources:        (Array.isArray(s.sources) ? s.sources : []).map(sourceRef).filter((r): r is SourceRef => r !== null),
      cardIds:        strs(s.card_ids),
      fromComplement: s.origin === 'plan_complement',
    })),
  }));
  const a = raw.attention;
  return {
    chapters,
    coverage:  { total: num(raw.coverage.units_total), covered: num(raw.coverage.units_covered) },
    retired:   a.retired_documents_detection === 'available'
      ? objs(a.retired_documents).map(r => ({
        documentPath:   fileOf(str(r.document_path)),
        replacedByPath: fileOf(str(r.replaced_by_document_path)),
        cardId:         str(r.card_id),
      }))
      : null,
    uncovered: objs(a.uncovered_units).map(u => {
      const unit = isObj(u.unit) ? u.unit : {};
      const reason = str(u.reason);
      return {
        documentId:   str(unit.document_id),
        documentPath: fileOf(str(u.document_path)),
        where:        unitWhere(unit),
        excerpt:      str(u.excerpt),
        reason:       UNCOVERED_REASON_LABEL[(REASONS.has(reason) ? reason : 'other') as UncoveredReason],
      };
    }),
    merged:            objs(a.merged_subjects).map(m => ({ subjectId: str(m.subject_id), titles: strs(m.titles) })),
    unattachedCardIds: objs(a.unattached_cards).map(c => str(c.card_id)),
    rejectedTitles:    objs(a.rejected_subjects).map(r => str(r.title)),
    unverifiedQuotes:  num(a.unverified_quotes),
    subjectCount:      chapters.reduce((n, c) => n + c.subjects.length, 0),
  };
}

/** « 6 catégories · 31 articles · 128 passages couverts sur 133 » (vocabulaire de l'écran, décision du porteur du 2026-11-14). */
export function planSummary(plan: Plan): string {
  const n = (k: number, one: string, many: string) => `${k} ${k > 1 ? many : one}`;
  return [
    n(plan.chapters.length, 'catégorie', 'catégories'),
    n(plan.subjectCount, 'article', 'articles'),
    `${plan.coverage.covered} passage${plan.coverage.covered > 1 ? 's' : ''} couvert${plan.coverage.covered > 1 ? 's' : ''} sur ${plan.coverage.total}`,
  ].join(' · ');
}

// ── Progression ───────────────────────────────────────────────

export interface PlanStep { label: string; stages: readonly string[]; counts?: boolean }

/**
 * Étapes affichées : le pipeline relit les documents (`download`, puis la lecture), propose les
 * chapitres et les sujets (`plan`), rattache les passages restants (`complement`), contrôle la
 * couverture (`coverage`), puis le back enregistre (`storing`). Une étape inconnue compte comme la
 * lecture des documents.
 */
export const PLAN_STEPS: readonly PlanStep[] = [
  { label: 'Lecture de vos documents',                 stages: ['download', 'parsing', 'images'], counts: true },
  { label: 'Proposition des catégories et des articles', stages: ['plan'] },
  { label: 'Rattachement des passages restants',       stages: ['complement'] },
  { label: 'Contrôle de la couverture',                stages: ['coverage'] },
  { label: 'Enregistrement du plan',                   stages: ['storing'] },
];

export type StepState = 'done' | 'current' | 'pending';

export function planStepStates(p: Pick<OnboardingPlan, 'status' | 'stage'>): StepState[] {
  if (p.status === 'succeeded') return PLAN_STEPS.map(() => 'done');
  if (p.stage === null) return PLAN_STEPS.map(() => 'pending');
  const found = PLAN_STEPS.findIndex(s => s.stages.includes(p.stage!));
  const current = found === -1 ? 0 : found;
  return PLAN_STEPS.map((_, i) => {
    if (i < current) return 'done';
    if (i > current) return 'pending';
    return p.status === 'running' ? 'current' : 'pending';
  });
}

const FAILURES = new Map<string, string>(Object.entries({
  plan_not_supported:   'Le service d\'analyse ne sait pas encore préparer un plan : il le saura très prochainement.',
  time_limit_exceeded:  'La préparation du plan a dépassé sa durée maximale.',
  call_limit_exceeded:  'La préparation du plan a atteint le nombre maximal d\'appels à l\'IA.',
  download_failed:      'Le service n\'a pas pu relire vos documents.',
  checksum_mismatch:    'Un document a changé pendant son envoi.',
  document_too_large:   'Un document dépasse la taille acceptée.',
  rate_limited:         'Le service d\'IA est saturé pour le moment.',
  provider_error:       'Le service d\'IA est indisponible pour le moment.',
  model_output_invalid: 'L\'IA a renvoyé une réponse inexploitable.',
  pipeline_restarted:   'Le service a redémarré pendant la préparation du plan.',
  input_missing:        'Un document, l\'audit ou vos réponses ont disparu avant l\'envoi.',
  cancelled:            'La préparation du plan a été annulée.',
  corpus_too_large:     'Les documents dépassent le volume de texte accepté.',
}));

/** Échecs de notre fait : relancer n'y change rien tout de suite, nous sommes prévenus. */
const OUR_SIDE = new Set(['provider_auth', 'pipeline_invalid_error_code', 'plan_invalid', 'invalid_request', 'schema_mismatch', 'internal_error']);

export function planFailureMessage(code: string | null): string {
  if (code === 'plan_not_supported') {
    return `${FAILURES.get(code)} Nous sommes prévenus. Ce plan ne compte pas dans votre quota.`;
  }
  if (code !== null && OUR_SIDE.has(code)) {
    return 'La préparation du plan a échoué à cause d\'un problème de notre côté. Nous sommes prévenus. Elle ne compte pas dans votre quota.';
  }
  const what = (code !== null && FAILURES.get(code)) || 'La préparation du plan a échoué.';
  return `${what} Elle ne compte pas dans votre quota : vous pouvez la relancer.`;
}

/** Ce que dit le champ de commentaire du plan : une remarque pour l'équipe, jamais dans la base. */
export const PLAN_COMMENT_HINT = 'Pour l\'équipe Knowdesk seulement : ce commentaire n\'entre jamais dans la base, '
  + 'et le plan ne change pas.';

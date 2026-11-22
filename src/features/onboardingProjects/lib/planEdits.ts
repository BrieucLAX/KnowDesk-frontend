/**
 * Modification du plan avant la rédaction (plan-construire-v1, étape 4 ; décisions du porteur du
 * 2026-11-22, D7 et D9 révisées), côté front.
 *
 * L'expert range le dernier plan réussi : renommer une catégorie ou un article, déplacer un article
 * (dans une catégorie nouvelle au besoin), monter ou descendre, réunir deux articles, retirer un
 * article. Rien n'entre dans le contenu (D3). Le back applique le journal au plan proposé et rend le
 * plan modifié (plan 0.1.0, lu par `readPlan`) ; ici : le contrat lu, les phrases de « Vos
 * modifications », et les modifications que l'écran envoie. Aucun identifiant ne sort vers l'écran.
 */
import { AUDIENCE_LABEL, audienceOf } from './audience';
import type { Plan, PlanChapter, PlanSubject } from './plan';

// ── Contrat du back (onboarding.planEditing.ts) ─────────────

export type PlanEditOp =
  | { kind: 'rename_chapter'; chapterId: string; title: string }
  | { kind: 'rename_subject'; subjectId: string; title: string }
  | { kind: 'move_subject'; subjectId: string; chapterId: string | null; newChapterTitle?: string; afterSubjectId: string | null }
  | { kind: 'move_chapter'; chapterId: string; afterChapterId: string | null }
  | { kind: 'merge_subjects'; subjectId: string; intoSubjectId: string }
  | { kind: 'remove_subject'; subjectId: string };

export type PlanEditKind = PlanEditOp['kind'];

/** Ce qu'une modification a touché, avec les titres au moment où elle s'est appliquée. */
export interface EditNames {
  subject?:    string;
  chapter?:    string;
  from?:       string;
  to?:         string;
  into?:       string;
  newChapter?: boolean;
  audience?:   { from: string | null; to: string | null };
}

export interface PlanEdit {
  id:        string;
  kind:      PlanEditKind;
  op:        PlanEditOp;
  names:     EditNames;
  author:    { id: string | null; name: string };
  createdAt: string;
}

export interface GoneSubject {
  subjectId:     string;
  title:         string;
  kind:          'removed' | 'merged';
  intoSubjectId: string | null;
}

/** Le plan modifié et ses modifications en vigueur, tels que le back les rend. */
export interface PlanEditsState {
  planId:            string;
  /** Le dernier plan réussi du projet : le seul qui se modifie. */
  editable:          boolean;
  /** La dernière ligne du journal : chaque écriture la nomme (409 PLAN_EDIT_CONFLICT sinon). */
  headId:            string | null;
  editCount:         number;
  /** Le plan modifié (plan 0.1.0) ; le plan proposé quand `editCount` vaut 0. */
  plan:              unknown;
  edits:             PlanEdit[];
  changedChapterIds: string[];
  changedSubjectIds: string[];
  gone:              GoneSubject[];
}

export const PLAN_TITLE_MAX = 200;

// ── Phrases de « Vos modifications » ────────────────────────

const q = (t: string | undefined) => `« ${t ?? ''} »`;

const audienceLabel = (v: string | null | undefined) => {
  const a = audienceOf(v ?? null);
  return a !== null ? AUDIENCE_LABEL[a] : v ?? 'sans public';
};

/** Une modification, dite en une phrase, avec les titres au moment où elle s'est appliquée. */
export function describeEdit(e: Pick<PlanEdit, 'kind' | 'names'>): string {
  const n = e.names;
  switch (e.kind) {
    case 'rename_chapter': return `Catégorie ${q(n.from)} renommée ${q(n.to)}`;
    case 'rename_subject': return `Article ${q(n.from)} renommé ${q(n.to)}`;
    case 'move_subject':
      if (n.newChapter) return `Catégorie ${q(n.to)} créée, avec ${q(n.subject)}`;
      if (n.from === n.to) return `${q(n.subject)} placé à un autre rang dans ${q(n.to)}`;
      return `${q(n.subject)} déplacé de ${q(n.from)} vers ${q(n.to)}`;
    case 'move_chapter': return `Catégorie ${q(n.chapter)} placée à un autre rang`;
    case 'merge_subjects':
      return n.audience
        ? `${q(n.subject)} réuni dans ${q(n.into)}, qui devient « ${audienceLabel(n.audience.to)} »`
        : `${q(n.subject)} réuni dans ${q(n.into)}`;
    case 'remove_subject': return `${q(n.subject)} retiré du plan`;
  }
}

/** « 3 modifications », « 1 modification ». */
export const editCountLabel = (n: number) => `${n} modification${n > 1 ? 's' : ''}`;

// ── Les modifications que l'écran envoie ────────────────────

/** Monter (-1) ou descendre (+1) un article dans sa catégorie ; null en bout de catégorie. */
export function moveSubjectBy(chapter: PlanChapter, subjectId: string, step: -1 | 1): PlanEditOp | null {
  const ids = chapter.subjects.map(s => s.id);
  const i = ids.indexOf(subjectId);
  const j = i + step;
  if (i === -1 || j < 0 || j >= ids.length) return null;
  const rest = ids.filter(id => id !== subjectId);
  return { kind: 'move_subject', subjectId, chapterId: chapter.id, afterSubjectId: j === 0 ? null : rest[j - 1] };
}

/** Monter ou descendre une catégorie ; null en bout de plan. */
export function moveChapterBy(plan: Plan, chapterId: string, step: -1 | 1): PlanEditOp | null {
  const ids = plan.chapters.map(c => c.id);
  const i = ids.indexOf(chapterId);
  const j = i + step;
  if (i === -1 || j < 0 || j >= ids.length) return null;
  const rest = ids.filter(id => id !== chapterId);
  return { kind: 'move_chapter', chapterId, afterChapterId: j === 0 ? null : rest[j - 1] };
}

/**
 * Le public d'un article après une réunion, comme le back le calcule : le même public reste ;
 * des publics différents donnent « tous » (Q2 a du 2026-11-22).
 */
export const mergedAudience = (into: Pick<PlanSubject, 'audience'>, from: Pick<PlanSubject, 'audience'>): string | null =>
  (into.audience ?? null) === (from.audience ?? null) ? into.audience : 'tous';

/** Message d'un refus : le back dit ce qui ne s'applique pas ; un conflit demande de recharger. */
export const PLAN_EDIT_CONFLICT = 'PLAN_EDIT_CONFLICT';

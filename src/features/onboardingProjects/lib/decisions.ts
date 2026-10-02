/**
 * Décisions d'arbitrage (F3, F-F3b), côté front.
 *
 * Le back tient le journal (une ligne par décision, rien n'est écrasé) et
 * valide chaque décision contre decision.schema.json. Ici : la forme des
 * réponses, la décision courante par question, la progression par étape
 * (un `group_id` = une décision annoncée), et la construction des actions
 * envoyées. Plan d'onboarding §5.1 (F-F3b) et §5.3 « Décisions ».
 */
import type { Question } from './audit';
import type { CardAction } from './reading';

// ── Contrat (decision.schema.json 0.6.0) ──────────────────────

export interface DecisionCondition { text: string }

export type DecisionAction =
  | { type: 'choose'; kept_assertion_id: string; discarded_assertion_ids: string[] }
  | { type: 'write_version'; text: string; condition?: DecisionCondition | null; value?: null }
  | { type: 'distinct_cases'; cases: Array<{ assertion_id: string; condition: DecisionCondition }> }
  | { type: 'later' }
  | { type: 'skip' };

export type DecisionActionType = DecisionAction['type'];

/**
 * Une décision telle que le back la renvoie : la réponse à une question (audits 0.6.0 et 0.7.0)
 * ou à une carte (audit 0.8.0, `cardId` renseigné, `questionId` identique, `conflictIds` null).
 */
export interface Decision {
  id:           string;
  questionId:   string;
  cardId?:      string | null;
  groupId:      string | null;
  conflictIds:  string[] | null;
  action:       DecisionAction | CardAction;
  supersedesId: string | null;
  decidedBy:    { id: string | null; name: string };
  decidedAt:    string;
  cancelledAt:  string | null;
  cancelledBy:  { id: string | null; name: string | null } | null;
}

/** GET …/decisions. */
export interface DecisionsState {
  /** Décision courante de chaque question décidée. */
  decisions:  Decision[];
  counts:     { decided: number; later: number; skipped: number; cards?: number | null };
  /** Seul l'audit de la dernière analyse réussie s'arbitre (Q2). */
  arbitrable: boolean;
}

/** POST …/decisions/:id/cancel. */
export interface CancelResult {
  cancelled: Decision;
  /** La décision précédente redevenue courante, ou null : la question est ouverte (Q1). */
  current:   Decision | null;
}

// ── État courant et progression ───────────────────────────────

export type QuestionStatus = 'open' | 'decided' | 'later' | 'skipped';

export function questionStatus(current: Decision | undefined): QuestionStatus {
  if (!current) return 'open';
  if (current.action.type === 'later') return 'later';
  if (current.action.type === 'skip') return 'skipped';
  return 'decided';
}

/** Statut d'une étape : « à faire » tant qu'une de ses questions est ouverte. */
export type StepStatus = 'todo' | 'later' | 'decided' | 'skipped';

export const STEP_STATUS_LABEL: Record<StepStatus, string> = {
  todo:    'À faire',
  later:   'Plus tard',
  decided: 'Décidée',
  skipped: 'Passée',
};

/**
 * Une étape (les questions d'un même groupe) n'est faite qu'une fois toutes
 * ses questions tranchées. « Plus tard » la laisse à faire ; « passer » est
 * une décision (non applicable).
 */
export function stepStatus(step: Question[], current: ReadonlyMap<string, Decision>): StepStatus {
  const statuses = step.map(q => questionStatus(current.get(q.id)));
  if (statuses.includes('open')) return 'todo';
  if (statuses.includes('later')) return 'later';
  if (statuses.every(s => s === 'skipped')) return 'skipped';
  return 'decided';
}

export const isStepDone = (status: StepStatus) => status === 'decided' || status === 'skipped';

/** « x sur N » : étapes faites sur le nombre d'étapes. */
export function progress(steps: Question[][], current: ReadonlyMap<string, Decision>) {
  return { done: steps.filter(s => isStepDone(stepStatus(s, current))).length, total: steps.length };
}

/** Première étape encore à faire (« plus tard » compris), sinon la première. */
export function firstOpenStep(steps: Question[][], current: ReadonlyMap<string, Decision>): number {
  const i = steps.findIndex(s => !isStepDone(stepStatus(s, current)));
  return i === -1 ? 0 : i;
}

// ── Construction des actions ──────────────────────────────────

export type Built = { ok: true; action: DecisionAction } | { ok: false; error: string };

/** Lettre d'une option (A, B, C…), dans l'ordre de l'audit. */
export const optionLetter = (index: number) => String.fromCharCode(65 + index);

/**
 * Garder une option : sa première assertion est gardée ; celles des autres
 * options sont écartées. Les autres assertions de l'option gardée ne sont ni
 * gardées ni écartées (§5.3).
 */
export function buildChoose(q: Question, keptIndex: number): Built {
  const kept = q.options[keptIndex]?.assertionIds[0];
  if (!kept) return { ok: false, error: 'Cette option ne cite aucune source : elle ne peut pas être retenue.' };
  const discarded = [...new Set(q.options.flatMap((o, i) => (i === keptIndex ? [] : o.assertionIds)))].filter(id => id !== kept);
  if (discarded.length === 0) return { ok: false, error: 'Aucune autre option à écarter.' };
  return { ok: true, action: { type: 'choose', kept_assertion_id: kept, discarded_assertion_ids: discarded } };
}

/** Version C : texte obligatoire, condition facultative. */
export function buildWriteVersion(text: string, condition: string): Built {
  const t = text.trim();
  if (!t) return { ok: false, error: 'Rédigez la version à retenir.' };
  const c = condition.trim();
  return { ok: true, action: { type: 'write_version', text: t, condition: c ? { text: c } : null } };
}

/** Deux cas distincts : une condition par option, toutes obligatoires. */
export function buildDistinctCases(q: Question, conditions: string[]): Built {
  if (q.options.length < 2) return { ok: false, error: 'Il faut au moins deux options.' };
  const cases: Array<{ assertion_id: string; condition: DecisionCondition }> = [];
  for (const [i, o] of q.options.entries()) {
    const text = (conditions[i] ?? '').trim();
    if (!text) return { ok: false, error: `Précisez le cas où l'option ${optionLetter(i)} s'applique.` };
    const assertionId = o.assertionIds[0];
    if (!assertionId) return { ok: false, error: `L'option ${optionLetter(i)} ne cite aucune source.` };
    cases.push({ assertion_id: assertionId, condition: { text } });
  }
  return { ok: true, action: { type: 'distinct_cases', cases } };
}

// ── Lecture d'une décision ────────────────────────────────────

/** La décision en clair, les options désignées par leur lettre. */
export function describeDecision(action: DecisionAction | CardAction, q: Question | undefined): string {
  const letterOf = (assertionId: string) => {
    const i = q?.options.findIndex(o => o.assertionIds.includes(assertionId)) ?? -1;
    return i >= 0 ? optionLetter(i) : '?';
  };
  switch (action.type) {
    case 'choose':
      return `Option ${letterOf(action.kept_assertion_id)} retenue`;
    case 'write_version':
      return `Version C : « ${action.text} »${action.condition ? `, si ${action.condition.text}` : ''}`;
    case 'distinct_cases':
      // Une réponse à une carte (0.8.0) a un texte, pas de cas : elle se décrit par describeCardAnswer.
      if (!('cases' in action)) return 'Décision';
      return `Cas distincts : ${action.cases.map(c => `${letterOf(c.assertion_id)} si ${c.condition.text}`).join(' ; ')}`;
    case 'later':
      return 'Plus tard';
    case 'skip':
      return 'Passée (non applicable)';
    default:
      return 'Décision';
  }
}

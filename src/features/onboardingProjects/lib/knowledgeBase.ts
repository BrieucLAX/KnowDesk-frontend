import { ApiError } from '../../../shared/lib/apiClient';

/**
 * Créer la base de connaissance depuis la version propre (KnowDesk-docs, plan-articles-v1.md, lot 2).
 * Types recopiés du back (`onboarding.knowledgeBase.ts`, `KnowledgeBasePreview` et la réponse de
 * `GET …/knowledge-base/:creationId`). Aucune version de contrat ne change : les trois listes de
 * `reading.ts` et `correction.ts` restent telles quelles.
 */

export type KnowledgeBaseCreationStatus = 'previewed' | 'queued' | 'running' | 'succeeded' | 'failed';

export interface KnowledgeBasePreview {
  creationId: string;
  status:     KnowledgeBaseCreationStatus;
  validation: { id: string; version: number };
  /** Une catégorie par chapitre, dans l'ordre des fiches. */
  categories: Array<{ name: string; articles: number }>;
  counts:     { categories: number; articles: number; faqs: number; faqsLinked: number; synonyms: number; images: number };
  /** Les 5 premiers titres, dans l'ordre des articles. */
  examples:   string[];
  titles:     { author: number; model: number; fallback: number; calls: number; costUsd: number };
  references: { resolved: number; unresolved: number };
  excluded:   Array<{ title: string; reason: 'table_of_contents' | 'faq' | string }>;
  quota:      { limit: number; current: number; toCreate: number; after: number; allowed: boolean };
  /** Aucun article ni FAQ non archivés hors de ce plan (décision 11). */
  knowledgeBaseEmpty: boolean;
  /** Faux : les synonymes sont enregistrés sans être appliqués à la recherche (back sans Meilisearch). */
  synonymsApplied:    boolean;
}

/** Ce qui est déjà fait ; recompté depuis zéro à chaque reprise (ce qui existe est sauté). */
export interface KnowledgeBaseProgress {
  categories?: number; articles?: number; faqs?: number; images?: number; synonyms?: number; synonymsExisting?: number;
}

export interface KnowledgeBaseCreation extends KnowledgeBasePreview {
  progress:   KnowledgeBaseProgress;
  /** Code seul (`creation_failed`…), jamais de message. */
  errorCode:  string | null;
  startedAt:  string | null;
  finishedAt: string | null;
}

/** La dernière création d'un projet (`GET …/projects/:p/knowledge-base`) : son état, sans le plan. */
export interface LatestKnowledgeBaseCreation {
  creationId: string;
  status:     KnowledgeBaseCreationStatus;
  validation: { id: string | null; version: number };
  progress:   KnowledgeBaseProgress;
  errorCode:  string | null;
  createdAt:  string;
  startedAt:  string | null;
  finishedAt: string | null;
}

/**
 * La création à rouvrir sur l'écran d'une version, d'après la dernière du projet. Lancée (en file,
 * en cours, réussie) : c'est la base de l'organisation, quelle que soit la version. En échec ou
 * simple aperçu : seulement si elle vient de cette version, sinon la reprendre recréerait l'ancien
 * texte.
 */
export function creationToReopen(latest: LatestKnowledgeBaseCreation | null, validationId: string): string | null {
  if (!latest) return null;
  if (latest.status === 'queued' || latest.status === 'running' || latest.status === 'succeeded') return latest.creationId;
  return latest.validation.id === validationId ? latest.creationId : null;
}

export const isCreationActive = (c: Pick<KnowledgeBaseCreation, 'status'>) => c.status === 'queued' || c.status === 'running';

/** Pourquoi le bouton « Créer » est désactivé, dans l'ordre où le back refuse. */
export function creationBlockers(p: KnowledgeBasePreview): string[] {
  const out: string[] = [];
  if (!p.knowledgeBaseEmpty) {
    out.push('La base de connaissance n\'est pas vide. La création depuis l\'onboarding ne se fait que dans une base vide : '
      + 'archivez ou supprimez d\'abord les articles et les FAQ existants.');
  }
  if (!p.quota.allowed) {
    const missing = p.quota.after - p.quota.limit;
    out.push(`Limite de ${p.quota.limit} articles dépassée : la base en compte déjà ${p.quota.current}, la création en ajoute `
      + `${p.quota.toCreate}. Il manque ${missing} place${missing > 1 ? 's' : ''}.`);
  }
  return out;
}

/** Ce qui n'est pas importé, en clair. */
export function excludedLabel(e: { title: string; reason: string }): string {
  if (e.reason === 'table_of_contents') return `${e.title} (sommaire, avec « Comment utiliser cette base » et l'historique)`;
  if (e.reason === 'faq') return `${e.title} (importée question par question dans les FAQ)`;
  return e.title;
}

export type StepState = 'done' | 'current' | 'pending';

/** Les étapes de la tâche, dans l'ordre du back : catégories, articles, FAQ, synonymes. */
export function creationSteps(c: KnowledgeBaseCreation): Array<{ label: string; done: number; total: number; state: StepState }> {
  const p = c.progress ?? {};
  const steps = [
    { label: 'Catégories', done: p.categories ?? 0, total: c.counts.categories },
    { label: 'Articles publiés', done: p.articles ?? 0, total: c.counts.articles },
    { label: 'FAQ', done: p.faqs ?? 0, total: c.counts.faqs },
    { label: 'Synonymes', done: (p.synonyms ?? 0) + (p.synonymsExisting ?? 0), total: c.counts.synonyms },
  ];
  if (c.status === 'succeeded') return steps.map(s => ({ ...s, state: 'done' as const }));
  const current = steps.findIndex(s => s.done < s.total);
  return steps.map((s, i) => ({
    ...s,
    state: current === -1 || i < current ? 'done' : i === current && c.status !== 'queued' ? 'current' : 'pending',
  }));
}

/**
 * Le message de chaque refus du back. Les deux 403 ont le même code (`FORBIDDEN`) : le message
 * du back sur la limite commence par « Limite », celui du rôle non.
 */
export function creationErrorMessage(err: unknown): string {
  if (!(err instanceof ApiError)) return 'La création n\'a pas pu être lancée. Réessayez.';
  switch (err.code) {
    case 'KNOWLEDGE_BASE_NOT_EMPTY':
      return 'La base de connaissance n\'est plus vide : archivez ou supprimez ses articles et ses FAQ, puis réessayez.';
    case 'KNOWLEDGE_MODULE_DISABLED':
      return 'La base de connaissance n\'est pas activée pour votre organisation. Demandez à l\'équipe KnowDesk de l\'activer.';
    case 'KNOWLEDGE_BASE_CREATION_RUNNING':
      return 'Une création est déjà en cours pour votre organisation.';
    case 'CONFLICT':
      return 'Cette base de connaissance a déjà été créée.';
    case 'FORBIDDEN':
      return /^limite/i.test(err.message)
        ? `${err.message.replace(/\s*Passez au plan Pro\.?$/, '')} Archivez des articles pour libérer de la place.`
        : 'Seul un administrateur peut créer la base de connaissance.';
    case 'NOT_FOUND':
      return 'Cet aperçu n\'existe plus. Rechargez la page pour en préparer un nouveau.';
    default:
      return err.message || 'La création n\'a pas pu être lancée. Réessayez.';
  }
}

/** Le message d'une tâche en échec (code seul côté back). */
export function creationFailureMessage(code: string | null): string {
  if (code === 'knowledge_module_disabled') return 'La base de connaissance a été désactivée pendant la création.';
  return 'La création s\'est arrêtée avant la fin. Ce qui est déjà créé est gardé : la reprise continue là où elle '
    + 's\'est arrêtée, sans doublon.';
}

// ── L'aperçu de cette version, retenu par navigateur : appoint seulement ──
// La création se retrouve par la dernière du projet (route du back). L'identifiant retenu ne sert
// que si cette route échoue, ou pour réutiliser l'aperçu de cette version quand le dernier aperçu
// du projet vient d'une autre version.

const storageKey = (validationId: string) => `knowdesk.kbCreation.${validationId}`;

export function rememberedCreation(validationId: string): string | null {
  try { return window.localStorage.getItem(storageKey(validationId)); } catch { return null; }
}

export function rememberCreation(validationId: string, creationId: string | null): void {
  try {
    if (creationId === null) window.localStorage.removeItem(storageKey(validationId));
    else window.localStorage.setItem(storageKey(validationId), creationId);
  } catch { /* stockage indisponible : la page marche sans */ }
}

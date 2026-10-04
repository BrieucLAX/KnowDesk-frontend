import type { Reading } from './reading';

/**
 * Audit livré par le pipeline (KnowDesk-pipeline, schemas/audit.schema.json).
 *
 * Le back le stocke tel quel et ne vérifie que sa version : sa structure
 * n'est pas garantie. Tout passe donc par `normalizeAudit`, qui ne garde que
 * ce que l'écran sait lire et pose les valeurs par défaut du schéma. Une
 * valeur d'énumération inconnue est gardée telle quelle : les libellés
 * (auditLabels.ts) ont un repli.
 *
 * Plan d'onboarding §5.3.
 */

/**
 * Versions que la vue des questions sait lire. 0.7.0 ajoute des champs à 0.6.0
 * (cartes, notes d'extraction, conflits en attente de lecture) sans en
 * retirer : `normalizeAudit` ne garde que ce que l'écran lit, les deux se
 * lisent donc de la même façon pendant la transition. L'audit 0.8.0 de la
 * lecture globale a sa propre vue (« À clarifier », lib/reading.ts).
 */
export const SUPPORTED_AUDIT_SCHEMAS: readonly string[] = ['0.6.0', '0.7.0'];

/** Réponse de GET …/analyses/:id/audit. */
export interface AuditResponse {
  analysisId:    string;
  schemaVersion: string;
  audit:         unknown;
  /** Images réellement conservées : une image citée peut manquer. */
  imageIds:      string[];
  /** Cartes, notes et points écartés de l'audit 0.8.0, lus par le back ; null pour un autre audit. */
  reading?:      Reading | null;
}

export interface ConditionClause {
  dimension: string;
  operator:  string;
  value:     string | string[];
}

export interface Condition {
  text:    string;
  /** Forme normalisée (conjonction), quand la détection la fournit. */
  clauses: ConditionClause[];
}

export interface SourceRef {
  format:        string;
  documentId:    string;
  excerpt:       string;
  zone:          string;
  /** Extrait transcrit par vision, non vérifié : l'image s'affiche à côté. */
  visionUnverified: boolean;
  imageId:       string | null;
  tableCell:     { row: number; column: number } | null;
  /** pdf */
  page:          number | null;
  /** pptx */
  slide:         number | null;
  /** docx */
  headingPath:   string[];
  blockKind:     string | null;
  blockIndex:    number | null;
}

export interface Assertion {
  id:        string;
  subject:   string;
  source:    SourceRef | null;
  /** Cas auquel la source restreint le fait (« En Corse »), s'il y en a un. */
  condition: Condition | null;
}

export interface Impact { level: string; score: number }

export interface QuestionOption {
  label:        string;
  document:     string;
  value:        string;
  scope:        string | null;
  assertionIds: string[];
  readByVision: boolean;
}

export interface Question {
  id:          string;
  type:        string;
  question:    string;
  subject:     string;
  conflictIds: string[];
  groupId:     string | null;
  options:     QuestionOption[];
  impact:      Impact;
  blocking:    boolean;
  rationale:   string | null;
}

export interface Conflict {
  id:                string;
  status:            string;
  proposedCondition: Condition | null;
}

export interface AutomaticDecision {
  id:          string;
  conflictIds: string[];
  rationale:   string | null;
  evidence:    SourceRef[];
  decidedAt:   string | null;
}

export interface DiscardedGap { id: string; subject: string; reason: string; explanation: string }
export interface ComplementaryTexts { id: string; subject: string; rationale: string }
export interface UnpairedSummary { reason: string; count: number; explanation: string }
export interface UndefinedReference { id: string; label: string; source: SourceRef | null }
export interface ObsolescenceHint { id: string; signal: string; source: SourceRef | null }

/** `error` : la raison d'un fichier non lu (`status: 'failed'`), sous la forme `code: détail`. */
export interface InventoryItem { documentId: string; path: string; format: string; status: string; error: string | null }

export interface Audit {
  generatedAt: string | null;
  summary: {
    count:             number;
    conflictCount:     number;
    autoResolvedCount: number;
    toConfirmCount:    number;
    toVerifyCount:     number;
    byImpact:          Record<string, number>;
  };
  estimatedMinutes:      number | null;
  inventory:             InventoryItem[];
  assertions:            Map<string, Assertion>;
  conflicts:             Map<string, Conflict>;
  questions:             Question[];
  automaticDecisions:    AutomaticDecision[];
  discardedGaps:         DiscardedGap[];
  complementaryTexts:    ComplementaryTexts[];
  unpaired:              UnpairedSummary[];
  undefinedReferences:   UndefinedReference[];
  obsolescenceHints:     ObsolescenceHint[];
  /** Détections que le pipeline ne produit pas encore : « non disponible », jamais « aucun ». */
  unavailableDetections: Set<string>;
}

// ── Lecture défensive ─────────────────────────────────────────

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const str   = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);
const num   = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const numOrNull = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const objs  = (v: unknown): Obj[] => (Array.isArray(v) ? v.filter(isObj) : []);
const strs  = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

function condition(v: unknown): Condition | null {
  if (!isObj(v) || typeof v.text !== 'string' || v.text.length === 0) return null;
  const clauses = objs(v.clauses)
    .filter(c => typeof c.dimension === 'string' && (typeof c.value === 'string' || Array.isArray(c.value)))
    .map(c => ({ dimension: str(c.dimension), operator: str(c.operator, 'eq'), value: typeof c.value === 'string' ? c.value : strs(c.value) }));
  return { text: v.text, clauses };
}

export function sourceRef(v: unknown): SourceRef | null {
  if (!isObj(v) || typeof v.document_id !== 'string') return null;
  const cell = isObj(v.table_cell) ? { row: num(v.table_cell.row), column: num(v.table_cell.column) } : null;
  return {
    format:           str(v.format),
    documentId:       v.document_id,
    excerpt:          str(v.excerpt),
    zone:             str(v.zone, 'text'),
    visionUnverified: v.excerpt_origin === 'vision_unverified',
    imageId:          strOrNull(v.image_id),
    tableCell:        cell,
    page:             numOrNull(v.page),
    slide:            numOrNull(v.slide),
    headingPath:      strs(v.heading_path),
    blockKind:        strOrNull(v.block_kind),
    blockIndex:       numOrNull(v.block_index),
  };
}

function question(q: Obj): Question {
  const impact = isObj(q.impact) ? q.impact : {};
  return {
    id:          str(q.id),
    type:        str(q.type),
    question:    str(q.question),
    subject:     str(q.subject),
    conflictIds: strs(q.conflict_ids),
    groupId:     strOrNull(q.group_id),
    options:     objs(q.options).map(o => ({
      label:        str(o.label),
      document:     str(o.document),
      value:        str(o.value),
      scope:        strOrNull(o.scope),
      assertionIds: strs(o.assertion_ids),
      readByVision: o.read_by_vision === true,
    })),
    impact:      { level: str(impact.level), score: num(impact.score) },
    // Absent ou illisible : bloquante, comme le veut l'ordre de l'audit (bloquantes d'abord).
    blocking:    q.blocking !== false,
    rationale:   strOrNull(q.rationale),
  };
}

/**
 * Audit lisible par l'écran, ou `null` si ce n'est pas un objet. Seule la
 * version est vérifiée à part (voir `isSupportedAudit`) : un champ manquant
 * prend sa valeur par défaut, un élément illisible d'une liste est ignoré.
 */
export function normalizeAudit(raw: unknown): Audit | null {
  if (!isObj(raw)) return null;
  const d = isObj(raw.decisions) ? raw.decisions : {};
  const byImpact: Record<string, number> = {};
  if (isObj(d.by_impact)) for (const [k, v] of Object.entries(d.by_impact)) if (typeof v === 'number') byImpact[k] = v;

  return {
    generatedAt: strOrNull(raw.generated_at),
    summary: {
      count:             num(d.count),
      conflictCount:     num(d.conflict_count),
      autoResolvedCount: num(d.auto_resolved_count),
      toConfirmCount:    num(d.to_confirm_count),
      toVerifyCount:     num(d.to_verify_count),
      byImpact,
    },
    estimatedMinutes: isObj(raw.estimated_duration) ? numOrNull(raw.estimated_duration.minutes) : null,
    inventory: objs(raw.inventory)
      .filter(i => typeof i.document_id === 'string')
      .map(i => ({
        documentId: str(i.document_id), path: str(i.path), format: str(i.format), status: str(i.status, 'pending'),
        error: typeof i.error === 'string' ? i.error : null,
      })),
    assertions: new Map(objs(raw.assertions)
      .filter(a => typeof a.id === 'string')
      .map(a => [str(a.id), { id: str(a.id), subject: str(a.subject), source: sourceRef(a.source), condition: condition(a.condition) }])),
    conflicts: new Map(objs(raw.conflicts)
      .filter(c => typeof c.id === 'string')
      .map(c => [str(c.id), { id: str(c.id), status: str(c.status, 'open'), proposedCondition: condition(c.proposed_condition) }])),
    questions: objs(raw.questions).filter(q => typeof q.id === 'string').map(question),
    automaticDecisions: objs(raw.automatic_decisions)
      .filter(a => typeof a.id === 'string')
      .map(a => ({
        id:          str(a.id),
        conflictIds: strs(a.conflict_ids),
        rationale:   strOrNull(a.rationale),
        evidence:    (Array.isArray(a.evidence) ? a.evidence : []).map(sourceRef).filter((s): s is SourceRef => s !== null),
        decidedAt:   strOrNull(a.decided_at),
      })),
    discardedGaps: objs(raw.discarded_gaps).map(g => ({
      id: str(g.id), subject: str(g.subject), reason: str(g.reason), explanation: str(g.explanation),
    })),
    complementaryTexts: objs(raw.complementary_texts).map(c => ({
      id: str(c.id), subject: str(c.subject), rationale: str(c.rationale),
    })),
    unpaired: objs(raw.unpaired).map(u => ({
      reason: str(u.reason), count: num(u.count), explanation: str(u.explanation),
    })),
    undefinedReferences: objs(raw.undefined_references).map(r => ({
      id: str(r.id), label: str(r.label), source: sourceRef(r.source),
    })),
    obsolescenceHints: objs(raw.obsolescence_hints).map(h => ({
      id: str(h.id), signal: str(h.signal), source: sourceRef(h.source),
    })),
    unavailableDetections: new Set(strs(raw.unavailable_detections)),
  };
}

export function isSupportedAudit(res: Pick<AuditResponse, 'schemaVersion'>): boolean {
  return SUPPORTED_AUDIT_SCHEMAS.includes(res.schemaVersion);
}

/** Le nom de fichier d'un chemin (`dossier/03-tarifs.md` → `03-tarifs.md`). */
export const fileName = (path: string): string => path.split(/[\\/]/).filter(Boolean).pop() ?? path;

/** Chemin complet d'un document dans l'inventaire (dans l'archive, pour un fichier qui en vient). */
export function documentPath(audit: Audit, documentId: string): string {
  return audit.inventory.find(i => i.documentId === documentId)?.path || documentId;
}

/**
 * Nom d'un document, toujours son nom de fichier, jamais le titre laissé par l'outil qui l'a
 * produit ; sans le chemin de l'archive, qui reste en infobulle (`documentPath`). Deux fichiers
 * de même nom dans des dossiers différents gardent leur chemin, pour ne pas se confondre.
 */
export function documentName(audit: Audit, documentId: string): string {
  const path = documentPath(audit, documentId);
  const name = fileName(path);
  const homonym = audit.inventory.some(i => i.documentId !== documentId && fileName(i.path) === name);
  return homonym ? path : name;
}

/** Les deux façons de nommer un document : son nom de fichier, et son chemin complet (infobulle). */
export interface DocNaming {
  name: (documentId: string) => string;
  path: (documentId: string) => string;
}

export const docNaming = (audit: Audit): DocNaming => ({
  name: id => documentName(audit, id),
  path: id => documentPath(audit, id),
});

/**
 * Un libellé qui nomme des documents (bouton, réponse) : écrit avec les noms de fichier, et
 * réécrit avec les chemins complets pour l'infobulle quand ils diffèrent.
 */
export function namedLabel(docs: DocNaming, build: (name: (documentId: string) => string) => string): { label: string; title?: string } {
  const label = build(docs.name);
  const full = build(docs.path);
  return full === label ? { label } : { label, title: full };
}

/** Nombre de documents lus par l'analyse : l'inventaire, sans les fichiers non lus. */
export const readDocumentsCount = (audit: Audit): number => audit.inventory.filter(i => i.status !== 'failed').length;

/** Sources des assertions d'une option, dans l'ordre de l'option. */
export function optionSources(audit: Audit, option: QuestionOption): SourceRef[] {
  return option.assertionIds
    .map(id => audit.assertions.get(id)?.source ?? null)
    .filter((s): s is SourceRef => s !== null);
}

// ── Regroupement des questions ───────────────────────────────

export type QuestionKind = 'decision' | 'to_verify' | 'to_confirm';

/**
 * Bloquante : une décision annoncée. Sinon, « à confirmer » si un de ses
 * conflits l'est (deux cas distincts), « à vérifier » dans tous les autres
 * cas (un côté lu par vision).
 */
export function questionKind(audit: Audit, q: Question): QuestionKind {
  if (q.blocking) return 'decision';
  const statuses = q.conflictIds.map(id => audit.conflicts.get(id)?.status);
  return statuses.includes('to_confirm') ? 'to_confirm' : 'to_verify';
}

/** Condition proposée par la détection pour séparer deux cas distincts. */
export function proposedCondition(audit: Audit, q: Question): Condition | null {
  for (const id of q.conflictIds) {
    const c = audit.conflicts.get(id)?.proposedCondition;
    if (c) return c;
  }
  return null;
}

/**
 * Condition de chaque option, pour préremplir « deux cas distincts » sur un
 * cas à confirmer. Pour chaque option, la condition de sa première
 * assertion, réduite aux dimensions que la détection propose de séparer
 * (« zone : Corse ») ; à défaut, le texte entier de cette condition ; à
 * défaut, vide. Les valeurs de la condition proposée ne sont pas reprises
 * telles quelles : leur ordre ne suit pas celui des options.
 */
export function proposedCases(audit: Audit, q: Question): string[] {
  const dims = new Set((proposedCondition(audit, q)?.clauses ?? []).map(c => c.dimension.toLowerCase()));
  return q.options.map(o => {
    const cond = o.assertionIds.length > 0 ? audit.assertions.get(o.assertionIds[0])?.condition ?? null : null;
    if (!cond) return '';
    const kept = cond.clauses
      .filter(c => dims.has(c.dimension.toLowerCase()))
      .map(c => {
        const values = Array.isArray(c.value) ? c.value.join(' / ') : c.value;
        return `${c.dimension} : ${c.operator === 'neq' || c.operator === 'not_in' ? 'non ' : ''}${values}`;
      });
    return kept.length > 0 ? kept.join(' ; ') : cond.text;
  });
}

/**
 * Questions d'un même `group_id` réunies en une étape (une décision annoncée,
 * un cas par question), dans l'ordre de l'audit. Sans `group_id`, une
 * question est seule dans son étape.
 */
export function groupQuestions(questions: Question[]): Question[][] {
  const groups: Question[][] = [];
  const byId = new Map<string, Question[]>();
  for (const q of questions) {
    const existing = q.groupId ? byId.get(q.groupId) : undefined;
    if (existing) { existing.push(q); continue; }
    const group = [q];
    groups.push(group);
    if (q.groupId) byId.set(q.groupId, group);
  }
  return groups;
}

/**
 * Les documents d'une analyse : ceux que l'analyse a lus (son inventaire, une archive comptant
 * pour chacun de ses fichiers), et les fichiers importés s'ils diffèrent. Tant que l'audit
 * charge (ou sans inventaire), les fichiers importés seuls.
 */
export function documentsLine(imported: number, audit: Audit | null): string {
  const files = `${imported} fichier${imported > 1 ? 's' : ''} importé${imported > 1 ? 's' : ''}`;
  if (!audit || audit.inventory.length === 0) return files;
  const read = readDocumentsCount(audit);
  const docs = `${read} document${read > 1 ? 's' : ''} lu${read > 1 ? 's' : ''}`;
  return read === imported ? docs : `${docs} (dans ${files})`;
}

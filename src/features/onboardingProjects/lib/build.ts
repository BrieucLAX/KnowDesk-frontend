/**
 * Rédaction des articles d'une base à construire (plan-construire-v1, lot C ; décisions du porteur
 * C-Q1 à C-Q6 du 2026-11-14), côté front.
 *
 * Depuis un plan prêt, Knowdesk rédige un article par article du plan, à partir de ses seules
 * sources. Un article ne contient que deux sortes de texte : des passages des documents, chacun
 * avec ses sources, et le texte de l'expert (« Autre réponse » ou précision d'une carte, D11),
 * mot pour mot, « saisi par l'expert le … ». Ce que les documents ne donnent pas n'est jamais
 * écrit : c'est la liste « Points non couverts par vos documents » (D3, D4). Ici : le contrat lu
 * (construction 0.1.0, telle que le back la rend), les étapes, les libellés en clair. Aucun code
 * (identifiant d'article, de carte, de raison) ne sort de ce module vers l'écran.
 */
import VERSIONS from './contract-versions.json';
import { sourceRef, type SourceRef } from './audit';
import type { PlanComment, PlanQuota, StepState } from './plan';

// ── Contrat du back (onboarding.builds.ts) ────────────────────

export type BuildStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface OnboardingBuild {
  id:            string;
  planId:        string;
  analysisId:    string;
  /** 1, 2… : chaque nouvelle rédaction du même plan. */
  generation:    number;
  status:        BuildStatus;
  /** Étape du pipeline, ou `storing` côté back. */
  stage:         string | null;
  /** Articles rédigés sur le total, pendant l'étape `build`. */
  done:          number;
  total:         number;
  /** Code seul, jamais de message. */
  errorCode:     string | null;
  decisionCount: number;
  createdAt:     string;
  submittedAt:   string | null;
  finishedAt:    string | null;
}

/** Ce que le back dit du lancement : permis, ou refusé avec son message (C-Q1 : réponses changées). */
export interface BuildLaunch { allowed: boolean; code?: string; message?: string }

export interface BuildsMeta { quota: PlanQuota; launch: BuildLaunch }

/** La rédaction telle que livrée (construction 0.1.0), et si elle se commente encore. */
export interface BuildContent {
  buildId:       string;
  planId:        string;
  schemaVersion: string;
  construction:  unknown;
  createdAt:     string;
  commentable:   boolean;
}

/** Un commentaire de la rédaction : sur un article, ou sur la rédaction entière (`subjectId: null`). */
export type BuildComment = PlanComment;

/** Rédactions que l'écran sait afficher, lues dans la copie de `contract-versions.json` du back. */
export const SUPPORTED_BUILD_SCHEMAS: readonly string[] = VERSIONS.builds.accepted;

export const isBuildActive = (b: Pick<OnboardingBuild, 'status'>) => b.status === 'queued' || b.status === 'running';

// ── Construction 0.1.0 : listes fermées du contrat, en clair ──

export type ToVerifyReason = 'sentence_below_quotes' | 'joined_passages' | 'dated_change_without_date';

/** Pourquoi une phrase gardée est « À vérifier ». */
export const TO_VERIFY_LABEL: Readonly<Record<ToVerifyReason, string>> = {
  sentence_below_quotes:     'vos documents ne la confirment pas mot pour mot.',
  joined_passages:           'cette phrase relie deux passages différents de vos documents.',
  dated_change_without_date: 'elle donne une nouvelle valeur sans sa date d\'effet.',
};

export type RemovedReason =
  | 'quote_not_verified' | 'value_without_source' | 'discarded_source' | 'discarded_value'
  | 'retired_source' | 'ended_measure' | 'introduction_without_content';

/**
 * Pourquoi un texte rédigé a été retiré de l'article. `{card}` est le titre de la carte dont la
 * réponse a écarté le passage (« Retenir … », « Plus tard », « Je confirme » sur une version).
 */
export const REMOVED_LABEL: Readonly<Record<RemovedReason, string>> = {
  quote_not_verified:           'aucune de ses sources ne se retrouve dans vos documents.',
  value_without_source:         'valeur qu\'aucune source citée ne donne.',
  discarded_source:             'passage écarté par votre réponse à la carte « {card} ».',
  discarded_value:              'valeur d\'un passage écarté par votre réponse à la carte « {card} ».',
  retired_source:               'passage d\'une version remplacée (carte « {card} »).',
  ended_measure:                'mesure terminée à la date de la rédaction.',
  introduction_without_content: 'titre ou introduction sans texte gardé après lui.',
};

export type EmptyReason = 'no_source' | 'all_removed' | 'invalid_output';

/** Pourquoi un article n'a aucun texte. */
export const EMPTY_LABEL: Readonly<Record<EmptyReason, string>> = {
  no_source:      'toutes ses sources sont écartées par vos réponses',
  all_removed:    'tout le texte rédigé a été retiré, faute de source',
  invalid_output: 'la rédaction de cet article a échoué',
};

export type UncoveredKind =
  | 'card_without_article' | 'missing_information' | 'value_without_source' | 'article_without_text' | 'unresolved_card';

/** Les groupes de « Points non couverts par vos documents », dans l'ordre de l'écran (C-Q3 : cartes en tête). */
export const UNCOVERED_GROUPS: ReadonlyArray<{ title: string; kinds: readonly UncoveredKind[] }> = [
  { title: 'Cartes sans article',                    kinds: ['card_without_article'] },
  { title: 'Informations absentes de vos documents', kinds: ['missing_information', 'value_without_source'] },
  { title: 'Articles sans texte',                    kinds: ['article_without_text'] },
  { title: 'Points non tranchés',                    kinds: ['unresolved_card'] },
];

export const UNCOVERED_KINDS: readonly UncoveredKind[] = UNCOVERED_GROUPS.flatMap(g => g.kinds);

// ── Construction 0.1.0, lue ───────────────────────────────────

export interface ExpertText { cardId: string; text: string; enteredOn: string }

export interface BuiltBlock {
  id:       string;
  kind:     'intertitle' | 'text' | 'list' | 'table';
  fromExpert: boolean;
  text:     string;
  items:    string[];
  header:   string[];
  rows:     string[][];
  sources:  SourceRef[];
  expert:   ExpertText | null;
  toVerify: Array<{ reason: ToVerifyReason; passages: string[] }>;
}

export interface RemovedBlock { id: string; text: string; reason: RemovedReason; cardId: string | null; passages: SourceRef[] }

export interface BuiltArticle {
  subjectId:   string;
  title:       string;
  question:    string;
  audience:    string | null;
  cardIds:     string[];
  written:     boolean;
  emptyReason: EmptyReason | null;
  blocks:      BuiltBlock[];
  removed:     RemovedBlock[];
}

export interface BuiltChapter { id: string; title: string; articles: BuiltArticle[] }

export interface UncoveredPoint {
  id:        string;
  kind:      UncoveredKind;
  subjectId: string | null;
  cardId:    string | null;
  expert:    ExpertText | null;
  /** Le texte retiré, pour une valeur sans source. */
  removedText: string | null;
  /** Ce que la rédaction signale comme manquant (ses mots, jamais dans la base). */
  note:      string | null;
  passages:  SourceRef[];
}

export interface Construction {
  chapters:        BuiltChapter[];
  uncovered:       UncoveredPoint[];
  preparationDate: string;
  articleCount:    number;
  writtenCount:    number;
  toVerifyCount:   number;
  expertCount:     number;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const objs  = (v: unknown): Obj[] => (Array.isArray(v) ? v.filter(isObj) : []);
const str   = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null);
const strs  = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const refs  = (v: unknown): SourceRef[] => (Array.isArray(v) ? v : []).map(sourceRef).filter((r): r is SourceRef => r !== null);

const oneOf = <T extends string>(allowed: readonly T[], v: unknown): T | null =>
  (typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : null);

const TO_VERIFY = Object.keys(TO_VERIFY_LABEL) as ToVerifyReason[];
const REMOVED = Object.keys(REMOVED_LABEL) as RemovedReason[];
const EMPTY = Object.keys(EMPTY_LABEL) as EmptyReason[];
const KINDS = ['intertitle', 'text', 'list', 'table'] as const;

function expertOf(v: unknown): ExpertText | null {
  if (!isObj(v)) return null;
  const text = strOrNull(v.text);
  const enteredOn = strOrNull(v.entered_on);
  return text && enteredOn ? { cardId: str(v.card_id), text, enteredOn } : null;
}

function blockOf(b: Obj): BuiltBlock | null {
  const kind = oneOf(KINDS, b.kind);
  if (kind === null) return null;
  return {
    id:         str(b.id),
    kind,
    fromExpert: b.origin === 'expert',
    text:       str(b.text),
    items:      strs(b.items),
    header:     strs(b.header),
    rows:       (Array.isArray(b.rows) ? b.rows : []).map(strs),
    sources:    refs(b.sources),
    expert:     b.origin === 'expert' ? expertOf(b.expert) : null,
    toVerify:   objs(b.to_verify).flatMap(m => {
      const reason = oneOf(TO_VERIFY, m.reason);
      return reason ? [{ reason, passages: strs(m.passages) }] : [];
    }),
  };
}

/** La rédaction stockée (construction 0.1.0, validée par le back), lue pour l'écran ; null si illisible. */
export function readConstruction(raw: unknown): Construction | null {
  if (!isObj(raw) || !Array.isArray(raw.articles) || !Array.isArray(raw.chapters)) return null;
  const articles = new Map(objs(raw.articles).map(a => [str(a.subject_id), a]));
  const removedText = new Map<string, string>();
  const chapters: BuiltChapter[] = objs(raw.chapters).map(c => ({
    id:       str(c.id),
    title:    str(c.title),
    articles: strs(c.subject_ids).map(id => articles.get(id)).filter(isObj).map(a => {
      const removed: RemovedBlock[] = objs(a.removed).flatMap(r => {
        const reason = oneOf(REMOVED, r.reason);
        if (reason === null) return [];
        removedText.set(str(r.id), str(r.text));
        return [{ id: str(r.id), text: str(r.text), reason, cardId: strOrNull(r.card_id), passages: refs(r.passages) }];
      });
      return {
        subjectId:   str(a.subject_id),
        title:       str(a.title),
        question:    str(a.question),
        audience:    strOrNull(a.audience),
        cardIds:     strs(a.card_ids),
        written:     a.status === 'written',
        emptyReason: oneOf(EMPTY, a.empty_reason),
        blocks:      objs(a.blocks).map(blockOf).filter((b): b is BuiltBlock => b !== null),
        removed,
      };
    }),
  }));
  const uncovered: UncoveredPoint[] = objs(raw.uncovered).flatMap(p => {
    const kind = oneOf(UNCOVERED_KINDS, p.kind);
    if (kind === null) return [];
    const removedId = strOrNull(p.removed_block_id);
    return [{
      id:          str(p.id),
      kind,
      subjectId:   strOrNull(p.subject_id),
      cardId:      strOrNull(p.card_id),
      expert:      expertOf(p.expert),
      removedText: removedId ? removedText.get(removedId) ?? null : null,
      note:        strOrNull(p.note),
      passages:    refs(p.passages),
    }];
  });
  const all = chapters.flatMap(c => c.articles);
  const blocks = all.flatMap(a => a.blocks);
  return {
    chapters,
    uncovered,
    preparationDate: str(raw.preparation_date),
    articleCount:    all.length,
    writtenCount:    all.filter(a => a.written).length,
    toVerifyCount:   blocks.reduce((n, b) => n + b.toVerify.reduce((k, m) => k + m.passages.length, 0), 0),
    expertCount:     blocks.filter(b => b.fromExpert).length,
  };
}

/** La raison d'un retrait, en clair, avec le titre de la carte qui l'a décidé. */
export function removedLabel(r: Pick<RemovedBlock, 'reason' | 'cardId'>, cardTitle: (id: string) => string): string {
  return REMOVED_LABEL[r.reason].replace('{card}', r.cardId ? cardTitle(r.cardId) : 'une carte');
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** « 6 articles · 2 phrases à vérifier · 1 texte saisi par l'expert · 5 points non couverts ». */
export function buildSummary(c: Construction): string {
  return [
    plural(c.articleCount, 'article', 'articles'),
    plural(c.toVerifyCount, 'phrase à vérifier', 'phrases à vérifier'),
    plural(c.expertCount, 'texte saisi par l\'expert', 'textes saisis par l\'expert'),
    plural(c.uncovered.length, 'point non couvert', 'points non couverts'),
  ].join(' · ');
}

// ── Progression ───────────────────────────────────────────────

export interface BuildStep { label: string; stages: readonly string[]; counts?: boolean }

/**
 * Étapes affichées : le pipeline relit les documents (`download`, puis la lecture), rédige les
 * articles (`build`, i / n), contrôle les sources (`checks`), puis le back enregistre (`storing`).
 * Une étape inconnue compte comme la lecture des documents.
 */
export const BUILD_STEPS: readonly BuildStep[] = [
  { label: 'Lecture de vos documents', stages: ['download', 'parsing', 'images'], counts: true },
  { label: 'Rédaction des articles',   stages: ['build'], counts: true },
  { label: 'Contrôle des sources',     stages: ['checks'] },
  { label: 'Enregistrement',           stages: ['storing'] },
];

export function buildStepStates(b: Pick<OnboardingBuild, 'status' | 'stage'>): StepState[] {
  if (b.status === 'succeeded') return BUILD_STEPS.map(() => 'done');
  if (b.stage === null) return BUILD_STEPS.map(() => 'pending');
  const found = BUILD_STEPS.findIndex(s => s.stages.includes(b.stage!));
  const current = found === -1 ? 0 : found;
  return BUILD_STEPS.map((_, i) => {
    if (i < current) return 'done';
    if (i > current) return 'pending';
    return b.status === 'running' ? 'current' : 'pending';
  });
}

const FAILURES = new Map<string, string>(Object.entries({
  build_not_supported:  'La rédaction n\'est pas encore disponible : réessayez plus tard.',
  time_limit_exceeded:  'La rédaction a dépassé sa durée maximale.',
  call_limit_exceeded:  'La rédaction a atteint le nombre maximal d\'appels à l\'IA.',
  download_failed:      'Le service n\'a pas pu relire vos documents.',
  checksum_mismatch:    'Un document a changé pendant son envoi.',
  document_too_large:   'Un document dépasse la taille acceptée.',
  rate_limited:         'Le service d\'IA est saturé pour le moment.',
  provider_error:       'Le service d\'IA est indisponible pour le moment.',
  model_output_invalid: 'L\'IA a renvoyé une réponse inexploitable.',
  pipeline_restarted:   'Le service a redémarré pendant la rédaction.',
  input_missing:        'Un document, le plan ou vos réponses ont disparu avant l\'envoi.',
  cancelled:            'La rédaction a été annulée.',
  corpus_too_large:     'Les documents dépassent le volume de texte accepté.',
}));

/** Échecs de notre fait : relancer n'y change rien tout de suite, nous sommes prévenus. */
const OUR_SIDE = new Set(['provider_auth', 'pipeline_invalid_error_code', 'build_invalid', 'invalid_request', 'schema_mismatch', 'internal_error']);

const NOT_COUNTED = 'Elle ne compte pas dans votre quota : vous pouvez la relancer.';

export function buildFailureMessage(code: string | null): string {
  if (code !== null && OUR_SIDE.has(code)) {
    return 'La rédaction a échoué à cause d\'un problème de notre côté. Nous sommes prévenus. Elle ne compte pas dans votre quota.';
  }
  const what = (code !== null && FAILURES.get(code)) || 'La rédaction a échoué.';
  return `${what} ${NOT_COUNTED}`;
}

/** Ce que dit le champ de commentaire de la rédaction : une remarque pour l'équipe, jamais dans la base. */
export const BUILD_COMMENT_HINT = 'Pour l\'équipe Knowdesk seulement : ce commentaire n\'entre jamais dans la base.';

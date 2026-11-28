import type {
  DocumentTypeDef, DocumentTypeKey, DocumentUsage, ImportSummary, OnboardingDocument,
} from '../types';

/*
 * Étape 1 « Documents » (US 1.1 à 1.3, contrat du lot 2a) : libellés, groupes par type, ligne de
 * date et phrases de l'écran. Les valeurs du contrat ne changent pas ; seuls les libellés sont ici.
 */

/** Repli quand `GET …/document-types` ne répond pas : les 7 types du contrat, à leur rang par défaut. */
export const DEFAULT_DOCUMENT_TYPES: readonly DocumentTypeDef[] = [
  { key: 'conditions_contrats',    name: 'Conditions générales et contrats', rank: 1, internalRule: 'plus_recent' },
  { key: 'tarifs',                 name: 'Tarifs',                           rank: 2, internalRule: 'plus_recent' },
  { key: 'descriptions_offres',    name: 'Descriptions d\'offres',           rank: 3, internalRule: 'plus_recent' },
  { key: 'procedures_internes',    name: 'Procédures internes',              rank: 4, internalRule: 'plus_recent' },
  { key: 'supports_formation',     name: 'Supports de formation',            rank: 5, internalRule: 'plus_recent' },
  { key: 'communications_clients', name: 'Communications aux clients',       rank: 6, internalRule: 'plus_recent' },
  { key: 'base_faq',               name: 'Base ou FAQ existante',            rank: 7, internalRule: 'plus_recent' },
];

export const USAGE_LABEL: Readonly<Record<DocumentUsage, string>> = { client: 'Client', interne: 'Interne' };

/** Mention KnowDesk de la liste (US 1.2), mot pour mot. */
export const LIST_MENTION = 'Types, usages et dates proposés par KnowDesk · modifiables';

/** Aide sous le titre de la liste (US 1.2), mot pour mot ; « interne » est en gras à l'écran. */
export const USAGE_HELP = 'L\'usage indique si un document peut servir à répondre aux clients. Le contenu d\'un document interne ne sera repris que dans les parties réservées aux conseillers.';

/** Groupes montrés avant « Voir tous les documents » (maquette Documents). */
export const VISIBLE_GROUPS = 3;

/** Relecture de la liste tant qu'un classement est en cours. */
export const CLASSIFICATION_POLL_MS = 3000;

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;
export const documentsCount = (n: number) => plural(n, 'document', 'documents');

/** Les types reçus, triés par rang ; une liste vide ou incomplète retombe sur la liste figée. */
export function sortedTypes(types: readonly DocumentTypeDef[] | null | undefined): DocumentTypeDef[] {
  const known = new Set(DEFAULT_DOCUMENT_TYPES.map(t => t.key));
  const valid = (types ?? []).filter(t => known.has(t.key));
  return [...(valid.length ? valid : DEFAULT_DOCUMENT_TYPES)].sort((a, b) => a.rank - b.rank);
}

/** Le nom à afficher : le titre lisible de KnowDesk, sinon le nom du fichier. */
export const displayName = (d: Pick<OnboardingDocument, 'title' | 'filename'>) => d.title?.trim() || d.filename;

export const isPending = (d: Pick<OnboardingDocument, 'classificationStatus'>) =>
  d.classificationStatus === 'en_attente' || d.classificationStatus === 'en_cours';

export const isReadable = (d: Pick<OnboardingDocument, 'state'>) => d.state !== 'illisible';

/** Un document classé (fini ou en échec) qui demande à l'utilisateur de vérifier son type. */
export const needsCheck = (d: OnboardingDocument) => isReadable(d) && !isPending(d) && d.toVerify;

/** Aucune date : cherchée sans résultat, retirée par l'utilisateur, ou jamais cherchée (classement en échec). */
export const lacksDate = (d: OnboardingDocument) => isReadable(d) && !isPending(d) && !d.date;

// ── Dates ─────────────────────────────────────────────────────

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** `2026-09-01` → « 1er sept. 2026 » ; une valeur mal formée est rendue telle quelle. */
export function formatDocumentDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const day = Number(m[3]);
  const month = MONTHS[Number(m[2]) - 1];
  if (!month || day < 1 || day > 31) return iso;
  return `${day === 1 ? '1er' : day} ${month} ${m[1]}`;
}

export interface DateLine {
  /** La date en clair, ou null : « Aucune date trouvée » (en jaune). */
  date:   string | null;
  /** D'où vient la date (« trouvée dans le titre ») ; null : saisie par l'utilisateur, ou pas de date. */
  origin: string | null;
  /** Le lien qui ouvre le sélecteur. */
  action: 'Modifier' | 'Ajouter une date (facultatif)';
}

/** Ligne de date d'un document (US 1.3, contrat section 6). */
export function dateLine(d: Pick<OnboardingDocument, 'date' | 'dateOrigin' | 'datePage'>): DateLine {
  if (!d.date) return { date: null, origin: null, action: 'Ajouter une date (facultatif)' };
  const origin = d.dateOrigin === 'titre' ? 'trouvée dans le titre'
    : d.dateOrigin === 'corps' ? (d.datePage != null ? `trouvée dans le document, page ${d.datePage}` : 'trouvée dans le document')
    : null;
  return { date: formatDocumentDate(d.date), origin, action: 'Modifier' };
}

// ── Groupes ───────────────────────────────────────────────────

export interface DocumentGroup {
  key:   DocumentTypeKey;
  name:  string;
  docs:  OnboardingDocument[];
}

export interface DocumentsView {
  /** Documents lus, classés ou non. */
  readable:   OnboardingDocument[];
  /** Classement pas encore rendu (en attente, en cours). */
  pending:    OnboardingDocument[];
  /** Classés mais sans type (classement en échec, ou type laissé vide) : à choisir. */
  untyped:    OnboardingDocument[];
  /** Un groupe par type qui a au moins un document, dans l'ordre des rangs. */
  groups:     DocumentGroup[];
  unreadable: OnboardingDocument[];
  toVerify:   number;
  withoutDate: number;
}

/** Range les documents pour l'écran : en cours de classement, sans type, puis par type au rang. */
export function documentsView(documents: readonly OnboardingDocument[], types: readonly DocumentTypeDef[]): DocumentsView {
  const readable = documents.filter(isReadable);
  const pending = readable.filter(isPending);
  const classified = readable.filter(d => !isPending(d));
  const groups = sortedTypes(types)
    .map(t => ({ key: t.key, name: t.name, docs: classified.filter(d => d.documentType === t.key) }))
    .filter(g => g.docs.length > 0);
  const typed = new Set(groups.flatMap(g => g.docs.map(d => d.id)));
  return {
    readable,
    pending,
    untyped:     classified.filter(d => !typed.has(d.id)),
    groups,
    unreadable:  documents.filter(d => !isReadable(d)),
    toVerify:    readable.filter(needsCheck).length,
    withoutDate: readable.filter(lacksDate).length,
  };
}

/**
 * Les groupes repliés derrière « Voir tous les documents » : au-delà des trois premiers, sauf
 * ceux qui portent un document « À vérifier » (l'encadré y renvoie), toujours montrés.
 */
export function foldedGroups(groups: readonly DocumentGroup[]): Set<DocumentTypeKey> {
  return new Set(groups.slice(VISIBLE_GROUPS).filter(g => !g.docs.some(needsCheck)).map(g => g.key));
}

/** « Voir tous les documents · 24 autres de 4 types ». */
export function showAllLabel(folded: readonly DocumentGroup[]): string {
  const n = folded.reduce((sum, g) => sum + g.docs.length, 0);
  return `Voir tous les documents · ${n} ${n > 1 ? 'autres' : 'autre'} de ${plural(folded.length, 'type', 'types')}`;
}

// ── Phrases ───────────────────────────────────────────────────

/** L'encadré en haut de la liste (maquette Documents) ; null : rien à signaler. */
export function attentionSentence(toVerify: number, withoutDate: number): string | null {
  const parts = [
    toVerify > 0 && (toVerify > 1 ? `${toVerify} documents sont difficiles à classer` : '1 document est difficile à classer'),
    withoutDate > 0 && (withoutDate > 1 ? `${withoutDate} documents n'ont pas de date` : '1 document n\'a pas de date'),
  ].filter(Boolean);
  if (!parts.length) return null;
  return `${parts.join(' et ')}. Vérifiez aussi les dates trouvées : elles servent à savoir quel document est le plus récent.`;
}

/** Note de la barre d'action : « 33 documents classés · 2 à vérifier ». */
export function actionNote(view: Pick<DocumentsView, 'readable' | 'pending' | 'toVerify'>): string | null {
  const total = view.readable.length;
  if (total === 0) return null;
  if (view.pending.length > 0) {
    return `Classement en cours · ${total - view.pending.length} sur ${total}`;
  }
  const classified = `${total} ${total > 1 ? 'documents classés' : 'document classé'}`;
  return view.toVerify > 0 ? `${classified} · ${view.toVerify} à vérifier` : classified;
}

export interface SummaryPart {
  text: string;
  /** Le document illisible vers lequel mène le lien (le premier, s'il y en a plusieurs). */
  linkTo?: string;
}

const MAX_IGNORED_NAMES = 5;

/** Ligne de synthèse après un import : « 5 doublons écartés · 1 document illisible » (lien), fichiers ignorés. */
export function summaryParts(summary: ImportSummary | null | undefined): SummaryPart[] {
  if (!summary) return [];
  const parts: SummaryPart[] = [];
  const dup = summary.duplicates.length;
  if (dup > 0) parts.push({ text: dup > 1 ? `${dup} doublons écartés` : '1 doublon écarté' });
  const unr = summary.unreadable.length;
  if (unr > 0) parts.push({ text: unr > 1 ? `${unr} documents illisibles` : '1 document illisible', linkTo: summary.unreadable[0].id });
  const ign = summary.unsupported.length;
  if (ign > 0) {
    const names = summary.unsupported.slice(0, MAX_IGNORED_NAMES).map(u => `« ${u.filename} »`).join(', ');
    const more = ign > MAX_IGNORED_NAMES ? ` et ${ign - MAX_IGNORED_NAMES} autres` : '';
    parts.push({ text: `${ign > 1 ? `${ign} fichiers ignorés` : '1 fichier ignoré'} (format non accepté) : ${names}${more}` });
  }
  return parts;
}

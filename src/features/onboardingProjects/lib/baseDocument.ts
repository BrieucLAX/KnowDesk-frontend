/**
 * La base corrigée mise en page pour la relecture, sur le modèle de la page validée par l'experte
 * (KnowDesk-pipeline, out/redaction/correction-v2) : chaque fiche dans l'ordre, chaque section à
 * sa place, le texte d'origine comparé au texte corrigé ligne à ligne, puis mot à mot.
 *
 * Les lignes sont découpées comme le pipeline (`correction/sections.py`, `parse_lines`) : un
 * titre, une image, une ligne de tableau, un élément de liste, ou un paragraphe dont les lignes
 * sont jointes. Les changements de la base (`changes`) sont décrits sur ces mêmes lignes : on
 * les retrouve par leur texte pour savoir quelle modification les couvre.
 */
import type { BaseCorrection, CorrectedSection, Modification } from './correction';

export type LineType = 'heading' | 'image' | 'row' | 'item' | 'text';

export interface Line { type: LineType; text: string }

function classify(raw: string): LineType {
  const line = raw.trim();
  if (line.startsWith('#')) return 'heading';
  if (line.startsWith('![')) return 'image';
  if (line.startsWith('|')) return 'row';
  if (/^([-*+•]|\d+[.)])\s/.test(line)) return 'item';
  return 'text';
}

export function parseLines(markdown: string): Line[] {
  const out: Line[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length > 0) out.push({ type: 'text', text: paragraph.map(p => p.trim()).join(' ') });
    paragraph = [];
  };
  for (const raw of markdown.split('\n')) {
    if (!raw.trim()) { flush(); continue; }
    const type = classify(raw);
    if (type === 'text') { paragraph.push(raw); continue; }
    flush();
    out.push({ type, text: raw.trim() });
  }
  flush();
  return out;
}

// ── Comparaison ───────────────────────────────────────────────

/** Plus longue sous-suite commune : la table des longueurs, de la fin vers le début. */
function lcsTable<T>(a: T[], b: T[], eq: (x: T, y: T) => boolean): Uint32Array[] {
  const t = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      t[i][j] = eq(a[i], b[j]) ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
    }
  }
  return t;
}

export type WordPart = { op: 'equal' | 'insert' | 'delete'; text: string };

/** Au-delà, la comparaison mot à mot coûterait trop : on montre l'ancien texte barré, puis le nouveau. */
const MAX_WORD_CELLS = 400_000;

/** Mot à mot : les mots retirés, les mots ajoutés, les autres tels quels (espaces compris). */
export function wordDiff(before: string, after: string): WordPart[] {
  const a = before.split(/(\s+)/).filter(Boolean);
  const b = after.split(/(\s+)/).filter(Boolean);
  if (a.length * b.length > MAX_WORD_CELLS) {
    return [{ op: 'delete', text: before }, { op: 'equal', text: ' ' }, { op: 'insert', text: after }];
  }
  const t = lcsTable(a, b, (x, y) => x === y);
  const out: WordPart[] = [];
  const push = (op: WordPart['op'], text: string) => {
    const last = out[out.length - 1];
    if (last && last.op === op) last.text += text;
    else out.push({ op, text });
  };
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { push('equal', a[i]); i++; j++; }
    else if (t[i + 1][j] >= t[i][j + 1]) push('delete', a[i++]);
    else push('insert', b[j++]);
  }
  while (i < a.length) push('delete', a[i++]);
  while (j < b.length) push('insert', b[j++]);
  return out;
}

export type Block =
  | { op: 'equal'; line: Line }
  | { op: 'insert' | 'delete'; line: Line; modificationId: string | null }
  /** `rewritten` : plus de la moitié des mots changent ; on montre l'ancien barré, puis le nouveau. */
  | { op: 'modify'; before: Line; after: Line; modificationId: string | null; rewritten: boolean };

/** Au-delà, un paragraphe est réécrit : le mot à mot deviendrait illisible. */
export const REWRITE_SHARE = 0.5;

/** Part des mots qui changent entre deux textes (0 : identiques, 1 : rien en commun). */
export function changedShare(before: string, after: string): number {
  const count = (t: string) => t.split(/\s+/).filter(Boolean).length;
  const longest = Math.max(count(before), count(after));
  if (longest === 0) return 0;
  const kept = wordDiff(before, after).filter(p => p.op === 'equal').reduce((n, p) => n + count(p.text), 0);
  return 1 - kept / longest;
}

/**
 * Les lignes de la section, dans l'ordre : inchangées, ajoutées, retirées, ou modifiées (une ligne
 * retirée suivie d'une ligne ajoutée du même type, comparées mot à mot).
 */
export function sectionBlocks(section: CorrectedSection): Block[] {
  const a = parseLines(section.original_markdown);
  const b = parseLines(section.corrected_markdown);
  const t = lcsTable(a, b, (x, y) => x.type === y.type && x.text === y.text);
  const raw: Array<{ op: 'equal' | 'insert' | 'delete'; line: Line }> = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i].type === b[j].type && a[i].text === b[j].text) { raw.push({ op: 'equal', line: b[j] }); i++; j++; }
    else if (t[i + 1][j] >= t[i][j + 1]) raw.push({ op: 'delete', line: a[i++] });
    else raw.push({ op: 'insert', line: b[j++] });
  }
  while (i < a.length) raw.push({ op: 'delete', line: a[i++] });
  while (j < b.length) raw.push({ op: 'insert', line: b[j++] });

  const owner = changeOwner(section);
  const blocks: Block[] = [];
  for (let k = 0; k < raw.length;) {
    if (raw[k].op === 'equal') { blocks.push({ op: 'equal', line: raw[k].line }); k++; continue; }
    // Une suite de changements : les lignes retirées, puis les lignes ajoutées.
    const deleted: Line[] = [], inserted: Line[] = [];
    while (k < raw.length && raw[k].op !== 'equal') {
      (raw[k].op === 'delete' ? deleted : inserted).push(raw[k].line);
      k++;
    }
    const used = new Set<number>();
    for (const d of deleted) {
      const n = inserted.findIndex((x, idx) => !used.has(idx) && x.type === d.type);
      if (n === -1) { blocks.push({ op: 'delete', line: d, modificationId: owner(d.text, '') }); continue; }
      used.add(n);
      const rewritten = changedShare(plainText(d), plainText(inserted[n])) > REWRITE_SHARE;
      blocks.push({ op: 'modify', before: d, after: inserted[n], modificationId: owner(d.text, inserted[n].text), rewritten });
    }
    inserted.forEach((x, idx) => {
      if (!used.has(idx)) blocks.push({ op: 'insert', line: x, modificationId: owner('', x.text) });
    });
  }
  return blocks;
}

/**
 * La modification qui couvre un changement : celle du changement gardé au même texte, sinon,
 * quand la section n'en porte qu'une, celle-là.
 */
function changeOwner(section: CorrectedSection): (before: string, after: string) => string | null {
  const kept = (section.changes ?? []).filter(c => c.kept && c.modification_id);
  const only = (section.modification_ids ?? []).length === 1 ? section.modification_ids![0] : null;
  return (before, after) => {
    const exact = kept.find(c => c.before === before && c.after === after)
      ?? (after ? kept.find(c => c.after === after) : undefined)
      ?? (before ? kept.find(c => c.before === before) : undefined);
    return exact?.modification_id ?? only;
  };
}

export const isChanged = (blocks: Block[]) => blocks.some(b => b.op !== 'equal');

/** La section commence par son propre titre, inchangé : il suffit de l'afficher une fois. */
export function ownHeading(blocks: Block[]): boolean {
  return blocks[0]?.op === 'equal' && blocks[0].line.type === 'heading';
}

/** Le texte proposé par une modification dans une section : ses lignes ajoutées ou modifiées. */
export function proposedLines(blocks: Block[], modificationId: string): string[] {
  return blocks.flatMap(b => {
    if (b.op === 'insert' && b.modificationId === modificationId) return [b.line.text];
    if (b.op === 'modify' && b.modificationId === modificationId) return [b.after.text];
    return [];
  });
}

// ── Mise en page de la base ───────────────────────────────────

export interface SectionView {
  key:           string;
  /** Titre de la section dans sa fiche : son chemin de titres, sans le titre de la fiche. */
  title:         string;
  blocks:        Block[];
  changed:       boolean;
  modificationIds: string[];
  conventionIds:   string[];
}

export interface SheetView { documentId: string; title: string; fileName: string; sections: SectionView[] }

const stripHashes = (s: string) => s.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();

/** Un chemin de titres qui n'est que le nom du fichier (une section avant le premier titre). */
const isFileName = (s: string) => /\.(md|docx|pdf|pptx|txt)$/i.test(s.trim());

export function sectionTitle(section: Pick<CorrectedSection, 'heading_path'>, sheetTitle: string): string {
  const path = section.heading_path.map(stripHashes).filter(p => p && !isFileName(p));
  const rest = path[0] === sheetTitle ? path.slice(1) : path;
  return rest.length > 0 ? rest.join(' › ') : sheetTitle;
}

export function sheetViews(base: BaseCorrection): SheetView[] {
  const modsBySection = new Map<string, string[]>();
  for (const m of base.modifications) {
    for (const k of m.section_keys) modsBySection.set(k, [...(modsBySection.get(k) ?? []), m.id]);
  }
  const convsBySection = new Map<string, string[]>();
  for (const c of base.conventions ?? []) {
    for (const k of c.section_keys) convsBySection.set(k, [...(convsBySection.get(k) ?? []), c.id]);
  }
  return base.sheets.map(sheet => {
    const fileName = sheet.document_path.split('/').pop() || sheet.document_path;
    // Le titre d'une fiche : son premier titre, jamais son nom de fichier.
    const firstHeading = sheet.sections
      .flatMap(s => parseLines(s.original_markdown))
      .find(l => l.type === 'heading');
    const firstPath = sheet.sections.map(s => stripHashes(s.heading_path[0] ?? '')).find(p => p && !isFileName(p));
    const title = (firstHeading ? stripHashes(firstHeading.text) : '') || firstPath || fileName;
    return {
      documentId: sheet.document_id,
      title,
      fileName,
      sections: sheet.sections.map(s => {
        const blocks = sectionBlocks(s);
        return {
          key:             s.key,
          title:           sectionTitle(s, title),
          blocks,
          changed:         isChanged(blocks),
          modificationIds: [...new Set([...(s.modification_ids ?? []), ...(modsBySection.get(s.key) ?? [])])],
          conventionIds:   [...new Set([...(s.convention_ids ?? []), ...(convsBySection.get(s.key) ?? [])])],
        };
      }),
    };
  });
}

/** Titre complet d'une section, par sa clé : « Fiche › Section ». */
export function sectionTitleIndex(sheets: SheetView[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const sheet of sheets) {
    for (const s of sheet.sections) index.set(s.key, s.title === sheet.title ? sheet.title : `${sheet.title} › ${s.title}`);
  }
  return index;
}

/**
 * Où s'affiche la carte de chaque modification : dans la première section, dans l'ordre du
 * document, qu'elle vise ; les suivantes y renvoient. Une modification sans section connue va
 * dans la liste du haut.
 */
export function modificationPlacement(sheets: SheetView[], modifications: Modification[]) {
  const first = new Map<string, string>();
  for (const sheet of sheets) {
    for (const s of sheet.sections) {
      for (const id of s.modificationIds) if (!first.has(id)) first.set(id, s.key);
    }
  }
  return {
    firstSection: first,
    unplaced: modifications.filter(m => !first.has(m.id)),
  };
}

// ── Texte d'une ligne ─────────────────────────────────────────

export type Inline = { text: string; strong: boolean };

/** Le texte d'une ligne en morceaux : le gras (`**…**`) à part ; les liens réduits à leur texte. */
export function inlineParts(text: string): Inline[] {
  const plain = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  const parts: Inline[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  for (let m = re.exec(plain); m; m = re.exec(plain)) {
    if (m.index > last) parts.push({ text: plain.slice(last, m.index), strong: false });
    parts.push({ text: m[1], strong: true });
    last = m.index + m[0].length;
  }
  if (last < plain.length) parts.push({ text: plain.slice(last), strong: false });
  return parts;
}

/** Le texte lisible d'une ligne, marques Markdown retirées (pour la comparaison mot à mot). */
export function plainText(line: Line): string {
  const t = line.text.replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  if (line.type === 'heading') return t.replace(/^#+\s*/, '');
  if (line.type === 'item') return t.replace(/^([-*+•])\s+/, '');
  return t;
}

export const headingLevel = (line: Line): number => Math.min(6, (/^#+/.exec(line.text)?.[0].length ?? 1));

/** Une ligne d'image : `![texte](image:img_…)` ; l'identifiant n'est pas affiché. */
export function imageOf(line: Line): { alt: string; imageId: string | null } {
  const m = /^!\[([^\]]*)\]\(([^)]*)\)/.exec(line.text);
  if (!m) return { alt: '', imageId: null };
  const target = m[2].trim();
  return { alt: m[1].trim(), imageId: target.startsWith('image:') ? target.slice('image:'.length) : null };
}

/** Les cellules d'une ligne de tableau ; null pour la ligne de séparation (`|---|---|`). */
export function rowCells(line: Line): string[] | null {
  const inner = line.text.trim().replace(/^\|/, '').replace(/\|$/, '');
  const cells = inner.split('|').map(c => c.trim());
  if (cells.every(c => /^:?-{2,}:?$/.test(c))) return null;
  return cells;
}

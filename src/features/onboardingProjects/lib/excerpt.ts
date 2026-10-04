/**
 * Mise en forme d'un extrait cité : le texte des documents arrive converti en markdown, et un
 * extrait tiré d'un tableau garde ses barres verticales, ses lignes de tirets et son gras.
 *
 * Un groupe de lignes qui commencent par `|` devient un tableau (lignes et cellules) ; l'en-tête
 * n'est reconnu que s'il est suivi d'une ligne de tirets, car l'extrait n'est souvent qu'une ligne
 * ou quelques lignes du tableau. Le reste est du texte, sans les `**`. Le texte cité n'est pas
 * modifié : seul son balisage disparaît.
 */

export type ExcerptBlock =
  | { kind: 'text'; text: string }
  | { kind: 'table'; header: string[] | null; rows: string[][] };

const SEPARATOR = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/;

/** Le texte sans le gras markdown. */
export const stripMarkup = (s: string): string => s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*\*/g, '');

const isTableLine = (line: string) => line.trimStart().startsWith('|');

function cells(line: string): string[] {
  const inner = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return inner.split('|').map(c => stripMarkup(c.trim()));
}

function table(lines: string[]): ExcerptBlock | null {
  const hasHeader = lines.length > 1 && SEPARATOR.test(lines[1].trim());
  const rows = lines.filter(l => !SEPARATOR.test(l.trim())).map(cells);
  if (rows.length === 0) return null;
  const width = Math.max(...rows.map(r => r.length));
  const padded = rows.map(r => [...r, ...Array<string>(width - r.length).fill('')]);
  return hasHeader ? { kind: 'table', header: padded[0], rows: padded.slice(1) } : { kind: 'table', header: null, rows: padded };
}

export function parseExcerpt(excerpt: string): ExcerptBlock[] {
  const blocks: ExcerptBlock[] = [];
  const lines = excerpt.split('\n');
  let i = 0;
  while (i < lines.length) {
    const tableLines = isTableLine(lines[i]);
    const group: string[] = [];
    while (i < lines.length && isTableLine(lines[i]) === tableLines) group.push(lines[i++]);
    if (tableLines) {
      const t = table(group);
      if (t) blocks.push(t);
    } else {
      const text = stripMarkup(group.join('\n')).trim();
      if (text) blocks.push({ kind: 'text', text });
    }
  }
  return blocks;
}

const BREAKS_LINE = /^\s*([-*+•>]\s|\d+[.)]\s|#|\|)/;

/**
 * Texte de la fiche de cadrage, pour l'affichage seulement : les retours à la ligne saisis dans
 * un paragraphe coupent la phrase ; on rejoint ces lignes par une espace. Une ligne vide sépare
 * toujours deux paragraphes, et une ligne de liste, de titre ou de tableau garde sa ligne. Le
 * texte enregistré n'est pas modifié.
 */
export function joinParagraphLines(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n[ \t]*\n/)
    .map(paragraph => paragraph.split('\n').reduce((out, line, i, lines) => {
      if (i === 0) return line.trimEnd();
      if (!line.trim()) return out;
      // Après un titre ou une ligne de tableau, la ligne suivante garde aussi sa place.
      const keep = BREAKS_LINE.test(line) || /^\s*(#|\|)/.test(lines[i - 1]);
      return keep ? `${out}\n${line.trimEnd()}` : `${out} ${line.trim()}`;
    }, ''))
    .join('\n\n');
}

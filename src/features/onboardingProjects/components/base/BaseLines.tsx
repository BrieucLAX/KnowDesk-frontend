import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../../../../shared/components/ui/Button';
import { Modal } from '../../../../shared/components/ui/Modal';
import {
  headingLevel, imageOf, inlineParts, markVerify, plainText, rowCells, verifyRanges, wordDiff, type Block, type Line,
} from '../../lib/baseDocument';
import { itemLabel } from '../../lib/correction';
import { AuditImage } from '../audit/AuditSource';

/**
 * Une phrase « À vérifier » (0.4.0) : surlignée, et dite aux lecteurs d'écran. Les morceaux
 * voisins d'une même phrase se suivent sans répéter la mention.
 */
function Verify({ first, children }: { first: boolean; children: React.ReactNode }) {
  return <mark className="obp-base-verify">{first && <span className="sr-only">À vérifier : </span>}{children}</mark>;
}

/** Le premier morceau de chaque suite de morceaux « À vérifier ». */
const startsVerify = (parts: ReadonlyArray<{ verify: boolean }>, i: number) => parts[i].verify && !parts[i - 1]?.verify;

/** Texte d'une ligne : le gras gardé ; les phrases « À vérifier » surlignées. */
function InlineText({ text, ranges = [] }: { text: string; ranges?: ReadonlyArray<[number, number]> }) {
  const parts = markVerify(inlineParts(text), ranges);
  return (
    <>
      {parts.map((p, i) => {
        const node = p.strong ? <strong>{p.text}</strong> : p.text;
        return p.verify ? <Verify key={i} first={startsVerify(parts, i)}>{node}</Verify> : <React.Fragment key={i}>{node}</React.Fragment>;
      })}
    </>
  );
}

/** Mot à mot : les mots retirés barrés, les mots ajoutés surlignés ; les phrases « À vérifier » marquées. */
function WordDiff({ before, after, ranges = [] }: { before: string; after: string; ranges?: ReadonlyArray<[number, number]> }) {
  const parts = markVerify(wordDiff(before, after), ranges, p => p.op !== 'delete');
  return (
    <>
      {parts.map((p, i) => {
        const node = p.op === 'insert' ? <ins>{p.text}</ins> : p.op === 'delete' ? <del>{p.text}</del> : p.text;
        return p.verify ? <Verify key={i} first={startsVerify(parts, i)}>{node}</Verify> : <React.Fragment key={i}>{node}</React.Fragment>;
      })}
    </>
  );
}

/**
 * Une image de la base, servie par la route des images de l'analyse ; un clic l'agrandit dans une
 * fenêtre qui se referme par « Fermer », Échap ou un clic sur le fond, le focus rendu à l'image
 * (rejeu v6 : l'image agrandie sur place ne se refermait pas).
 */
function BaseImage({ line }: { line: Line }) {
  const { alt, imageId } = imageOf(line);
  const [zoom, setZoom] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const opened = useRef(false);
  // Refermée, le focus revient à l'image, même si le clic ne l'y avait pas mis (Safari).
  useEffect(() => {
    if (zoom) opened.current = true;
    else if (opened.current) opener.current?.focus();
  }, [zoom]);
  if (imageId === null) return <span className="obp-base-image-missing">Image conservée : {alt || 'image'}</span>;
  const label = alt || 'Image de la fiche';
  const close = () => setZoom(false);
  return (
    <figure className="obp-base-figure">
      <button ref={opener} type="button" className="obp-base-figure__open" onClick={() => setZoom(true)} aria-label="Agrandir l'image">
        <AuditImage imageId={imageId} alt={label} />
      </button>
      {alt && <figcaption>{alt}</figcaption>}
      {zoom && createPortal(
        <Modal title={label} onClose={close} size="lg" className="obp-base-zoom" showCloseButton={false}
          footer={<Button type="button" variant="primary" size="md" onClick={close}>Fermer</Button>}>
          <AuditImage imageId={imageId} alt={label} />
        </Modal>,
        document.body,
      )}
    </figure>
  );
}

const TAG_OP = { insert: 'ajout', delete: 'retrait', modify: 'modification' } as const;

/** Ce que la ligne devient : un titre, un élément de liste, un paragraphe ; le texte fourni à part. */
function LineShell({ line, children }: { line: Line; children: React.ReactNode }) {
  if (line.type === 'heading') return <p className={`obp-base-h obp-base-h--${headingLevel(line)}`}>{children}</p>;
  if (line.type === 'item') return <p className={`obp-base-item${/^[-*+•]\s/.test(line.text) ? ' obp-base-item--bullet' : ''}`}>{children}</p>;
  return <p className="obp-base-p">{children}</p>;
}

function Tag({ id }: { id: string | null }) {
  return id ? <span className="obp-base-tag">{itemLabel(id)}</span> : null;
}

function LineBlock({ block }: { block: Block }) {
  if (block.op === 'equal') {
    if (block.line.type === 'image') return <BaseImage line={block.line} />;
    return <LineShell line={block.line}><InlineText text={stripMarks(block.line)} /></LineShell>;
  }
  if (block.op === 'modify' && block.rewritten) {
    // Réécrit à plus de moitié : l'ancien paragraphe barré en entier, puis le nouveau.
    return (
      <>
        <LineBlock block={{ op: 'delete', line: block.before, modificationId: null }} />
        <LineBlock block={{ op: 'insert', line: block.after, modificationId: block.modificationId, toVerify: block.toVerify }} />
      </>
    );
  }
  if (block.op === 'modify') {
    return (
      <div className="obp-base-change obp-base-change--modify">
        <LineShell line={block.after}>
          <WordDiff before={plainText(block.before)} after={plainText(block.after)}
            ranges={verifyRanges(plainText(block.after), block.toVerify, block.after.type)} /> <Tag id={block.modificationId} />
        </LineShell>
      </div>
    );
  }
  return (
    <div className={`obp-base-change obp-base-change--${block.op}`}>
      <span className="sr-only">{TAG_OP[block.op]} : </span>
      {block.line.type === 'image'
        ? <BaseImage line={block.line} />
        : (
          <LineShell line={block.line}>
            <InlineText text={stripMarks(block.line)}
              ranges={block.op === 'insert' ? verifyRanges(plainText(block.line), block.toVerify, block.line.type) : []} /> <Tag id={block.modificationId} />
          </LineShell>
        )}
      {block.line.type === 'image' && <Tag id={block.modificationId} />}
    </div>
  );
}

/** Le texte d'une ligne sans ses marques de titre ni de puce, gras gardé. */
function stripMarks(line: Line): string {
  if (line.type === 'heading') return line.text.replace(/^#+\s*/, '');
  if (line.type === 'item') return line.text.replace(/^([-*+•])\s+/, '');
  return line.text;
}

const rowOf = (b: Block): Line => (b.op === 'modify' ? b.after : b.line);

/**
 * Les phrases « À vérifier » d'une ligne de tableau, cellule par cellule ; un passage qu'aucune
 * cellule ne contient marque toute la ligne.
 */
function cellRanges(b: Block, cells: string[]): Array<Array<[number, number]>> {
  const passages = b.op === 'equal' || b.op === 'delete' ? undefined : b.toVerify;
  if (!passages?.length) return cells.map(() => []);
  const plain = cells.map(c => plainText({ type: 'text', text: c }));
  const found = passages.map(p => plain.findIndex(c => c.includes(plainText({ type: 'text', text: p.trim() }).trim())));
  if (found.includes(-1)) return plain.map(c => [[0, c.length]]);
  return plain.map((c, i) => verifyRanges(c, passages.filter((_, k) => found[k] === i), 'text'));
}

/** Lignes de tableau consécutives, rendues en tableau ; chaque ligne garde sa marque de changement. */
function TableBlock({ blocks }: { blocks: Block[] }) {
  const rows = blocks.filter(b => rowCells(rowOf(b)) !== null);
  return (
    <div className="obp-base-table-wrap">
      <table className="obp-base-table">
        <tbody>
          {rows.map((b, i) => {
            if (b.op === 'modify') {
              const before = rowCells(b.before) ?? [];
              const after = rowCells(b.after) ?? [];
              const aligned = before.length === after.length;
              const ranges = cellRanges(b, after);
              return (
                <tr key={i} className="obp-base-row obp-base-row--modify">
                  {after.map((cell, c) => (
                    <td key={c}>
                      {aligned
                        ? <WordDiff before={before[c].replace(/\*\*/g, '')} after={cell.replace(/\*\*/g, '')} ranges={ranges[c]} />
                        : <ins><InlineText text={cell} ranges={ranges[c]} /></ins>}
                    </td>
                  ))}
                  <td className="obp-base-row__tag"><Tag id={b.modificationId} /></td>
                </tr>
              );
            }
            const cells = rowCells(b.line) ?? [];
            const ranges = cellRanges(b, cells);
            return (
              <tr key={i} className={`obp-base-row${b.op === 'equal' ? '' : ` obp-base-row--${b.op}`}`}>
                {cells.map((cell, c) => <td key={c}><InlineText text={cell} ranges={ranges[c]} /></td>)}
                {b.op !== 'equal' && <td className="obp-base-row__tag"><span className="sr-only">{TAG_OP[b.op]} </span><Tag id={b.modificationId} /></td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Le texte d'une section, dans l'ordre, avec ses changements. */
export function BaseLines({ blocks }: { blocks: Block[] }) {
  const out: React.ReactNode[] = [];
  for (let i = 0; i < blocks.length;) {
    if (rowOf(blocks[i]).type === 'row') {
      const start = i;
      while (i < blocks.length && rowOf(blocks[i]).type === 'row') i++;
      out.push(<TableBlock key={start} blocks={blocks.slice(start, i)} />);
      continue;
    }
    out.push(<LineBlock key={i} block={blocks[i]} />);
    i++;
  }
  return <div className="obp-base-doc">{out}</div>;
}

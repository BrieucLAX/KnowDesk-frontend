import React, { useState } from 'react';
import {
  headingLevel, imageOf, inlineParts, plainText, rowCells, wordDiff, type Block, type Line,
} from '../../lib/baseDocument';
import { itemLabel } from '../../lib/correction';
import { AuditImage } from '../audit/AuditSource';

/** Texte d'une ligne inchangée : le gras gardé. */
function InlineText({ text }: { text: string }) {
  return <>{inlineParts(text).map((p, i) => (p.strong ? <strong key={i}>{p.text}</strong> : <React.Fragment key={i}>{p.text}</React.Fragment>))}</>;
}

/** Mot à mot : les mots retirés barrés, les mots ajoutés surlignés. */
function WordDiff({ before, after }: { before: string; after: string }) {
  return (
    <>
      {wordDiff(before, after).map((p, i) => {
        if (p.op === 'insert') return <ins key={i}>{p.text}</ins>;
        if (p.op === 'delete') return <del key={i}>{p.text}</del>;
        return <React.Fragment key={i}>{p.text}</React.Fragment>;
      })}
    </>
  );
}

/** Une image de la base, servie par la route des images de l'analyse ; un clic l'agrandit. */
function BaseImage({ line }: { line: Line }) {
  const { alt, imageId } = imageOf(line);
  const [zoom, setZoom] = useState(false);
  if (imageId === null) return <span className="obp-base-image-missing">Image conservée : {alt || 'image'}</span>;
  return (
    <figure className={`obp-base-figure${zoom ? ' obp-base-figure--zoom' : ''}`}>
      <button type="button" className="obp-base-figure__open" onClick={() => setZoom(z => !z)}
        aria-label={zoom ? 'Réduire l\'image' : 'Agrandir l\'image'}>
        <AuditImage imageId={imageId} alt={alt || 'Image de la fiche'} />
      </button>
      {alt && <figcaption>{alt}</figcaption>}
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
        <LineBlock block={{ op: 'insert', line: block.after, modificationId: block.modificationId }} />
      </>
    );
  }
  if (block.op === 'modify') {
    return (
      <div className="obp-base-change obp-base-change--modify">
        <LineShell line={block.after}><WordDiff before={plainText(block.before)} after={plainText(block.after)} /> <Tag id={block.modificationId} /></LineShell>
      </div>
    );
  }
  return (
    <div className={`obp-base-change obp-base-change--${block.op}`}>
      <span className="sr-only">{TAG_OP[block.op]} : </span>
      {block.line.type === 'image'
        ? <BaseImage line={block.line} />
        : <LineShell line={block.line}><InlineText text={stripMarks(block.line)} /> <Tag id={block.modificationId} /></LineShell>}
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
              return (
                <tr key={i} className="obp-base-row obp-base-row--modify">
                  {after.map((cell, c) => (
                    <td key={c}>{aligned ? <WordDiff before={before[c].replace(/\*\*/g, '')} after={cell.replace(/\*\*/g, '')} /> : <ins>{cell}</ins>}</td>
                  ))}
                  <td className="obp-base-row__tag"><Tag id={b.modificationId} /></td>
                </tr>
              );
            }
            const cells = rowCells(b.line) ?? [];
            return (
              <tr key={i} className={`obp-base-row${b.op === 'equal' ? '' : ` obp-base-row--${b.op}`}`}>
                {cells.map((cell, c) => <td key={c}><InlineText text={cell} /></td>)}
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

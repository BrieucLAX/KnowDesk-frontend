import React from 'react';
import { parseExcerpt } from '../../lib/excerpt';

/** Le texte d'un extrait cité : un tableau en lignes et cellules, le reste en texte, sans balisage. */
export function ExcerptText({ excerpt }: { excerpt: string }) {
  const blocks = parseExcerpt(excerpt);
  if (blocks.length === 1 && blocks[0].kind === 'text') return <>{blocks[0].text}</>;
  return (
    <>
      {blocks.map((b, i) => b.kind === 'text' ? <p key={i} className="obp-excerpt-text">{b.text}</p> : (
        <div key={i} className="obp-excerpt-table">
          <table>
            {b.header && <thead><tr>{b.header.map((c, j) => <th key={j} scope="col">{c}</th>)}</tr></thead>}
            <tbody>
              {b.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}>{c}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
      ))}
    </>
  );
}

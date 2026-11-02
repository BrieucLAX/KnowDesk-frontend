import { fileName, type Audit } from '../../lib/audit';
import { analyzedDocuments, analyzedDocumentsSummary, citedByText, type AnalyzedDocument, type Reading } from '../../lib/reading';
import { DocName, FileName } from '../audit/DocName';

/**
 * « Documents analysés » : tout l'inventaire de l'audit, sous le nombre de documents lus, replié.
 * Pour chaque document, son nom de fichier, son type et son statut en clair : lu (et le nombre de
 * cartes qui le citent, 0 compris), écarté comme doublon d'un autre fichier, ou non lu avec sa
 * raison ; et ses images non lues s'il y en a. L'experte voit ainsi ce qui a été lu, y compris ce
 * qui l'a été sans donner de carte.
 */
export function AnalyzedDocuments({ audit, reading }: { audit: Audit; reading: Pick<Reading, 'cards' | 'unreadImages'> }) {
  const docs = analyzedDocuments(audit, reading);
  if (docs.length === 0) return null;
  return (
    <details className="obp-audit-folded obp-docs-analyzed">
      <summary>Documents analysés <span className="obp-muted">· {analyzedDocumentsSummary(docs)}</span></summary>
      <ul className="obp-docs-analyzed__list" aria-label="Documents analysés">
        {docs.map(d => (
          <li key={d.documentId || d.path} className={`obp-docs-analyzed__row obp-docs-analyzed__row--${d.status.kind}`}>
            {d.documentId
              ? <DocName audit={audit} id={d.documentId} className="obp-docs-analyzed__name" />
              : <FileName name={fileName(d.path)} path={d.path} className="obp-docs-analyzed__name" />}
            <span className="obp-docs-analyzed__type">{d.type}</span>
            <span className="obp-docs-analyzed__status"><StatusText audit={audit} doc={d} /></span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function StatusText({ audit, doc }: { audit: Audit; doc: AnalyzedDocument }) {
  const images = doc.unreadImages > 0
    ? `, ${doc.unreadImages} ${doc.unreadImages > 1 ? 'images non lues' : 'image non lue'}`
    : '';
  const s = doc.status;
  if (s.kind === 'read') return <>Lu, {citedByText(s.cards)}{images}</>;
  if (s.kind === 'unread') return <>Non lu : {s.reason}{images}</>;
  if (!s.of) return <>Écarté : doublon d'un autre fichier</>;
  const kept = audit.inventory.find(i => i.path === s.of);
  return (
    <>
      Écarté : doublon de{' '}
      {kept?.documentId ? <DocName audit={audit} id={kept.documentId} /> : <FileName name={fileName(s.of)} path={s.of} />}
    </>
  );
}


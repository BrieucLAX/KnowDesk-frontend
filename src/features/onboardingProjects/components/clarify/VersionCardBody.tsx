import React from 'react';
import type { Audit } from '../../lib/audit';
import {
  formatDay, toQuote, VERSION_REUSE_SENTENCE, type RangedCard, type ReadingCard, type VersionDifference, type VersionDocument,
} from '../../lib/reading';
import { DocName, DocNames } from '../audit/DocName';
import { ClarifyQuote } from './ReadingCardView';

const dateRead = (d: VersionDocument) => (d.dateRead ? `date lue : ${formatDay(d.dateRead)}` : 'aucune date lue');

/** Un document et sa date lue, montrée : elle ne décide rien (décision du porteur du 2026-11-03). */
function VersionDocumentLine({ audit, title, document }: { audit: Audit; title: string; document: VersionDocument }) {
  return <li>{title} : <DocName audit={audit} id={document.documentId} /> ({dateRead(document)})</li>;
}

/** Une valeur qui change : l'objet, l'ancienne et la nouvelle valeur, chacune avec sa citation vérifiée. */
function Differences({ audit, title, rows }: { audit: Audit; title: string; rows: VersionDifference[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="obp-clarify-version__section" aria-label={title}>
      <h5 className="obp-clarify-side__title">{title}</h5>
      <ul className="obp-clarify-version__list">
        {rows.map(d => {
          const old = toQuote(d.oldQuote);
          const next = toQuote(d.newQuote);
          return (
            <li key={`${d.subject}:${d.oldValue}:${d.newValue}`} className="obp-clarify-version__row">
              <p className="obp-clarify-version__change"><strong>{d.subject}</strong> : {d.oldValue} → {d.newValue}</p>
              {old && <ClarifyQuote audit={audit} quote={old} />}
              {next && <ClarifyQuote audit={audit} quote={next} />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Les cartes ligne par ligne rangées sous la carte de versions : plus posées, toujours consultables. */
function Ranged({ audit, cards }: { audit: Audit; cards: RangedCard[] }) {
  if (cards.length === 0) return null;
  return (
    <details className="obp-clarify-version__ranged">
      <summary>
        {cards.length > 1
          ? `${cards.length} cartes ligne par ligne rangées sous celle-ci, qui ne sont plus posées`
          : '1 carte ligne par ligne rangée sous celle-ci, qui n\'est plus posée'}
      </summary>
      <ul>
        {cards.map(c => <li key={c.cardId}>{c.subject} (<DocNames audit={audit} ids={c.documentIds} />)</li>)}
      </ul>
    </details>
  );
}

const DATES_NOTE = 'Ces dates sont lues dans les documents, à titre d\'information : elles ne décident rien, c\'est votre réponse qui compte.';

/**
 * Le corps d'une carte de versions (audit 0.16.0, décision D10) : une affirmation à confirmer, son
 * titre étant son sujet. Ni côtés ni « Analyse proposée par l'IA » : la carte est écrite par le code.
 */
export function VersionCardBody({ audit, card }: { audit: Audit; card: ReadingCard }) {
  if (card.replacement) {
    const r = card.replacement;
    return (
      <div className="obp-clarify-version">
        <ul className="obp-clarify-version__documents">
          <VersionDocumentLine audit={audit} title="Nouvelle version" document={r.replacingDocument} />
          <VersionDocumentLine audit={audit} title="Version remplacée" document={r.replacedDocument} />
        </ul>
        <p className="obp-clarify-version__note">{DATES_NOTE}</p>
        <Differences audit={audit} title="Les différences entre les deux versions" rows={r.differences} />
        <Ranged audit={audit} cards={r.rangedCards} />
      </div>
    );
  }
  if (card.versionReuse) {
    const r = card.versionReuse;
    return (
      <div className="obp-clarify-version">
        <p className="obp-clarify-version__sentence">{VERSION_REUSE_SENTENCE}</p>
        <ul className="obp-clarify-version__documents">
          <VersionDocumentLine audit={audit} title="Ce document" document={r.document} />
          <VersionDocumentLine audit={audit} title="Version remplacée" document={r.replacedDocument} />
          <VersionDocumentLine audit={audit} title="Nouvelle version" document={r.replacingDocument} />
        </ul>
        <p className="obp-clarify-version__note">{DATES_NOTE}</p>
        <Differences audit={audit} title="Les valeurs à mettre à jour" rows={r.updates} />
        <Ranged audit={audit} cards={r.rangedCards} />
      </div>
    );
  }
  return null;
}

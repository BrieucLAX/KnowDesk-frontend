import React from 'react';
import { documentName, type Audit } from '../../lib/audit';
import {
  isBlocking, NATURES, sideDocuments, toQuotes, type ModelAnalysis, type Quote, type ReadingCard,
} from '../../lib/reading';
import { AuditSource } from '../audit/AuditSource';

/**
 * Une citation vérifiée : passage d'un document (nom de fichier, emplacement, extrait verbatim ;
 * image à côté d'un extrait lu par vision), ou de la fiche de cadrage.
 */
export function ClarifyQuote({ audit, quote, imageShown = false }: { audit: Audit; quote: Quote; imageShown?: boolean }) {
  if (quote.kind === 'briefing') {
    return (
      <figure className="obp-audit-source obp-clarify-briefing">
        <figcaption className="obp-audit-source__where">
          <span className="obp-audit-source__doc">Fiche de cadrage</span>
        </figcaption>
        <blockquote className="obp-audit-source__excerpt">{quote.excerpt}</blockquote>
      </figure>
    );
  }
  return (
    <div className="obp-clarify-quote">
      <AuditSource audit={audit} source={quote.source} imageShown={imageShown} />
      {quote.realigned && (
        <p className="obp-clarify-quote__note">Citation recalée sur le texte exact de la source.</p>
      )}
    </div>
  );
}

/**
 * « Analyse proposée par l'IA » : le texte du modèle, à part des citations. Il aide à répondre ;
 * ce n'est ni un extrait des documents ni une réponse, et il n'entre jamais dans la base.
 */
export function ModelAnalysisBox({ analysis }: { analysis: ModelAnalysis }) {
  return (
    <aside className="obp-clarify-ai" aria-label="Analyse proposée par l'IA">
      <p className="obp-clarify-ai__title">Analyse proposée par l'IA</p>
      <p className="obp-clarify-ai__note">
        Rédigée par l'IA pour vous aider à répondre : ce n'est pas un extrait de vos documents, et elle n'entre pas dans la base.
      </p>
      <dl className="obp-clarify-ai__body">
        {analysis.subject && <div><dt>Sujet</dt><dd>{analysis.subject}</dd></div>}
        {analysis.reason && <div><dt>Pourquoi c'est à clarifier</dt><dd>{analysis.reason}</dd></div>}
        {analysis.proposal && <div><dt>Ce que l'IA propose</dt><dd>{analysis.proposal}</dd></div>}
      </dl>
    </aside>
  );
}

interface ReadingCardViewProps {
  audit: Audit;
  card:  ReadingCard;
  /** « Carte 3 sur 9 ». */
  title: string;
}

/**
 * Une carte : sa nature, les documents par leur nom de fichier, les citations vérifiées de
 * chaque côté, puis l'analyse de l'IA, à part.
 */
export function ReadingCardView({ audit, card, title }: ReadingCardViewProps) {
  const name = (id: string) => documentName(audit, id);
  const blocking = isBlocking(card);
  const nonBlockingVision = NATURES[card.nature].blocking && !blocking;
  return (
    <article className="obp-audit-card obp-clarify-card" aria-label={title}>
      <header className="obp-audit-card__head">
        <h4 className="obp-audit-card__title">{title}</h4>
        <span className={`obp-audit-tag obp-clarify-nature obp-clarify-nature--${card.nature}`}>{NATURES[card.nature].label}</span>
        {blocking && <span className="obp-audit-tag obp-audit-tag--high">Bloque la publication</span>}
        {nonBlockingVision && <span className="obp-audit-tag">Ne bloque pas : lecture d'image à confirmer</span>}
      </header>

      <p className="obp-clarify-docs">
        <span className="obp-muted">Documents : </span>
        {card.documentIds.map(name).join(', ')}
      </p>

      <div className={`obp-clarify-sides${card.sides.length > 1 ? ' obp-clarify-sides--two' : ''}`}>
        {card.sides.map(side => {
          const quotes = toQuotes(side.quotes);
          return (
            <section key={side.label} className="obp-clarify-side" aria-label={`Côté ${side.label}`}>
              <h5 className="obp-clarify-side__title">
                Côté {side.label}
                <span className="obp-muted"> · {sideDocuments(quotes, name).join(', ')}</span>
              </h5>
              {quotes.map((q, i) => {
                // Une même image n'est affichée qu'une fois par côté, à côté de son premier extrait.
                const imageId = q.kind === 'document' && q.source.visionUnverified ? q.source.imageId : null;
                const shown = imageId !== null && quotes.slice(0, i).some(p => p.kind === 'document' && p.source.imageId === imageId);
                return <ClarifyQuote key={i} audit={audit} quote={q} imageShown={shown} />;
              })}
            </section>
          );
        })}
      </div>

      <ModelAnalysisBox analysis={card.analysis} />
    </article>
  );
}

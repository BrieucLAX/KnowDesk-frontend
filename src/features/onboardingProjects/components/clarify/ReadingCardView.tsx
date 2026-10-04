import React from 'react';
import type { Audit } from '../../lib/audit';
import {
  isBlocking, isBriefingOnly, missingSide, NATURES, toQuotes, unverifiedReasonLabel, type ModelAnalysis, type Quote,
  type ReadingCard,
} from '../../lib/reading';
import { joinParagraphLines } from '../../lib/excerpt';
import { AuditSource } from '../audit/AuditSource';
import { AiFileName, DocNames } from '../audit/DocName';
import { ExcerptText } from '../audit/ExcerptText';

/**
 * Une citation vérifiée : passage d'un document (nom de fichier, emplacement, extrait verbatim ;
 * image à côté d'un extrait lu par vision), ou de la fiche de cadrage (sans son libellé quand le
 * côté s'intitule déjà « Votre fiche de cadrage »), ses lignes d'un même paragraphe rejointes.
 */
export function ClarifyQuote({ audit, quote, imageShown = false, bare = false }: {
  audit: Audit; quote: Quote; imageShown?: boolean; bare?: boolean;
}) {
  if (quote.kind === 'briefing') {
    return (
      <figure className="obp-audit-source obp-clarify-briefing">
        {!bare && (
          <figcaption className="obp-audit-source__where">
            <span className="obp-audit-source__doc">Votre fiche de cadrage</span>
          </figcaption>
        )}
        <blockquote className="obp-audit-source__excerpt"><ExcerptText excerpt={joinParagraphLines(quote.excerpt)} /></blockquote>
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
  audit:    Audit;
  card:     ReadingCard;
  /** Libellé de repérage : le sujet de la carte (cardTitle). */
  title:    string;
  /** « Carte 3 sur 9 ». */
  position: string;
}

/**
 * Une carte : son sujet, sa nature, les documents par leur nom de fichier, les citations
 * vérifiées de chaque côté (le nom du fichier au-dessus de chaque citation), puis l'analyse de
 * l'IA, à part. Une carte qui compare deux côtés dont l'un n'a pas été retrouvé le dit.
 */
export function ReadingCardView({ audit, card, title, position }: ReadingCardViewProps) {
  const blocking = isBlocking(card);
  const nonBlockingVision = NATURES[card.nature].blocking && !blocking;
  const missing = missingSide(card);
  const refused = missing ? card.unverifiedQuotes.filter(u => u.side === missing) : [];
  return (
    <article className="obp-audit-card obp-clarify-card" aria-label={position}>
      <p className="obp-clarify-card__position">{position}</p>
      <header className="obp-audit-card__head">
        <h4 className="obp-audit-card__title">{title}</h4>
        <span className={`obp-audit-tag obp-clarify-nature obp-clarify-nature--${card.nature}`}>{NATURES[card.nature].label}</span>
        {blocking && <span className="obp-audit-tag obp-audit-tag--high">Bloque la publication</span>}
        {nonBlockingVision && <span className="obp-audit-tag">Ne bloque pas : lecture d'image à confirmer</span>}
      </header>

      <p className="obp-clarify-docs">
        <span className="obp-muted">Documents : </span>
        <DocNames audit={audit} ids={card.documentIds} />
      </p>

      <div className={`obp-clarify-sides${card.sides.length > 1 || missing ? ' obp-clarify-sides--two' : ''}`}>
        {card.sides.map(side => {
          const quotes = toQuotes(side.quotes);
          const briefing = isBriefingOnly(quotes);
          const label = briefing ? 'Votre fiche de cadrage' : `Côté ${side.label}`;
          return (
            <section key={side.label} className={`obp-clarify-side${briefing ? ' obp-clarify-side--briefing' : ''}`} aria-label={label}>
              <h5 className="obp-clarify-side__title">{label}</h5>
              {briefing && <p className="obp-clarify-side__note">Ce que vous avez écrit, pas un document de la base.</p>}
              {quotes.map((q, i) => {
                // Une même image n'est affichée qu'une fois par côté, à côté de son premier extrait.
                const imageId = q.kind === 'document' && q.source.visionUnverified ? q.source.imageId : null;
                const shown = imageId !== null && quotes.slice(0, i).some(p => p.kind === 'document' && p.source.imageId === imageId);
                return <ClarifyQuote key={i} audit={audit} quote={q} imageShown={shown} bare={briefing} />;
              })}
            </section>
          );
        })}
        {missing && (
          <section className="obp-clarify-side obp-clarify-side--missing" aria-label="Passage non retrouvé">
            <p className="obp-clarify-side__title">L'autre passage cité n'a pas pu être retrouvé dans vos documents.</p>
            <p className="obp-muted">
              Seul le passage affiché a été vérifié : la question porte sur lui.
            </p>
            {refused.map((u, i) => (
              <p key={i} className="obp-clarify-unverified">
                Texte rendu par l'IA ({u.document && <><AiFileName path={u.document} />, </>}{u.location && `${u.location}, `}{unverifiedReasonLabel(u.reason)}),
                qui n'est pas une citation : {u.text}
              </p>
            ))}
          </section>
        )}
      </div>

      <ModelAnalysisBox analysis={card.analysis} />
    </article>
  );
}

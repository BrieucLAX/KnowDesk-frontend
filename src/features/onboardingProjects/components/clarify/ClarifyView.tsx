import React from 'react';
import { Button }   from '../../../../shared/components/ui/Button';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';
import { docNaming, fileName, type Audit } from '../../lib/audit';
import {
  CARD_STATUS_LABEL, cardProgress, cardStatus, cardTitle, clarifySummary, describeSummary, groupByNature,
  modelNatureLabel, NATURES, orderedCards, rejectionReasonLabel, toQuotes, unavailableLabel, unreadFiles, unverifiedCounts, unverifiedReasonLabel, type Reading,
} from '../../lib/reading';
import type { Arbitration } from '../../hooks/useArbitration';
import { AiFileName, DocNames, FileName } from '../audit/DocName';
import { ClarifyQuote, ModelAnalysisBox } from './ReadingCardView';
import { CurrentAnswer } from './CardAnswers';

interface ClarifyViewProps {
  audit:       Audit;
  reading:     Reading;
  arbitration: Arbitration;
  /** Ouvre la session sur une carte (null : la première à traiter). */
  onOpen:      (cardId: string | null) => void;
}

const STATUS_CLASS = { open: 'todo', answered: 'decided', later: 'later' } as const;

/**
 * Vue d'ensemble de l'audit 0.8.0 : le nombre de cartes annoncé et son résumé (cartes par nature,
 * dont celles qui bloquent la publication), les cartes regroupées par nature et nommées par leur
 * sujet, les notes temporaires à part, et le volet replié « Détails de l'analyse » (points
 * écartés, citations non vérifiées, fichiers non lus). Une détection que la lecture ne produit
 * pas encore n'apparaît pas dans la vue d'ensemble, jamais comme « 0 » : seul le volet de
 * détails la mentionne, en clair.
 */
export function ClarifyView({ audit, reading, arbitration, onOpen }: ClarifyViewProps) {
  const ordered = orderedCards(reading.cards);
  const groups = groupByNature(reading.cards);
  const docs = docNaming(audit);
  const { state } = arbitration;
  const ready = state.status === 'ready';
  const current = state.status === 'ready' ? state.current : new Map();
  const arbitrable = state.status === 'ready' && state.arbitrable;
  const p = cardProgress(reading.cards, current);
  const notesUnavailable = reading.unavailableDetections.includes('temporary_notes');
  const unread = unreadFiles(audit);
  const unverifiedTotal = Object.values(reading.unverifiedQuotes).reduce<number>((n, c) => n + (c ?? 0), 0);

  return (
    <div className="obp-audit obp-clarify">
      <section className="obp-audit-section" aria-labelledby="obp-clarify-title">
        <h3 id="obp-clarify-title" className="obp-section-title">
          {reading.cards.length === 0
            ? 'Aucune carte à clarifier'
            : `${reading.cards.length} ${reading.cards.length > 1 ? 'cartes' : 'carte'} à clarifier`}
        </h3>
        <div className="obp-clarify-summary">
          {describeSummary(clarifySummary(reading.cards, current), ready).map(line => <p key={line}>{line}</p>)}
          {!notesUnavailable && (
            <p className="obp-muted">Notes temporaires : {reading.temporaryNotes.length}</p>
          )}
        </div>
        {state.status === 'loading' && <Skeleton className="obp-arb-entry__loading" />}
        {ready && reading.cards.length > 0 && (
          <div className="obp-arb-entry">
            <Button variant="primary" size="md" onClick={() => onOpen(null)}>
              {!arbitrable ? 'Consulter les cartes' : current.size > 0 ? 'Reprendre' : 'Commencer'}
            </Button>
            <span className="obp-muted">
              {p.answered} sur {p.total} {p.total > 1 ? 'cartes répondues' : 'carte répondue'}
              {p.later > 0 ? `, ${p.later} pour plus tard` : ''}
            </span>
          </div>
        )}
        {ready && !arbitrable && (
          <p className="obp-arb-entry obp-arb-entry--readonly" role="status">
            Audit d'une analyse précédente : ses réponses restent consultables, mais ne se modifient plus.
          </p>
        )}
      </section>

      {groups.map(g => (
        <section key={g.nature} className="obp-audit-section" aria-label={NATURES[g.nature].plural}>
          <h3 className="obp-section-title">{NATURES[g.nature].plural} <span className="obp-count">{g.cards.length}</span></h3>
          <ul className="obp-audit-list">
            {g.cards.map(c => {
              const decision = current.get(c.id);
              const st = cardStatus(decision);
              return (
                <li key={c.id} className="obp-clarify-row">
                  <button type="button" className="obp-clarify-row__open" onClick={() => onOpen(c.id)}>
                    <span className="obp-clarify-row__title">{cardTitle(c, ordered.indexOf(c) + 1)}</span>
                    <span className="obp-clarify-row__docs"><DocNames audit={audit} ids={c.documentIds} /></span>
                    {ready && <span className={`obp-arb__status obp-arb__status--${STATUS_CLASS[st]}`}>{CARD_STATUS_LABEL[st]}</span>}
                  </button>
                  {decision && <CurrentAnswer card={c} current={decision} docs={docs} />}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {!notesUnavailable && (
        <section className="obp-audit-section" aria-labelledby="obp-clarify-notes">
          <h3 id="obp-clarify-notes" className="obp-section-title">Notes temporaires</h3>
          {reading.temporaryNotes.length === 0 ? (
            <p className="obp-muted">Aucune note temporaire.</p>
          ) : (
            <ul className="obp-audit-list">
              {reading.temporaryNotes.map(n => (
                <li key={n.id} className="obp-audit-card">
                  <p className="obp-audit-card__title">
                    {n.window.start || n.window.end
                      ? `Du ${n.window.start ?? '…'} au ${n.window.end ?? '…'}`
                      : 'Période non précisée'}
                    <span className="obp-muted"> · rien à trancher</span>
                  </p>
                  {toQuotes(n.quotes).map((q, i) => <ClarifyQuote key={i} audit={audit} quote={q} />)}
                  <ModelAnalysisBox analysis={n.analysis} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <details className="obp-audit-folded">
        <summary>Détails de l'analyse</summary>
        <div className="obp-audit-section">
          <h4 className="obp-audit-item__title">Points écartés</h4>
          {reading.rejectedPoints.length === 0 ? (
            <p className="obp-muted">Aucun point écarté.</p>
          ) : (
            <ul className="obp-audit-list">
              {reading.rejectedPoints.map(r => (
                <li key={r.rank} className="obp-audit-item">
                  <p className="obp-audit-item__title">
                    {modelNatureLabel(r.nature)} · {rejectionReasonLabel(r.reason)}
                  </p>
                  {r.documents.length > 0 && (
                    <p className="obp-muted">
                      Documents nommés par l'IA : {r.documents.map((d, j) => <React.Fragment key={j}>{j > 0 && ', '}<AiFileName path={d} /></React.Fragment>)}
                    </p>
                  )}
                  {toQuotes(r.briefingQuotes).map((q, i) => <ClarifyQuote key={i} audit={audit} quote={q} />)}
                  {r.unverifiedQuotes.map((u, i) => (
                    <p key={i} className="obp-clarify-unverified">
                      Texte rendu par l'IA (<AiFileName path={u.document} />, {unverifiedReasonLabel(u.reason)}), qui n'est pas une citation : {u.text}
                    </p>
                  ))}
                  <ModelAnalysisBox analysis={r.analysis} />
                </li>
              ))}
            </ul>
          )}

          <h4 className="obp-audit-item__title">Citations non vérifiées</h4>
          {unverifiedTotal === 0 ? (
            <p className="obp-muted">Toutes les citations de l'IA ont été retrouvées dans les documents.</p>
          ) : (
            <>
              <p className="obp-muted">
                Ces citations rendues par l'IA n'ont pas été retrouvées telles quelles dans les documents : elles ne sont
                jamais montrées comme des citations.
              </p>
              <ul className="obp-clarify-counts">
                {unverifiedCounts(reading.unverifiedQuotes).map(([reason, n]) => (
                  <li key={reason}>{n} {unverifiedReasonLabel(reason)}</li>
                ))}
              </ul>
            </>
          )}

          <h4 className="obp-audit-item__title">Fichiers non lus</h4>
          {unread.length === 0 ? (
            <p className="obp-muted">Tous les fichiers importés ont été lus.</p>
          ) : (
            <>
              <p className="obp-muted">
                L'analyse n'a pas lu ces fichiers : aucune carte ne s'appuie sur eux.
              </p>
              <ul className="obp-clarify-counts">
                {unread.map(f => <li key={f.path}><FileName name={fileName(f.path)} path={f.path} /> : {f.reason}</li>)}
              </ul>
            </>
          )}

          {reading.unavailableDetections.length > 0 && (
            <>
              <h4 className="obp-audit-item__title">Ce que l'analyse ne repère pas encore</h4>
              <ul className="obp-clarify-counts">
                {reading.unavailableDetections.map(d => <li key={d}>{unavailableLabel(d)}</li>)}
              </ul>
            </>
          )}
        </div>
      </details>
    </div>
  );
}

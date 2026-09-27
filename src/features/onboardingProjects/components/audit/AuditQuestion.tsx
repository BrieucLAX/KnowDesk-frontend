import React from 'react';
import { optionSources, proposedCondition, type Audit, type Question } from '../../lib/audit';
import { impactLabel, questionTypeLabel, VISION_NOTE } from '../../lib/auditLabels';
import { AuditSource } from './AuditSource';

interface AuditQuestionGroupProps {
  audit:  Audit;
  /** Questions d'une même étape (même `group_id`), dans l'ordre de l'audit. */
  group:  Question[];
  /** Titre de l'étape, par exemple « Décision 2 ». */
  title:  string;
  /** Cas à confirmer : la condition proposée par la détection est montrée. */
  showProposedCondition?: boolean;
}

/**
 * Une étape de l'audit, en lecture seule : chaque question, ses options dans
 * l'ordre proposé (la source qui fait le plus foi d'abord) et les extraits
 * qui les appuient.
 */
export function AuditQuestionGroup({ audit, group, title, showProposedCondition = false }: AuditQuestionGroupProps) {
  const first = group[0];
  return (
    <article className="obp-audit-card" aria-label={title}>
      <header className="obp-audit-card__head">
        <h4 className="obp-audit-card__title">{title}</h4>
        <span className="obp-audit-tag">{questionTypeLabel(first.type)}</span>
        <span className={`obp-audit-tag obp-audit-tag--${first.impact.level || 'unknown'}`}>{impactLabel(first.impact.level)}</span>
      </header>
      {group.map(q => (
        <section key={q.id} className="obp-audit-question">
          <p className="obp-audit-question__text">{q.question || q.subject}</p>
          {showProposedCondition && (() => {
            const condition = proposedCondition(audit, q);
            return condition && <p className="obp-muted">Condition qui séparerait les cas : {condition.text}</p>;
          })()}
          <ol className="obp-audit-options">
            {q.options.map((o, i) => {
              const sources = optionSources(audit, o);
              return (
                <li key={`${q.id}-${i}`} className="obp-audit-option">
                  <p className="obp-audit-option__label">{o.label || `${o.value} — ${o.document}`}</p>
                  {o.scope && <p className="obp-muted">Portée : {o.scope}</p>}
                  {o.readByVision && !sources.some(s => s.visionUnverified) && (
                    <p className="obp-audit-vision">{VISION_NOTE}</p>
                  )}
                  {sources.map((s, j) => <AuditSource key={j} audit={audit} source={s} />)}
                </li>
              );
            })}
          </ol>
          {q.rationale && <p className="obp-muted">Ce que l'analyse a lu : {q.rationale}</p>}
        </section>
      ))}
    </article>
  );
}

import React from 'react';
import { proposedCases, type Audit, type Question } from '../../lib/audit';
import type { Arbitration } from '../../hooks/useArbitration';
import { AuditQuestionGroup } from './AuditQuestion';
import { DecisionActions } from './DecisionActions';
import { DecisionHistory } from './DecisionHistory';

interface QuestionStepProps {
  audit:       Audit;
  projectId:   string;
  analysisId:  string;
  /** Questions d'une même étape (même `group_id`) : un cas par question. */
  step:        Question[];
  title:       string;
  /** Cas à confirmer : condition proposée affichée, et « deux cas distincts » prérempli. */
  toConfirm:   boolean;
  arbitration: Arbitration;
}

/**
 * Une étape de la session : la question, son sujet, ses options et leurs
 * extraits (images comprises), la piste de l'audit, puis sous chaque
 * question ses actions et son historique.
 */
export function QuestionStep({ audit, projectId, analysisId, step, title, toConfirm, arbitration }: QuestionStepProps) {
  const { state, pending, decide, cancel } = arbitration;
  if (state.status !== 'ready') return null;

  return (
    <AuditQuestionGroup
      audit={audit}
      group={step}
      title={title}
      showProposedCondition={toConfirm}
      footer={q => {
        const current = state.current.get(q.id);
        return (
          <div className="obp-decision-block">
            <DecisionActions
              question={q}
              current={current}
              arbitrable={state.arbitrable}
              busy={pending === q.id}
              proposedCases={toConfirm ? proposedCases(audit, q) : undefined}
              onDecide={action => decide(q, action)}
              onCancel={() => cancel(q)}
            />
            <DecisionHistory projectId={projectId} analysisId={analysisId} question={q} currentId={current?.id ?? null} />
          </div>
        );
      }}
    />
  );
}

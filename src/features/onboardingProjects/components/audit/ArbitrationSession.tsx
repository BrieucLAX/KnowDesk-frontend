import React, { useMemo, useState } from 'react';
import { Button }     from '../../../../shared/components/ui/Button';
import { FilterTabs } from '../../../../shared/components/ui/FilterTabs';
import { groupQuestions, questionKind, type Audit, type QuestionKind } from '../../lib/audit';
import { firstOpenStep, isStepDone, progress, STEP_STATUS_LABEL, stepStatus } from '../../lib/decisions';
import type { Arbitration } from '../../hooks/useArbitration';
import { QuestionStep } from './QuestionStep';

interface ArbitrationSessionProps {
  audit:       Audit;
  projectId:   string;
  analysisId:  string;
  arbitration: Arbitration;
  onExit:      () => void;
}

const LISTS: ReadonlyArray<{ id: QuestionKind; label: string; step: string; progress: [string, string] }> = [
  { id: 'decision',   label: 'Décisions',          step: 'Décision',        progress: ['décision', 'décisions'] },
  { id: 'to_verify',  label: 'Points à vérifier',  step: 'Point à vérifier', progress: ['point à vérifier', 'points à vérifier'] },
  { id: 'to_confirm', label: 'Cas à confirmer',    step: 'Cas à confirmer', progress: ['cas à confirmer', 'cas à confirmer'] },
];

/**
 * Session d'arbitrage : une étape à la fois (les questions d'un même
 * groupe), navigation précédente / suivante, vue d'ensemble. Les décisions
 * annoncées d'abord ; les points à vérifier et les cas à confirmer se
 * tranchent avec les mêmes actions, dans leur propre liste, hors du compte.
 */
export function ArbitrationSession({ audit, projectId, analysisId, arbitration, onExit }: ArbitrationSessionProps) {
  const lists = useMemo(() => LISTS
    .map(l => ({ ...l, steps: groupQuestions(audit.questions.filter(q => questionKind(audit, q) === l.id)) }))
    .filter(l => l.steps.length > 0), [audit]);

  const current = arbitration.state.status === 'ready' ? arbitration.state.current : new Map();
  const [listId, setListId] = useState<QuestionKind>(lists[0]?.id ?? 'decision');
  // Reprise : chaque liste s'ouvre sur sa première étape encore à faire.
  const [indexes, setIndexes] = useState<Record<string, number>>(
    () => Object.fromEntries(lists.map(l => [l.id, firstOpenStep(l.steps, current)])),
  );

  const list = lists.find(l => l.id === listId) ?? lists[0];
  if (!list) {
    return (
      <div className="obp-arb">
        <p className="obp-muted">Aucune question à trancher dans cet audit.</p>
        <Button variant="ghost" size="sm" onClick={onExit}>Revenir à l'audit</Button>
      </div>
    );
  }

  const index = Math.min(indexes[list.id] ?? 0, list.steps.length - 1);
  const go = (i: number) => setIndexes(prev => ({ ...prev, [list.id]: i }));
  const step = list.steps[index];
  const status = stepStatus(step, current);
  const p = progress(list.steps, current);
  const decisionsList = lists.find(l => l.id === 'decision');
  const main = decisionsList ? progress(decisionsList.steps, current) : null;

  return (
    <div className="obp-arb">
      <div className="obp-arb__head">
        <div>
          <h3 className="obp-section-title">Arbitrage</h3>
          {main && (
            <p className="obp-arb__progress">
              <strong>{main.done} sur {main.total}</strong> {main.total > 1 ? 'décisions' : 'décision'}
              <progress max={main.total} value={main.done} aria-label="Décisions prises" />
            </p>
          )}
          <p className="obp-muted">« Plus tard » laisse la question à faire. « Passer » l'enregistre comme non applicable.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onExit}>Revenir à l'audit</Button>
      </div>

      {lists.length > 1 && (
        <FilterTabs<QuestionKind>
          options={lists.map(l => ({ id: l.id, label: l.label, count: l.steps.length }))}
          value={list.id}
          onChange={setListId}
          ariaLabel="Listes à trancher"
        />
      )}

      <div className="obp-arb__body">
        <nav className="obp-arb__overview" aria-label="Vue d'ensemble">
          <p className="obp-muted">{p.done} sur {p.total} {p.total > 1 ? list.progress[1] : list.progress[0]}</p>
          <ol>
            {list.steps.map((s, i) => {
              const st = stepStatus(s, current);
              return (
                <li key={s[0].id}>
                  <button type="button" className={`obp-arb__overview-item${i === index ? ' is-current' : ''}`}
                    aria-current={i === index ? 'step' : undefined} onClick={() => go(i)}>
                    <span>{list.step} {i + 1}</span>
                    <span className={`obp-arb__status obp-arb__status--${st}`}>{STEP_STATUS_LABEL[st]}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="obp-arb__step">
          <QuestionStep
            key={step[0].id}
            audit={audit}
            projectId={projectId}
            analysisId={analysisId}
            step={step}
            title={`${list.step} ${index + 1} sur ${list.steps.length}`}
            toConfirm={list.id === 'to_confirm'}
            arbitration={arbitration}
          />
          <div className="obp-arb__nav">
            <Button variant="ghost" size="sm" disabled={index === 0} onClick={() => go(index - 1)}>← Précédente</Button>
            <Button variant={isStepDone(status) ? 'primary' : 'secondary'} size="sm"
              disabled={index === list.steps.length - 1} onClick={() => go(index + 1)}>
              Suivante →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

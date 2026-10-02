import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../shared/lib/apiClient';
import { getErrorMessage } from '../../../shared/lib/apiErrors';
import { useToast } from '../../../shared/lib/useToast';
import { onboardingApi } from '../api/onboardingApi';
import type { Question } from '../lib/audit';
import type { Decision, DecisionAction } from '../lib/decisions';
import type { CardAction } from '../lib/reading';

export type ArbitrationState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; current: ReadonlyMap<string, Decision>; arbitrable: boolean };

/** Codes après lesquels l'écran ne reflète plus le back : on relit tout. */
const RELOAD_CODES = new Set(['DECISION_CONFLICT', 'AUDIT_READ_ONLY']);

/**
 * Décisions de l'audit d'une analyse : décision courante par question,
 * enregistrement, annulation (Q1). Chaque écriture envoie la décision
 * courante affichée ; si un autre membre (ou un autre onglet) l'a changée,
 * le back répond 409 et on relit l'état.
 */
export function useArbitration(projectId: string, analysisId: string | null) {
  const toast = useToast();
  const [state,   setState]   = useState<ArbitrationState>({ status: 'loading' });
  const [pending, setPending] = useState<string | null>(null);
  /** Analyse affichée : une réponse arrivée après un changement d'audit est ignorée. */
  const shown = useRef(analysisId);
  shown.current = analysisId;

  const load = useCallback(async () => {
    if (analysisId === null) return;
    try {
      const res = await onboardingApi.listDecisions(projectId, analysisId);
      if (shown.current !== analysisId) return;
      setState({ status: 'ready', current: new Map(res.decisions.map(d => [d.questionId, d])), arbitrable: res.arbitrable });
    } catch (err) {
      if (shown.current !== analysisId) return;
      setState({ status: 'error' });
      toast.error(err instanceof Error ? err.message : 'Impossible de charger les décisions.');
    }
  }, [projectId, analysisId, toast]);

  useEffect(() => {
    setState({ status: 'loading' });
    void load();
  }, [load]);

  const setCurrent = (questionId: string, decision: Decision | null) => setState(s => {
    if (s.status !== 'ready') return s;
    const next = new Map(s.current);
    if (decision) next.set(questionId, decision);
    else next.delete(questionId);
    return { ...s, current: next };
  });

  const fail = async (err: unknown, fallback: string) => {
    if (err instanceof ApiError && RELOAD_CODES.has(err.code)) {
      toast.error(getErrorMessage(err));
      await load();
      return;
    }
    toast.error(err instanceof Error ? err.message : fallback);
  };

  /** Vrai si la décision est enregistrée. */
  const decide = async (question: Question, action: DecisionAction): Promise<boolean> => {
    if (analysisId === null || state.status !== 'ready') return false;
    setPending(question.id);
    try {
      const saved = await onboardingApi.decide(projectId, analysisId, {
        questionId:        question.id,
        expectedCurrentId: state.current.get(question.id)?.id ?? null,
        action,
      });
      setCurrent(question.id, saved);
      return true;
    } catch (err) {
      await fail(err, 'Impossible d\'enregistrer la décision.');
      return false;
    } finally {
      setPending(null);
    }
  };

  /** Vrai si la réponse à la carte (audit 0.8.0) est enregistrée. */
  const answer = async (cardId: string, action: CardAction): Promise<boolean> => {
    if (analysisId === null || state.status !== 'ready') return false;
    setPending(cardId);
    try {
      const saved = await onboardingApi.answerCard(projectId, analysisId, {
        cardId,
        expectedCurrentId: state.current.get(cardId)?.id ?? null,
        action,
      });
      setCurrent(cardId, saved);
      return true;
    } catch (err) {
      await fail(err, 'Impossible d\'enregistrer la réponse.');
      return false;
    } finally {
      setPending(null);
    }
  };

  /**
   * Retire la décision courante d'une question ou d'une carte (par son identifiant) : elle
   * revient à la précédente, ou redevient ouverte.
   */
  const cancel = async (question: Pick<Question, 'id'>): Promise<boolean> => {
    if (analysisId === null || state.status !== 'ready') return false;
    const current = state.current.get(question.id);
    if (!current) return false;
    setPending(question.id);
    try {
      const res = await onboardingApi.cancelDecision(projectId, analysisId, current.id);
      setCurrent(question.id, res.current);
      return true;
    } catch (err) {
      await fail(err, 'Impossible d\'annuler la décision.');
      return false;
    } finally {
      setPending(null);
    }
  };

  return { state, pending, decide, answer, cancel, reload: load };
}

export type Arbitration = ReturnType<typeof useArbitration>;

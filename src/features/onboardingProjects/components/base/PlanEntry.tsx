import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '../../../../shared/components/ui/Button';
import { ConfirmDialog } from '../../../../shared/components/ui/ConfirmDialog';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';
import { ActionBarContent } from '../../../../shared/components/ui/ActionBar';
import { useToast } from '../../../../shared/lib/useToast';
import { getErrorMessage } from '../../../../shared/lib/apiErrors';
import { onboardingApi } from '../../api/onboardingApi';
import type { Decision } from '../../lib/decisions';
import { versionCardsWaiting, versionCardWaitingMessage, type ReadingCard } from '../../lib/reading';
import { blockingCardsLeft } from '../../lib/correction';
import { isPlanActive, planFailureMessage, type OnboardingPlan, type PlanQuota } from '../../lib/plan';
import { editCountLabel } from '../../lib/planEdits';

interface PlanEntryProps {
  projectId:  string;
  analysisId: string;
  cards:      ReadingCard[];
  current:    ReadonlyMap<string, Decision>;
  /** Ouvre « Nouvelle base », où le plan se suit et se lit. */
  onOpenBase: () => void;
}

/** Le nombre de cartes bloquantes qui restent, dit pour le plan. */
export function planBlockingLeftLabel({ left, later }: { left: number; later: number }): string {
  const head = left > 1
    ? `Encore ${left} questions bloquantes sans réponse avant de préparer le plan.`
    : 'Encore 1 question bloquante sans réponse avant de préparer le plan.';
  if (later === 0) return head;
  return `${head} « Plus tard » ne compte pas comme une réponse à une question bloquante${later < left ? ` (${later} sur ${left})` : ''}.`;
}

/**
 * Sur « À clarifier », en mode construire (pas de base existante, audit 0.16.0) : le bloc « Plan de
 * la nouvelle base » prend la place du message « Knowdesk ne sait pas encore construire… »
 * (décisions du porteur du 2026-11-14, B-Q1 et B-Q2). « Préparer le plan » quand toutes les cartes
 * bloquantes ont une vraie réponse ; sinon le bouton reste grisé, avec le message de la
 * préparation qui nomme la carte de version en attente. Un plan en cours, ou prêt, y renvoie.
 */
export function PlanEntry({ projectId, analysisId, cards, current, onOpenBase }: PlanEntryProps) {
  const toast = useToast();
  const [plans,     setPlans]     = useState<OnboardingPlan[] | null>(null);
  const [quota,     setQuota]     = useState<PlanQuota | null>(null);
  const [launching, setLaunching] = useState(false);
  const [confirm,   setConfirm]   = useState(false);
  /** Modifications en vigueur du plan actuel (étape 4) : le nouveau plan ne les reprend pas (Q5 a). */
  const [editCount, setEditCount] = useState(0);

  const load = useCallback(async () => {
    const res = await onboardingApi.listPlans(projectId, analysisId);
    setPlans(res.data);
    setQuota(res.meta.quota);
  }, [projectId, analysisId]);

  useEffect(() => {
    // Échec silencieux (route absente avant le déploiement du back) : aucun plan, le bouton reste.
    load().catch(() => setPlans([]));
  }, [load]);

  // Le plan actuel, le dernier réussi : ses modifications, en silence sans la route (back d'avant).
  const currentPlanId = plans?.find(p => p.status === 'succeeded')?.id ?? null;
  useEffect(() => {
    setEditCount(0);
    if (currentPlanId === null) return;
    let cancelled = false;
    onboardingApi.getPlanEdits(projectId, currentPlanId)
      .then(e => { if (!cancelled) setEditCount(e.editCount); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [projectId, currentPlanId]);

  const launch = async () => {
    setConfirm(false);
    setLaunching(true);
    try {
      await onboardingApi.launchPlan(projectId, analysisId);
      onOpenBase();
    } catch (err) {
      toast.error(getErrorMessage(err));
      void load().catch(() => {});
    } finally {
      setLaunching(false);
    }
  };

  const head = (
    <>
      <h3 className="obp-plan-entry__title">Plan de la nouvelle base</h3>
      <p className="obp-muted">
        Knowdesk propose des catégories et des articles, chacun avec ses sources dans vos documents.
        Vous pourrez le lire, le commenter et le ranger à votre façon.
      </p>
    </>
  );

  if (plans === null) return <section className="obp-plan-entry" aria-label="Plan de la nouvelle base">{head}<Skeleton className="obp-arb-entry__loading" /></section>;

  const left = blockingCardsLeft(cards, current);
  const waiting = versionCardsWaiting(cards, current);
  const latest = plans[0] ?? null;
  const ready = plans.some(p => p.status === 'succeeded');
  const quotaReached = quota !== null && quota.used >= quota.max;

  if (latest && isPlanActive(latest)) {
    return (
      <section className="obp-plan-entry" aria-label="Plan de la nouvelle base">
        {head}
        <div className="obp-arb-entry">
          <span>Le plan est en préparation.</span>
          <Button variant="secondary" size="md" onClick={onOpenBase}>Voir l'avancement</Button>
        </div>
      </section>
    );
  }

  return (
    <section className="obp-plan-entry" aria-label="Plan de la nouvelle base">
      {head}
      {latest?.status === 'failed' && (
        <p className="obp-analysis__error" role="status">{planFailureMessage(latest.errorCode)}</p>
      )}
      {left.left > 0 ? (
        <ActionBarContent
          note={(
            <div role="status">
              {waiting.map(c => <p key={c.id} className="obp-correction-entry__left">{versionCardWaitingMessage(c)}</p>)}
              {left.left > waiting.length && <p className="obp-correction-entry__left">{planBlockingLeftLabel(left)}</p>}
            </div>
          )}
        >
          <Button variant="primary" size="md" disabled>Préparer le plan</Button>
        </ActionBarContent>
      ) : quotaReached ? (
        <p className="obp-muted" role="status">
          Votre organisation a atteint son nombre de plans ({quota!.max}). Contactez-nous pour en obtenir d'autres.
        </p>
      ) : (
        <ActionBarContent
          note={ready ? 'Le plan se lit et se modifie à l\'étape « Plan ».' : 'Le plan se prépare avec vos réponses actuelles ; vous le suivrez dans « Nouvelle base ».'}
        >
          {ready ? (
            <>
              <Button variant="secondary" size="md" loading={launching} onClick={() => setConfirm(true)}>Préparer à nouveau le plan</Button>
              <Button variant="primary" size="md" onClick={onOpenBase}>Voir le plan</Button>
            </>
          ) : (
            <Button variant="primary" size="md" loading={launching} onClick={launch}>Préparer le plan</Button>
          )}
        </ActionBarContent>
      )}

      {confirm && (
        <ConfirmDialog
          title="Préparer à nouveau le plan ?"
          description={editCount > 0
            ? `Vos ${editCountLabel(editCount)} du plan actuel ne seront pas reprises : le nouveau plan repart de la proposition de Knowdesk, avec vos réponses actuelles. Le plan actuel, ses modifications et ses commentaires resteront consultables, mais ne se modifieront ni ne se commenteront plus.`
            : 'Un nouveau plan sera préparé avec vos réponses actuelles. Le plan actuel et ses commentaires resteront consultables, mais ne se commenteront plus.'}
          confirmLabel="Préparer à nouveau"
          cancelLabel="Annuler"
          variant="primary"
          onConfirm={() => { void launch(); }}
          onCancel={() => setConfirm(false)}
        />
      )}
    </section>
  );
}

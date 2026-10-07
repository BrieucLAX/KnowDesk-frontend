import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '../../../../shared/components/ui/Button';
import { ConfirmDialog } from '../../../../shared/components/ui/ConfirmDialog';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';
import { useToast } from '../../../../shared/lib/useToast';
import { getErrorMessage } from '../../../../shared/lib/apiErrors';
import { onboardingApi } from '../../api/onboardingApi';
import type { Decision } from '../../lib/decisions';
import type { ReadingCard } from '../../lib/reading';
import {
  blockingCardsLeft, blockingLeftLabel, CORRECTABLE_AUDIT_SCHEMAS, correctionFailureMessage, isCorrectionActive,
  type CorrectionQuota, type OnboardingCorrection,
} from '../../lib/correction';

interface CorrectionEntryProps {
  projectId:     string;
  analysisId:    string;
  schemaVersion: string;
  cards:         ReadingCard[];
  current:       ReadonlyMap<string, Decision>;
  onOpenBase:    () => void;
}

/**
 * Sur « À clarifier », sous le résumé : « Préparer la nouvelle base » quand toutes les cartes
 * bloquantes ont une décision (règle du back : la nature seule ; « Plus tard » ne tranche pas),
 * sinon le nombre de cartes qui restent. Une préparation en cours, ou une base prête, y renvoie.
 */
export function CorrectionEntry({ projectId, analysisId, schemaVersion, cards, current, onOpenBase }: CorrectionEntryProps) {
  const toast = useToast();
  const [corrections, setCorrections] = useState<OnboardingCorrection[] | null>(null);
  const [quota,     setQuota]     = useState<CorrectionQuota | null>(null);
  const [launching, setLaunching] = useState(false);
  const [confirm,   setConfirm]   = useState(false);
  const correctable = CORRECTABLE_AUDIT_SCHEMAS.includes(schemaVersion);

  const load = useCallback(async () => {
    const res = await onboardingApi.listCorrections(projectId, analysisId);
    setCorrections(res.data);
    setQuota(res.meta.quota);
  }, [projectId, analysisId]);

  useEffect(() => {
    if (!correctable) return;
    load().catch(() => setCorrections([]));
  }, [correctable, load]);

  if (!correctable) {
    return (
      <p className="obp-muted obp-correction-entry">
        Cet audit vient d'une version précédente de l'analyse : relancez une analyse pour préparer la nouvelle base.
      </p>
    );
  }
  if (corrections === null) return <Skeleton className="obp-arb-entry__loading" />;

  const left = blockingCardsLeft(cards, current);
  const latest = corrections[0] ?? null;
  const ready = corrections.some(c => c.status === 'succeeded');
  const quotaReached = quota !== null && quota.used >= quota.max;

  const launch = async () => {
    setConfirm(false);
    setLaunching(true);
    try {
      await onboardingApi.launchCorrection(projectId, analysisId);
      onOpenBase();
    } catch (err) {
      toast.error(getErrorMessage(err));
      void load().catch(() => {});
    } finally {
      setLaunching(false);
    }
  };

  if (latest && isCorrectionActive(latest)) {
    return (
      <div className="obp-arb-entry obp-correction-entry">
        <span>La nouvelle base est en préparation.</span>
        <Button variant="secondary" size="md" onClick={onOpenBase}>Voir l'avancement</Button>
      </div>
    );
  }

  return (
    <div className="obp-correction-entry">
      {latest?.status === 'failed' && (
        <p className="obp-analysis__error" role="status">{correctionFailureMessage(latest.errorCode)}</p>
      )}
      {left.left > 0 ? (
        <p className="obp-correction-entry__left" role="status">{blockingLeftLabel(left)}</p>
      ) : quotaReached ? (
        <p className="obp-muted" role="status">
          Votre espace a atteint son nombre de préparations ({quota!.max}). Contactez-nous pour en obtenir d'autres.
        </p>
      ) : (
        <div className="obp-arb-entry">
          {ready ? (
            <>
              <Button variant="primary" size="md" onClick={onOpenBase}>Relire la nouvelle base</Button>
              <Button variant="secondary" size="md" loading={launching} onClick={() => setConfirm(true)}>Préparer à nouveau</Button>
            </>
          ) : (
            <Button variant="primary" size="md" loading={launching} onClick={launch}>Préparer la nouvelle base</Button>
          )}
          <span className="obp-muted">Vos fiches sont reprises telles quelles ; seules vos réponses les modifient.</span>
        </div>
      )}
      {left.left > 0 && ready && (
        <p className="obp-muted">
          <button type="button" className="obp-link" onClick={onOpenBase}>Relire la nouvelle base déjà prête →</button>
        </p>
      )}

      {confirm && (
        <ConfirmDialog
          title="Préparer à nouveau la nouvelle base ?"
          description="Une nouvelle version sera préparée avec vos réponses actuelles. La relecture de la version actuelle restera consultable, mais ne se modifiera plus."
          confirmLabel="Préparer à nouveau"
          cancelLabel="Annuler"
          variant="primary"
          onConfirm={() => { void launch(); }}
          onCancel={() => setConfirm(false)}
        />
      )}
    </div>
  );
}

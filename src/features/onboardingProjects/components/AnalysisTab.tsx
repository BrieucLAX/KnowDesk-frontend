import React, { useCallback, useEffect, useState } from 'react';
import { Button }   from '../../../shared/components/ui/Button';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog';
import { useToast } from '../../../shared/lib/useToast';
import { usePolling } from '../../../shared/lib/usePolling';
import { formatFull } from '../../../shared/lib/formatDate';
import { onboardingApi } from '../api/onboardingApi';
import { ANALYSIS_POLL_MS, analysisFailureMessage, isAnalysisActive } from '../lib/analysisStatus';
import { AnalysisProgress } from './AnalysisProgress';
import type { AnalysisQuota, OnboardingAnalysis, OnboardingProject } from '../types';

interface AnalysisTabProps {
  project:   OnboardingProject;
  /** Une analyse a été lancée : le projet relit ses documents (désormais figés). */
  onChanged: () => void;
}

const STATUS_LABEL: Record<OnboardingAnalysis['status'], string> = {
  queued: 'En attente', running: 'En cours', succeeded: 'Terminée', failed: 'Interrompue',
};

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/**
 * Onglet « Analyse » : lancement, puis suivi de l'analyse en cours (relue
 * toutes les 5 s tant qu'elle est en file ou en cours), et analyses passées.
 */
export function AnalysisTab({ project, onChanged }: AnalysisTabProps) {
  const toast = useToast();
  const [analyses,   setAnalyses]   = useState<OnboardingAnalysis[] | null>(null);
  const [quota,      setQuota]      = useState<AnalysisQuota | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [launching,  setLaunching]  = useState(false);

  const load = useCallback(async () => {
    const { data, meta } = await onboardingApi.listAnalyses(project.id);
    setAnalyses(data);
    setQuota(meta.quota);
  }, [project.id]);

  useEffect(() => {
    load().catch(err => {
      setAnalyses([]);
      toast.error(err instanceof Error ? err.message : 'Impossible de charger les analyses.');
    });
  }, [load, toast]);

  const latest = analyses?.[0] ?? null;
  const active = latest !== null && isAnalysisActive(latest);

  // Appel de fond : une relecture en échec est simplement retentée au tick suivant.
  usePolling(async () => {
    if (!latest) return;
    const fresh = await onboardingApi.getAnalysis(project.id, latest.id);
    setAnalyses(prev => prev?.map(a => (a.id === fresh.id ? fresh : a)) ?? prev);
    if (isAnalysisActive(fresh)) return;
    if (fresh.status === 'succeeded') toast.success('Analyse terminée.');
    else toast.error(analysisFailureMessage(fresh.errorCode));
    await load().catch(() => { /* le quota sera relu au prochain affichage */ });
  }, ANALYSIS_POLL_MS, active);

  const launch = async () => {
    setLaunching(true);
    try {
      const created = await onboardingApi.launchAnalysis(project.id);
      setAnalyses(prev => [created, ...(prev ?? [])]);
      setQuota(q => (q ? { ...q, used: q.used + 1 } : q));
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Impossible de lancer l\'analyse.');
    } finally {
      setLaunching(false);
      setConfirming(false);
    }
  };

  if (analyses === null) {
    return <Skeleton className="obp-skeleton-block" />;
  }

  const remaining = quota ? Math.max(0, quota.max - quota.used) : null;
  const blocker =
    project.documentsCount === 0 ? 'Importez au moins un document pour lancer l\'analyse.'
    : project.cadrageVersion === null ? 'Enregistrez la fiche de cadrage pour lancer l\'analyse.'
    : remaining === 0 ? `Votre espace a atteint son nombre d'analyses (${quota!.max}). Contactez-nous pour en obtenir d'autres.`
    : null;
  const history = analyses.slice(1);

  return (
    <>
      {latest && <AnalysisProgress analysis={latest} />}

      {!active && (
        <section className="obp-launch" aria-labelledby="obp-launch-title">
          <h2 id="obp-launch-title" className="obp-section-title">
            {latest ? 'Lancer une nouvelle analyse' : 'Lancer l\'analyse'}
          </h2>
          <p className="obp-muted">
            L'analyse lit vos documents avec votre fiche de cadrage, puis prépare les questions à trancher.
            Elle peut durer jusqu'à une heure.
          </p>
          <ul className="obp-launch__summary">
            <li>{plural(project.documentsCount, 'document', 'documents')}</li>
            <li>Fiche de cadrage : {project.cadrageVersion === null ? 'non enregistrée' : `version ${project.cadrageVersion}`}</li>
            {quota && remaining !== null && <li>Analyses restantes : {remaining} sur {quota.max}</li>}
          </ul>
          <div className="obp-launch__actions">
            <Button variant="primary" size="md" disabled={blocker !== null} onClick={() => setConfirming(true)}>
              Lancer l'analyse
            </Button>
            {blocker && <span className="obp-muted">{blocker}</span>}
          </div>
        </section>
      )}

      {history.length > 0 && (
        <section aria-labelledby="obp-history-title">
          <h2 id="obp-history-title" className="obp-section-title">Analyses précédentes</h2>
          <ul className="obp-history">
            {history.map(a => (
              <li key={a.id} className="obp-history__item">
                <span className={`obp-history__status obp-history__status--${a.status}`}>{STATUS_LABEL[a.status]}</span>
                <span>{formatFull(a.createdAt)}</span>
                <span>fiche version {a.cadrageVersion}, {plural(a.documents.length, 'document', 'documents')}</span>
                {a.status === 'failed' && <span>{analysisFailureMessage(a.errorCode)}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {confirming && (
        <ConfirmDialog
          title="Lancer l'analyse ?"
          description={
            `Les ${plural(project.documentsCount, 'document', 'documents')} du projet et la version ${project.cadrageVersion} `
            + 'de la fiche de cadrage seront figés : vous ne pourrez plus retirer ces documents. '
            + (remaining !== null ? `Il vous restera ${remaining - 1} analyse${remaining - 1 > 1 ? 's' : ''}.` : '')
          }
          confirmLabel="Lancer l'analyse"
          variant="primary"
          loading={launching}
          onConfirm={launch}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}

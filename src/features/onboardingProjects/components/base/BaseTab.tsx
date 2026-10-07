import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Skeleton }   from '../../../../shared/components/ui/Skeleton';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { useToast }   from '../../../../shared/lib/useToast';
import { usePolling } from '../../../../shared/lib/usePolling';
import { formatFull } from '../../../../shared/lib/formatDate';
import { getErrorMessage } from '../../../../shared/lib/apiErrors';
import { onboardingApi } from '../../api/onboardingApi';
import { cardTitles, isCorrectionActive, type BaseVersion, type OnboardingCorrection } from '../../lib/correction';
import { useBaseReview } from '../../hooks/useBaseReview';
import type { OnboardingProject } from '../../types';
import { AuditImagesContext, type AuditImages } from '../audit/AuditSource';
import { BaseReviewView } from './BaseReviewView';
import { CorrectionProgress } from './CorrectionProgress';

/** Intervalle de relecture d'une préparation en cours. */
export const CORRECTION_POLL_MS = 5000;

interface BaseTabProps {
  project:       OnboardingProject;
  onGoToClarify: () => void;
}

type Loaded = { state: 'loading' } | { state: 'none' } | { state: 'ready'; analysisId: string; corrections: OnboardingCorrection[] };

/**
 * Onglet « Nouvelle base » : la préparation en cours (étapes, avancement), puis la relecture de la
 * dernière base prête. Les bases précédentes de l'analyse se consultent, en lecture seule.
 */
export function BaseTab({ project, onGoToClarify }: BaseTabProps) {
  const toast = useToast();
  const [loaded,   setLoaded]   = useState<Loaded>({ state: 'loading' });
  const [selected, setSelected] = useState<string | null>(null);
  const [base,     setBase]     = useState<BaseVersion | null>(null);
  const [titles,   setTitles]   = useState<ReadonlyMap<string, string>>(new Map());
  const [imageIds, setImageIds] = useState<ReadonlySet<string>>(new Set());
  const [retrying, setRetrying] = useState(false);

  /** Les corrections de la dernière analyse réussie (seule à se corriger). */
  const refresh = useCallback(async () => {
    const { data: analyses } = await onboardingApi.listAnalyses(project.id);
    const latest = analyses.find(a => a.status === 'succeeded');
    if (!latest) { setLoaded({ state: 'none' }); return; }
    const { data } = await onboardingApi.listCorrections(project.id, latest.id);
    setLoaded(data.length === 0 ? { state: 'none' } : { state: 'ready', analysisId: latest.id, corrections: data });
  }, [project.id]);

  useEffect(() => {
    refresh().catch(err => { setLoaded({ state: 'none' }); toast.error(getErrorMessage(err)); });
  }, [refresh, toast]);

  const corrections = loaded.state === 'ready' ? loaded.corrections : [];
  const latest = corrections[0] ?? null;
  const succeeded = corrections.filter(c => c.status === 'succeeded');
  usePolling(refresh, CORRECTION_POLL_MS, latest !== null && isCorrectionActive(latest));

  // La dernière base prête, sauf choix d'une précédente.
  const shownId = selected !== null && succeeded.some(c => c.id === selected) ? selected : succeeded[0]?.id ?? null;
  const analysisId = loaded.state === 'ready' ? loaded.analysisId : null;

  useEffect(() => {
    if (shownId === null) { setBase(null); return; }
    let cancelled = false;
    setBase(null);
    onboardingApi.getBase(project.id, shownId)
      .then(b => { if (!cancelled) setBase(b); })
      .catch(err => { if (!cancelled) toast.error(getErrorMessage(err)); });
    return () => { cancelled = true; };
  }, [project.id, shownId, toast]);

  // Titres des cartes (origine des modifications) et images de l'analyse : un appui, échec silencieux.
  useEffect(() => {
    if (analysisId === null) return;
    let cancelled = false;
    onboardingApi.getAudit(project.id, analysisId)
      .then(res => { if (!cancelled && res.reading) setTitles(cardTitles(res.reading.cards)); })
      .catch(() => {});
    onboardingApi.listAuditImages(project.id, analysisId)
      .then(list => { if (!cancelled) setImageIds(new Set(list.map(i => i.imageId))); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [project.id, analysisId]);

  const loadImage = useCallback(
    (imageId: string) => onboardingApi.getAuditImage(project.id, analysisId ?? '', imageId),
    [project.id, analysisId],
  );
  const images = useMemo<AuditImages>(() => ({ available: imageIds, load: loadImage }), [imageIds, loadImage]);
  const review = useBaseReview(project.id, base?.correctionId ?? null);

  const retry = async () => {
    if (analysisId === null) return;
    setRetrying(true);
    try {
      await onboardingApi.launchCorrection(project.id, analysisId);
      await refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setRetrying(false);
    }
  };

  if (loaded.state === 'loading') return <Skeleton className="obp-skeleton-block" />;
  if (loaded.state === 'none') {
    return (
      <EmptyState
        title="Aucune nouvelle base pour l'instant"
        description="Elle se prépare depuis « À clarifier », une fois toutes les cartes bloquantes tranchées."
        ctaLabel="Aller à « À clarifier »"
        onCta={onGoToClarify}
      />
    );
  }

  const showProgress = latest !== null && latest.status !== 'succeeded';
  return (
    <>
      {showProgress && <CorrectionProgress correction={latest} onRetry={latest.status === 'failed' ? retry : undefined} retrying={retrying} />}

      {succeeded.length > 0 && (
        <div className="obp-audit-head">
          <h2 className="obp-section-title">Nouvelle base du {formatFull(succeeded.find(c => c.id === shownId)?.finishedAt ?? null)}</h2>
          {succeeded.length > 1 && (
            <label className="obp-audit-picker">
              <span className="obp-muted">Version</span>
              <select value={shownId ?? ''} onChange={e => setSelected(e.target.value)}>
                {succeeded.map((c, i) => (
                  <option key={c.id} value={c.id}>{formatFull(c.finishedAt)}{i === 0 ? ' (la plus récente)' : ''}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
      {shownId !== null && base === null && <Skeleton className="obp-skeleton-block" />}
      {base !== null && base.correctionId === shownId && (
        base.schemaVersion !== '0.1.0' ? (
          <p className="obp-audit-unsupported" role="status">
            Cette base est dans un format que cette version de l'application ne sait pas afficher.
          </p>
        ) : (
          <AuditImagesContext.Provider value={images}>
            <BaseReviewView base={base.base} cardTitles={titles} editable={base.reviewable} review={review} />
          </AuditImagesContext.Provider>
        )
      )}
    </>
  );
}

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Skeleton }   from '../../../../shared/components/ui/Skeleton';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { useToast }   from '../../../../shared/lib/useToast';
import { formatFull } from '../../../../shared/lib/formatDate';
import { onboardingApi } from '../../api/onboardingApi';
import { isSupportedAudit, normalizeAudit, type Audit } from '../../lib/audit';
import type { OnboardingAnalysis, OnboardingProject } from '../../types';
import { AuditImagesContext, type AuditImages } from './AuditSource';
import { AuditView } from './AuditView';

interface AuditTabProps {
  project:        OnboardingProject;
  onGoToAnalysis: () => void;
}

type Loaded =
  | { state: 'loading' }
  | { state: 'error' }
  | { state: 'unsupported'; schemaVersion: string }
  | { state: 'ready'; audit: Audit; imageIds: ReadonlySet<string> };

/**
 * Onglet « Audit » (F3, lecture seule). Affiche l'audit de la dernière
 * analyse réussie ; les audits des analyses réussies précédentes restent
 * consultables, en lecture seule.
 */
export function AuditTab({ project, onGoToAnalysis }: AuditTabProps) {
  const toast = useToast();
  const [analyses, setAnalyses] = useState<OnboardingAnalysis[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loaded,   setLoaded]   = useState<Loaded>({ state: 'loading' });

  useEffect(() => {
    let cancelled = false;
    onboardingApi.listAnalyses(project.id)
      .then(({ data }) => {
        if (cancelled) return;
        const succeeded = data.filter(a => a.status === 'succeeded');
        setAnalyses(succeeded);
        setSelected(succeeded[0]?.id ?? null);
      })
      .catch(err => {
        if (cancelled) return;
        setAnalyses([]);
        toast.error(err instanceof Error ? err.message : 'Impossible de charger les analyses.');
      });
    return () => { cancelled = true; };
  }, [project.id, toast]);

  useEffect(() => {
    if (selected === null) return;
    let cancelled = false;
    setLoaded({ state: 'loading' });
    onboardingApi.getAudit(project.id, selected)
      .then(res => {
        if (cancelled) return;
        const audit = isSupportedAudit(res) ? normalizeAudit(res.audit) : null;
        setLoaded(audit
          ? { state: 'ready', audit, imageIds: new Set(res.imageIds) }
          : { state: 'unsupported', schemaVersion: res.schemaVersion });
      })
      .catch(err => {
        if (cancelled) return;
        setLoaded({ state: 'error' });
        toast.error(err instanceof Error ? err.message : 'Impossible de charger l\'audit.');
      });
    return () => { cancelled = true; };
  }, [project.id, selected, toast]);

  const loadImage = useCallback(
    (imageId: string) => onboardingApi.getAuditImage(project.id, selected ?? '', imageId),
    [project.id, selected],
  );
  const images = useMemo<AuditImages>(
    () => ({ available: loaded.state === 'ready' ? loaded.imageIds : new Set(), load: loadImage }),
    [loaded, loadImage],
  );

  if (analyses === null) return <Skeleton className="obp-skeleton-block" />;

  if (analyses.length === 0) {
    return (
      <EmptyState
        title="Aucun audit pour l'instant"
        description="L'audit apparaît ici quand une analyse du projet est terminée."
        ctaLabel="Aller à l'analyse"
        onCta={onGoToAnalysis}
      />
    );
  }

  const current = analyses.find(a => a.id === selected) ?? analyses[0];
  const isLatest = current.id === analyses[0].id;

  return (
    <>
      <div className="obp-audit-head">
        <h2 className="obp-section-title">Audit du {formatFull(current.finishedAt ?? current.createdAt)}</h2>
        {analyses.length > 1 && (
          <label className="obp-audit-picker">
            <span className="obp-muted">Analyse</span>
            <select value={current.id} onChange={e => setSelected(e.target.value)}>
              {analyses.map((a, i) => (
                <option key={a.id} value={a.id}>
                  {formatFull(a.finishedAt ?? a.createdAt)}{i === 0 ? ' (la plus récente)' : ''}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <p className="obp-muted">
        {isLatest
          ? `Fiche de cadrage version ${current.cadrageVersion}, ${current.documents.length} document${current.documents.length > 1 ? 's' : ''}.`
          : 'Audit d\'une analyse précédente, en lecture seule.'}
      </p>

      {loaded.state === 'loading' && <Skeleton className="obp-skeleton-block" />}
      {loaded.state === 'error' && <p className="obp-muted">L'audit n'a pas pu être chargé.</p>}
      {loaded.state === 'unsupported' && (
        <p className="obp-audit-unsupported" role="status">
          Cet audit est dans un format que cette version de l'application ne sait pas afficher
          (version {loaded.schemaVersion}).
        </p>
      )}
      {loaded.state === 'ready' && (
        <AuditImagesContext.Provider value={images}>
          <AuditView audit={loaded.audit} />
        </AuditImagesContext.Provider>
      )}
    </>
  );
}

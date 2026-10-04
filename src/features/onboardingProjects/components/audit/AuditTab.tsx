import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button }     from '../../../../shared/components/ui/Button';
import { Skeleton }   from '../../../../shared/components/ui/Skeleton';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { useToast }   from '../../../../shared/lib/useToast';
import { formatFull } from '../../../../shared/lib/formatDate';
import { onboardingApi } from '../../api/onboardingApi';
import { groupQuestions, isSupportedAudit, normalizeAudit, questionKind, documentsLine, type Audit } from '../../lib/audit';
import { progress } from '../../lib/decisions';
import { READING_AUDIT_SCHEMA, type Reading } from '../../lib/reading';
import { useArbitration } from '../../hooks/useArbitration';
import type { OnboardingAnalysis, OnboardingProject } from '../../types';
import { AuditImagesContext, type AuditImages } from './AuditSource';
import { AuditView } from './AuditView';
import { ArbitrationSession } from './ArbitrationSession';
import { CurrentDecision } from './DecisionActions';
import { ClarifyView } from '../clarify/ClarifyView';
import { ClarifySession } from '../clarify/ClarifySession';

interface AuditTabProps {
  project:        OnboardingProject;
  onGoToAnalysis: () => void;
}

type Loaded =
  | { state: 'loading' }
  | { state: 'error' }
  | { state: 'unsupported'; schemaVersion: string }
  | { state: 'ready'; audit: Audit; imageIds: ReadonlySet<string> }
  /** Audit 0.8.0 : `audit` n'en garde que l'inventaire (noms de fichier), les cartes sont dans `reading`. */
  | { state: 'reading'; audit: Audit; reading: Reading; imageIds: ReadonlySet<string> };

/**
 * Onglet « À clarifier » (F3, F-C'). Affiche l'audit de la dernière analyse
 * réussie, et son arbitrage ; les audits des analyses réussies précédentes
 * restent consultables, décisions comprises, en lecture seule (Q2). Un audit
 * 0.8.0 (lecture globale) montre ses cartes ; un audit 0.6.0 ou 0.7.0, ses
 * questions, comme avant.
 */
export function AuditTab({ project, onGoToAnalysis }: AuditTabProps) {
  const toast = useToast();
  const [analyses, setAnalyses] = useState<OnboardingAnalysis[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loaded,   setLoaded]   = useState<Loaded>({ state: 'loading' });
  const [session,  setSession]  = useState(false);
  /** Session « À clarifier » ouverte, sur une carte (null : la première à traiter) ; undefined : fermée. */
  const [clarify,  setClarify]  = useState<string | null | undefined>(undefined);
  const arbitration = useArbitration(project.id, loaded.state === 'ready' || loaded.state === 'reading' ? selected : null);

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
    setSession(false);
    setClarify(undefined);
    onboardingApi.getAudit(project.id, selected)
      .then(res => {
        if (cancelled) return;
        if (res.schemaVersion === READING_AUDIT_SCHEMA && res.reading) {
          const inventory = normalizeAudit(res.audit);
          setLoaded(inventory
            ? { state: 'reading', audit: inventory, reading: res.reading, imageIds: new Set(res.imageIds) }
            : { state: 'unsupported', schemaVersion: res.schemaVersion });
          return;
        }
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
    () => ({ available: loaded.state === 'ready' || loaded.state === 'reading' ? loaded.imageIds : new Set(), load: loadImage }),
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
  const loadedAudit = loaded.state === 'ready' || loaded.state === 'reading' ? loaded.audit : null;
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
          ? `Fiche de cadrage version ${current.cadrageVersion}, ${documentsLine(current.documents.length, loadedAudit)}.`
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
      {loaded.state === 'reading' && (
        <AuditImagesContext.Provider value={images}>
          {clarify !== undefined && arbitration.state.status === 'ready' ? (
            <ClarifySession
              audit={loaded.audit}
              reading={loaded.reading}
              projectId={project.id}
              analysisId={current.id}
              arbitration={arbitration}
              startCardId={clarify}
              onExit={() => setClarify(undefined)}
            />
          ) : (
            <ClarifyView audit={loaded.audit} reading={loaded.reading} arbitration={arbitration} onOpen={setClarify} />
          )}
        </AuditImagesContext.Provider>
      )}
      {loaded.state === 'ready' && (
        <AuditImagesContext.Provider value={images}>
          {session && arbitration.state.status === 'ready' && arbitration.state.arbitrable ? (
            <ArbitrationSession
              audit={loaded.audit}
              projectId={project.id}
              analysisId={current.id}
              arbitration={arbitration}
              onExit={() => setSession(false)}
            />
          ) : (
            <AuditView
              audit={loaded.audit}
              arbitration={<ArbitrationEntry audit={loaded.audit} arbitration={arbitration} onStart={() => setSession(true)} />}
              questionFooter={q => {
                const decision = arbitration.state.status === 'ready' ? arbitration.state.current.get(q.id) : undefined;
                return decision && <CurrentDecision question={q} current={decision} />;
              }}
            />
          )}
        </AuditImagesContext.Provider>
      )}
    </>
  );
}

/**
 * Sous l'annonce du nombre de décisions et de la durée : « Commencer
 * l'arbitrage », ou « Reprendre » s'il y a déjà des décisions. Un audit
 * précédent ne s'arbitre plus : ses décisions se lisent sur chaque question.
 */
function ArbitrationEntry({ audit, arbitration, onStart }: {
  audit: Audit; arbitration: ReturnType<typeof useArbitration>; onStart: () => void;
}) {
  const { state } = arbitration;
  if (state.status === 'loading') return <Skeleton className="obp-arb-entry__loading" />;
  if (state.status === 'error') return null;
  if (!state.arbitrable) {
    return (
      <p className="obp-arb-entry obp-arb-entry--readonly" role="status">
        Audit d'une analyse précédente : ses décisions restent consultables sur chaque question, mais ne se modifient plus.
      </p>
    );
  }
  const steps = groupQuestions(audit.questions.filter(q => questionKind(audit, q) === 'decision'));
  const p = progress(steps, state.current);
  const started = state.current.size > 0;
  return (
    <div className="obp-arb-entry">
      <Button variant="primary" size="md" onClick={onStart}>
        {started ? 'Reprendre l\'arbitrage' : 'Commencer l\'arbitrage'}
      </Button>
      {steps.length > 0 && <span className="obp-muted">{p.done} sur {p.total} {p.total > 1 ? 'décisions prises' : 'décision prise'}</span>}
    </div>
  );
}

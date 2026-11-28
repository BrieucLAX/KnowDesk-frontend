import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Skeleton }   from '../../../../shared/components/ui/Skeleton';
import { Select } from '../../../../shared/components/ui/Select';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { useToast }   from '../../../../shared/lib/useToast';
import { usePolling } from '../../../../shared/lib/usePolling';
import { formatFull } from '../../../../shared/lib/formatDate';
import { getErrorMessage } from '../../../../shared/lib/apiErrors';
import { onboardingApi } from '../../api/onboardingApi';
import { cardTitles, isCorrectionActive, SUPPORTED_CORRECTION_SCHEMAS, type BaseVersion, type OnboardingCorrection } from '../../lib/correction';
import type { Decision } from '../../lib/decisions';
import { cardTitle, codeCheck, NATURES, orderedCards, type ReadingCard } from '../../lib/reading';
import { useBaseReview } from '../../hooks/useBaseReview';
import { normalizeAudit, type Audit } from '../../lib/audit';
import { hasPlan } from '../../lib/plan';
import { PlanTab, type BaseView } from './PlanTab';
import { useStatusSignal } from '../../lib/steps';
import type { OnboardingProject } from '../../types';
import { AuditImagesContext, type AuditImages } from '../audit/AuditSource';
import { BaseReviewView } from './BaseReviewView';
import { CorrectionProgress } from './CorrectionProgress';
import { ValidationPanel } from './ValidationPanel';

/** Intervalle de relecture d'une préparation en cours. */
export const CORRECTION_POLL_MS = 5000;

interface BaseTabProps {
  project:       OnboardingProject;
  /** Ouvre « À clarifier », sur une carte si elle est donnée. */
  onGoToClarify: (cardId?: string) => void;
  /** Ouvre la version propre d'une version validée. */
  onOpenValidation?: (validationId: string) => void;
  /** Ouvre « Créer la base de connaissance » depuis une version validée à jour. */
  onOpenKnowledgeBase?: (validationId: string) => void;
  /** Mode construire (lot D) : module « knowledge », et l'ouverture de la base une fois créée. */
  knowledgeEnabled?: boolean;
  onOpenKnowledge?:  () => void;
  /**
   * Parcours (lot 1 « Socle ») : `plan`, l'étape 4 (le plan, ou la préparation de la correction) ;
   * `articles`, l'étape 5 (les articles rédigés, ou la relecture de la base corrigée).
   */
  view:       BaseView;
  onOpenView: (view: BaseView) => void;
}

type Loaded =
  | { state: 'loading' }
  /** Aucune base : `analysisId`, la dernière analyse réussie s'il y en a une, dont les cartes bloquantes se nomment. */
  | { state: 'none'; analysisId: string | null }
  | { state: 'ready'; analysisId: string; corrections: OnboardingCorrection[] };

/**
 * Étapes 4 et 5 du parcours (lot 1 « Socle »), qui reprennent l'ancien onglet « Nouvelle base ».
 * Mode construire : `PlanTab`. Mode correction : la préparation à l'étape 4, la relecture de la
 * base corrigée à l'étape 5 ; ses écrans sont inchangés.
 *
 * Onglet « Nouvelle base » : la préparation en cours (étapes, avancement), puis la relecture de la
 * dernière base prête. Les bases précédentes de l'analyse se consultent, en lecture seule.
 */
export function BaseTab({ project, onGoToClarify, onOpenValidation, onOpenKnowledgeBase, knowledgeEnabled, onOpenKnowledge, view, onOpenView }: BaseTabProps) {
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
    if (!latest) { setLoaded({ state: 'none', analysisId: null }); return; }
    const { data } = await onboardingApi.listCorrections(project.id, latest.id);
    setLoaded(data.length === 0 ? { state: 'none', analysisId: latest.id } : { state: 'ready', analysisId: latest.id, corrections: data });
  }, [project.id]);

  useEffect(() => {
    refresh().catch(err => { setLoaded({ state: 'none', analysisId: null }); toast.error(getErrorMessage(err)); });
  }, [refresh, toast]);

  const corrections = loaded.state === 'ready' ? loaded.corrections : [];
  const latest = corrections[0] ?? null;
  const succeeded = corrections.filter(c => c.status === 'succeeded');
  usePolling(refresh, CORRECTION_POLL_MS, latest !== null && isCorrectionActive(latest));

  // La dernière base prête, sauf choix d'une précédente.
  const shownId = selected !== null && succeeded.some(c => c.id === selected) ? selected : succeeded[0]?.id ?? null;
  const analysisId = loaded.state === 'loading' ? null : loaded.analysisId;
  const [cards, setCards] = useState<ReadingCard[]>([]);
  const [decisions, setDecisions] = useState<ReadonlyMap<string, Decision>>(new Map());
  /**
   * Mode construire sur un audit 0.16.0 (lot B) : l'onglet montre le plan, avec l'inventaire de
   * l'audit pour nommer les documents. null : pas de plan (correction, ou audit plus ancien) ;
   * undefined : l'audit n'est pas encore lu.
   */
  const [planAudit, setPlanAudit] = useState<Audit | null | undefined>(undefined);

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
      .then(res => {
        if (cancelled) return;
        if (res.reading) { setTitles(cardTitles(res.reading.cards)); setCards(res.reading.cards); }
        setPlanAudit(res.reading && hasPlan(res.schemaVersion, res.reading.base) ? normalizeAudit(res.audit) : null);
      })
      .catch(() => { if (!cancelled) setPlanAudit(null); });
    // Les réponses courantes : cartes encore bloquantes (écran vide), réponse d'une carte en attente.
    onboardingApi.listDecisions(project.id, analysisId)
      .then(res => { if (!cancelled) setDecisions(new Map(res.decisions.map(d => [d.cardId ?? d.questionId, d]))); })
      .catch(() => {});
    onboardingApi.listAuditImages(project.id, analysisId)
      .then(list => { if (!cancelled) setImageIds(new Set(list.map(i => i.imageId))); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [project.id, analysisId]);

  // Préparation de la correction terminée (base corrigée prête, ou échec) : la page relit le statut.
  useStatusSignal(loaded.state === 'loading' ? undefined : latest?.status ?? null);

  const loadImage = useCallback(
    (imageId: string) => onboardingApi.getAuditImage(project.id, analysisId ?? '', imageId),
    [project.id, analysisId],
  );
  const images = useMemo<AuditImages>(() => ({ available: imageIds, load: loadImage }), [imageIds, loadImage]);
  const review = useBaseReview(project.id, base?.correctionId ?? null);
  /** Audit 0.11.0 : les cartes « Contenu périmé », dont les retraits acceptés se listent à part. */
  const outdatedCardIds = useMemo(
    () => new Set(cards.filter(c => codeCheck(c)?.kind === 'outdated_content').map(c => c.id)),
    [cards],
  );

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
  // Le plan d'une base à construire (lot B) : il prend la place de la préparation.
  if (analysisId !== null && planAudit === undefined) return <Skeleton className="obp-skeleton-block" />;
  if (analysisId !== null && planAudit) {
    return <AuditImagesContext.Provider value={images}>
      <PlanTab
        projectId={project.id} analysisId={analysisId} audit={planAudit} cards={cards} onGoToClarify={onGoToClarify}
        knowledgeEnabled={knowledgeEnabled} onOpenKnowledge={onOpenKnowledge} view={view} onOpenView={onOpenView}
      />
    </AuditImagesContext.Provider>;
  }
  if (loaded.state === 'none' && view === 'articles') {
    return (
      <EmptyState
        title="Aucun article à relire pour l'instant"
        description="Les articles apparaissent ici une fois le plan préparé et les articles rédigés."
        ctaLabel="Aller au plan"
        onCta={() => onOpenView('plan')}
      />
    );
  }
  if (loaded.state === 'none') {
    // Les cartes qui bloquent encore la préparation, nommées, chacune ouvrable (plan v4, point 12).
    const blocking = orderedCards(cards)
      .map((c, i) => ({ card: c, title: cardTitle(c, i + 1) }))
      .filter(({ card }) => {
        const d = decisions.get(card.id);
        return NATURES[card.nature].blocking && (!d || d.action.type === 'later');
      });
    return (
      <>
        <EmptyState
          title="Rien de préparé pour l'instant"
          description="Le plan se prépare depuis « Questions », une fois que toutes les questions bloquantes ont une réponse."
          ctaLabel="Aller à « Questions »"
          onCta={() => onGoToClarify()}
        />
        {blocking.length > 0 && (
          <section className="obp-base-blocking" aria-label="Cartes qui bloquent la préparation">
            <p className="obp-base-blocking__head">
              {blocking.length > 1 ? `${blocking.length} cartes bloquent encore la préparation :` : '1 carte bloque encore la préparation :'}
            </p>
            <ul>
              {blocking.map(({ card, title }) => (
                <li key={card.id}>
                  <button type="button" className="obp-link" onClick={() => onGoToClarify(card.id)}>{title}</button>
                  {decisions.get(card.id)?.action.type === 'later' && <span className="obp-muted"> · laissée « Plus tard »</span>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </>
    );
  }

  const showProgress = latest !== null && latest.status !== 'succeeded';
  // Étape 4, mode correction : la préparation de la base corrigée ; prête, la suite est à l'étape 5.
  if (view === 'plan') {
    return showProgress
      ? <CorrectionProgress correction={latest} onRetry={latest.status === 'failed' ? retry : undefined} retrying={retrying} />
      : <p className="obp-muted" role="status">La base corrigée est prête : relisez-la à l'étape suivante.</p>;
  }
  if (succeeded.length === 0) {
    return (
      <EmptyState
        title="La base corrigée n'est pas encore prête"
        description="Elle apparaît ici une fois sa préparation terminée."
        ctaLabel="Voir la préparation"
        onCta={() => onOpenView('plan')}
      />
    );
  }
  return (
    <>

      {succeeded.length > 0 && (
        <div className="obp-audit-head">
          <h2 className="obp-section-title">Nouvelle base du {formatFull(succeeded.find(c => c.id === shownId)?.finishedAt ?? null)}</h2>
          {succeeded.length > 1 && (
            <label className="obp-audit-picker">
              <span className="obp-muted">Version</span>
              <Select value={shownId ?? ''} onChange={e => setSelected(e.target.value)}>
                {succeeded.map((c, i) => (
                  <option key={c.id} value={c.id}>{formatFull(c.finishedAt)}{i === 0 ? ' (la plus récente)' : ''}</option>
                ))}
              </Select>
            </label>
          )}
        </div>
      )}
      {shownId !== null && base === null && <Skeleton className="obp-skeleton-block" />}
      {base !== null && base.correctionId === shownId && (
        !SUPPORTED_CORRECTION_SCHEMAS.includes(base.schemaVersion) ? (
          <p className="obp-audit-unsupported" role="status">
            Cette base est dans un format que cette version de l'application ne sait pas afficher.
          </p>
        ) : (
          <AuditImagesContext.Provider value={images}>
            {review.state.status === 'ready' && onOpenValidation && (
              <ValidationPanel
                projectId={project.id}
                correctionId={base.correctionId}
                reviews={review.state.reviews}
                fixes={review.state.fixes}
                toReview={review.state.toReview}
                editable={base.reviewable}
                onOpen={onOpenValidation}
                onCreateKnowledgeBase={onOpenKnowledgeBase}
              />
            )}
            <BaseReviewView base={base.base} cardTitles={titles} decisions={decisions} onGoToClarify={onGoToClarify} editable={base.reviewable} review={review}
              outdatedCardIds={outdatedCardIds} />
          </AuditImagesContext.Provider>
        )
      )}
    </>
  );
}

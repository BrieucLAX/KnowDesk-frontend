import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Button } from '../../../../shared/components/ui/Button';
import { Select } from '../../../../shared/components/ui/Select';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';
import { useToast } from '../../../../shared/lib/useToast';
import { usePolling } from '../../../../shared/lib/usePolling';
import { formatFull } from '../../../../shared/lib/formatDate';
import { getErrorMessage } from '../../../../shared/lib/apiErrors';
import { ApiError } from '../../../../shared/lib/apiClient';
import { onboardingApi } from '../../api/onboardingApi';
import type { Audit } from '../../lib/audit';
import { cardTitle, orderedCards, type ReadingCard } from '../../lib/reading';
import {
  isPlanActive, PLAN_COMMENT_HINT, PLAN_STEPS, planFailureMessage, planStepStates, planDocumentCount, planSummary, readPlan,
  SUPPORTED_PLAN_SCHEMAS, type OnboardingPlan, type Plan, type PlanComment, type PlanContent, type PlanSubject,
} from '../../lib/plan';
import {
  isBuildActive, readConstruction, SUPPORTED_BUILD_SCHEMAS, type BuildComment, type BuildContent, type BuildsMeta, type OnboardingBuild,
} from '../../lib/build';
import { AuditSource } from '../audit/AuditSource';
import { AudienceFilter, AudienceTag } from './Audience';
import { hasAudiences, matchesAudience, type AudienceFilter as Filter } from '../../lib/audience';
import { BuildArticles, BuildEntry, BuildProgress } from './BuildView';
import { editCountLabel, PLAN_EDIT_CONFLICT, type PlanEditOp, type PlanEditsState } from '../../lib/planEdits';
import { EditsPanel, GoneSection, ModifiedTag, useEditDialogs, type PlanEditor } from './PlanEditing';
import { KnowDeskMention } from '../../../../shared/components/ui/Origin';
import { fromDocuments } from '../../lib/format';
import { useStatusSignal } from '../../lib/steps';

/** Intervalle de relecture d'un plan en préparation. */
export const PLAN_POLL_MS = 5000;

/** Intervalle de relecture d'une rédaction en cours (lot C). */
export const BUILD_POLL_MS = 5000;

/** Étape 4 (le plan) ou étape 5 (les articles rédigés) du parcours. */
export type BaseView = 'plan' | 'articles';

const STEP_STATE_LABEL = { done: 'terminée', current: 'en cours', pending: 'à venir' } as const;

interface PlanTabProps {
  projectId:     string;
  analysisId:    string;
  /** L'inventaire de l'audit : les documents nommés par leur nom de fichier. */
  audit:         Audit;
  cards:         ReadingCard[];
  /** Ouvre « À clarifier », sur une carte si elle est donnée. */
  onGoToClarify: (cardId?: string) => void;
  /** Lot D : module « knowledge » de l'organisation, et l'ouverture de la base une fois créée. */
  knowledgeEnabled?: boolean;
  onOpenKnowledge?:  () => void;
  /** Parcours (lot 1 « Socle ») : la partie montrée, et l'ouverture de l'autre étape. */
  view:       BaseView;
  onOpenView: (view: BaseView) => void;
}

/**
 * Parcours (lot 1 « Socle ») : l'ancien onglet « Nouvelle base » est partagé entre l'étape 4
 * (`view: 'plan'` : le plan, sa modification et le lancement de la rédaction) et l'étape 5
 * (`view: 'articles'` : la rédaction, les articles rédigés et la création de la base) ; les deux
 * vues ne sont plus des onglets internes.
 *
 * Onglet « Nouvelle base » en mode construire (plan-construire-v1, lot B) : le plan en préparation
 * (étapes), puis le plan prêt, en lecture seule (D7) : ses points d'attention, ses chapitres et
 * sujets avec leurs sources, les cartes rattachées, et les commentaires (un par sujet, un pour le
 * plan, B-Q3). Lot C : deux vues, « Plan » et « Articles rédigés » (C-Q11 : plus de « Points non
 * couverts ») ; la rédaction se lance sous le plan, depuis le plan le plus récent (C-Q1 : réponses
 * inchangées).
 *
 * Étape 4 (décisions du porteur du 2026-11-22) : le dernier plan réussi se modifie (« Modifier le
 * plan ») ; l'écran montre alors le plan modifié que le back rend, les mentions « Modifié », le
 * panneau « Vos modifications », la section « Retirés ou réunis », et un lien vers le plan proposé.
 * Sans la route (back d'avant), le plan se lit comme avant.
 */
export function PlanTab({ projectId, analysisId, audit, cards, onGoToClarify, knowledgeEnabled, onOpenKnowledge, view, onOpenView }: PlanTabProps) {
  const toast = useToast();
  const [plans,    setPlans]    = useState<OnboardingPlan[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [content,  setContent]  = useState<PlanContent | null>(null);
  const [comments, setComments] = useState<PlanComment[]>([]);
  const [builds,   setBuilds]   = useState<OnboardingBuild[] | null>(null);
  const [buildsMeta, setBuildsMeta] = useState<BuildsMeta | null>(null);
  const [buildContent, setBuildContent] = useState<BuildContent | null>(null);
  const [buildComments, setBuildComments] = useState<BuildComment[]>([]);
  const [launching, setLaunching] = useState(false);
  const [edits,    setEdits]    = useState<PlanEditsState | null>(null);
  const [editing,  setEditing]  = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [showProposed, setShowProposed] = useState(false);

  const refresh = useCallback(async () => {
    const res = await onboardingApi.listPlans(projectId, analysisId);
    setPlans(res.data);
  }, [projectId, analysisId]);

  useEffect(() => {
    refresh().catch(err => { setPlans([]); toast.error(getErrorMessage(err)); });
  }, [refresh, toast]);

  const latest = plans?.[0] ?? null;
  const succeeded = (plans ?? []).filter(p => p.status === 'succeeded');
  usePolling(refresh, PLAN_POLL_MS, latest !== null && isPlanActive(latest));
  const shownId = selected !== null && succeeded.some(p => p.id === selected) ? selected : succeeded[0]?.id ?? null;

  useEffect(() => {
    setEdits(null); setEditing(false); setShowProposed(false);
    if (shownId === null) { setContent(null); setComments([]); return; }
    let cancelled = false;
    setContent(null);
    // Le plan modifié ; en silence sans la route (back d'avant l'étape 4) : le plan proposé se lit.
    onboardingApi.getPlanEdits(projectId, shownId)
      .then(e => { if (!cancelled) setEdits(e); })
      .catch(() => { if (!cancelled) setEdits(null); });
    onboardingApi.getPlanContent(projectId, shownId)
      .then(c => { if (!cancelled) setContent(c); })
      .catch(err => { if (!cancelled) toast.error(getErrorMessage(err)); });
    onboardingApi.listPlanComments(projectId, shownId)
      .then(c => { if (!cancelled) setComments(c); })
      .catch(() => { if (!cancelled) setComments([]); });
    return () => { cancelled = true; };
  }, [projectId, shownId, toast]);

  // Rédactions du plan affiché (lot C) : la liste, puis la plus récente réussie.
  const refreshBuilds = useCallback(async () => {
    if (shownId === null) return;
    const res = await onboardingApi.listBuilds(projectId, shownId);
    setBuilds(res.data);
    setBuildsMeta(res.meta);
  }, [projectId, shownId]);

  useEffect(() => {
    setBuilds(null); setBuildsMeta(null);
    if (shownId === null) return;
    refreshBuilds().catch(() => { setBuilds([]); setBuildsMeta(null); });
  }, [refreshBuilds, shownId]);

  const latestBuild = builds?.[0] ?? null;
  // Rédaction lancée, terminée ou en échec : la page relit le statut du projet.
  useStatusSignal(builds === null ? undefined : latestBuild?.status ?? null);
  usePolling(refreshBuilds, BUILD_POLL_MS, latestBuild !== null && isBuildActive(latestBuild));
  const shownBuildId = (builds ?? []).find(b => b.status === 'succeeded')?.id ?? null;

  useEffect(() => {
    if (shownBuildId === null) { setBuildContent(null); setBuildComments([]); return; }
    let cancelled = false;
    onboardingApi.getBuildContent(projectId, shownBuildId)
      .then(c => { if (!cancelled) setBuildContent(c); })
      .catch(err => { if (!cancelled) toast.error(getErrorMessage(err)); });
    onboardingApi.listBuildComments(projectId, shownBuildId)
      .then(c => { if (!cancelled) setBuildComments(c); })
      .catch(() => { if (!cancelled) setBuildComments([]); });
    return () => { cancelled = true; };
  }, [projectId, shownBuildId, toast]);

  const construction = useMemo(
    () => (buildContent !== null && buildContent.buildId === shownBuildId && SUPPORTED_BUILD_SCHEMAS.includes(buildContent.schemaVersion)
      ? readConstruction(buildContent.construction) : null),
    [buildContent, shownBuildId],
  );

  if (plans === null) return <Skeleton className="obp-skeleton-block" />;
  if (plans.length === 0) {
    return (
      <EmptyState
        title="Aucun plan pour l'instant"
        description="Le plan de la nouvelle base se prépare depuis « Questions », une fois que toutes les questions bloquantes ont une réponse."
        ctaLabel="Aller à « Questions »"
        onCta={() => onGoToClarify()}
      />
    );
  }

  const showProgress = latest !== null && latest.status !== 'succeeded';
  const supported = content !== null && content.planId === shownId && SUPPORTED_PLAN_SCHEMAS.includes(content.schemaVersion);
  const shownEdits = edits !== null && edits.planId === shownId ? edits : null;
  const proposed = supported ? readPlan(content.plan) : null;
  const modified = supported && shownEdits !== null ? readPlan(shownEdits.plan) : null;
  const plan = showProposed || modified === null ? proposed : modified;
  const canEdit = shownEdits !== null && shownEdits.editable && content?.commentable === true && !showProposed;

  const reloadEdits = async () => {
    if (shownId === null) return;
    setEdits(await onboardingApi.getPlanEdits(projectId, shownId));
  };
  /** Envoie une modification ; vrai si elle est enregistrée. Un conflit recharge le plan modifié. */
  const runEdit = async (work: (head: string | null) => Promise<PlanEditsState>): Promise<boolean> => {
    if (shownEdits === null) return false;
    setEditBusy(true);
    try {
      setEdits(await work(shownEdits.headId));
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err));
      if (err instanceof ApiError && err.code === PLAN_EDIT_CONFLICT) void reloadEdits().catch(() => {});
      return false;
    } finally {
      setEditBusy(false);
    }
  };
  const editor: PlanEditor | undefined = shownEdits === null || showProposed ? undefined : {
    editing: editing && canEdit,
    busy:    editBusy,
    changedChapters: new Set(shownEdits.changedChapterIds),
    changedSubjects: new Set(shownEdits.changedSubjectIds),
    apply:   (op: PlanEditOp) => runEdit(head => onboardingApi.editPlan(projectId, shownEdits.planId, head, op)),
  };
  const editCount = shownEdits?.editCount ?? 0;
  const onSaved = (saved: PlanComment) =>
    setComments(list => [...list.filter(c => c.subjectId !== saved.subjectId), saved]);
  const onCancelled = (subjectId: string | null, current: PlanComment | null) =>
    setComments(list => [...list.filter(c => c.subjectId !== subjectId), ...(current ? [current] : [])]);
  const onBuildSaved = (saved: BuildComment) =>
    setBuildComments(list => [...list.filter(c => c.subjectId !== saved.subjectId), saved]);
  const onBuildCancelled = (subjectId: string | null, current: BuildComment | null) =>
    setBuildComments(list => [...list.filter(c => c.subjectId !== subjectId), ...(current ? [current] : [])]);

  const launchBuild = async () => {
    if (shownId === null) return;
    setLaunching(true);
    try {
      await onboardingApi.launchBuild(projectId, shownId);
      await refreshBuilds();
      onOpenView('articles');
    } catch (err) {
      toast.error(getErrorMessage(err));
      void refreshBuilds().catch(() => {});
    } finally {
      setLaunching(false);
    }
  };

  const titles = new Map(orderedCards(cards).map((c, i) => [c.id, cardTitle(c, i + 1)]));
  const ctx = {
    audit,
    cardTitle: (id: string) => titles.get(id) ?? 'une carte',
    onGoToClarify,
  };
  const buildProgress = latestBuild !== null && latestBuild.status !== 'succeeded'
    ? <BuildProgress build={latestBuild} onBackToPlan={() => onOpenView('plan')} /> : null;
  const noArticles = (
    <EmptyState
      title="Aucun article rédigé pour l'instant"
      description="La rédaction se lance sous le plan, une fois le plan prêt."
      ctaLabel="Revenir au plan"
      onCta={() => onOpenView('plan')}
    />
  );
  const shownBuild = (builds ?? []).find(b => b.id === shownBuildId) ?? null;
  const builtEdits = shownBuild?.planEditCount ?? 0;
  const builtHead = shownBuildId !== null && (
    <h2 className="obp-section-title">
      Articles rédigés le {formatFull(shownBuild?.finishedAt ?? null)}, à partir du plan
      du {formatFull(succeeded.find(p => p.id === shownId)?.finishedAt ?? null)}
      {builtEdits > 0 && `, modifié (${editCountLabel(builtEdits)})`}
    </h2>
  );
  const constructionBody = (body: (c: NonNullable<typeof construction>) => React.ReactNode) => {
    if (shownBuildId === null) return buildProgress ? null : noArticles;
    if (buildContent === null || buildContent.buildId !== shownBuildId) return <Skeleton className="obp-skeleton-block" />;
    if (construction === null) {
      return (
        <p className="obp-audit-unsupported" role="status">
          Cette rédaction est dans un format que cette version de l'application ne sait pas afficher.
        </p>
      );
    }
    return body(construction);
  };

  return (
    <>
      {view === 'plan' && showProgress && <PlanProgress plan={latest} onGoToClarify={onGoToClarify} />}
      {view === 'articles' && succeeded.length === 0 && noArticles}

      {view === 'plan' && succeeded.length > 0 && (
        <div className="obp-audit-head">
          <h2 className="obp-section-title">Plan du {formatFull(succeeded.find(p => p.id === shownId)?.finishedAt ?? null)}</h2>
          {canEdit && view === 'plan' && (
            <Button variant={editing ? 'primary' : 'secondary'} size="md" onClick={() => setEditing(e => !e)}>
              {editing ? 'Terminer les modifications' : 'Modifier le plan'}
            </Button>
          )}
          {succeeded.length > 1 && (
            <label className="obp-audit-picker">
              <span className="obp-muted">Version</span>
              <Select value={shownId ?? ''} onChange={e => setSelected(e.target.value)}>
                {succeeded.map((p, i) => (
                  <option key={p.id} value={p.id}>{formatFull(p.finishedAt)}{i === 0 ? ' (la plus récente)' : ''}</option>
                ))}
              </Select>
            </label>
          )}
        </div>
      )}
      {shownId !== null && content === null && <Skeleton className="obp-skeleton-block" />}
      {content !== null && content.planId === shownId && (
        plan === null ? (
          <p className="obp-audit-unsupported" role="status">
            Ce plan est dans un format que cette version de l'application ne sait pas afficher.
          </p>
        ) : (
          <>
            <div className="obp-build-panel">
              {view === 'plan' && shownEdits !== null && editCount > 0 && (
                <p className="obp-plan-modified-note" role="status">
                  {showProposed
                    ? 'Vous voyez le plan proposé par Knowdesk, sans vos modifications. '
                    : `Plan modifié par vous : ${editCountLabel(editCount)}. `}
                  <button type="button" className="obp-link" onClick={() => { setShowProposed(v => !v); setEditing(false); }}>
                    {showProposed ? 'Voir le plan modifié' : 'Voir le plan proposé'}
                  </button>
                </p>
              )}
              {view === 'plan' && shownEdits !== null && !showProposed && (editing || editCount > 0) && (
                <EditsPanel
                  state={shownEdits} busy={editBusy}
                  onUndo={() => { void runEdit(head => onboardingApi.undoPlanEdit(projectId, shownEdits.planId, head)); }}
                  onReset={() => { void runEdit(head => onboardingApi.resetPlanEdits(projectId, shownEdits.planId, head)); }}
                />
              )}
              {view === 'plan' && (
                <PlanView
                  projectId={projectId} planId={content.planId} plan={plan} audit={audit} cards={cards}
                  comments={comments} commentable={content.commentable}
                  onSaved={onSaved} onCancelled={onCancelled} onGoToClarify={onGoToClarify}
                  editor={editor}
                  gone={shownEdits !== null && !showProposed
                    ? <GoneSection gone={shownEdits.gone} titles={new Map((proposed?.chapters ?? []).flatMap(c => c.subjects).map(s => [s.id, s.title] as const))} current={plan} comments={comments} />
                    : null}
                  footer={
                    <BuildEntry
                      articleCount={plan.subjectCount} builds={builds} meta={buildsMeta} launching={launching}
                      onLaunch={() => { void launchBuild(); }} onOpenArticles={() => onOpenView('articles')}
                    />
                  }
                />
              )}
              {view === 'articles' && (
                <>
                  {buildProgress}
                  {builtHead}
                  {constructionBody(c => (
                    <BuildArticles
                      projectId={projectId} buildId={shownBuildId!} construction={c} comments={buildComments}
                      commentable={buildContent!.commentable}
                      onSaved={onBuildSaved} onCancelled={onBuildCancelled} {...ctx}
                      knowledgeEnabled={knowledgeEnabled} onOpenKnowledge={onOpenKnowledge}
                    />
                  ))}
                </>
              )}
            </div>
          </>
        )
      )}
    </>
  );
}

/** Préparation du plan : étapes, avancement i/n, ou l'échec en clair. */
export function PlanProgress({ plan, onGoToClarify }: { plan: OnboardingPlan; onGoToClarify: (cardId?: string) => void }) {
  const states = planStepStates(plan);
  return (
    <section className="obp-analysis" aria-labelledby="obp-plan-progress-title">
      <h2 id="obp-plan-progress-title" className="obp-section-title">
        {plan.status === 'queued' && 'Plan en attente de démarrage'}
        {plan.status === 'running' && 'Plan en préparation'}
        {plan.status === 'succeeded' && 'Plan prêt'}
        {plan.status === 'failed' && 'Préparation du plan interrompue'}
      </h2>
      {plan.status === 'queued' && (
        <p className="obp-muted">Le service traite un travail à la fois : le plan démarre dès qu'il est libre.</p>
      )}
      <ol className="obp-steps" aria-live="polite">
        {PLAN_STEPS.map((step, i) => {
          const state = states[i];
          const showCounts = step.counts && state === 'current' && plan.total > 0;
          return (
            <li key={step.label} className={`obp-step obp-step--${state}`} aria-current={state === 'current' ? 'step' : undefined}>
              <span className="obp-step__marker" aria-hidden="true" />
              <span className="obp-step__label">{step.label}</span>
              {showCounts && <span className="obp-step__count">{plan.done} / {plan.total}</span>}
              <span className="sr-only"> : {STEP_STATE_LABEL[state]}</span>
            </li>
          );
        })}
      </ol>
      {isPlanActive(plan) && (
        <p className="obp-analysis__note">Vous pouvez fermer cette page : la préparation continue, et vous la retrouverez ici.</p>
      )}
      {plan.status === 'failed' && (
        <>
          <p className="obp-analysis__error" role="alert">{planFailureMessage(plan.errorCode)}</p>
          <Button variant="secondary" size="md" onClick={() => onGoToClarify()}>Aller à « Questions »</Button>
        </>
      )}
    </section>
  );
}

interface PlanViewProps {
  projectId:     string;
  planId:        string;
  plan:          Plan;
  audit:         Audit;
  cards:         ReadingCard[];
  comments:      PlanComment[];
  commentable:   boolean;
  onSaved:       (saved: PlanComment) => void;
  onCancelled:   (subjectId: string | null, current: PlanComment | null) => void;
  onGoToClarify: (cardId?: string) => void;
  /** Le bas du plan : la rédaction des articles (lot C). */
  footer?:       React.ReactNode;
  /** Le plan modifié (étape 4) : mentions « Modifié », et les outils en mode modification. */
  editor?:       PlanEditor;
  /** Les articles retirés ou réunis, avec leurs commentaires (étape 4). */
  gone?:         React.ReactNode;
}

/** Le plan prêt, en lecture seule : points d'attention, chapitres, sujets, commentaires. */
export function PlanView({ projectId, planId, plan, audit, cards, comments, commentable, onSaved, onCancelled, onGoToClarify, footer, editor, gone }: PlanViewProps) {
  const titles = new Map(orderedCards(cards).map((c, i) => [c.id, cardTitle(c, i + 1)]));
  const subjectTitles = new Map(plan.chapters.flatMap(c => c.subjects).map(s => [s.id, s.title]));
  const commentOf = (subjectId: string | null) => comments.find(c => c.subjectId === subjectId) ?? null;
  const box = (subjectId: string | null, label: string) => (
    <PlanCommentBox
      projectId={projectId} planId={planId} subjectId={subjectId} label={label}
      current={commentOf(subjectId)} editable={commentable} onSaved={onSaved} onCancelled={onCancelled}
    />
  );

  const [filterChoice, setFilter] = useState<Filter>('all');
  const editing = editor?.editing === true;
  // En modification, tout le plan se voit : les monter / descendre portent sur l'ordre entier.
  const filter: Filter = editing ? 'all' : filterChoice;
  const audiences = !editing && hasAudiences(plan.chapters.flatMap(c => c.subjects.map(s => s.audience)));
  const { chapterTools, subjectTools, dialogs } = useEditDialogs(plan, editor);
  return (
    <div className="obp-plan">
      <KnowDeskMention>{`Plan préparé par KnowDesk${fromDocuments(planDocumentCount(plan))}`}</KnowDeskMention>
      <p className="obp-plan__summary">{planSummary(plan)}</p>
      {!commentable && (
        <p className="obp-muted" role="status">Ce plan a été remplacé par un plus récent : il se consulte, mais ne se commente plus.</p>
      )}

      <section className="obp-plan-attention" aria-label="Points d'attention">
        <h3 className="obp-plan-attention__title">Points d'attention</h3>

        <div className="obp-plan-attention__group">
          <h4>Documents écartés comme obsolètes{plan.retired !== null && ` (${plan.retired.length})`}</h4>
          {plan.retired === null ? (
            <p className="obp-muted">Non disponible : cette analyse n'a pas recherché les documents remplacés par une nouvelle version.</p>
          ) : plan.retired.length === 0 ? (
            <p className="obp-muted">Aucun document remplacé par une nouvelle version que vous avez confirmée.</p>
          ) : (
            <ul>
              {plan.retired.map(r => (
                <li key={`${r.documentPath}-${r.cardId}`}>
                  <strong>{r.documentPath}</strong> : remplacé par {r.replacedByPath}, confirmé par vous
                  {' '}(<button type="button" className="obp-link" onClick={() => onGoToClarify(r.cardId)}>voir la carte</button>).
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="obp-plan-attention__group">
          <h4>Passages sans article ({plan.uncovered.length})</h4>
          {plan.uncovered.length === 0 ? (
            <p className="obp-muted">Chaque passage de vos documents est couvert par un article.</p>
          ) : (
            <details>
              <summary>Voir les passages</summary>
              <ul>
                {plan.uncovered.map((u, i) => (
                  <li key={`${u.documentId}-${i}`}>
                    <strong>{u.documentPath}</strong> › {u.where} : {u.reason}
                    <blockquote className="obp-plan__excerpt">{u.excerpt}</blockquote>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>

        <div className="obp-plan-attention__group">
          <h4>Articles réunis ({plan.merged.length})</h4>
          {plan.merged.length > 0 && <KnowDeskMention>Réunis par KnowDesk</KnowDeskMention>}
          {plan.merged.length === 0 ? (
            <p className="obp-muted">Aucun article en double.</p>
          ) : (
            <ul>
              {plan.merged.map(m => (
                <li key={m.subjectId}>
                  {m.titles.map(t => `« ${t} »`).join(' et ')} : mêmes passages, un seul article
                  {subjectTitles.has(m.subjectId) && <> (« {subjectTitles.get(m.subjectId)} »)</>}.
                </li>
              ))}
            </ul>
          )}
        </div>

        {(plan.unattachedCardIds.length > 0 || plan.rejectedTitles.length > 0 || plan.unverifiedQuotes > 0) && (
          <div className="obp-plan-attention__group">
            <h4>À savoir</h4>
            <ul>
              {plan.unattachedCardIds.length > 0 && (
                <li>
                  {plan.unattachedCardIds.length > 1 ? `${plan.unattachedCardIds.length} cartes ne sont rattachées à aucun article : ` : 'Une carte n\'est rattachée à aucun article : '}
                  {plan.unattachedCardIds.map((id, i) => (
                    <React.Fragment key={id}>{i > 0 && ', '}
                      <button type="button" className="obp-link" onClick={() => onGoToClarify(id)}>{titles.get(id) ?? 'une carte'}</button>
                    </React.Fragment>
                  ))}.
                </li>
              )}
              {plan.rejectedTitles.length > 0 && (
                <li>Articles proposés sans source vérifiable, écartés : {plan.rejectedTitles.map(t => `« ${t} »`).join(', ')}.</li>
              )}
              {plan.unverifiedQuotes > 0 && (
                <li>{plan.unverifiedQuotes > 1 ? `${plan.unverifiedQuotes} citations introuvables dans vos documents ont été écartées.` : 'Une citation introuvable dans vos documents a été écartée.'}</li>
              )}
            </ul>
          </div>
        )}
      </section>

      {audiences && (
        <AudienceFilter values={plan.chapters.flatMap(c => c.subjects.map(s => s.audience))} value={filter} onChange={setFilter} />
      )}
      {plan.chapters.map((chapter, ci) => ({ chapter, ci, shown: chapter.subjects.filter(s => matchesAudience(s.audience, filter)) }))
        .filter(x => x.shown.length > 0).map(({ chapter, ci, shown }) => (
        <details key={chapter.id} className="obp-plan-chapter" open={ci === 0 || filter !== 'all' || editing}>
          <summary className="obp-plan-chapter__title">
            Catégorie {ci + 1} · {chapter.title}
            {editor?.changedChapters.has(chapter.id) && <> <ModifiedTag /></>}
          </summary>
          {chapterTools(chapter)}
          {shown.map(subject => (
            <SubjectBlock
              key={subject.id} subject={subject} audit={audit} titles={titles} onGoToClarify={onGoToClarify}
              modified={editor?.changedSubjects.has(subject.id) === true} tools={subjectTools(chapter, subject)}
            >
              {!editing && box(subject.id, 'Commentaire sur cet article (facultatif)')}
            </SubjectBlock>
          ))}
        </details>
      ))}
      {dialogs}

      {gone}

      {!editing && (
        <section className="obp-plan__whole" aria-label="Commentaire sur le plan">
          {box(null, 'Commentaire sur le plan (facultatif)')}
        </section>
      )}

      {footer ?? (
        <p className="obp-plan__next">
          Vous pouvez encore modifier vos réponses dans « Questions », puis préparer le plan à nouveau.
        </p>
      )}
    </div>
  );
}

function SubjectBlock({ subject, audit, titles, onGoToClarify, children, modified = false, tools }: {
  subject: PlanSubject; audit: Audit; titles: ReadonlyMap<string, string>;
  onGoToClarify: (cardId?: string) => void; children: React.ReactNode;
  modified?: boolean; tools?: React.ReactNode;
}) {
  return (
    <article className="obp-plan-subject">
      <h4 className="obp-plan-subject__title">{subject.title}{modified && <> <ModifiedTag /></>}</h4>
      {tools}
      <p className="obp-plan-subject__meta">
        <span>Cet article répondra à : {subject.question}</span>
        <AudienceTag value={subject.audience} />
      </p>
      <details className="obp-plan-subject__sources">
        <summary>Sources ({subject.sources.length})</summary>
        {subject.sources.map((s, i) => <AuditSource key={i} audit={audit} source={s} />)}
      </details>
      {subject.cardIds.length > 0 && (
        <p className="obp-plan-subject__cards">
          Cartes liées ({subject.cardIds.length}) :{' '}
          {subject.cardIds.map((id, i) => (
            <React.Fragment key={id}>{i > 0 && ', '}
              <button type="button" className="obp-link" onClick={() => onGoToClarify(id)}>{titles.get(id) ?? 'une carte'}</button>
            </React.Fragment>
          ))}
        </p>
      )}
      {children}
    </article>
  );
}

interface PlanCommentBoxProps {
  projectId:   string;
  planId:      string;
  subjectId:   string | null;
  label:       string;
  current:     PlanComment | null;
  editable:    boolean;
  onSaved:     (saved: PlanComment) => void;
  onCancelled: (subjectId: string | null, current: PlanComment | null) => void;
  /** Enregistrement et annulation ailleurs que sur le plan (la rédaction, lot C) ; le plan par défaut. */
  submit?:     (body: { subjectId: string | null; expectedCurrentId: string | null; comment: string }) => Promise<PlanComment>;
  cancel?:     (commentId: string) => Promise<{ current: PlanComment | null }>;
  hint?:       string;
}

/**
 * Commentaire sur un sujet, ou sur le plan entier (B-Q3) : lu par l'équipe, jamais envoyé au
 * pipeline, jamais dans la base. Un nouveau commentaire remplace le courant ; « Retirer » l'annule.
 */
export function PlanCommentBox({ projectId, planId, subjectId, label, current, editable, onSaved, onCancelled, submit, cancel, hint }: PlanCommentBoxProps) {
  const id = useId();
  const [text, setText] = useState(current?.comment ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setText(current?.comment ?? ''); }, [current?.id, current?.comment]);

  if (!editable) {
    return current
      ? <p className="obp-clarify-comment">Commentaire : {current.comment} <span className="obp-muted">— {current.author.name}, {formatFull(current.createdAt)}</span></p>
      : null;
  }

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try { await work(); } catch (err) {
      setError(err instanceof Error ? err.message : 'Le commentaire n\'a pas pu être enregistré.');
    } finally { setBusy(false); }
  };
  const save = () => run(async () => {
    const body = { subjectId, expectedCurrentId: current?.id ?? null, comment: text.trim() };
    onSaved(await (submit ? submit(body) : onboardingApi.commentPlan(projectId, planId, body)));
  });
  const remove = () => run(async () => {
    const res = await (cancel ? cancel(current!.id) : onboardingApi.cancelPlanComment(projectId, planId, current!.id));
    onCancelled(subjectId, res.current);
  });
  const changed = text.trim() !== (current?.comment ?? '') && text.trim() !== '';

  return (
    <div className="obp-clarify-comment">
      <label htmlFor={id} className="obp-base-label">{label}</label>
      <textarea id={id} className="obp-base-textarea" rows={2} maxLength={5000} value={text} onChange={e => setText(e.target.value)} />
      <p className="obp-muted">{hint ?? PLAN_COMMENT_HINT}</p>
      {current && <p className="obp-muted">Commentaire enregistré par {current.author.name}, {formatFull(current.createdAt)}.</p>}
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="obp-decision__actions">
        <Button variant="secondary" size="sm" loading={busy} disabled={!changed} onClick={() => void save()}>Enregistrer le commentaire</Button>
        {current && <Button variant="ghost" size="sm" disabled={busy} onClick={() => void remove()}>Retirer le commentaire</Button>}
      </div>
    </div>
  );
}

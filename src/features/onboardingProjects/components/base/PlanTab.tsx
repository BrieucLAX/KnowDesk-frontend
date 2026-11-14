import React, { useCallback, useEffect, useId, useState } from 'react';
import { Button } from '../../../../shared/components/ui/Button';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';
import { useToast } from '../../../../shared/lib/useToast';
import { usePolling } from '../../../../shared/lib/usePolling';
import { formatFull } from '../../../../shared/lib/formatDate';
import { getErrorMessage } from '../../../../shared/lib/apiErrors';
import { onboardingApi } from '../../api/onboardingApi';
import type { Audit } from '../../lib/audit';
import { cardTitle, orderedCards, type ReadingCard } from '../../lib/reading';
import {
  isPlanActive, PLAN_COMMENT_HINT, PLAN_STEPS, planFailureMessage, planStepStates, planSummary, readPlan,
  SUPPORTED_PLAN_SCHEMAS, type OnboardingPlan, type Plan, type PlanComment, type PlanContent, type PlanSubject,
} from '../../lib/plan';
import { AuditSource } from '../audit/AuditSource';

/** Intervalle de relecture d'un plan en préparation. */
export const PLAN_POLL_MS = 5000;

const STEP_STATE_LABEL = { done: 'terminée', current: 'en cours', pending: 'à venir' } as const;

interface PlanTabProps {
  projectId:     string;
  analysisId:    string;
  /** L'inventaire de l'audit : les documents nommés par leur nom de fichier. */
  audit:         Audit;
  cards:         ReadingCard[];
  /** Ouvre « À clarifier », sur une carte si elle est donnée. */
  onGoToClarify: (cardId?: string) => void;
}

/**
 * Onglet « Nouvelle base » en mode construire (plan-construire-v1, lot B) : le plan en préparation
 * (étapes), puis le plan prêt, en lecture seule (D7) : ses points d'attention, ses chapitres et
 * sujets avec leurs sources, les cartes rattachées, et les commentaires (un par sujet, un pour le
 * plan, B-Q3). La rédaction de la base à partir du plan n'existe pas encore (lot C) : rien ne la
 * propose.
 */
export function PlanTab({ projectId, analysisId, audit, cards, onGoToClarify }: PlanTabProps) {
  const toast = useToast();
  const [plans,    setPlans]    = useState<OnboardingPlan[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [content,  setContent]  = useState<PlanContent | null>(null);
  const [comments, setComments] = useState<PlanComment[]>([]);

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
    if (shownId === null) { setContent(null); setComments([]); return; }
    let cancelled = false;
    setContent(null);
    onboardingApi.getPlanContent(projectId, shownId)
      .then(c => { if (!cancelled) setContent(c); })
      .catch(err => { if (!cancelled) toast.error(getErrorMessage(err)); });
    onboardingApi.listPlanComments(projectId, shownId)
      .then(c => { if (!cancelled) setComments(c); })
      .catch(() => { if (!cancelled) setComments([]); });
    return () => { cancelled = true; };
  }, [projectId, shownId, toast]);

  if (plans === null) return <Skeleton className="obp-skeleton-block" />;
  if (plans.length === 0) {
    return (
      <EmptyState
        title="Aucun plan pour l'instant"
        description="Le plan de la nouvelle base se prépare depuis « À clarifier », une fois toutes les cartes bloquantes tranchées."
        ctaLabel="Aller à « À clarifier »"
        onCta={() => onGoToClarify()}
      />
    );
  }

  const showProgress = latest !== null && latest.status !== 'succeeded';
  const plan = content !== null && content.planId === shownId && SUPPORTED_PLAN_SCHEMAS.includes(content.schemaVersion)
    ? readPlan(content.plan) : null;
  const onSaved = (saved: PlanComment) =>
    setComments(list => [...list.filter(c => c.subjectId !== saved.subjectId), saved]);
  const onCancelled = (subjectId: string | null, current: PlanComment | null) =>
    setComments(list => [...list.filter(c => c.subjectId !== subjectId), ...(current ? [current] : [])]);

  return (
    <>
      {showProgress && <PlanProgress plan={latest} onGoToClarify={onGoToClarify} />}

      {succeeded.length > 0 && (
        <div className="obp-audit-head">
          <h2 className="obp-section-title">Plan du {formatFull(succeeded.find(p => p.id === shownId)?.finishedAt ?? null)}</h2>
          {succeeded.length > 1 && (
            <label className="obp-audit-picker">
              <span className="obp-muted">Version</span>
              <select value={shownId ?? ''} onChange={e => setSelected(e.target.value)}>
                {succeeded.map((p, i) => (
                  <option key={p.id} value={p.id}>{formatFull(p.finishedAt)}{i === 0 ? ' (la plus récente)' : ''}</option>
                ))}
              </select>
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
          <PlanView
            projectId={projectId} planId={content.planId} plan={plan} audit={audit} cards={cards}
            comments={comments} commentable={content.commentable}
            onSaved={onSaved} onCancelled={onCancelled} onGoToClarify={onGoToClarify}
          />
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
          <Button variant="secondary" size="md" onClick={() => onGoToClarify()}>Aller à « À clarifier »</Button>
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
}

/** Le plan prêt, en lecture seule : points d'attention, chapitres, sujets, commentaires. */
export function PlanView({ projectId, planId, plan, audit, cards, comments, commentable, onSaved, onCancelled, onGoToClarify }: PlanViewProps) {
  const titles = new Map(orderedCards(cards).map((c, i) => [c.id, cardTitle(c, i + 1)]));
  const subjectTitles = new Map(plan.chapters.flatMap(c => c.subjects).map(s => [s.id, s.title]));
  const commentOf = (subjectId: string | null) => comments.find(c => c.subjectId === subjectId) ?? null;
  const box = (subjectId: string | null, label: string) => (
    <PlanCommentBox
      projectId={projectId} planId={planId} subjectId={subjectId} label={label}
      current={commentOf(subjectId)} editable={commentable} onSaved={onSaved} onCancelled={onCancelled}
    />
  );

  return (
    <div className="obp-plan">
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
          <h4>Passages sans sujet ({plan.uncovered.length})</h4>
          {plan.uncovered.length === 0 ? (
            <p className="obp-muted">Chaque passage de vos documents est couvert par un sujet.</p>
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
          <h4>Sujets réunis ({plan.merged.length})</h4>
          {plan.merged.length === 0 ? (
            <p className="obp-muted">Aucun sujet en double.</p>
          ) : (
            <ul>
              {plan.merged.map(m => (
                <li key={m.subjectId}>
                  {m.titles.map(t => `« ${t} »`).join(' et ')} : mêmes passages, un seul sujet
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
                  {plan.unattachedCardIds.length > 1 ? `${plan.unattachedCardIds.length} cartes ne sont rattachées à aucun sujet : ` : 'Une carte n\'est rattachée à aucun sujet : '}
                  {plan.unattachedCardIds.map((id, i) => (
                    <React.Fragment key={id}>{i > 0 && ', '}
                      <button type="button" className="obp-link" onClick={() => onGoToClarify(id)}>{titles.get(id) ?? 'une carte'}</button>
                    </React.Fragment>
                  ))}.
                </li>
              )}
              {plan.rejectedTitles.length > 0 && (
                <li>Sujets proposés sans source vérifiable, écartés : {plan.rejectedTitles.map(t => `« ${t} »`).join(', ')}.</li>
              )}
              {plan.unverifiedQuotes > 0 && (
                <li>{plan.unverifiedQuotes > 1 ? `${plan.unverifiedQuotes} citations introuvables dans vos documents ont été écartées.` : 'Une citation introuvable dans vos documents a été écartée.'}</li>
              )}
            </ul>
          </div>
        )}
      </section>

      {plan.chapters.map((chapter, ci) => (
        <details key={chapter.id} className="obp-plan-chapter" open={ci === 0}>
          <summary className="obp-plan-chapter__title">Chapitre {ci + 1} · {chapter.title}</summary>
          {chapter.subjects.map(subject => (
            <SubjectBlock key={subject.id} subject={subject} audit={audit} titles={titles} onGoToClarify={onGoToClarify}>
              {box(subject.id, 'Commentaire sur ce sujet (facultatif)')}
            </SubjectBlock>
          ))}
        </details>
      ))}

      <section className="obp-plan__whole" aria-label="Commentaire sur le plan">
        {box(null, 'Commentaire sur le plan (facultatif)')}
      </section>

      <p className="obp-plan__next">
        La rédaction de la base à partir de ce plan arrive bientôt. Vous pouvez encore modifier vos réponses dans
        « À clarifier », puis préparer le plan à nouveau.
      </p>
    </div>
  );
}

function SubjectBlock({ subject, audit, titles, onGoToClarify, children }: {
  subject: PlanSubject; audit: Audit; titles: ReadonlyMap<string, string>;
  onGoToClarify: (cardId?: string) => void; children: React.ReactNode;
}) {
  return (
    <article className="obp-plan-subject">
      <h4 className="obp-plan-subject__title">{subject.title}</h4>
      <p className="obp-plan-subject__meta">
        <span>Question : {subject.question}</span>
        {subject.audience && <span>Public : {subject.audience}</span>}
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
}

/**
 * Commentaire sur un sujet, ou sur le plan entier (B-Q3) : lu par l'équipe, jamais envoyé au
 * pipeline, jamais dans la base. Un nouveau commentaire remplace le courant ; « Retirer » l'annule.
 */
export function PlanCommentBox({ projectId, planId, subjectId, label, current, editable, onSaved, onCancelled }: PlanCommentBoxProps) {
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
    onSaved(await onboardingApi.commentPlan(projectId, planId, { subjectId, expectedCurrentId: current?.id ?? null, comment: text.trim() }));
  });
  const remove = () => run(async () => {
    const res = await onboardingApi.cancelPlanComment(projectId, planId, current!.id);
    onCancelled(subjectId, res.current);
  });
  const changed = text.trim() !== (current?.comment ?? '') && text.trim() !== '';

  return (
    <div className="obp-clarify-comment">
      <label htmlFor={id} className="obp-base-label">{label}</label>
      <textarea id={id} className="obp-base-textarea" rows={2} maxLength={5000} value={text} onChange={e => setText(e.target.value)} />
      <p className="obp-muted">{PLAN_COMMENT_HINT}</p>
      {current && <p className="obp-muted">Commentaire enregistré par {current.author.name}, {formatFull(current.createdAt)}.</p>}
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="obp-decision__actions">
        <Button variant="secondary" size="sm" loading={busy} disabled={!changed} onClick={() => void save()}>Enregistrer le commentaire</Button>
        {current && <Button variant="ghost" size="sm" disabled={busy} onClick={() => void remove()}>Retirer le commentaire</Button>}
      </div>
    </div>
  );
}

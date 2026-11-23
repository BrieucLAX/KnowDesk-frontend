import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '../../../../shared/components/ui/Button';
import { ActionBarContent } from '../../../../shared/components/ui/ActionBar';
import { useStepFact } from '../../lib/steps';
import { ConfirmDialog } from '../../../../shared/components/ui/ConfirmDialog';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';
import { ApiError } from '../../../../shared/lib/apiClient';
import { formatFull } from '../../../../shared/lib/formatDate';
import { usePolling } from '../../../../shared/lib/usePolling';
import { onboardingApi } from '../../api/onboardingApi';
import {
  audienceTagsSummary, buildCreationBlockers, buildCreationSteps, buildExcludedLabel, creationErrorMessage, creationFailureMessage,
  isCreationActive, type BuildKnowledgeBaseCreation, type BuildKnowledgeBasePreview, type BuildKnowledgeBaseState,
} from '../../lib/knowledgeBase';
import { KNOWLEDGE_BASE_POLL_MS } from './KnowledgeBaseCreationView';

const STEP_STATE_LABEL = { done: 'terminée', current: 'en cours', pending: 'à venir' } as const;
const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;
/** Le jour d'une rédaction (horodatage du back), « 22/11/2026 ». */
const dayOf = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
};

interface BuildKnowledgeBaseProps {
  projectId:       string;
  buildId:         string;
  /** Module « knowledge » de l'organisation : sans lui, rien n'est proposé (le back refuserait). */
  knowledgeEnabled: boolean;
  onOpenKnowledge?: () => void;
}

type Creation = BuildKnowledgeBasePreview | BuildKnowledgeBaseCreation;
const progressOf = (c: Creation) => ('progress' in c ? c.progress : {});

/**
 * « Créer la base de connaissance » depuis la rédaction (plan-construire-v1, lot D ; décisions du
 * porteur du 2026-11-22). Sous « Articles rédigés » : le bouton, grisé avec la raison que le back
 * donne ; l'aperçu (catégories dans l'ordre du plan, articles, étiquettes de public proposées
 * seulement si la rédaction en distingue, articles non importés, phrases « À vérifier » publiées
 * sans marque) ; une confirmation ; l'avancement, relu jusqu'au résultat ; la reprise après un
 * échec. Un article du plan devient un article de la base (D5) ; aucun appel à l'IA.
 */
export function BuildKnowledgeBase({ projectId, buildId, knowledgeEnabled, onOpenKnowledge }: BuildKnowledgeBaseProps) {
  const [state, setState]         = useState<BuildKnowledgeBaseState | null>(null);
  const [creation, setCreation]   = useState<Creation | null>(null);
  const [applyTags, setApplyTags] = useState(true);
  const [busy, setBusy]           = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const load = useCallback(async () => {
    const s = await onboardingApi.getBuildKnowledgeBase(projectId, buildId);
    setState(s);
    // Une création lancée (en file, en cours, en échec, réussie) se relit avec son aperçu figé.
    if (s.creation && s.creation.status !== 'previewed') {
      setCreation(await onboardingApi.getBuildKnowledgeBaseCreation(projectId, s.creation.creationId));
    }
  }, [projectId, buildId]);

  useEffect(() => {
    if (!knowledgeEnabled) return;
    load().catch(err => setError(err instanceof ApiError ? err.message : 'L\'état de la création n\'a pas pu être chargé.'));
  }, [load, knowledgeEnabled]);

  const active = creation !== null && isCreationActive(creation);
  // « Nouvelle base » terminée : la base de connaissance est créée depuis cette rédaction.
  useStepFact('base', !knowledgeEnabled || state === null ? undefined : creation?.status === 'succeeded');
  usePolling(async () => {
    if (!creation) return;
    setCreation(await onboardingApi.getBuildKnowledgeBaseCreation(projectId, creation.creationId));
  }, KNOWLEDGE_BASE_POLL_MS, active);

  const preview = async (apply: boolean) => {
    setBusy(true);
    setError(null);
    try {
      setCreation(await onboardingApi.previewBuildKnowledgeBase(projectId, buildId, apply));
      setApplyTags(apply);
    } catch (err) {
      setError(creationErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    if (!creation) return;
    setConfirming(false);
    setBusy(true);
    setError(null);
    try {
      setCreation(await onboardingApi.createBuildKnowledgeBase(projectId, buildId, creation.creationId));
    } catch (err) {
      setError(creationErrorMessage(err));
      load().catch(() => { /* l'état reste celui d'avant */ });
    } finally {
      setBusy(false);
    }
  };

  const frame = (body: React.ReactNode) => (
    <section className="obp-plan-entry obp-kb-build" aria-labelledby="obp-kb-build-title">
      <h3 id="obp-kb-build-title" className="obp-plan-entry__title">Base de connaissance</h3>
      {body}
    </section>
  );

  if (!knowledgeEnabled) return null;
  if (state === null) {
    return frame(error ? <p className="obp-analysis__error" role="alert">{error}</p> : <Skeleton className="obp-arb-entry__loading" />);
  }

  // ── Résultat ──
  if (creation && creation.status === 'succeeded') {
    const c = creation as BuildKnowledgeBaseCreation;
    return frame(
      <div className="obp-kb__result">
        <p role="status">
          Base de connaissance créée{c.finishedAt ? ` le ${formatFull(c.finishedAt)}` : ''}, depuis la rédaction du{' '}
          {dayOf(c.build.createdAt)} : {plural(c.counts.articles, 'article publié', 'articles publiés')},{' '}
          {plural(c.counts.categories, 'catégorie', 'catégories')}.
        </p>
        <p className="obp-muted">Les articles sont internes : votre équipe les voit, le chatbot public ne les voit pas.</p>
        {onOpenKnowledge && (
          <ActionBarContent note="La base de connaissance est créée.">
            <Button variant="primary" size="md" onClick={onOpenKnowledge}>Ouvrir la base de connaissance</Button>
          </ActionBarContent>
        )}
      </div>,
    );
  }

  // ── Avancement, ou échec à reprendre ──
  if (creation && (active || creation.status === 'failed')) {
    const failed = creation.status === 'failed';
    const steps = buildCreationSteps({ progress: progressOf(creation), counts: creation.counts, status: creation.status });
    return frame(
      <div className="obp-analysis">
        <h4 className="obp-section-title">
          {failed ? 'Création interrompue' : creation.status === 'queued' ? 'Création en attente de démarrage' : 'Création en cours'}
        </h4>
        <ol className="obp-steps" aria-live="polite">
          {steps.map(s => (
            <li key={s.label} className={`obp-step obp-step--${s.state}`} aria-current={s.state === 'current' ? 'step' : undefined}>
              <span className="obp-step__marker" aria-hidden="true" />
              <span className="obp-step__label">{s.label}</span>
              {s.total > 0 && <span className="obp-step__count">{s.done} / {s.total}</span>}
              <span className="sr-only"> : {STEP_STATE_LABEL[s.state]}</span>
            </li>
          ))}
        </ol>
        {active && <p className="obp-analysis__note">Vous pouvez quitter cette page : la création continue, et vous la retrouverez ici.</p>}
        {failed && (
          <>
            <p className="obp-analysis__error" role="alert">{creationFailureMessage((creation as BuildKnowledgeBaseCreation).errorCode)}</p>
            {error && <p className="obp-analysis__error" role="alert">{error}</p>}
            {state.launch.code !== 'ADMIN_ONLY' && (
              <ActionBarContent note="Création interrompue.">
                <Button variant="primary" size="md" loading={busy} onClick={create}>Reprendre la création</Button>
              </ActionBarContent>
            )}
          </>
        )}
      </div>,
    );
  }

  // ── Bouton, avant l'aperçu ──
  if (!creation) {
    const allowed = state.launch.allowed;
    return frame(
      <>
        <p className="obp-muted">
          Chaque article rédigé devient un article de votre base, dans sa catégorie, publié en interne. Les sources, les
          phrases retirées et vos commentaires n'y entrent pas.
        </p>
        {error && <p className="obp-analysis__error" role="alert">{error}</p>}
        <ActionBarContent
          note={!allowed && state.launch.message
            ? <p className="obp-kb__blockers" role="status">{state.launch.message}</p>
            : 'Un aperçu s\'affiche avant toute création.'}
        >
          <Button variant="primary" size="md" disabled={!allowed} loading={busy} onClick={() => preview(true)}>
            Créer la base de connaissance
          </Button>
        </ActionBarContent>
      </>,
    );
  }

  // ── Aperçu ──
  const p = creation;
  const blockers = buildCreationBlockers(p);
  const tagsLine = audienceTagsSummary(p);
  return frame(
    <>
      <p className="obp-muted">
        Depuis la rédaction du {dayOf(p.build.createdAt)}
        {p.build.planEditCount ? `, plan modifié (${plural(p.build.planEditCount, 'modification', 'modifications')})` : ''}.
        Un article rédigé devient un article de la base ; ils se relisent et se corrigent ensuite dans la base de connaissance.
      </p>
      <dl className="obp-analysis__stats">
        <div><dt>Catégories</dt><dd>{p.counts.categories}</dd></div>
        <div><dt>Articles</dt><dd>{p.counts.articles}</dd></div>
      </dl>

      {p.audience.detected && (
        <label className="obp-kb-build__audience">
          <input type="checkbox" checked={applyTags} disabled={busy} onChange={e => preview(e.target.checked)} />
          {' '}Appliquer les étiquettes de public (Particuliers / Professionnels)
        </label>
      )}
      {tagsLine && <p className="obp-muted">{tagsLine}</p>}
      {p.audience.applied && p.tags.reused.length > 0 && (
        <p className="obp-muted">
          Votre organisation a déjà {p.tags.reused.map(t => `« ${t} »`).join(' et ')} : {p.tags.reused.length > 1 ? 'elles sont reprises' : 'elle est reprise'} telle{p.tags.reused.length > 1 ? 's' : ''} quelle{p.tags.reused.length > 1 ? 's' : ''}.
        </p>
      )}
      {p.audience.applied && p.tags.nearMiss.length > 0 && (
        <p className="obp-muted">
          Votre organisation a aussi {p.tags.nearMiss.map(t => `« ${t} »`).join(', ')} : Knowdesk pose « Particuliers » et « Professionnels », sans y toucher.
        </p>
      )}

      <div className="obp-kb__columns">
        <section aria-labelledby="obp-kb-build-categories">
          <h4 id="obp-kb-build-categories" className="obp-kb__subtitle">Catégories, dans l'ordre</h4>
          <ol className="obp-kb__categories">
            {p.categories.map((cat, i) => (
              <li key={`${i}-${cat.name}`}>
                <span>{cat.name}</span>
                <span className="obp-muted"> · {plural(cat.articles, 'article', 'articles')}</span>
              </li>
            ))}
          </ol>
        </section>
        <section aria-labelledby="obp-kb-build-more">
          {p.toVerify.length > 0 && (
            <details className="obp-kb-build__verify">
              <summary id="obp-kb-build-more">
                {plural(p.toVerify.length, 'phrase à vérifier reste', 'phrases à vérifier restent')} dans les articles
              </summary>
              <p className="obp-muted">Elles seront publiées sans marque. Relisez-les dans « Articles rédigés » avant de créer la base.</p>
              <ul className="obp-kb__examples">
                {p.toVerify.map((t, i) => <li key={`${i}-${t.text}`}><strong>{t.title}</strong> : « {t.text} »</li>)}
              </ul>
            </details>
          )}
          {p.excluded.length > 0 && (
            <>
              <h4 className="obp-kb__subtitle">Non importé comme article</h4>
              <ul className="obp-kb__examples">
                {p.excluded.map((e, i) => <li key={`${i}-${e.title}`}>{buildExcludedLabel(e)}</li>)}
              </ul>
            </>
          )}
        </section>
      </div>

      {p.quota.limit !== null && (
        <ul className="obp-kb__facts">
          <li>
            Articles de l'organisation : {p.quota.current} aujourd'hui, {p.quota.after} après la création (limite de {p.quota.limit},
            les articles archivés ne comptent pas).
          </li>
        </ul>
      )}

      {error && <p className="obp-analysis__error" role="alert">{error}</p>}
      <ActionBarContent
        note={blockers.length > 0 ? (
          <ul className="obp-kb__blockers" role="status">
            {blockers.map(b => <li key={b}>{b}</li>)}
          </ul>
        ) : 'Une confirmation vous sera demandée avant la création.'}
      >
        <Button variant="primary" size="md" disabled={blockers.length > 0 || busy} loading={busy} onClick={() => setConfirming(true)}>
          Créer la base
        </Button>
      </ActionBarContent>

      {confirming && (
        <ConfirmDialog
          title="Créer la base de connaissance ?"
          description={`${plural(p.counts.articles, 'article sera publié', 'articles seront publiés')} en interne, dans `
            + `${plural(p.counts.categories, 'catégorie', 'catégories')} : votre équipe les verra dans la base de connaissance, `
            + 'le chatbot public ne les verra pas.'}
          confirmLabel="Créer la base"
          variant="primary"
          onConfirm={create}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>,
  );
}

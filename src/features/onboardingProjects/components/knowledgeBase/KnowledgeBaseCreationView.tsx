import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../../../../shared/components/ui/Button';
import { ConfirmDialog } from '../../../../shared/components/ui/ConfirmDialog';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';
import { ApiError } from '../../../../shared/lib/apiClient';
import { formatFull } from '../../../../shared/lib/formatDate';
import { usePolling } from '../../../../shared/lib/usePolling';
import { onboardingApi } from '../../api/onboardingApi';
import {
  creationBlockers, creationErrorMessage, creationFailureMessage, creationSteps, creationToReopen, excludedLabel, isCreationActive,
  rememberCreation, rememberedCreation, type KnowledgeBaseCreation, type KnowledgeBasePreview, type LatestKnowledgeBaseCreation,
} from '../../lib/knowledgeBase';
import type { Validation } from '../../lib/correction';

/** Intervalle de relecture d'une création en cours (elle dure quelques secondes). */
export const KNOWLEDGE_BASE_POLL_MS = 2000;

/**
 * La version est-elle la version validée à jour ? Le back ne le calcule que dans la liste des
 * versions de la correction (pour la plus récente) : `GET …/validations/:id` le rend toujours nul.
 */
export async function isUpToDateValidation(projectId: string, v: Pick<Validation, 'id' | 'correctionId'>): Promise<boolean> {
  const list = await onboardingApi.listValidations(projectId, v.correctionId);
  return list.find(x => x.id === v.id)?.upToDate === true;
}

const STEP_STATE_LABEL = { done: 'terminée', current: 'en cours', pending: 'à venir' } as const;

interface KnowledgeBaseCreationViewProps {
  projectId:        string;
  validationId:     string;
  /** Rôle de l'utilisateur : le back réserve l'aperçu et la création aux administrateurs. */
  isAdmin:          boolean;
  /** Module « knowledge » de l'organisation ; sans lui, le back refuse (KNOWLEDGE_MODULE_DISABLED). */
  knowledgeEnabled: boolean;
  /** Revenir à la version propre. */
  onBack:           () => void;
  onOpenKnowledge:  () => void;
}

type Screen =
  | { kind: 'loading'; preparing: boolean }
  | { kind: 'module-off' }
  /** `latest` : la dernière création du projet, lisible par un manager (état seul). */
  | { kind: 'not-admin'; latest?: LatestKnowledgeBaseCreation | null }
  | { kind: 'outdated' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; creation: KnowledgeBaseCreation | KnowledgeBasePreview };

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** L'aperçu n'a ni progression ni dates : il se lit comme une création pas encore lancée. */
const asCreation = (c: KnowledgeBaseCreation | KnowledgeBasePreview): KnowledgeBaseCreation =>
  ({ progress: {}, errorCode: null, startedAt: null, finishedAt: null, ...c });

/**
 * « Créer la base de connaissance » depuis une version propre validée et à jour (plan-articles-v1,
 * lot 2). L'aperçu (catégories dans l'ordre, nombres, exemples de titres, ce qui n'est pas importé,
 * limite d'articles), puis un seul bouton, réservé aux administrateurs, avec une confirmation
 * courte ; la création suit dans une tâche de fond, relue ici jusqu'au résultat. Aucune
 * validation article par article : les articles se relisent ensuite dans la base de connaissance.
 *
 * À l'ouverture, la dernière création du projet est relue (route du back) : depuis n'importe quel
 * navigateur, une création en cours, réussie ou en échec se retrouve, et un aperçu de cette version
 * se réutilise sans nouveaux appels au modèle. L'identifiant retenu par navigateur n'est qu'un appoint.
 */
export function KnowledgeBaseCreationView({
  projectId, validationId, isAdmin, knowledgeEnabled, onBack, onOpenKnowledge,
}: KnowledgeBaseCreationViewProps) {
  const [screen, setScreen] = useState<Screen>({ kind: 'loading', preparing: false });
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  /** Lancée de nouveau après un échec : l'écran le dit jusqu'au résultat. */
  const [resumed, setResumed] = useState(false);
  const creationId = screen.kind === 'ready' ? screen.creation.creationId : null;
  const idRef = useRef<string | null>(null);
  idRef.current = creationId;

  /**
   * Une reprise recompte depuis zéro ce qui existe déjà : la progression affichée ne recule pas
   * pour autant pendant la même tâche.
   */
  const show = useCallback((next: KnowledgeBaseCreation | KnowledgeBasePreview) => {
    setScreen(prev => {
      if (prev.kind !== 'ready' || prev.creation.creationId !== next.creationId || !isCreationActive(next)) {
        return { kind: 'ready', creation: next };
      }
      const before = asCreation(prev.creation).progress;
      const now = asCreation(next).progress;
      const progress = { ...now };
      for (const k of Object.keys(before) as Array<keyof typeof before>) progress[k] = Math.max(before[k] ?? 0, now[k] ?? 0);
      return { kind: 'ready', creation: { ...asCreation(next), progress } };
    });
  }, []);

  const refusedBy = useCallback((err: unknown): Screen | null => {
    if (err instanceof ApiError && err.code === 'KNOWLEDGE_MODULE_DISABLED') return { kind: 'module-off' };
    if (err instanceof ApiError && err.code === 'FORBIDDEN' && !/^limite/i.test(err.message)) return { kind: 'not-admin' };
    return null;
  }, []);

  useEffect(() => {
    if (!knowledgeEnabled) { setScreen({ kind: 'module-off' }); return; }
    let cancelled = false;
    if (!isAdmin) {
      setScreen({ kind: 'not-admin' });
      onboardingApi.getLatestKnowledgeBaseCreation(projectId)
        .then(latest => { if (!cancelled) setScreen({ kind: 'not-admin', latest }); })
        .catch(() => {});
      return () => { cancelled = true; };
    }
    setScreen({ kind: 'loading', preparing: false });
    (async () => {
      const validation = await onboardingApi.getValidation(projectId, validationId);
      if (cancelled) return;
      if (!await isUpToDateValidation(projectId, validation)) { if (!cancelled) setScreen({ kind: 'outdated' }); return; }
      if (cancelled) return;
      let reopen: string | null;
      try {
        reopen = creationToReopen(await onboardingApi.getLatestKnowledgeBaseCreation(projectId), validationId);
      } catch (err) {
        if (refusedBy(err)) throw err;
        reopen = null;
      }
      if (cancelled) return;
      const remembered = reopen ?? rememberedCreation(validationId);
      if (remembered) {
        try {
          const c = await onboardingApi.getKnowledgeBaseCreation(projectId, remembered);
          if (c.validation.id === validationId) rememberCreation(validationId, c.creationId);
          if (!cancelled) setScreen({ kind: 'ready', creation: c });
          return;
        } catch (err) {
          if (!(err instanceof ApiError && err.status === 404)) throw err;
          rememberCreation(validationId, null);
        }
      }
      if (cancelled) return;
      setScreen({ kind: 'loading', preparing: true });
      const preview = await onboardingApi.previewKnowledgeBase(projectId, validationId);
      rememberCreation(validationId, preview.creationId);
      if (!cancelled) setScreen({ kind: 'ready', creation: preview });
    })().catch(err => {
      if (cancelled) return;
      setScreen(refusedBy(err) ?? { kind: 'error', message: creationErrorMessage(err) });
    });
    return () => { cancelled = true; };
  }, [projectId, validationId, isAdmin, knowledgeEnabled, refusedBy]);

  const refresh = useCallback(async () => {
    const id = idRef.current;
    if (id === null) return;
    show(await onboardingApi.getKnowledgeBaseCreation(projectId, id));
  }, [projectId, show]);

  const active = screen.kind === 'ready' && isCreationActive(screen.creation);
  usePolling(refresh, KNOWLEDGE_BASE_POLL_MS, active);

  const create = async () => {
    if (screen.kind !== 'ready' || sending) return;
    const wasFailed = screen.creation.status === 'failed';
    setConfirming(false);
    setSending(true);
    setRefusal(null);
    try {
      show(await onboardingApi.createKnowledgeBase(projectId, validationId, screen.creation.creationId));
      setResumed(wasFailed);
    } catch (err) {
      const refused = refusedBy(err);
      if (refused) { setScreen(refused); return; }
      setRefusal(creationErrorMessage(err));
      // L'état a changé côté back (base remplie, création lancée ailleurs, déjà créée) : on le relit.
      await refresh().catch(() => {});
    } finally {
      setSending(false);
    }
  };

  const back = <button type="button" className="obp-link" onClick={onBack}>Revenir à la version propre</button>;
  const frame = (body: React.ReactNode) => (
    <section className="obp-kb" aria-labelledby="obp-kb-title">
      <header className="obp-kb__head">
        <h2 id="obp-kb-title" className="obp-section-title">Créer la base de connaissance</h2>
        <p className="obp-muted">{back}</p>
      </header>
      {body}
    </section>
  );

  if (screen.kind === 'loading') {
    return frame(
      <div aria-busy="true">
        {screen.preparing && <p className="obp-muted" role="status">Préparation de l'aperçu : découpage en articles et titres des regroupements…</p>}
        <Skeleton className="obp-skeleton-block" />
      </div>,
    );
  }
  if (screen.kind === 'module-off') {
    return frame(
      <p className="obp-kb__notice" role="status">
        La base de connaissance n'est pas activée pour votre organisation. Demandez à l'équipe KnowDesk de l'activer
        pour y créer les articles de cette version.
      </p>,
    );
  }
  if (screen.kind === 'not-admin') {
    const latest = screen.latest;
    return frame(
      <>
        <p className="obp-kb__notice" role="status">
          Seul un administrateur de votre organisation peut créer la base de connaissance depuis cette version.
        </p>
        {latest?.status === 'succeeded' && (
          <div className="obp-kb__result">
            <p>
              La base de connaissance a été créée{latest.finishedAt ? ` le ${formatFull(latest.finishedAt)}` : ''}, depuis la
              version validée n° {latest.validation.version}.
            </p>
            <div><Button variant="secondary" size="md" onClick={onOpenKnowledge}>Ouvrir la base de connaissance</Button></div>
          </div>
        )}
        {latest && isCreationActive(latest) && (
          <p className="obp-muted">
            Une création est en cours : {plural(latest.progress.articles ?? 0, 'article publié', 'articles publiés')} pour l'instant.
          </p>
        )}
        {latest?.status === 'failed' && (
          <p className="obp-muted">La création s'est arrêtée avant la fin ; un administrateur peut la reprendre depuis cet écran.</p>
        )}
      </>,
    );
  }
  if (screen.kind === 'outdated') {
    return frame(
      <p className="obp-kb__notice" role="status">
        Cette version n'est plus la version validée à jour : revalidez la nouvelle base, puis créez la base de
        connaissance depuis la dernière version.
      </p>,
    );
  }
  if (screen.kind === 'error') {
    return frame(<p className="obp-analysis__error" role="alert">{screen.message}</p>);
  }

  const c = asCreation(screen.creation);
  const steps = creationSteps(c);
  const failed = c.status === 'failed';

  if (c.status === 'succeeded') {
    return frame(
      <div className="obp-kb__result">
        <p role="status">
          Base de connaissance créée{c.finishedAt ? ` le ${formatFull(c.finishedAt)}` : ''}{resumed ? ', après une reprise' : ''},
          depuis la version validée n° {c.validation.version} : {plural(c.counts.articles, 'article publié', 'articles publiés')},{' '}
          {plural(c.counts.faqs, 'FAQ', 'FAQ')}, {plural(c.counts.categories, 'catégorie', 'catégories')}
          {c.counts.synonyms > 0 && <>, {plural(c.counts.synonyms, 'synonyme', 'synonymes')}</>}.
        </p>
        <p className="obp-muted">Les articles et les FAQ sont internes : votre équipe les voit, le chatbot public ne les voit pas.</p>
        <div><Button variant="primary" size="md" onClick={onOpenKnowledge}>Ouvrir la base de connaissance</Button></div>
      </div>,
    );
  }

  if (active || failed) {
    return frame(
      <div className="obp-analysis">
        <h3 className="obp-section-title">
          {failed ? 'Création interrompue'
            : resumed ? 'Reprise de la création'
            : c.status === 'queued' ? 'Création en attente de démarrage' : 'Création en cours'}
        </h3>
        {resumed && active && (
          <p className="obp-muted">Ce qui avait été créé avant l'interruption est gardé ; la reprise continue sans doublon.</p>
        )}
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
        {active && (
          <p className="obp-analysis__note">
            Vous pouvez quitter cette page : la création continue, et vous la retrouverez ici.
          </p>
        )}
        {failed && (
          <>
            <p className="obp-analysis__error" role="alert">{creationFailureMessage(c.errorCode)}</p>
            {refusal && <p className="obp-analysis__error" role="alert">{refusal}</p>}
            <div><Button variant="primary" size="md" loading={sending} onClick={create}>Reprendre la création</Button></div>
          </>
        )}
      </div>,
    );
  }

  // Aperçu (status « previewed »).
  const blockers = creationBlockers(c);
  return frame(
    <>
      <p className="obp-muted">
        Depuis la version validée n° {c.validation.version}. Aucune validation article par article : les articles se
        relisent et se corrigent ensuite dans la base de connaissance.
      </p>
      <dl className="obp-analysis__stats">
        <div><dt>Catégories</dt><dd>{c.counts.categories}</dd></div>
        <div><dt>Articles</dt><dd>{c.counts.articles}</dd></div>
        <div><dt>FAQ</dt><dd>{c.counts.faqs}</dd></div>
        <div><dt>Synonymes</dt><dd>{c.counts.synonyms}</dd></div>
      </dl>

      <div className="obp-kb__columns">
        <section aria-labelledby="obp-kb-categories">
          <h3 id="obp-kb-categories" className="obp-kb__subtitle">Catégories, dans l'ordre</h3>
          <ol className="obp-kb__categories">
            {c.categories.map((cat, i) => (
              <li key={`${i}-${cat.name}`}>
                <span>{cat.name}</span>
                <span className="obp-muted"> · {plural(cat.articles, 'article', 'articles')}</span>
              </li>
            ))}
          </ol>
        </section>
        <section aria-labelledby="obp-kb-examples">
          <h3 id="obp-kb-examples" className="obp-kb__subtitle">Exemples de titres</h3>
          <ul className="obp-kb__examples">
            {c.examples.map((t, i) => <li key={`${i}-${t}`}>{t}</li>)}
          </ul>
          {c.titles.model + c.titles.fallback > 0 && (
            <p className="obp-muted">
              {plural(c.titles.model + c.titles.fallback, 'article regroupe', 'articles regroupent')} plusieurs sections :
              leur titre a été écrit à cette étape. Tous les titres se modifient ensuite dans l'éditeur.
            </p>
          )}
          {c.excluded.length > 0 && (
            <>
              <h3 className="obp-kb__subtitle">Non importé comme article</h3>
              <ul className="obp-kb__examples">
                {c.excluded.map((e, i) => <li key={`${i}-${e.title}`}>{excludedLabel(e)}</li>)}
              </ul>
            </>
          )}
        </section>
      </div>

      <ul className="obp-kb__facts">
        <li>
          Articles de l'organisation : {c.quota.current} aujourd'hui, {c.quota.after} après la création (limite de {c.quota.limit},
          les articles archivés ne comptent pas).
        </li>
        {c.references.unresolved > 0 && (
          <li>
            {plural(c.references.unresolved, 'renvoi « chapitre N » n\'a pas trouvé son article : il reste', 'renvois « chapitre N » n\'ont pas trouvé leur article : ils restent')} en texte.
          </li>
        )}
        {c.counts.synonyms > 0 && !c.synonymsApplied && (
          <li>Les synonymes seront enregistrés, mais la recherche de cet environnement ne les applique pas.</li>
        )}
      </ul>

      {blockers.length > 0 && (
        <ul className="obp-kb__blockers" role="status">
          {blockers.map(b => <li key={b}>{b}</li>)}
        </ul>
      )}
      {refusal && <p className="obp-analysis__error" role="alert">{refusal}</p>}
      <div>
        <Button variant="primary" size="md" disabled={blockers.length > 0} loading={sending} onClick={() => setConfirming(true)}>
          Créer la base de connaissance
        </Button>
      </div>

      {confirming && (
        <ConfirmDialog
          title="Créer la base de connaissance ?"
          description={`${plural(c.counts.articles, 'article', 'articles')} et ${plural(c.counts.faqs, 'FAQ', 'FAQ')} seront publiés en interne : `
            + 'votre équipe les verra dans la base de connaissance, le chatbot public ne les verra pas.'}
          confirmLabel="Créer"
          variant="primary"
          onConfirm={create}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>,
  );
}

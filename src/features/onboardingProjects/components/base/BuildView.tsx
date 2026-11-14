import React, { useState } from 'react';
import { Button } from '../../../../shared/components/ui/Button';
import { ConfirmDialog } from '../../../../shared/components/ui/ConfirmDialog';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';
import { onboardingApi } from '../../api/onboardingApi';
import type { Audit } from '../../lib/audit';
import {
  BUILD_COMMENT_HINT, BUILD_STEPS, buildFailureMessage, buildStepStates, buildSummary, EMPTY_LABEL, isBuildActive,
  removedLabel, TO_VERIFY_LABEL, UNCOVERED_GROUPS,
  type BuildComment, type BuildsMeta, type BuiltArticle, type BuiltBlock, type Construction, type OnboardingBuild,
  type UncoveredPoint,
} from '../../lib/build';
import { expertEntered } from '../../lib/correction';
import { AuditSource } from '../audit/AuditSource';
import { PlanCommentBox } from './PlanTab';

const STEP_STATE_LABEL = { done: 'terminée', current: 'en cours', pending: 'à venir' } as const;

/** L'ancre d'un article dans « Articles rédigés », pour y aller depuis les points non couverts. */
export const articleAnchor = (subjectId: string) => `obp-build-article-${subjectId}`;

// ── Lancement, sous le plan ───────────────────────────────────

interface BuildEntryProps {
  /** Nombre d'articles du plan affiché. */
  articleCount: number;
  builds:       OnboardingBuild[] | null;
  meta:         BuildsMeta | null;
  launching:    boolean;
  onLaunch:     () => void;
  onOpenArticles: () => void;
}

/**
 * Bloc « Rédaction des articles », sous le plan (lot C). Le back dit si la rédaction peut partir :
 * plan le plus récent et prêt, aucune rédaction en cours, quota, et réponses inchangées depuis le
 * plan (C-Q1) ; sinon le bouton est grisé avec son message.
 */
export function BuildEntry({ articleCount, builds, meta, launching, onLaunch, onOpenArticles }: BuildEntryProps) {
  const [confirm, setConfirm] = useState(false);
  const head = (
    <>
      <h3 className="obp-plan-entry__title">Rédaction des articles</h3>
      <p className="obp-muted">
        Knowdesk rédige chaque article à partir de ses seules sources dans vos documents. Chaque phrase
        garde sa source. Ce que vos documents ne disent pas n'est jamais écrit : c'est listé à part.
      </p>
    </>
  );
  const next = (
    <p className="obp-plan__next">
      Vous pouvez encore modifier vos réponses dans « À clarifier », puis préparer le plan à nouveau.
    </p>
  );
  if (builds === null || meta === null) {
    return <section className="obp-plan-entry" aria-label="Rédaction des articles">{head}<Skeleton className="obp-arb-entry__loading" />{next}</section>;
  }
  const latest = builds[0] ?? null;
  const ready = builds.some(b => b.status === 'succeeded');
  const quotaReached = meta.quota.used >= meta.quota.max;
  const label = ready ? 'Rédiger à nouveau' : `Rédiger ${articleCount > 1 ? `les ${articleCount} articles` : 'l\'article'}`;
  const refused = !meta.launch.allowed || quotaReached;

  if (latest && isBuildActive(latest)) {
    return (
      <section className="obp-plan-entry" aria-label="Rédaction des articles">
        {head}
        <div className="obp-arb-entry">
          <span>La rédaction est en cours.</span>
          <Button variant="secondary" size="md" onClick={onOpenArticles}>Voir l'avancement</Button>
        </div>
        {next}
      </section>
    );
  }

  return (
    <section className="obp-plan-entry" aria-label="Rédaction des articles">
      {head}
      {latest?.status === 'failed' && <p className="obp-analysis__error" role="status">{buildFailureMessage(latest.errorCode)}</p>}
      <div className="obp-arb-entry">
        {ready && <Button variant="primary" size="md" onClick={onOpenArticles}>Voir les articles rédigés</Button>}
        <Button
          variant={ready ? 'secondary' : 'primary'} size="md" loading={launching} disabled={refused}
          onClick={() => (ready ? setConfirm(true) : onLaunch())}
        >{label}</Button>
      </div>
      {refused ? (
        <p className="obp-correction-entry__left" role="status">
          {quotaReached && meta.launch.allowed
            ? `Votre organisation a atteint son nombre de rédactions (${meta.quota.max}). Contactez-nous pour en obtenir d'autres.`
            : meta.launch.message ?? 'La rédaction ne peut pas être lancée pour l\'instant.'}
        </p>
      ) : !ready && (
        <p className="obp-muted">Environ 5 à 10 minutes. Vous pourrez fermer cette page.</p>
      )}
      {next}
      {confirm && (
        <ConfirmDialog
          title="Rédiger à nouveau les articles ?"
          description="Les articles seront rédigés à nouveau à partir de ce plan. La rédaction actuelle et ses commentaires resteront consultables, mais ne se commenteront plus."
          confirmLabel="Rédiger à nouveau"
          cancelLabel="Annuler"
          variant="primary"
          onConfirm={() => { setConfirm(false); onLaunch(); }}
          onCancel={() => setConfirm(false)}
        />
      )}
    </section>
  );
}

// ── Avancement ────────────────────────────────────────────────

/** Rédaction en cours : étapes, articles rédigés i / n, ou l'échec en clair. */
export function BuildProgress({ build, onBackToPlan }: { build: OnboardingBuild; onBackToPlan: () => void }) {
  const states = buildStepStates(build);
  return (
    <section className="obp-analysis" aria-labelledby="obp-build-progress-title">
      <h2 id="obp-build-progress-title" className="obp-section-title">
        {build.status === 'queued' && 'Rédaction en attente de démarrage'}
        {build.status === 'running' && 'Rédaction en cours'}
        {build.status === 'succeeded' && 'Rédaction terminée'}
        {build.status === 'failed' && 'Rédaction interrompue'}
      </h2>
      {build.status === 'queued' && (
        <p className="obp-muted">Le service traite un travail à la fois : la rédaction démarre dès qu'il est libre.</p>
      )}
      <ol className="obp-steps" aria-live="polite">
        {BUILD_STEPS.map((step, i) => {
          const state = states[i];
          const showCounts = step.counts && state === 'current' && build.total > 0;
          return (
            <li key={step.label} className={`obp-step obp-step--${state}`} aria-current={state === 'current' ? 'step' : undefined}>
              <span className="obp-step__marker" aria-hidden="true" />
              <span className="obp-step__label">{step.label}</span>
              {showCounts && <span className="obp-step__count">{build.done} / {build.total}</span>}
              <span className="sr-only"> : {STEP_STATE_LABEL[state]}</span>
            </li>
          );
        })}
      </ol>
      {isBuildActive(build) && (
        <p className="obp-analysis__note">Vous pouvez fermer cette page : la rédaction continue, et vous la retrouverez ici.</p>
      )}
      {build.status === 'failed' && (
        <>
          <p className="obp-analysis__error" role="alert">{buildFailureMessage(build.errorCode)}</p>
          <Button variant="secondary" size="md" onClick={onBackToPlan}>Revenir au plan</Button>
        </>
      )}
    </section>
  );
}

// ── Articles rédigés ──────────────────────────────────────────

/** Le texte, ses phrases « À vérifier » surlignées (passages mot pour mot du bloc). */
function Highlighted({ text, passages }: { text: string; passages: readonly string[] }) {
  const ranges: Array<[number, number]> = [];
  for (const p of passages) {
    const at = p === '' ? -1 : text.indexOf(p);
    if (at >= 0 && !ranges.some(([s, e]) => at < e && at + p.length > s)) ranges.push([at, at + p.length]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const out: React.ReactNode[] = [];
  let pos = 0;
  ranges.forEach(([s, e], i) => {
    if (s > pos) out.push(text.slice(pos, s));
    out.push(<mark key={i} className="obp-base-verify"><span className="sr-only">À vérifier : </span>{text.slice(s, e)}</mark>);
    pos = e;
  });
  if (pos < text.length) out.push(text.slice(pos));
  return <>{out}</>;
}

interface Ctx {
  audit:         Audit;
  cardTitle:     (id: string) => string;
  onGoToClarify: (cardId?: string) => void;
}

function CardLink({ id, ctx }: { id: string; ctx: Ctx }) {
  return <button type="button" className="obp-link" onClick={() => ctx.onGoToClarify(id)}>{ctx.cardTitle(id)}</button>;
}

function BlockView({ block, ctx }: { block: BuiltBlock; ctx: Ctx }) {
  if (block.kind === 'intertitle') return <h5 className="obp-build-intertitle">{block.text}</h5>;
  if (block.fromExpert) {
    return (
      <div className="obp-build-expert">
        <p className="obp-build-expert__label">Précision de l'expert</p>
        <p className="obp-base-quote">« {block.text} »</p>
        {block.expert && (
          <p className="obp-muted">
            {expertEntered(block.expert.enteredOn)} Carte « <CardLink id={block.expert.cardId} ctx={ctx} /> ».
          </p>
        )}
      </div>
    );
  }
  const passages = block.toVerify.flatMap(m => m.passages);
  return (
    <div className="obp-build-block">
      {block.kind === 'text' && <p className="obp-build-text"><Highlighted text={block.text} passages={passages} /></p>}
      {block.kind === 'list' && (
        <ul className="obp-build-list">
          {block.items.map((item, i) => <li key={i}><Highlighted text={item} passages={passages} /></li>)}
        </ul>
      )}
      {block.kind === 'table' && (
        <div className="obp-build-table-wrap">
          <table className="obp-build-table">
            <thead><tr>{block.header.map((h, i) => <th key={i} scope="col">{h}</th>)}</tr></thead>
            <tbody>{block.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
      {block.toVerify.map((m, i) => (
        <p key={i} className="obp-build-verify-note">
          <mark className="obp-base-verify">À vérifier</mark> : {TO_VERIFY_LABEL[m.reason]}
        </p>
      ))}
      <details className="obp-plan-subject__sources">
        <summary>Sources ({block.sources.length})</summary>
        {block.sources.map((s, i) => <AuditSource key={i} audit={ctx.audit} source={s} />)}
      </details>
    </div>
  );
}

function ArticleView({ article, ctx, onShowUncovered, children }: {
  article: BuiltArticle; ctx: Ctx; onShowUncovered: () => void; children: React.ReactNode;
}) {
  const toVerify = article.blocks.reduce((n, b) => n + b.toVerify.reduce((k, m) => k + m.passages.length, 0), 0);
  return (
    <article className="obp-plan-subject obp-build-article" id={articleAnchor(article.subjectId)}>
      <div className="obp-build-article__head">
        <h4 className="obp-plan-subject__title">{article.title}</h4>
        {toVerify > 0 && <span className="obp-build-chip">{toVerify > 1 ? `${toVerify} phrases à vérifier` : '1 phrase à vérifier'}</span>}
      </div>
      <p className="obp-plan-subject__meta">
        <span>Cet article répondra à : {article.question}</span>
        {article.audience && <span>Public : {article.audience}</span>}
      </p>
      {!article.written && (
        <p className="obp-muted">
          Aucun texte gardé : {article.emptyReason ? EMPTY_LABEL[article.emptyReason] : 'aucun texte n\'a pu être gardé'}.{' '}
          <button type="button" className="obp-link" onClick={onShowUncovered}>Voir les points non couverts</button>.
        </p>
      )}
      {article.blocks.map(b => <BlockView key={b.id} block={b} ctx={ctx} />)}
      {article.removed.length > 0 && (
        <details className="obp-build-removed">
          <summary>Retiré de cet article ({article.removed.length})</summary>
          <ul>
            {article.removed.map(r => (
              <li key={r.id}>
                « {r.text} » : {removedLabel(r, ctx.cardTitle)}
                {r.passages.map((s, i) => <AuditSource key={i} audit={ctx.audit} source={s} />)}
              </li>
            ))}
          </ul>
        </details>
      )}
      {article.cardIds.length > 0 && (
        <p className="obp-plan-subject__cards">
          Cartes liées ({article.cardIds.length}) :{' '}
          {article.cardIds.map((id, i) => <React.Fragment key={id}>{i > 0 && ', '}<CardLink id={id} ctx={ctx} /></React.Fragment>)}
        </p>
      )}
      {children}
    </article>
  );
}

interface BuildArticlesProps extends Ctx {
  projectId:     string;
  buildId:       string;
  construction:  Construction;
  comments:      BuildComment[];
  commentable:   boolean;
  focus:         string | null;
  onSaved:       (saved: BuildComment) => void;
  onCancelled:   (subjectId: string | null, current: BuildComment | null) => void;
  onShowUncovered: () => void;
}

/**
 * Les articles rédigés, par catégorie : chaque passage avec ses sources, les phrases « À vérifier »,
 * le texte de l'expert « saisi par l'expert le … » (D11), ce qui a été retiré et pourquoi, et un
 * commentaire par article et un pour la rédaction (C-Q2 : lire et commenter, rien d'autre).
 */
export function BuildArticles({
  projectId, buildId, construction, comments, commentable, focus, onSaved, onCancelled, onShowUncovered, ...ctx
}: BuildArticlesProps) {
  const commentOf = (subjectId: string | null) => comments.find(c => c.subjectId === subjectId) ?? null;
  const box = (subjectId: string | null, label: string) => (
    <PlanCommentBox
      projectId={projectId} planId={buildId} subjectId={subjectId} label={label}
      current={commentOf(subjectId)} editable={commentable} onSaved={onSaved} onCancelled={onCancelled}
      submit={body => onboardingApi.commentBuild(projectId, buildId, body)}
      cancel={id => onboardingApi.cancelBuildComment(projectId, buildId, id)}
      hint={BUILD_COMMENT_HINT}
    />
  );
  return (
    <div className="obp-plan">
      <p className="obp-plan__summary">{buildSummary(construction)}</p>
      {!commentable && (
        <p className="obp-muted" role="status">Cette rédaction a été remplacée par une plus récente : elle se consulte, mais ne se commente plus.</p>
      )}
      <p className="obp-muted">
        <mark className="obp-base-verify">Phrase à vérifier</mark> : vos documents ne la confirment pas mot pour mot,
        ou elle relie deux passages différents de vos documents.
      </p>
      {construction.chapters.map((chapter, ci) => (
        <details key={chapter.id} className="obp-plan-chapter" open={ci === 0 || chapter.articles.some(a => a.subjectId === focus)}>
          <summary className="obp-plan-chapter__title">Catégorie {ci + 1} · {chapter.title}</summary>
          {chapter.articles.map(article => (
            <ArticleView key={article.subjectId} article={article} ctx={ctx} onShowUncovered={onShowUncovered}>
              {box(article.subjectId, 'Commentaire sur cet article (facultatif)')}
            </ArticleView>
          ))}
        </details>
      ))}
      <section className="obp-plan__whole" aria-label="Commentaire sur la rédaction">
        {box(null, 'Commentaire sur la rédaction (facultatif)')}
      </section>
      <p className="obp-plan__next">La création des articles dans votre base arrive bientôt.</p>
    </div>
  );
}

// ── Points non couverts ───────────────────────────────────────

interface UncoveredListProps extends Ctx {
  construction:   Construction;
  isBlocking:     (cardId: string) => boolean;
  onOpenArticle:  (subjectId: string) => void;
}

/** « Points non couverts par vos documents » (D3, D4) : jamais dans un article, pour l'équipe. */
export function UncoveredList({ construction, isBlocking, onOpenArticle, ...ctx }: UncoveredListProps) {
  const titles = new Map(construction.chapters.flatMap(c => c.articles).map(a => [a.subjectId, a.title]));
  const articleLink = (subjectId: string | null) => subjectId !== null && (
    <button type="button" className="obp-link" onClick={() => onOpenArticle(subjectId)}>Voir l'article</button>
  );
  const article = (subjectId: string | null) => `« ${subjectId !== null ? titles.get(subjectId) ?? 'un article' : 'un article'} »`;

  const point = (p: UncoveredPoint) => {
    switch (p.kind) {
      case 'card_without_article':
        return (
          <>
            <p className="obp-build-point__title">
              <strong>{p.cardId ? ctx.cardTitle(p.cardId) : 'Une carte'}</strong>
              {p.cardId && isBlocking(p.cardId) && <span className="obp-build-chip">carte bloquante</span>}
            </p>
            <p>Aucun article du plan ne cite les passages de cette carte : votre réponse n'apparaît dans aucun article.</p>
            {p.expert && (
              <>
                <p className="obp-base-quote">« {p.expert.text} »</p>
                <p className="obp-muted">{expertEntered(p.expert.enteredOn)} Ce texte n'est écrit dans aucun article.</p>
              </>
            )}
          </>
        );
      case 'missing_information':
        return (
          <>
            <p>Article {article(p.subjectId)} : {p.note}</p>
            <p className="obp-muted">Signalé par la rédaction : aucune source de cet article ne donne cette information.</p>
          </>
        );
      case 'value_without_source':
        return (
          <>
            <p>Article {article(p.subjectId)} : une valeur a été retirée, faute de source.</p>
            {p.removedText && <blockquote className="obp-plan__excerpt">{p.removedText}</blockquote>}
          </>
        );
      case 'article_without_text': {
        const a = construction.chapters.flatMap(c => c.articles).find(x => x.subjectId === p.subjectId);
        return <p>Article {article(p.subjectId)} : {a?.emptyReason ? EMPTY_LABEL[a.emptyReason] : 'aucun texte gardé'}.</p>;
      }
      case 'unresolved_card':
        return (
          <>
            <p className="obp-build-point__title"><strong>{p.cardId ? ctx.cardTitle(p.cardId) : 'Une carte'}</strong></p>
            <p>Carte laissée « Plus tard » ou sans réponse : les passages en désaccord sont retirés des articles.</p>
          </>
        );
    }
  };

  return (
    <section className="obp-plan obp-build-uncovered" aria-labelledby="obp-build-uncovered-title">
      <h2 id="obp-build-uncovered-title" className="obp-section-title">
        Points non couverts par vos documents ({construction.uncovered.length})
      </h2>
      <p className="obp-muted">
        Ce que vos documents ne donnent pas n'est jamais écrit dans un article. Ces points sont à compléter
        par votre équipe ; ils n'entrent pas dans la base.
      </p>
      {construction.uncovered.length === 0 && <p>Vos documents couvrent chaque article : aucun point à compléter.</p>}
      {UNCOVERED_GROUPS.map(group => {
        const points = construction.uncovered.filter(p => group.kinds.includes(p.kind));
        if (points.length === 0) return null;
        return (
          <div key={group.title} className="obp-plan-attention__group">
            <h3 className="obp-plan-attention__title">{group.title} ({points.length})</h3>
            <ol className="obp-build-points">
              {points.map(p => (
                <li key={p.id} className="obp-build-point">
                  {point(p)}
                  {p.passages.length > 0 && (
                    <details className="obp-plan-subject__sources">
                      <summary>Passages ({p.passages.length})</summary>
                      {p.passages.map((s, i) => <AuditSource key={i} audit={ctx.audit} source={s} />)}
                    </details>
                  )}
                  <p className="obp-build-point__links">
                    {p.cardId && <button type="button" className="obp-link" onClick={() => ctx.onGoToClarify(p.cardId!)}>Voir la carte</button>}
                    {p.kind !== 'card_without_article' && p.kind !== 'unresolved_card' && articleLink(p.subjectId)}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        );
      })}
    </section>
  );
}

import React, { useState } from 'react';
import { Button } from '../../../../shared/components/ui/Button';
import { ConfirmDialog } from '../../../../shared/components/ui/ConfirmDialog';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';
import { onboardingApi } from '../../api/onboardingApi';
import type { Audit } from '../../lib/audit';
import {
  BUILD_COMMENT_HINT, BUILD_STEPS, buildFailureMessage, buildStepStates, buildSummary, EMPTY_LABEL, groupBlocks, isBuildActive,
  removedLabel, removedLabelAround, TO_VERIFY_LABEL, unplacedAnswersTitle, verifyLegend,
  type BuildComment, type BuildsMeta, type BuiltArticle, type BuiltBlock, type Construction, type OnboardingBuild,
} from '../../lib/build';
import { expertEntered } from '../../lib/correction';
import { AuditSource } from '../audit/AuditSource';
import { AudienceFilter, AudienceTag } from './Audience';
import { hasAudiences, matchesAudience, type AudienceFilter as Filter } from '../../lib/audience';
import { PlanCommentBox } from './PlanTab';
import { BuildKnowledgeBase } from '../knowledgeBase/BuildKnowledgeBase';
import { ByYouBadge, KnowDeskMention } from '../../../../shared/components/ui/Origin';
import { fromDocuments } from '../../lib/format';

const STEP_STATE_LABEL = { done: 'terminée', current: 'en cours', pending: 'à venir' } as const;

/** L'ancre d'un article dans « Articles rédigés ». */
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

/** La raison d'un retrait ; la carte qui l'a décidé est un lien vers elle. */
function RemovedReason({ removed, ctx }: { removed: Pick<BuiltArticle['removed'][number], 'reason' | 'cardId'>; ctx: Ctx }) {
  const around = removedLabelAround(removed);
  if (!around || !removed.cardId) return <>{removedLabel(removed, ctx.cardTitle)}</>;
  return <>{around.before}<CardLink id={removed.cardId} ctx={ctx} />{around.after}</>;
}

function BlockView({ block, ctx }: { block: BuiltBlock; ctx: Ctx }) {
  if (block.kind === 'intertitle') return <h5 className="obp-build-intertitle">{block.text}</h5>;
  if (block.fromExpert) {
    return (
      <div className="obp-build-expert">
        <p className="obp-build-expert__label">Précision de l'expert <ByYouBadge /></p>
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
      {block.audience && (
        <p className="obp-build-block__audience" aria-label="Public de ce passage"><AudienceTag value={block.audience} /></p>
      )}
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

/**
 * Un paragraphe fait de passages qui se suivent (étape 5, 2026-11-22, voie A) : leurs textes à la
 * suite, mot pour mot ; sous lui, les sources de chaque phrase d'origine (« D'après « … » »).
 */
function ParagraphView({ blocks, ctx }: { blocks: BuiltBlock[]; ctx: Ctx }) {
  if (blocks.length === 1) return <BlockView block={blocks[0]} ctx={ctx} />;
  const audience = blocks[0].audience;
  return (
    <div className="obp-build-block obp-build-paragraph">
      {audience && (
        <p className="obp-build-block__audience" aria-label="Public de ce passage"><AudienceTag value={audience} /></p>
      )}
      <p className="obp-build-text">{blocks.map(b => b.text).join(' ')}</p>
      <details className="obp-plan-subject__sources">
        <summary>Sources ({blocks.reduce((n, b) => n + b.sources.length, 0)})</summary>
        {blocks.map(b => (
          <div key={b.id} className="obp-build-origin">
            <p className="obp-build-origin__said">D'après « {b.text} »</p>
            {b.sources.map((s, i) => <AuditSource key={i} audit={ctx.audit} source={s} />)}
          </div>
        ))}
      </details>
    </div>
  );
}

/** Les documents dont l'article tire ses textes, hors texte de l'expert : la source de « Rédigé par KnowDesk ». */
function articleDocumentCount(article: BuiltArticle): number {
  return new Set(article.blocks.filter(b => !b.fromExpert).flatMap(b => b.sources.map(s => s.documentId))).size;
}

function ArticleView({ article, ctx, children }: { article: BuiltArticle; ctx: Ctx; children: React.ReactNode }) {
  const toVerify = article.blocks.reduce((n, b) => n + b.toVerify.reduce((k, m) => k + m.passages.length, 0), 0);
  return (
    <article className="obp-plan-subject obp-build-article" id={articleAnchor(article.subjectId)}>
      <div className="obp-build-article__head">
        <h4 className="obp-plan-subject__title">{article.title}</h4>
        {toVerify > 0 && <span className="obp-build-chip">{toVerify > 1 ? `${toVerify} phrases à vérifier` : '1 phrase à vérifier'}</span>}
      </div>
      <p className="obp-plan-subject__meta">
        <span>Cet article répondra à : {article.question}</span>
        <AudienceTag value={article.audience} />
      </p>
      {article.written && <KnowDeskMention>{`Rédigé par KnowDesk${fromDocuments(articleDocumentCount(article))}`}</KnowDeskMention>}
      {!article.written && (
        <p className="obp-muted">
          Aucun texte gardé : {article.emptyReason ? EMPTY_LABEL[article.emptyReason] : 'aucun texte n\'a pu être gardé'}.
        </p>
      )}
      {groupBlocks(article.blocks).map(g => (g.kind === 'paragraph'
        ? <ParagraphView key={g.blocks[0].id} blocks={g.blocks} ctx={ctx} />
        : <BlockView key={g.block.id} block={g.block} ctx={ctx} />))}
      {article.removed.length > 0 && (
        <details className="obp-build-removed">
          <summary>Retiré de cet article ({article.removed.length})</summary>
          <KnowDeskMention>Retiré par KnowDesk, avec sa raison</KnowDeskMention>
          <ul>
            {article.removed.map(r => (
              <li key={r.id}>
                « {r.text} » : <RemovedReason removed={r} ctx={ctx} />
                {r.passages.map((s, i) => <AuditSource key={i} audit={ctx.audit} source={s} />)}
              </li>
            ))}
          </ul>
        </details>
      )}
      {article.duplicates.length > 0 && (
        <details className="obp-build-removed obp-build-duplicates">
          <summary>Redites retirées ({article.duplicates.length})</summary>
          <KnowDeskMention>Retirées par KnowDesk : le texte gardé dit la même chose</KnowDeskMention>
          <ul>
            {article.duplicates.map(d => (
              <li key={d.id}>
                « {d.text} » : {d.inTable ? 'déjà dans le tableau, ligne' : 'déjà dit par'} « {d.keptBy} ».
                {d.passages.map((s, i) => <AuditSource key={i} audit={ctx.audit} source={s} />)}
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
  onSaved:       (saved: BuildComment) => void;
  onCancelled:   (subjectId: string | null, current: BuildComment | null) => void;
  /** Module « knowledge » : sans lui, la création de la base n'est pas proposée (lot D). */
  knowledgeEnabled?: boolean;
  onOpenKnowledge?:  () => void;
}

/**
 * Les articles rédigés, par catégorie : chaque passage avec ses sources, les phrases « À vérifier »,
 * le texte de l'expert « saisi par l'expert le … » (D11), ce qui a été retiré et pourquoi, et un
 * commentaire par article et un pour la rédaction (C-Q2 : lire et commenter, rien d'autre). En tête,
 * les réponses de l'expert qu'aucun article ne porte (C-Q11) ; aucune suggestion de l'IA.
 */
export function BuildArticles({
  projectId, buildId, construction, comments, commentable, onSaved, onCancelled, knowledgeEnabled = false, onOpenKnowledge, ...ctx
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
  const [filter, setFilter] = useState<Filter>('all');
  const values = construction.chapters.flatMap(c => c.articles.map(a => a.audience));
  return (
    <div className="obp-plan">
      <p className="obp-plan__summary">{buildSummary(construction)}</p>
      <UnplacedAnswers construction={construction} ctx={ctx} />
      {!commentable && (
        <p className="obp-muted" role="status">Cette rédaction a été remplacée par une plus récente : elle se consulte, mais ne se commente plus.</p>
      )}
      <p className="obp-muted">
        <mark className="obp-base-verify">Phrase à vérifier</mark> : {verifyLegend(construction)}
        {' '}<KnowDeskMention>Trouvées par KnowDesk</KnowDeskMention>
      </p>
      {hasAudiences(values) && <AudienceFilter values={values} value={filter} onChange={setFilter} />}
      {construction.chapters.map((chapter, ci) => ({ chapter, ci, shown: chapter.articles.filter(a => matchesAudience(a.audience, filter)) }))
        .filter(x => x.shown.length > 0).map(({ chapter, ci, shown }) => (
        <details key={chapter.id} className="obp-plan-chapter" open={ci === 0 || filter !== 'all'}>
          <summary className="obp-plan-chapter__title">Catégorie {ci + 1} · {chapter.title}</summary>
          {shown.map(article => (
            <ArticleView key={article.subjectId} article={article} ctx={ctx}>
              {box(article.subjectId, 'Commentaire sur cet article (facultatif)')}
            </ArticleView>
          ))}
        </details>
      ))}
      <section className="obp-plan__whole" aria-label="Commentaire sur la rédaction">
        {box(null, 'Commentaire sur la rédaction (facultatif)')}
      </section>
      {commentable && (
        <BuildKnowledgeBase projectId={projectId} buildId={buildId} knowledgeEnabled={knowledgeEnabled} onOpenKnowledge={onOpenKnowledge} />
      )}
    </div>
  );
}

// ── Réponses qui ne figurent dans aucun article (C-Q11) ──────

/**
 * « N de vos réponses ne figurent dans aucun article » : les cartes répondues qu'aucun article du
 * plan ne cite, chacune avec son titre et un lien vers elle. Rien d'autre : ni suggestion de l'IA,
 * ni information « absente de vos documents ».
 */
export function UnplacedAnswers({ construction, ctx }: { construction: Construction; ctx: Ctx }) {
  const answers = construction.unplacedAnswers;
  if (answers.length === 0) return null;
  return (
    <section className="obp-build-unplaced" aria-labelledby="obp-build-unplaced-title">
      <h3 id="obp-build-unplaced-title" className="obp-build-unplaced__title">{unplacedAnswersTitle(answers.length)}</h3>
      <p className="obp-muted">Aucun article du plan ne cite les passages de ces cartes : votre réponse n'est écrite nulle part.</p>
      <ul className="obp-build-unplaced__list">
        {answers.map(a => <li key={a.cardId}><CardLink id={a.cardId} ctx={ctx} /></li>)}
      </ul>
    </section>
  );
}

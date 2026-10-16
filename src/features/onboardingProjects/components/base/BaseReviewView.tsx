import React, { useMemo } from 'react';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';
import {
  modificationPlacement, ownHeading, proposedLines, sectionTitleIndex, sheetViews, type SectionView, type SheetView,
} from '../../lib/baseDocument';
import {
  canCreateChapters, chapterRequests, firstSentence, toVerifyCounts, recordedAnswer, itemLabel, itemRank, kindLabel, NEW_CHAPTER_LABEL, originLabel, outcomeLabel, partialSummary,
  pendingSentences, reasonGroups, reviewProgressLabel, SHOWN_REASONS, type ReasonGroup,
  type BaseCorrection, type Convention, type Modification, type SectionFix,
} from '../../lib/correction';
import type { BaseReview } from '../../hooks/useBaseReview';
import type { Decision } from '../../lib/decisions';
import { formatFull } from '../../../../shared/lib/formatDate';
import { Button } from '../../../../shared/components/ui/Button';
import { AuthorName } from './AuthorName';
import { BaseLines } from './BaseLines';
import type { FixSection } from './ReviewCard';
import { ReviewCard } from './ReviewCard';
import { SectionCommentBox } from './SectionCommentBox';
import { SectionFixBox } from './SectionFixBox';

interface BaseReviewViewProps {
  base:       BaseCorrection;
  /** Titre de chaque carte de l'audit, pour dire d'où vient une modification. */
  cardTitles: ReadonlyMap<string, string>;
  /** Réponse courante de chaque carte de l'analyse (par identifiant de carte) ; vide s'il manque. */
  decisions?: ReadonlyMap<string, Decision>;
  editable:   boolean;
  review:     BaseReview;
}

const anchorOf = (id: string) => `obp-base-${id.toLowerCase()}`;

/**
 * Relecture de la nouvelle base, sur le modèle de la page validée par l'experte : chaque fiche
 * dans l'ordre, chaque modification à sa place avec le titre de sa section, les sections
 * inchangées repliées à leur place, un avis par modification et par convention, un commentaire
 * possible sur n'importe quelle section, et « n sur N relues » en tête.
 */
export function BaseReviewView({ base, cardTitles, decisions = new Map(), editable, review }: BaseReviewViewProps) {
  const sheets = useMemo(() => sheetViews(base), [base]);
  const titles = useMemo(() => sectionTitleIndex(sheets), [sheets]);
  const placement = useMemo(() => modificationPlacement(sheets, base.modifications), [sheets, base.modifications]);
  const mods = useMemo(() => new Map(base.modifications.map(m => [m.id, m])), [base.modifications]);
  const conventions = base.conventions ?? [];
  const chapters = useMemo(() => chapterRequests(base.pending ?? []), [base.pending]);
  /** 0.4.0 : les phrases « À vérifier » de chaque modification. */
  const toVerify = useMemo(() => toVerifyCounts(base), [base]);
  const createsChapters = canCreateChapters(base.schema_version);
  /** Le texte proposé par chaque modification, toutes sections confondues. */
  /** Les sections que chaque modification touche, dans l'ordre du document, avec les lignes qu'elle y propose. */
  const fixSections = useMemo(() => {
    const out = new Map<string, FixSection[]>();
    for (const m of base.modifications) {
      const keys = new Set(m.section_keys);
      out.set(m.id, sheets.flatMap(s => s.sections).filter(s => keys.has(s.key)).map(s => ({
        key: s.key, title: titles.get(s.key) ?? s.title, proposed: proposedLines(s.blocks, m.id).join('\n\n'),
      })));
    }
    return out;
  }, [base.modifications, sheets, titles]);

  /**
   * Ce qu'une modification écrit, et elle seule : une section peut en porter plusieurs (« Base de
   * co 2026 v3 » : la mesure expirée M3 à côté de la procédure pharmacies M2, en 5.2). Les lignes
   * d'une autre modification ne s'affichent jamais comme les siennes.
   */
  const ownWriting = useMemo(() => {
    const blocks = new Map(sheets.flatMap(sh => sh.sections).map(s => [s.key, s.blocks]));
    const out = new Map<string, { writes: boolean; others: Array<{ id: string; title: string }> }>();
    for (const m of base.modifications) {
      const keys = m.section_keys.filter(k => blocks.has(k));
      const writes = keys.some(k => proposedLines(blocks.get(k)!, m.id).length > 0);
      const others = keys.flatMap(k => [...new Set(blocks.get(k)!.flatMap(b => (b.op !== 'equal' && b.modificationId && b.modificationId !== m.id ? [b.modificationId] : [])))]
        .map(id => ({ id, title: titles.get(k) ?? '' })));
      out.set(m.id, { writes, others });
    }
    return out;
  }, [base.modifications, sheets, titles]);

  const { state } = review;
  if (state.status === 'loading') return <Skeleton className="obp-skeleton-block" />;
  if (state.status === 'error') return <p className="obp-muted">Les avis n'ont pas pu être chargés.</p>;

  const reviewed = [...state.reviews.values()].filter(r => r.verdict !== null).length;
  const sectionTitle = (key: string) => titles.get(key) ?? null;

  const modificationCard = (m: Modification) => (
    <ReviewCard
      key={m.id}
      anchor={anchorOf(m.id)}
      title={`${itemLabel(m.id)} · ${kindLabel(m.kind)}`}
      withVerdict={m.outcome === 'applied'}
      editable={editable}
      current={state.reviews.get(m.id)}
      save={review.saves.get(`item:${m.id}`)}
      fixable
      sections={fixSections.get(m.id) ?? []}
      toVerify={toVerify.get(m.id) ?? 0}
      onSave={d => { void review.saveReview(m.id, d); }}
    >
      <p className="obp-base-card__origin">{originLabel(m, cardTitles)}</p>
      <p className="obp-base-card__what">{m.instruction}</p>
      {m.expert_text && m.expert_text.trim() && <p className="obp-base-quote">« {m.expert_text.trim()} »</p>}
      <Outcome label={outcomeLabel(m)} applied={m.outcome === 'applied'} groups={reasonGroups(m.reasons ?? [], sectionTitle)} />
      <OwnWriting id={m.id} writing={ownWriting.get(m.id)} />
    </ReviewCard>
  );

  /**
   * Une modification en attente d'un chapitre à créer (0.3.0) : à son rang, avec le numéro que le
   * pipeline lui a réservé ; rien à relire, elle n'écrit rien dans la base.
   */
  const chapterCard = (c: { id: string; cardId: string }) => {
    const title = cardTitles.get(c.cardId);
    const answer = decisions.get(c.cardId);
    const text = answer ? recordedAnswer(answer.action) : null;
    return (
      <article key={c.id} id={anchorOf(c.id)} className="obp-base-card obp-base-card--pending" aria-label={itemLabel(c.id)}>
        <h4 className="obp-base-card__title">{itemLabel(c.id)} — {NEW_CHAPTER_LABEL}</h4>
        {title && <p className="obp-base-card__origin">Carte « {title} »</p>}
        <p className="obp-muted">
          Cette réponse demande un chapitre qui n'existe pas encore dans la base
          {createsChapters ? ', et aucun document importé ne le porte' : ''}. Elle reste enregistrée dans « À
          clarifier ». Pour en reprendre le contenu, utilisez « Corriger cette section » sur la section la plus proche et
          ajoutez-le au texte.
        </p>
        {answer && text && <RecordedAnswer text={text} answer={answer} />}
      </article>
    );
  };

  const conventionCard = (c: Convention) => (
    <ReviewCard
      key={c.id}
      anchor={anchorOf(c.id)}
      title={itemLabel(c.id)}
      withVerdict
      editable={editable}
      current={state.reviews.get(c.id)}
      save={review.saves.get(`item:${c.id}`)}
      fixable={false}
      sections={[]}
      onSave={d => { void review.saveReview(c.id, d); }}
    >
      <p className="obp-base-card__what">{c.rule}</p>
      <p className="obp-muted">
        {c.section_keys.length === 0
          ? 'Elle n\'a rien changé dans la base.'
          : `Appliquée dans : ${c.section_keys.map(k => titles.get(k)).filter(Boolean).join(' ; ')}.`}
      </p>
    </ReviewCard>
  );

  const section = (sheet: SheetView, s: SectionView) => {
    const comment = (
      <SectionCommentBox
        title={s.title}
        current={state.comments.get(s.key)}
        editable={editable}
        save={review.saves.get(`section:${s.key}`)}
        onSave={t => { void review.saveComment(s.key, t); }}
      />
    );
    const fix = (
      <SectionFixBox
        title={s.title}
        proposed={s.proposedMarkdown}
        current={state.fixes.get(s.key)}
        editable={editable}
        save={review.saves.get(`fix:${s.key}`)}
        onSave={t => { void review.saveSectionFix(s.key, t); }}
      />
    );
    const open = s.changed || s.modificationIds.length > 0 || s.conventionIds.length > 0;
    /** Le texte de section enregistré (« Corriger cette section ») : la section l'affiche, comme la version propre. */
    const fixed = state.fixes.get(s.key);
    if (!open) {
      return (
        <details key={s.key} className="obp-base-section obp-base-section--unchanged">
          <summary>
            <span className="obp-base-section__title">{s.title}</span>
            <span className="obp-muted"> · inchangée</span>
            {state.comments.has(s.key) && <span className="obp-base-chip">commentée</span>}
            {fixed && <span className="obp-base-chip">corrigée</span>}
          </summary>
          {/* Le titre est dans le résumé : il ne se répète pas dans le texte. */}
          {fixed ? <FixedText fix={fixed} blocks={s.blocks} /> : <BaseLines blocks={ownHeading(s.blocks) ? s.blocks.slice(1) : s.blocks} />}
          {fix}
          {comment}
        </details>
      );
    }
    return (
      <section key={s.key} className="obp-base-section obp-base-section--open" aria-label={s.title}>
        {!ownHeading(s.blocks) && s.title !== sheet.title && <h3 className="obp-base-section__title">{s.title}</h3>}
        <div className="obp-base-grid">
          {fixed ? <FixedText fix={fixed} blocks={s.blocks} /> : <BaseLines blocks={s.blocks} />}
          <div className="obp-base-side">
            {s.modificationIds.map(id => {
              const m = mods.get(id);
              if (!m) return null;
              if (placement.firstSection.get(id) === s.key) return modificationCard(m);
              return (
                <p key={id} className="obp-base-follow">
                  Suite de la <a href={`#${anchorOf(id)}`}>{itemLabel(id).toLowerCase()}</a>, à relire plus haut.
                </p>
              );
            })}
            {s.conventionIds.map(id => {
              const c = conventions.find(x => x.id === id);
              return c ? (
                <p key={id} className="obp-base-follow">
                  Convention appliquée ici : {c.rule} <a href={`#${anchorOf(id)}`}>Votre avis</a>
                </p>
              ) : null;
            })}
            {fix}
            {comment}
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className="obp-base">
      <header className="obp-base-head">
        <div>
          <p className="obp-base-head__title">Les modifications apportées à votre base</p>
          {pendingSentences(base.pending ?? [], id => cardTitles.get(id), createsChapters).map(text => (
            <p key={text} className="obp-muted">{text}</p>
          ))}
        </div>
        <p className="obp-base-head__progress" aria-live="polite">
          <strong>{reviewProgressLabel(reviewed, state.toReview)}</strong>
        </p>
      </header>

      <p className="obp-base-legend">
        Votre base est reprise telle quelle ; seules vos réponses dans « À clarifier » la modifient.{' '}
        <ins>texte ajouté</ins> <del>texte retiré</del>{' '}
        Les sections sans modification sont repliées à leur place : ouvrez-les pour les lire.
        {toVerify.size > 0 && (
          <>{' '}<mark className="obp-base-verify">Phrase à vérifier</mark> : ajoutée, mais vos documents ne la confirment pas mot pour mot.</>
        )}
        Vous pouvez commenter n'importe quelle section.
      </p>
      {!editable && (
        <p className="obp-arb-entry--readonly" role="status">
          Base d'une préparation précédente : ses avis restent consultables, mais ne se modifient plus.
        </p>
      )}

      {conventions.length > 0 && (
        <section className="obp-base-chapter" aria-labelledby="obp-base-conventions">
          <h2 id="obp-base-conventions" className="obp-base-chapter__title">Conventions appliquées</h2>
          <div className="obp-base-side obp-base-side--wide">{conventions.map(conventionCard)}</div>
        </section>
      )}

      {(placement.unplaced.length > 0 || chapters.length > 0) && (
        <section className="obp-base-chapter" aria-labelledby="obp-base-unplaced">
          <h2 id="obp-base-unplaced" className="obp-base-chapter__title">Modifications sans emplacement dans la base</h2>
          <div className="obp-base-side obp-base-side--wide">
            {[
              ...placement.unplaced.map(m => ({ id: m.id, node: modificationCard(m) })),
              ...chapters.map(c => ({ id: c.id, node: chapterCard(c) })),
            ].sort((a, b) => itemRank(a.id) - itemRank(b.id)).map(x => x.node)}
          </div>
        </section>
      )}

      {sheets.map(sheet => (
        <section key={sheet.documentId} className="obp-base-chapter" aria-label={sheet.title}>
          <h2 className="obp-base-chapter__title">{sheet.title}</h2>
          <p className="obp-muted obp-base-chapter__file">
            {sheet.createdBy ? `Nouveau chapitre, créé par la ${itemLabel(sheet.createdBy).toLowerCase()} · ${sheet.fileName}` : sheet.fileName}
          </p>
          {sheet.sections.map(s => section(sheet, s))}
        </section>
      ))}
    </div>
  );
}

/** Ce que la carte écrit dans la base, elle seule ; et, si elle n'écrit rien, d'où viennent les changements montrés à côté. */
function OwnWriting({ id, writing }: { id: string; writing: { writes: boolean; others: Array<{ id: string; title: string }> } | undefined }) {
  if (!writing) return null;
  if (writing.writes) {
    return <p className="obp-muted obp-base-card__own">Ses lignes sont marquées « {itemLabel(id)} » dans le texte.</p>;
  }
  return (
    <p className="obp-muted obp-base-card__own">
      Elle n'écrit rien dans la base.
      {writing.others.map(o => ` Les changements de « ${o.title} » viennent de la ${itemLabel(o.id).toLowerCase()}.`).join('')}
    </p>
  );
}

/**
 * Un libellé de l'écran écrit en phrases complètes (la note d'image) se lit tel quel, sous la
 * suite de la modification ; les autres se lisent à sa suite, sans majuscule.
 */
const standsAlone = (g: ReasonGroup): boolean => !g.fromModel && /[.!?]$/.test(g.text);

const reasonLine = (g: ReasonGroup) => `${g.text}${g.sections > 1 ? ` (dans ${g.sections} sections)` : ''}`;

/**
 * La suite d'une modification. Appliquée en partie : ce qui n'a pas pu être fait en une phrase,
 * puis ce qui n'a pas été repris, regroupé, trois lignes au plus, le reste repliable.
 */
function Outcome({ label, applied, groups }: { label: string; applied: boolean; groups: ReasonGroup[] }) {
  const summary = applied ? partialSummary(groups) : null;
  const rest = summary ? groups.filter(g => g !== summary) : groups;
  return (
    <div className={`obp-base-card__outcome${applied ? '' : ' obp-base-card__outcome--na'}`}>
      <p>
        <strong>{label}</strong>
        {summary && !standsAlone(summary) && ` : ${firstSentence(summary.text).charAt(0).toLowerCase()}${firstSentence(summary.text).slice(1)}.`}
        {summary && standsAlone(summary) && '.'}
      </p>
      {summary && standsAlone(summary) && <p>{summary.text}</p>}
      {rest.length > 0 && (
        <>
          <p className="obp-base-card__reasons-head">{applied ? 'Ce qui n\'a pas été repris :' : 'Pourquoi :'}</p>
          <ul>{rest.slice(0, SHOWN_REASONS).map(g => <li key={g.text}>{reasonLine(g)}</li>)}</ul>
          {rest.length > SHOWN_REASONS && (
            <details className="obp-base-card__more">
              <summary>Voir {rest.length - SHOWN_REASONS > 1 ? `les ${rest.length - SHOWN_REASONS} autres raisons` : 'l\'autre raison'}</summary>
              <ul>{rest.slice(SHOWN_REASONS).map(g => <li key={g.text}>{reasonLine(g)}</li>)}</ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Une section corrigée (plan v4, point 8) : le texte enregistré, celui que la version propre
 * reprend, et qui l'a écrit ; le texte proposé reste lisible, replié.
 */
function FixedText({ fix, blocks }: { fix: SectionFix; blocks: SectionView['blocks'] }) {
  return (
    <div className="obp-base-fixed">
      <p className="obp-base-label">
        Texte corrigé par <AuthorName name={fix.authorName ?? 'un membre de l\'équipe'} authorId={fix.authorId} />, le {formatFull(fix.createdAt)}
      </p>
      <pre className="obp-base-section-fix__text">{fix.correctedText}</pre>
      <details className="obp-base-fixed__proposed">
        <summary>Texte proposé par la préparation</summary>
        <BaseLines blocks={blocks} />
      </details>
    </div>
  );
}

/** La réponse enregistrée sur une carte en attente (plan v4, point 13) : son texte, qui l'a donnée et quand ; copiable. */
function RecordedAnswer({ text, answer }: { text: string; answer: Decision }) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(text).then(() => setCopied(true), () => {});
  };
  return (
    <div className="obp-base-answer">
      <p className="obp-base-label">
        Réponse enregistrée par <AuthorName name={answer.decidedBy.name} authorId={answer.decidedBy.id} />, le {formatFull(answer.decidedAt)} :
      </p>
      <blockquote className="obp-base-quote obp-base-answer__text">{text}</blockquote>
      <div className="obp-decision__actions">
        <Button variant="secondary" size="sm" onClick={copy}>{copied ? 'Copiée' : 'Copier la réponse'}</Button>
      </div>
    </div>
  );
}

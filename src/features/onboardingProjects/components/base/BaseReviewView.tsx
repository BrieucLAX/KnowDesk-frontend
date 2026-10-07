import React, { useMemo } from 'react';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';
import {
  modificationPlacement, proposedLines, sectionTitleIndex, sheetViews, type SectionView, type SheetView,
} from '../../lib/baseDocument';
import {
  itemLabel, kindLabel, originLabel, outcomeLabel, reasonLabels, reviewProgressLabel,
  type BaseCorrection, type Convention, type Modification,
} from '../../lib/correction';
import type { BaseReview } from '../../hooks/useBaseReview';
import { BaseLines } from './BaseLines';
import { ReviewCard } from './ReviewCard';
import { SectionCommentBox } from './SectionCommentBox';

interface BaseReviewViewProps {
  base:       BaseCorrection;
  /** Titre de chaque carte de l'audit, pour dire d'où vient une modification. */
  cardTitles: ReadonlyMap<string, string>;
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
export function BaseReviewView({ base, cardTitles, editable, review }: BaseReviewViewProps) {
  const sheets = useMemo(() => sheetViews(base), [base]);
  const titles = useMemo(() => sectionTitleIndex(sheets), [sheets]);
  const placement = useMemo(() => modificationPlacement(sheets, base.modifications), [sheets, base.modifications]);
  const mods = useMemo(() => new Map(base.modifications.map(m => [m.id, m])), [base.modifications]);
  const conventions = base.conventions ?? [];
  /** Le texte proposé par chaque modification, toutes sections confondues. */
  const proposed = useMemo(() => {
    const out = new Map<string, string>();
    for (const m of base.modifications) {
      const lines = sheets.flatMap(s => s.sections).flatMap(s => proposedLines(s.blocks, m.id));
      out.set(m.id, lines.join('\n\n'));
    }
    return out;
  }, [base.modifications, sheets]);

  const { state } = review;
  if (state.status === 'loading') return <Skeleton className="obp-skeleton-block" />;
  if (state.status === 'error') return <p className="obp-muted">Les avis n'ont pas pu être chargés.</p>;

  const reviewed = [...state.reviews.values()].filter(r => r.verdict !== null).length;
  const sectionTitle = (key: string) => titles.get(key) ?? null;
  const pending = (base.pending ?? []).map(p => cardTitles.get(p.card_id)).filter((t): t is string => Boolean(t));
  const pendingCount = (base.pending ?? []).length;

  const modificationCard = (m: Modification) => (
    <ReviewCard
      key={m.id}
      anchor={anchorOf(m.id)}
      title={`${itemLabel(m.id)} · ${kindLabel(m.kind)}`}
      withVerdict={m.outcome === 'applied'}
      editable={editable}
      current={state.reviews.get(m.id)}
      save={review.saves.get(`item:${m.id}`)}
      proposed={proposed.get(m.id) ?? ''}
      onSave={d => { void review.saveReview(m.id, d); }}
    >
      <p className="obp-base-card__origin">{originLabel(m, cardTitles)}</p>
      <p className="obp-base-card__what">{m.instruction}</p>
      {m.expert_text && m.expert_text.trim() && <p className="obp-base-quote">« {m.expert_text.trim()} »</p>}
      <div className={`obp-base-card__outcome${m.outcome === 'applied' ? '' : ' obp-base-card__outcome--na'}`}>
        <p>
          <strong>{outcomeLabel(m)}</strong>
          {(m.reasons ?? []).length > 0 && (m.outcome === 'applied' ? ' ; ce qui n\'a pas été repris :' : ' :')}
        </p>
        {(m.reasons ?? []).length > 0 && (
          <ul>{reasonLabels(m.reasons ?? [], sectionTitle).map(r => <li key={r}>{r}</li>)}</ul>
        )}
      </div>
    </ReviewCard>
  );

  const conventionCard = (c: Convention) => (
    <ReviewCard
      key={c.id}
      anchor={anchorOf(c.id)}
      title={itemLabel(c.id)}
      withVerdict
      editable={editable}
      current={state.reviews.get(c.id)}
      save={review.saves.get(`item:${c.id}`)}
      proposed={c.rule}
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
    const open = s.changed || s.modificationIds.length > 0 || s.conventionIds.length > 0;
    if (!open) {
      return (
        <details key={s.key} className="obp-base-section obp-base-section--unchanged">
          <summary>
            <span className="obp-base-section__title">{s.title}</span>
            <span className="obp-muted"> · inchangée</span>
            {state.comments.has(s.key) && <span className="obp-base-chip">commentée</span>}
          </summary>
          <BaseLines blocks={s.blocks} />
          {comment}
        </details>
      );
    }
    return (
      <section key={s.key} className="obp-base-section obp-base-section--open" aria-label={s.title}>
        {s.title !== sheet.title && <h3 className="obp-base-section__title">{s.title}</h3>}
        <div className="obp-base-grid">
          <BaseLines blocks={s.blocks} />
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
          <p className="obp-muted">
            {pendingCount === 0
              ? 'Aucune information en attente.'
              : pending.length > 0
                ? `Informations en attente, sans modification de la base : ${pending.join(' ; ')}.`
                : `${pendingCount} ${pendingCount > 1 ? 'informations' : 'information'} en attente, sans modification de la base.`}
          </p>
        </div>
        <p className="obp-base-head__progress" aria-live="polite">
          <strong>{reviewProgressLabel(reviewed, state.toReview)}</strong>
        </p>
      </header>

      <p className="obp-base-legend">
        Votre base est reprise telle quelle ; seules vos réponses dans « À clarifier » la modifient.{' '}
        <ins>texte ajouté</ins> <del>texte retiré</del>{' '}
        Les sections sans modification sont repliées à leur place : ouvrez-les pour les lire.
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

      {placement.unplaced.length > 0 && (
        <section className="obp-base-chapter" aria-labelledby="obp-base-unplaced">
          <h2 id="obp-base-unplaced" className="obp-base-chapter__title">Modifications sans emplacement dans la base</h2>
          <div className="obp-base-side obp-base-side--wide">{placement.unplaced.map(modificationCard)}</div>
        </section>
      )}

      {sheets.map(sheet => (
        <section key={sheet.documentId} className="obp-base-chapter" aria-label={sheet.title}>
          <h2 className="obp-base-chapter__title">{sheet.title}</h2>
          <p className="obp-muted obp-base-chapter__file">{sheet.fileName}</p>
          {sheet.sections.map(s => section(sheet, s))}
        </section>
      ))}
    </div>
  );
}

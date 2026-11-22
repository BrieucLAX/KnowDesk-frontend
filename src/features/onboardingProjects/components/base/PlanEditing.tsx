import React, { useId, useState } from 'react';
import { Button } from '../../../../shared/components/ui/Button';
import { ConfirmDialog } from '../../../../shared/components/ui/ConfirmDialog';
import { Modal } from '../../../../shared/components/ui/Modal';
import { formatFull } from '../../../../shared/lib/formatDate';
import { AUDIENCE_LABEL, audienceOf } from '../../lib/audience';
import type { Plan, PlanChapter, PlanComment, PlanSubject } from '../../lib/plan';
import {
  describeEdit, editCountLabel, mergedAudience, moveChapterBy, moveSubjectBy, PLAN_TITLE_MAX,
  type GoneSubject, type PlanEditOp, type PlanEditsState,
} from '../../lib/planEdits';

/**
 * Modification du plan avant la rédaction (plan-construire-v1, étape 4 ; décisions du porteur du
 * 2026-11-22) : les outils de chaque catégorie et de chaque article en mode modification, leurs
 * fenêtres, le panneau « Vos modifications », la section « Retirés ou réunis ». Rien n'entre dans le
 * contenu : un titre est un libellé, un article ne porte que des passages de vos documents.
 */

/** Ce que l'écran du plan sait faire du plan modifié ; absent : le plan se lit comme avant. */
export interface PlanEditor {
  /** Mode modification ouvert. */
  editing:         boolean;
  busy:            boolean;
  changedChapters: ReadonlySet<string>;
  changedSubjects: ReadonlySet<string>;
  apply:           (op: PlanEditOp) => Promise<boolean>;
}

const publicLabel = (v: string | null) => {
  const a = audienceOf(v);
  return a !== null ? AUDIENCE_LABEL[a] : v ?? 'sans public';
};

export function ModifiedTag() {
  return <span className="obp-plan-modified">Modifié</span>;
}

// ── Outils d'une catégorie et d'un article ──────────────────

type Dialog =
  | { kind: 'rename-chapter'; chapter: PlanChapter }
  | { kind: 'rename-subject'; subject: PlanSubject }
  | { kind: 'move'; subject: PlanSubject; from: PlanChapter }
  | { kind: 'merge'; subject: PlanSubject }
  | { kind: 'remove'; subject: PlanSubject };

export function useEditDialogs(plan: Plan, editor: PlanEditor | undefined) {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = () => setDialog(null);
  const run = async (op: PlanEditOp | null) => {
    if (op === null || !editor) return;
    if (await editor.apply(op)) close();
  };

  const chapterTools = (chapter: PlanChapter) => editor?.editing && (
    <span className="obp-plan-tools" role="group" aria-label={`Modifier la catégorie « ${chapter.title} »`}>
      <Button variant="ghost" size="sm" disabled={editor.busy} onClick={() => setDialog({ kind: 'rename-chapter', chapter })}>Renommer</Button>
      <Button variant="ghost" size="sm" disabled={editor.busy || moveChapterBy(plan, chapter.id, -1) === null}
        aria-label={`Monter la catégorie « ${chapter.title} »`} onClick={() => void run(moveChapterBy(plan, chapter.id, -1))}>↑</Button>
      <Button variant="ghost" size="sm" disabled={editor.busy || moveChapterBy(plan, chapter.id, 1) === null}
        aria-label={`Descendre la catégorie « ${chapter.title} »`} onClick={() => void run(moveChapterBy(plan, chapter.id, 1))}>↓</Button>
    </span>
  );

  const subjectTools = (chapter: PlanChapter, subject: PlanSubject) => editor?.editing && (
    <div className="obp-plan-tools" role="group" aria-label={`Modifier l'article « ${subject.title} »`}>
      <Button variant="ghost" size="sm" disabled={editor.busy} onClick={() => setDialog({ kind: 'rename-subject', subject })}>Renommer</Button>
      <Button variant="ghost" size="sm" disabled={editor.busy} onClick={() => setDialog({ kind: 'move', subject, from: chapter })}>Déplacer…</Button>
      <Button variant="ghost" size="sm" disabled={editor.busy || plan.subjectCount < 2} onClick={() => setDialog({ kind: 'merge', subject })}>Réunir dans…</Button>
      <Button variant="ghost" size="sm" disabled={editor.busy || plan.subjectCount < 2} onClick={() => setDialog({ kind: 'remove', subject })}>Retirer du plan</Button>
      <Button variant="ghost" size="sm" disabled={editor.busy || moveSubjectBy(chapter, subject.id, -1) === null}
        aria-label={`Monter l'article « ${subject.title} »`} onClick={() => void run(moveSubjectBy(chapter, subject.id, -1))}>↑</Button>
      <Button variant="ghost" size="sm" disabled={editor.busy || moveSubjectBy(chapter, subject.id, 1) === null}
        aria-label={`Descendre l'article « ${subject.title} »`} onClick={() => void run(moveSubjectBy(chapter, subject.id, 1))}>↓</Button>
    </div>
  );

  const dialogs = dialog && editor && (
    <>
      {dialog.kind === 'rename-chapter' && (
        <RenameDialog what="la catégorie" current={dialog.chapter.title} busy={editor.busy} onCancel={close}
          onSave={title => run({ kind: 'rename_chapter', chapterId: dialog.chapter.id, title })} />
      )}
      {dialog.kind === 'rename-subject' && (
        <RenameDialog what="l'article" current={dialog.subject.title} busy={editor.busy} onCancel={close}
          onSave={title => run({ kind: 'rename_subject', subjectId: dialog.subject.id, title })} />
      )}
      {dialog.kind === 'move' && (
        <MoveDialog plan={plan} subject={dialog.subject} from={dialog.from} busy={editor.busy} onCancel={close} onMove={run} />
      )}
      {dialog.kind === 'merge' && (
        <MergeDialog plan={plan} subject={dialog.subject} busy={editor.busy} onCancel={close} onMerge={run} />
      )}
      {dialog.kind === 'remove' && (
        <ConfirmDialog
          title={`Retirer « ${dialog.subject.title} » du plan ?`}
          description={removeDescription(dialog.subject)}
          confirmLabel="Retirer du plan"
          cancelLabel="Annuler"
          variant="danger"
          loading={editor.busy}
          onConfirm={() => void run({ kind: 'remove_subject', subjectId: dialog.subject.id })}
          onCancel={close}
        />
      )}
    </>
  );

  return { chapterTools, subjectTools, dialogs };
}

export function removeDescription(subject: PlanSubject): string {
  const n = subject.sources.length;
  const sources = `${n > 1 ? `Ses ${n} sources ne seront pas rédigées` : 'Sa source ne sera pas rédigée'}.`;
  const c = subject.cardIds.length;
  const cards = c === 0 ? ''
    : ` Vos réponses à ${c > 1 ? `ses ${c} cartes liées` : 'sa carte liée'} apparaîtront, en tête des articles rédigés, parmi celles qui ne figurent dans aucun article.`;
  return `${sources}${cards} Vous pourrez annuler.`;
}

function RenameDialog({ what, current, busy, onSave, onCancel }: {
  what: string; current: string; busy: boolean; onSave: (title: string) => void; onCancel: () => void;
}) {
  const id = useId();
  const [title, setTitle] = useState(current);
  const clean = title.trim();
  const valid = clean.length > 0 && clean.length <= PLAN_TITLE_MAX && clean !== current;
  return (
    <Modal
      title={`Renommer ${what}`} size="sm" onClose={onCancel} asForm
      onSubmit={e => { e.preventDefault(); if (valid) onSave(clean); }}
      footer={(
        <>
          <Button type="button" variant="ghost" size="md" onClick={onCancel}>Annuler</Button>
          <Button type="submit" variant="primary" size="md" loading={busy} disabled={!valid}>Renommer</Button>
        </>
      )}
    >
      <label htmlFor={id} className="obp-base-label">Nouveau nom</label>
      <input id={id} className="obp-plan-input" value={title} maxLength={PLAN_TITLE_MAX} onChange={e => setTitle(e.target.value)} />
      <p className="obp-muted">Un nom seulement : le contenu de l'article ne change pas.</p>
    </Modal>
  );
}

const NEW_CHAPTER = '__new__';
const FIRST = '__first__';

function MoveDialog({ plan, subject, from, busy, onMove, onCancel }: {
  plan: Plan; subject: PlanSubject; from: PlanChapter; busy: boolean;
  onMove: (op: PlanEditOp) => void; onCancel: () => void;
}) {
  const chapterField = useId();
  const nameField = useId();
  const positionField = useId();
  const [chapterId, setChapterId] = useState(from.id);
  const [name, setName] = useState('');
  const target = plan.chapters.find(c => c.id === chapterId);
  const others = (target?.subjects ?? []).filter(s => s.id !== subject.id);
  const lastOther = others.length > 0 ? others[others.length - 1].id : FIRST;
  const [after, setAfter] = useState<string>(lastOther);
  const isNew = chapterId === NEW_CHAPTER;
  const position = isNew || !others.some(s => s.id === after) ? (isNew ? FIRST : lastOther) : after;
  const clean = name.trim();
  const valid = isNew ? clean.length > 0 && clean.length <= PLAN_TITLE_MAX : target !== undefined;

  const submit = () => {
    if (!valid) return;
    onMove(isNew
      ? { kind: 'move_subject', subjectId: subject.id, chapterId: null, newChapterTitle: clean, afterSubjectId: null }
      : { kind: 'move_subject', subjectId: subject.id, chapterId, afterSubjectId: position === FIRST ? null : position });
  };

  return (
    <Modal
      title={`Déplacer « ${subject.title} »`} size="md" onClose={onCancel} asForm
      onSubmit={e => { e.preventDefault(); submit(); }}
      footer={(
        <>
          <Button type="button" variant="ghost" size="md" onClick={onCancel}>Annuler</Button>
          <Button type="submit" variant="primary" size="md" loading={busy} disabled={!valid}>Déplacer</Button>
        </>
      )}
    >
      <label htmlFor={chapterField} className="obp-base-label">Catégorie</label>
      <select id={chapterField} className="obp-plan-input" value={chapterId}
        onChange={e => { setChapterId(e.target.value); setAfter(FIRST); }}>
        {plan.chapters.map((c, i) => <option key={c.id} value={c.id}>Catégorie {i + 1} · {c.title}</option>)}
        <option value={NEW_CHAPTER}>+ Nouvelle catégorie…</option>
      </select>
      {isNew ? (
        <>
          <label htmlFor={nameField} className="obp-base-label">Nom de la nouvelle catégorie</label>
          <input id={nameField} className="obp-plan-input" value={name} maxLength={PLAN_TITLE_MAX} onChange={e => setName(e.target.value)} />
          <p className="obp-muted">Elle se place après « {from.title} ». Une catégorie n'existe jamais vide : elle disparaît avec son dernier article.</p>
        </>
      ) : (
        <>
          <label htmlFor={positionField} className="obp-base-label">Position</label>
          <select id={positionField} className="obp-plan-input" value={position} onChange={e => setAfter(e.target.value)}>
            <option value={FIRST}>En premier</option>
            {others.map(s => <option key={s.id} value={s.id}>Après « {s.title} »</option>)}
          </select>
        </>
      )}
    </Modal>
  );
}

function MergeDialog({ plan, subject, busy, onMerge, onCancel }: {
  plan: Plan; subject: PlanSubject; busy: boolean; onMerge: (op: PlanEditOp) => void; onCancel: () => void;
}) {
  const field = useId();
  const candidates = plan.chapters.flatMap(c => c.subjects).filter(s => s.id !== subject.id);
  const [intoId, setIntoId] = useState('');
  const into = candidates.find(s => s.id === intoId);
  const after = into ? mergedAudience(into, subject) : null;
  const n = subject.sources.length;
  const c = subject.cardIds.length;
  return (
    <Modal
      title={`Réunir « ${subject.title} »`} size="md" onClose={onCancel} asForm
      onSubmit={e => { e.preventDefault(); if (into) onMerge({ kind: 'merge_subjects', subjectId: subject.id, intoSubjectId: into.id }); }}
      footer={(
        <>
          <Button type="button" variant="ghost" size="md" onClick={onCancel}>Annuler</Button>
          <Button type="submit" variant="primary" size="md" loading={busy} disabled={!into}>Réunir</Button>
        </>
      )}
    >
      <label htmlFor={field} className="obp-base-label">Réunir dans l'article</label>
      <select id={field} className="obp-plan-input" value={intoId} onChange={e => setIntoId(e.target.value)}>
        <option value="">Choisir un article…</option>
        {plan.chapters.map((ch, i) => {
          const options = ch.subjects.filter(s => s.id !== subject.id);
          return options.length === 0 ? null : (
            <optgroup key={ch.id} label={`Catégorie ${i + 1} · ${ch.title}`}>
              {options.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </optgroup>
          );
        })}
      </select>
      {into && (
        <div className="obp-plan-merge" role="status">
          <p>
            « {into.title} » garde son titre et sa question, et reçoit {n > 1 ? `les ${n} sources` : 'la source'}
            {c > 0 && ` et ${c > 1 ? `les ${c} cartes liées` : 'la carte liée'}`} de « {subject.title} ».
            « {subject.title} » disparaît du plan.
          </p>
          {after !== into.audience && (
            <p>Public : {publicLabel(into.audience)} → {publicLabel(after)} (publics différents).</p>
          )}
        </div>
      )}
    </Modal>
  );
}

// ── Vos modifications ───────────────────────────────────────

export function EditsPanel({ state, busy, onUndo, onReset }: {
  state: PlanEditsState; busy: boolean; onUndo: () => void; onReset: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <section className="obp-plan-edits" aria-labelledby="obp-plan-edits-title">
      <h3 id="obp-plan-edits-title" className="obp-plan-attention__title">Vos modifications ({state.editCount})</h3>
      {state.editCount === 0 ? (
        <p className="obp-muted">Aucune modification : le plan est celui proposé par Knowdesk.</p>
      ) : (
        <ol className="obp-plan-edits__list">
          {state.edits.map(e => (
            <li key={e.id}>
              {describeEdit(e)} <span className="obp-muted">— {e.author.name}, {formatFull(e.createdAt)}</span>
            </li>
          ))}
        </ol>
      )}
      {state.editable && state.editCount > 0 && (
        <div className="obp-decision__actions">
          <Button variant="secondary" size="sm" loading={busy} onClick={onUndo}>Annuler la dernière modification</Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirm(true)}>Revenir au plan proposé</Button>
        </div>
      )}
      {confirm && (
        <ConfirmDialog
          title="Revenir au plan proposé ?"
          description={`Vos ${editCountLabel(state.editCount)} seront annulées. Les rédactions déjà faites ne changent pas.`}
          confirmLabel="Revenir au plan proposé"
          cancelLabel="Garder mes modifications"
          variant="danger"
          loading={busy}
          onConfirm={() => { setConfirm(false); onReset(); }}
          onCancel={() => setConfirm(false)}
        />
      )}
    </section>
  );
}

// ── Retirés ou réunis ───────────────────────────────────────

/**
 * Les articles du plan proposé qui n'y sont plus, et le commentaire qu'ils portaient. Un article
 * réuni dans un article réuni à son tour est dit réuni dans celui qui reste.
 */
export function GoneSection({ gone, titles, current, comments }: {
  gone: GoneSubject[]; titles: ReadonlyMap<string, string>; current: Plan | null; comments: PlanComment[];
}) {
  if (gone.length === 0) return null;
  const now = new Map((current?.chapters ?? []).flatMap(c => c.subjects).map(s => [s.id, s.title] as const));
  const byId = new Map(gone.map(g => [g.subjectId, g]));
  const home = (id: string | null): string => {
    const seen = new Set<string>();
    let at = id;
    while (at !== null && !now.has(at) && !seen.has(at)) {
      seen.add(at);
      const next = byId.get(at);
      if (!next || next.kind === 'removed') return `« ${titles.get(at) ?? 'un autre article'} », retiré depuis`;
      at = next.intoSubjectId;
    }
    return `« ${at !== null ? now.get(at) ?? titles.get(at) ?? 'un autre article' : 'un autre article'} »`;
  };
  return (
    <section className="obp-plan-gone" aria-labelledby="obp-plan-gone-title">
      <h3 id="obp-plan-gone-title" className="obp-plan-attention__title">Retirés ou réunis ({gone.length})</h3>
      <ul>
        {gone.map(g => {
          const comment = comments.find(c => c.subjectId === g.subjectId) ?? null;
          return (
            <li key={g.subjectId}>
              « {g.title} » : {g.kind === 'removed'
                ? 'retiré du plan, ses sources ne seront pas rédigées'
                : `réuni dans ${home(g.intoSubjectId)}`}.
              {comment && (
                <p className="obp-clarify-comment">
                  Commentaire : {comment.comment} <span className="obp-muted">— {comment.author.name}, {formatFull(comment.createdAt)}</span>
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

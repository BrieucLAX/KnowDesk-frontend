import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../shared/lib/apiClient';
import { getErrorMessage } from '../../../shared/lib/apiErrors';
import { useToast } from '../../../shared/lib/useToast';
import { onboardingApi } from '../api/onboardingApi';
import type { Review, SectionComment, Verdict } from '../lib/correction';

export type SaveState = 'saving' | 'saved' | 'error';

export type BaseReviewState =
  | { status: 'loading' }
  | { status: 'error' }
  | {
    status:   'ready';
    reviews:  ReadonlyMap<string, Review>;
    comments: ReadonlyMap<string, SectionComment>;
    /** Éléments à relire (modifications appliquées et conventions), selon le back. */
    toReview: number;
  };

/** Ce qu'un avis porte : envoyé en entier à chaque écriture, pour qu'un commentaire n'efface pas un verdict. */
export interface ReviewDraft {
  verdict:        Verdict | null;
  /** « Corriger » : un texte par section touchée (clé de section → texte). */
  correctedTexts: Record<string, string> | null;
  comment:        string | null;
}

/** Les textes écrits, sans les champs vides ; null s'il n'en reste aucun. */
function cleanTexts(texts: Record<string, string> | null): Record<string, string> | null {
  const kept = Object.entries(texts ?? {}).map(([k, v]) => [k, v.trim()] as const).filter(([, v]) => v);
  return kept.length > 0 ? Object.fromEntries(kept) : null;
}

const sameTexts = (a: Record<string, string> | null, b: Record<string, string> | null) =>
  JSON.stringify(Object.entries(a ?? {}).sort()) === JSON.stringify(Object.entries(b ?? {}).sort());

/** Codes après lesquels l'écran ne reflète plus le back : on relit tout. */
const RELOAD_CODES = new Set(['REVIEW_CONFLICT', 'BASE_READ_ONLY']);

const clean = (s: string | null) => (s !== null && s.trim() ? s.trim() : null);

/**
 * Avis et commentaires de la relecture d'une base : l'avis courant de chaque modification ou
 * convention, le commentaire courant de chaque section, et leur enregistrement dès qu'ils sont
 * donnés. Chaque écriture envoie l'élément courant affiché ; si un autre membre (ou un autre
 * onglet) l'a changé, le back répond 409 et on relit tout. Les écritures d'un même élément
 * partent l'une après l'autre.
 */
export function useBaseReview(projectId: string, correctionId: string | null) {
  const toast = useToast();
  const [state, setState] = useState<BaseReviewState>({ status: 'loading' });
  const [saves, setSaves] = useState<ReadonlyMap<string, SaveState>>(new Map());
  const reviews  = useRef(new Map<string, Review>());
  const comments = useRef(new Map<string, SectionComment>());
  const queues   = useRef(new Map<string, Promise<unknown>>());
  const shown = useRef(correctionId);
  shown.current = correctionId;

  const publish = useCallback((toReview?: number) => {
    setState(s => ({
      status:   'ready',
      reviews:  new Map(reviews.current),
      comments: new Map(comments.current),
      toReview: toReview ?? (s.status === 'ready' ? s.toReview : 0),
    }));
  }, []);

  const load = useCallback(async () => {
    if (correctionId === null) return;
    try {
      const [r, c] = await Promise.all([
        onboardingApi.listReviews(projectId, correctionId),
        onboardingApi.listSectionComments(projectId, correctionId),
      ]);
      if (shown.current !== correctionId) return;
      reviews.current = new Map(r.reviews.map(x => [x.itemId, x]));
      comments.current = new Map(c.map(x => [x.sectionKey, x]));
      publish(r.counts.toReview);
    } catch (err) {
      if (shown.current !== correctionId) return;
      setState({ status: 'error' });
      toast.error(getErrorMessage(err));
    }
  }, [projectId, correctionId, publish, toast]);

  useEffect(() => {
    setState({ status: 'loading' });
    setSaves(new Map());
    reviews.current = new Map();
    comments.current = new Map();
    void load();
  }, [load]);

  const mark = (key: string, s: SaveState) => setSaves(m => new Map(m).set(key, s));

  /** Une écriture à la suite des précédentes du même élément. */
  const enqueue = useCallback((key: string, write: () => Promise<void>) => {
    const run = (queues.current.get(key) ?? Promise.resolve()).then(async () => {
      if (shown.current !== correctionId) return;
      mark(key, 'saving');
      try {
        await write();
        if (shown.current === correctionId) mark(key, 'saved');
      } catch (err) {
        if (shown.current !== correctionId) return;
        mark(key, 'error');
        toast.error(getErrorMessage(err));
        if (err instanceof ApiError && RELOAD_CODES.has(err.code)) await load();
      }
    });
    queues.current.set(key, run);
    return run;
  }, [correctionId, load, toast]);

  /** Enregistre l'avis d'une modification ou d'une convention ; sans verdict ni commentaire, l'avis courant est retiré. */
  const saveReview = useCallback((itemId: string, draft: ReviewDraft) => enqueue(`item:${itemId}`, async () => {
    if (correctionId === null) return;
    const current = reviews.current.get(itemId) ?? null;
    const body = {
      verdict:        draft.verdict,
      correctedText:  null,
      correctedTexts: draft.verdict === 'fix' ? cleanTexts(draft.correctedTexts) : null,
      comment:        clean(draft.comment),
    };
    if (current && current.verdict === body.verdict && current.correctedText === null
      && sameTexts(current.correctedTexts, body.correctedTexts) && current.comment === body.comment) return;
    if (body.verdict === null && body.comment === null) {
      if (!current) return;
      const res = await onboardingApi.cancelReview(projectId, correctionId, current.id);
      if (res.current) reviews.current.set(itemId, res.current); else reviews.current.delete(itemId);
      publish();
      return;
    }
    if (body.verdict === 'fix' && body.correctedTexts === null) {
      throw new Error('Écrivez le texte tel que vous le voulez avant d\'enregistrer « Corriger ».');
    }
    const saved = await onboardingApi.review(projectId, correctionId, { itemId, expectedCurrentId: current?.id ?? null, ...body });
    reviews.current.set(itemId, saved);
    publish();
  }), [correctionId, enqueue, projectId, publish]);

  /** Enregistre le commentaire d'une section ; vide, le commentaire courant est retiré. */
  const saveComment = useCallback((sectionKey: string, text: string) => enqueue(`section:${sectionKey}`, async () => {
    if (correctionId === null) return;
    const current = comments.current.get(sectionKey) ?? null;
    const comment = clean(text);
    if ((current?.comment ?? null) === comment) return;
    if (comment === null) {
      const res = await onboardingApi.cancelSectionComment(projectId, correctionId, current!.id);
      if (res.current) comments.current.set(sectionKey, res.current); else comments.current.delete(sectionKey);
    } else {
      comments.current.set(sectionKey, await onboardingApi.commentSection(projectId, correctionId, {
        sectionKey, expectedCurrentId: current?.id ?? null, comment,
      }));
    }
    publish();
  }), [correctionId, enqueue, projectId, publish]);

  return { state, saves, saveReview, saveComment, reload: load };
}

export type BaseReview = ReturnType<typeof useBaseReview>;

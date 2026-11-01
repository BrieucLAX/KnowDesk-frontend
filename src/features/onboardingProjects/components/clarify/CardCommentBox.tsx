import React, { useEffect, useId, useState } from 'react';
import { Button } from '../../../../shared/components/ui/Button';
import { formatFull } from '../../../../shared/lib/formatDate';
import { onboardingApi } from '../../api/onboardingApi';
import type { CardComment } from '../../lib/decisions';

interface CardCommentBoxProps {
  projectId:  string;
  analysisId: string;
  cardId:     string;
  /** Faux pour l'audit d'une analyse précédente : le commentaire se lit, sans modification. */
  editable:   boolean;
}

/** Ce que dit le champ : une remarque pour l'équipe, jamais une consigne pour la base. */
export const CARD_COMMENT_HINT = 'Pour l\'équipe Knowdesk seulement : ce commentaire n\'entre jamais dans la base.';

const currentOf = (chain: CardComment[]) => [...chain].reverse().find(c => c.cancelledAt === null) ?? null;

/**
 * Commentaire sur la carte (lot Elyra v2, F1b) : une remarque sur la carte elle-même (doublon,
 * côtés mal classés, question sur l'analyse), gardée par le back seul. Il n'est pas une réponse :
 * la préparation de la base ne le lit jamais. Chargé avec la carte ; un nouveau commentaire
 * remplace le courant, « Retirer » l'annule ; rien n'est effacé.
 */
export function CardCommentBox({ projectId, analysisId, cardId, editable }: CardCommentBoxProps) {
  const id = useId();
  const [chain, setChain] = useState<CardComment[] | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    onboardingApi.cardCommentHistory(projectId, analysisId, cardId)
      .then(data => { if (!cancelled) { setChain(data); setText(currentOf(data)?.comment ?? ''); } })
      .catch(() => { if (!cancelled) setChain([]); });
    return () => { cancelled = true; };
  }, [projectId, analysisId, cardId]);

  if (chain === null) return null;
  const current = currentOf(chain);

  if (!editable) {
    return current
      ? <p className="obp-clarify-comment">Commentaire sur la carte : {current.comment} <span className="obp-muted">— {current.author.name}, {formatFull(current.createdAt)}</span></p>
      : null;
  }

  const run = async (work: () => Promise<CardComment[]>) => {
    setBusy(true);
    setError(null);
    try {
      const next = await work();
      setChain(next);
      setText(currentOf(next)?.comment ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Le commentaire n\'a pas pu être enregistré.');
    } finally {
      setBusy(false);
    }
  };
  const save = () => run(async () => {
    const saved = await onboardingApi.commentCard(projectId, analysisId, { cardId, expectedCurrentId: current?.id ?? null, comment: text.trim() });
    return [...chain, saved];
  });
  const remove = () => run(async () => {
    const { cancelled } = await onboardingApi.cancelCardComment(projectId, analysisId, current!.id);
    return chain.map(c => (c.id === cancelled.id ? cancelled : c));
  });
  const changed = text.trim() !== (current?.comment ?? '') && text.trim() !== '';

  return (
    <div className="obp-clarify-comment">
      <label htmlFor={id} className="obp-base-label">Un commentaire sur la carte ? (facultatif)</label>
      <textarea id={id} className="obp-base-textarea" rows={2} maxLength={5000} value={text}
        onChange={e => setText(e.target.value)} />
      <p className="obp-muted">{CARD_COMMENT_HINT}</p>
      {current && <p className="obp-muted">Commentaire enregistré par {current.author.name}, {formatFull(current.createdAt)}.</p>}
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="obp-decision__actions">
        <Button variant="secondary" size="sm" loading={busy} disabled={!changed} onClick={() => void save()}>Enregistrer le commentaire</Button>
        {current && <Button variant="ghost" size="sm" disabled={busy} onClick={() => void remove()}>Retirer le commentaire</Button>}
      </div>
    </div>
  );
}

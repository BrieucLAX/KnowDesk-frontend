import React, { useCallback, useEffect, useState } from 'react';
import { faqsApi }      from '../api/faqsApi';
import '../faqs.css';
import { useToast }     from '../../../shared/lib/useToast';
import { ApiError }     from '../../../shared/lib/apiClient';
import { cn }           from '../../../shared/lib/cn';
import { ThumbsDown, ThumbsUp } from 'lucide-react';

interface FaqHelpfulButtonsProps {
  faqId:        string;
  helpfulYes:   number;
  helpfulNo:    number;
  /** Callback notifié après un vote réussi (pour mettre à jour la liste appelante). */
  onVoted?:     (counts: { helpful_yes: number; helpful_no: number }) => void;
  /** Variante visuelle compacte (utilisée dans la liste) ou en pleine taille (popover/editor). */
  size?:        'compact' | 'full';
  /** Mode lecture seule — affiche les compteurs sans permettre de voter. */
  readOnly?:    boolean;
}

const STORAGE_KEY = (faqId: string) => `kd-faq-vote-${faqId}`;

/**
 * Boutons de vote « cette réponse a-t-elle aidé ? ».
 *
 * - 1 vote par FAQ par session (gardé en localStorage). Garde-fou UX, pas
 *   une sécurité — un user déterminé peut clear le localStorage.
 * - Affiche les compteurs après vote (helpful_yes/no en provenance API).
 * - En mode readOnly : affichage seul (sans interaction), utile pour la
 *   liste admin et l'éditeur.
 */
export function FaqHelpfulButtons({
  faqId,
  helpfulYes,
  helpfulNo,
  onVoted,
  size = 'full',
  readOnly,
}: FaqHelpfulButtonsProps) {
  const toast = useToast();
  const [voted,  setVoted]  = useState<'yes' | 'no' | null>(null);
  const [voting, setVoting] = useState(false);
  const [counts, setCounts] = useState({ yes: helpfulYes, no: helpfulNo });

  // Restore vote depuis localStorage au mount + sync compteurs si props changent
  useEffect(() => {
    setCounts({ yes: helpfulYes, no: helpfulNo });
    try {
      const stored = localStorage.getItem(STORAGE_KEY(faqId));
      if (stored === 'yes' || stored === 'no') setVoted(stored);
    } catch { /* localStorage indisponible (private browsing) — ignore */ }
  }, [faqId, helpfulYes, helpfulNo]);

  const handleVote = useCallback(async (vote: 'yes' | 'no') => {
    if (readOnly || voting) return;
    // Bouton non-voté alors que l'autre l'est : bloqué (le user doit
    // annuler son vote en cours en recliquant dessus d'abord).
    if (voted && voted !== vote) return;

    const undo = voted === vote;
    setVoting(true);
    try {
      const result = await faqsApi.vote(faqId, vote, undo);
      setCounts({ yes: result.helpful_yes, no: result.helpful_no });
      setVoted(undo ? null : vote);
      try {
        if (undo) localStorage.removeItem(STORAGE_KEY(faqId));
        else      localStorage.setItem(STORAGE_KEY(faqId), vote);
      } catch { /* ignore */ }
      onVoted?.(result);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Vote impossible.');
    } finally {
      setVoting(false);
    }
  }, [faqId, readOnly, voted, voting, onVoted, toast]);

  const total = counts.yes + counts.no;
  const helpfulRate = total > 0 ? Math.round((counts.yes / total) * 100) : null;

  if (readOnly) {
    return (
      <span className="faq-helpful faq-helpful--readonly" title={`${counts.yes} 👍 · ${counts.no} 👎`}>
        {total === 0 ? (
          <span className="faq-helpful__empty">—</span>
        ) : (
          <>
            <span className="faq-helpful__rate">{helpfulRate}%</span>
            <span className="faq-helpful__total">({total})</span>
          </>
        )}
      </span>
    );
  }

  return (
    <div className={cn('faq-helpful', `faq-helpful--${size}`)} role="group" aria-label="Cette réponse a-t-elle aidé ?">
      {size === 'full' && <span className="faq-helpful__label">Cette réponse a-t-elle aidé ?</span>}

      <button
        type="button"
        className={cn('faq-helpful__btn', voted === 'yes' && 'faq-helpful__btn--active')}
        onClick={(e) => { e.stopPropagation(); handleVote('yes'); }}
        disabled={voting || (voted === 'no')}
        title={voted === 'yes' ? 'Recliquez pour annuler votre vote' : voted === 'no' ? 'Annulez d\'abord votre 👎 pour changer de vote' : ''}
        aria-pressed={voted === 'yes'}
        aria-label={voted === 'yes' ? 'Annuler mon vote « cette réponse a aidé »' : 'Oui, cette réponse a aidé'}
      >
        <ThumbsUp size={16} />
        <span className="faq-helpful__count">{counts.yes}</span>
      </button>

      <button
        type="button"
        className={cn('faq-helpful__btn', voted === 'no' && 'faq-helpful__btn--active')}
        onClick={(e) => { e.stopPropagation(); handleVote('no'); }}
        disabled={voting || (voted === 'yes')}
        title={voted === 'no' ? 'Recliquez pour annuler votre vote' : voted === 'yes' ? 'Annulez d\'abord votre 👍 pour changer de vote' : ''}
        aria-pressed={voted === 'no'}
        aria-label={voted === 'no' ? 'Annuler mon vote « cette réponse n\'a pas aidé »' : 'Non, cette réponse n\'a pas aidé'}
      >
        <ThumbsDown size={16} />
        <span className="faq-helpful__count">{counts.no}</span>
      </button>

      {voted && size === 'full' && (
        <span className="faq-helpful__thanks" role="status">
          Merci ! <span className="faq-helpful__thanks-hint">Recliquez pour annuler.</span>
        </span>
      )}
    </div>
  );
}

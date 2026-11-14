import React, { useCallback, useEffect, useState } from 'react';
import { sanitizeArticleHtml } from '../../../shared/lib/sanitize';
import { useToast }            from '../../../shared/lib/useToast';
import { trackEvent }          from '../../../shared/lib/trackEvent';
import type { AiState, AiSource }   from '../hooks/useAiAnswer';
import { CircleHelp, FileText, ListOrdered, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react';

const TYPE_ICONS: Record<AiSource['type'], React.ReactNode> = {
  article: <FileText size={16} />,
  faq:     <CircleHelp size={16} />,
  tree:    <ListOrdered size={16} />,
};

interface AiAnswerCardProps {
  state:        AiState;
  /** Query brute — utilisée pour tracker le feedback en parallèle de l'event shown. */
  query:        string;
  onSelectSource: (source: AiSource) => void;
}

/**
 * AiAnswerCard — la carte « réponse IA » au-dessus des résultats Meilisearch.
 *
 * États :
 *  - streaming : sparkle anim + texte qui se construit + cursor
 *  - unsure    : "Je n'ai pas la réponse précise…" + sources
 *  - done      : réponse finale + bouton Copier
 *  - error     : message d'erreur + sources si dispo
 */
export function AiAnswerCard({ state, query, onSelectSource }: AiAnswerCardProps) {
  const toast = useToast();
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  // Reset le feedback quand la query change (nouvelle réponse → nouveau vote possible)
  useEffect(() => { setFeedback(null); }, [query]);

  const handleCopy = useCallback(async () => {
    // Strip HTML/markdown au cas où le LLM en a glissé, ET strip les
    // références [n] / [n, m] / [n][m] : elles ne servent qu'à l'affichage
    // dans la carte (cliquables vers les sources). Au copier-coller dans
    // un mail/chat, elles polluent inutilement.
    const plain = state.answer
      .replace(/<[^>]*>/g, '')
      .replace(/\s*\[\d+(?:\s*,\s*\d+)*\]/g, '')   // [1], [1, 2], [1,2,3]
      .replace(/\s+([.,;:!?])/g, '$1')              // recolle ponctuation orpheline
      .replace(/[ \t]{2,}/g, ' ')                   // double espaces résiduels
      .trim();
    try {
      await navigator.clipboard.writeText(plain);
      toast.success('Réponse copiée.');
    } catch {
      toast.error('Copie impossible : le navigateur bloque le presse-papiers. Sélectionnez le texte et copiez-le à la main.');
    }
  }, [state.answer, toast]);

  const handleFeedback = useCallback((helpful: boolean) => {
    if (feedback) return;  // anti double-click
    setFeedback(helpful ? 'up' : 'down');
    trackEvent('ai_answer.feedback', {
      payload: {
        query:      query.toLowerCase().slice(0, 200),
        helpful,
        status:     state.status,
        sourceIds:  state.sources.map(s => s.id),
      },
    });
    toast.success(helpful ? 'Merci pour votre retour.' : 'Merci, votre retour nous aide à améliorer les réponses.');
  }, [feedback, query, state.status, state.sources, toast]);

  const isStreaming = state.status === 'streaming';
  const isUnsure    = state.status === 'unsure';
  const isError     = state.status === 'error';
  const isDone      = state.status === 'done';

  return (
    <div className={`ai-answer ai-answer--${state.status}`} role="region" aria-label="Réponse IA">
      <div className="ai-answer__header">
        <span className={`ai-answer__sparkle ${isStreaming ? 'ai-answer__sparkle--anim' : ''}`} aria-hidden="true">
          <Sparkles size={20} />
        </span>
        <span className="ai-answer__title">
          {isUnsure
            ? 'La base ne contient pas de réponse précise à cette question.'
            : isError
              ? 'Génération indisponible'
              : 'Réponse IA'}
        </span>
        {isStreaming && <span className="ai-answer__streaming-dots" aria-hidden="true">…</span>}
      </div>

      {/* Body : texte streamé. En unsure on ne montre pas de body. */}
      {!isUnsure && state.answer && (
        <div
          className="ai-answer__body"
          dangerouslySetInnerHTML={{ __html: linkifySources(sanitizeArticleHtml(state.answer)) }}
        />
      )}

      {/* Cursor clignotant pendant le stream */}
      {isStreaming && <span className="ai-answer__cursor" aria-hidden="true" />}

      {/* Sources */}
      {state.sources.length > 0 && (
        <div className="ai-answer__sources" aria-label="Sources">
          <span className="ai-answer__sources-label">
            {isUnsure ? 'Articles les plus proches :' : 'Sources :'}
          </span>
          {state.sources.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className="ai-answer__source-chip"
              onClick={() => onSelectSource(s)}
            >
              <span className="ai-answer__source-num">[{i + 1}]</span>
              <span className="ai-answer__source-icon" aria-hidden="true">{TYPE_ICONS[s.type]}</span>
              <span className="ai-answer__source-title">{s.title}</span>
            </button>
          ))}
        </div>
      )}

      {isError && state.error && (
        <p className="ai-answer__error">{state.error}</p>
      )}

      <div className="ai-answer__footer">
        <div className="ai-answer__footer-actions">
          {isDone && state.answer && (
            <button type="button" className="ai-answer__copy" onClick={handleCopy}>
              Copier
            </button>
          )}
          {(isDone || isUnsure) && (
            <div className="ai-answer__feedback" role="group" aria-label="Cette réponse était-elle utile ?">
              <button
                type="button"
                className={`ai-answer__feedback-btn ${feedback === 'up' ? 'ai-answer__feedback-btn--active' : ''}`}
                onClick={() => handleFeedback(true)}
                disabled={feedback !== null}
                aria-label="Réponse utile"
                title="Réponse utile"
              >
                <ThumbsUp size={16} />
              </button>
              <button
                type="button"
                className={`ai-answer__feedback-btn ${feedback === 'down' ? 'ai-answer__feedback-btn--active' : ''}`}
                onClick={() => handleFeedback(false)}
                disabled={feedback !== null}
                aria-label="Réponse pas utile"
                title="Réponse pas utile"
              >
                <ThumbsDown size={16} />
              </button>
            </div>
          )}
        </div>
        <span className="ai-answer__disclaimer">Réponse générée par l'IA. Vérifiez les sources.</span>
      </div>
    </div>
  );
}

/** Transforme [1], [2]… en `<sup class="ai-answer__cite">[1]</sup>` cliquables. */
function linkifySources(html: string): string {
  return html.replace(/\[(\d+)\]/g, '<sup class="ai-answer__cite">[$1]</sup>');
}

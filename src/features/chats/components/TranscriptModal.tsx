import React, { useEffect, useState } from 'react';
import { Modal } from '../../../shared/components/ui/Modal';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { useToast } from '../../../shared/lib/useToast';
import { formatRelative } from '../../../shared/lib/formatDate';
import { chatsApi, type ChatDetail } from '../api/chatsApi';
import { Lock, ThumbsDown, ThumbsUp } from 'lucide-react';
import { StarRating } from '../../../shared/components/ui/StarRating';

interface TranscriptModalProps {
  chatId:  string;
  onClose: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  active:     'En cours',
  resolved:   'Résolue',
  unresolved: 'Non résolue',
  escalated:  'Escaladée',
  abandoned:  'Abandonnée', // legacy
};

const REASON_LABEL: Record<string, string> = {
  handoff:           'Demande humain',
  positive_signal:   'Emoji positif',
  negative_signal:   'Emoji négatif',
  csat_high:         'CSAT élevé',
  csat_low:          'CSAT bas',
  llm_positive:      'Analyse IA positive',
  llm_negative:      'Analyse IA négative',
  fallback_message:  'Bot a ré-orienté',
  short_answered:    'Réponse rapide',
  no_signal:         'Aucun signal exploitable',
  no_interaction:    'Aucune interaction',
};

export function TranscriptModal({ chatId, onClose }: TranscriptModalProps) {
  const toast = useToast();
  const [detail, setDetail]   = useState<ChatDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    chatsApi.get(chatId)
      .then(res => { if (alive) setDetail(res); })
      .catch(err => {
        if (!alive) return;
        toast.error(err?.message ?? 'Impossible de charger la transcription.');
        onClose();
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [chatId, toast, onClose]);

  return (
    <Modal
      title={detail?.topic ?? 'Conversation'}
      size="lg"
      onClose={onClose}
    >
      {loading || !detail ? (
        <div className="chat-transcript__loading">
          <Skeleton className="chat-transcript__loading-row" />
          <Skeleton className="chat-transcript__loading-row chat-transcript__loading-row--short" />
          <Skeleton className="chat-transcript__loading-row" />
        </div>
      ) : (
        <div className="chat-transcript">
          <div
            className="chat-transcript__redaction-notice"
            title="Email, téléphone, IBAN, n° de carte et n° de sécurité sociale sont automatiquement masqués dans cette interface admin."
          >
            <Lock size={16} />Coordonnées masquées
          </div>

          <dl className="chat-transcript__meta">
            <div>
              <dt>Statut</dt>
              <dd>{STATUS_LABEL[detail.status] ?? detail.status}</dd>
            </div>
            <div>
              <dt>Démarrée</dt>
              <dd>{formatRelative(detail.startedAt)}</dd>
            </div>
            {detail.endedAt && (
              <div>
                <dt>Terminée</dt>
                <dd>{formatRelative(detail.endedAt)}</dd>
              </div>
            )}
            <div>
              <dt>Messages</dt>
              <dd>{detail.turns.length}</dd>
            </div>
            {detail.resolutionReason && (
              <div>
                <dt>Motif</dt>
                <dd title={detail.resolutionReason}>{REASON_LABEL[detail.resolutionReason] ?? detail.resolutionReason}</dd>
              </div>
            )}
            {detail.csat !== null && (
              <div>
                <dt>CSAT</dt>
                <dd><StarRating value={detail.csat} /></dd>
              </div>
            )}
            {detail.resolvedHelpful !== null && (
              <div>
                <dt>Retour</dt>
                <dd className="icon-label">{detail.resolvedHelpful ? <><ThumbsUp size={16} />Utile</> : <><ThumbsDown size={16} />Non utile</>}</dd>
              </div>
            )}
          </dl>

          <div className="chat-transcript__body">
            {detail.turns.map(t => {
              const isVisitor = t.role === 'visitor' || t.role === 'user';
              return (
                <div
                  key={t.id}
                  className={`chat-transcript__msg chat-transcript__msg--${isVisitor ? 'visitor' : 'bot'}`}
                >
                  <div className="chat-transcript__bubble">
                    {t.content}
                  </div>
                  <div className="chat-transcript__time">
                    {formatRelative(t.createdAt)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}

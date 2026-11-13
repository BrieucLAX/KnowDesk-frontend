import React, { useEffect, useState } from 'react';
import '../chats.css';
import { Button } from '../../../shared/components/ui/Button';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { EntityRow } from '../../../shared/components/ui/EntityRow';
import { Pager }    from '../../../shared/components/ui/Pager';
import { PageHeader }  from '../../../shared/components/layout/PageHeader';
import { PageToolbar, PageToolbarSearch } from '../../../shared/components/layout/PageToolbar';
import { useToast } from '../../../shared/lib/useToast';
import { formatRelative } from '../../../shared/lib/formatDate';
import { chatsApi, type ChatListItem, type ChatStatus } from '../api/chatsApi';
import { TranscriptModal } from './TranscriptModal';
import { StarRating } from '../../../shared/components/ui/StarRating';
import { Badge } from '../../../shared/components/ui/StatusBadge';

const STATUS_OPTIONS: Array<{ value: '' | ChatStatus; label: string }> = [
  { value: '',           label: 'Tous les statuts' },
  { value: 'active',     label: 'En cours' },
  { value: 'resolved',   label: 'Résolues' },
  { value: 'unresolved', label: 'Non résolues' },
  { value: 'escalated',  label: 'Escaladées' },
];

const STATUS_LABEL: Record<ChatStatus, { label: string; tone: 'neutral' | 'success' | 'warning' | 'danger' }> = {
  active:     { label: 'En cours',     tone: 'neutral' },
  resolved:   { label: 'Résolue',      tone: 'success' },
  unresolved: { label: 'Non résolue',  tone: 'danger'  },
  escalated:  { label: 'Escaladée',    tone: 'warning' },
  // Legacy : peut apparaître pour les rows pas encore recalculées
  abandoned:  { label: 'Abandonnée',   tone: 'neutral' },
};

/** Libellé humain de resolution_reason (Phase D). */
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

const PER_PAGE = 20;

export function ChatsPage() {
  const toast = useToast();

  const [items, setItems]     = useState<ChatListItem[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [q, setQ]             = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus]   = useState<'' | ChatStatus>('');
  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    chatsApi.list({
      q: q || undefined,
      status: status || undefined,
      page,
      perPage: PER_PAGE,
    })
      .then(res => {
        if (!alive) return;
        setItems(res.items);
        setTotal(res.total);
      })
      .catch(err => {
        if (!alive) return;
        toast.error(err?.message ?? 'Impossible de charger la liste des chats.');
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [q, status, page, toast]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <section className="chats-page">
      <PageHeader
        title="Conversations"
        subtitle={`Conversations menées par le chatbot embarqué — ${total} ${total === 1 ? 'conversation' : 'conversations'}`}
      />

      <PageToolbar
        left={(
          <label className="chats-page__filter">
            <span>Statut</span>
            <select
              value={status}
              onChange={e => { setStatus(e.target.value as '' | ChatStatus); setPage(1); }}
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
        )}
        right={(
          <>
            <PageToolbarSearch
              id="chats-search"
              value={searchInput}
              onChange={setSearchInput}
              placeholder="Rechercher dans les transcripts…"
              ariaLabel="Rechercher dans les transcripts"
              onSubmit={() => { setPage(1); setQ(searchInput.trim()); }}
            />
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => { setPage(1); setQ(searchInput.trim()); }}
            >
              Rechercher
            </Button>
            {q && (
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => { setSearchInput(''); setQ(''); setPage(1); }}
              >
                Effacer
              </Button>
            )}
          </>
        )}
      />

      {loading ? (
        <div className="chats-page__list">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="chats-page__row-skeleton" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title={q ? 'Aucune conversation trouvée' : 'Aucune conversation pour le moment'}
          description={
            q
              ? 'Essaye un autre mot-clé ou élargis les filtres.'
              : 'Les conversations menées via le widget apparaîtront ici dès qu\'un visiteur posera une question.'
          }
        />
      ) : (
        <>
          <ul className="chats-page__list" role="list">
            {items.map(c => {
              const meta = STATUS_LABEL[c.status];
              return (
                <li key={c.id}>
                  <EntityRow
                    title={c.topic ?? c.firstQuestion ?? '— Conversation —'}
                    subtitle={c.firstQuestion && c.topic && (
                      <span className="chats-page__row-q">« {c.firstQuestion} »</span>
                    )}
                    onClick={() => setSelectedId(c.id)}
                    meta={(
                      <>
                        <Badge
                          tone={meta.tone}
                          title={c.resolutionReason ? (REASON_LABEL[c.resolutionReason] ?? c.resolutionReason) : undefined}
                        >
                          {meta.label}
                        </Badge>
                        {c.resolutionReason && REASON_LABEL[c.resolutionReason] && (
                          <span className="chats-page__row-reason">
                            {REASON_LABEL[c.resolutionReason]}
                          </span>
                        )}
                        <span className="chats-page__row-turns">
                          {c.turnsCount} {c.turnsCount === 1 ? 'message' : 'messages'}
                        </span>
                        {c.csat !== null && (
                          <span className="chats-page__row-csat" title={`CSAT ${c.csat}/5`}>
                            <StarRating value={c.csat} />
                          </span>
                        )}
                        <span className="chats-page__row-date">
                          {formatRelative(c.startedAt)}
                        </span>
                      </>
                    )}
                  />
                </li>
              );
            })}
          </ul>

          <Pager page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      {selectedId && (
        <TranscriptModal
          chatId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </section>
  );
}

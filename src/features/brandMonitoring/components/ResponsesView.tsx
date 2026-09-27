import { useEffect, useState, useCallback } from 'react';
import { brandMonitoringApi } from '../api/brandMonitoringApi';
import { useToast } from '../../../shared/lib/useToast';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { Modal } from '../../../shared/components/ui/Modal';
import { formatRelative } from '../../../shared/lib/formatDate';
import { MarkdownContent } from '../../../shared/components/ui/MarkdownContent';
import type { ResponseWithMentions, Sentiment } from '../types';

function sentimentEmoji(s: Sentiment | null): string {
  if (s === 'positive') return '😊';
  if (s === 'negative') return '😞';
  if (s === 'neutral')  return '😐';
  return '';
}

interface ResponsesViewProps {
  projectId: string;
}

export function ResponsesView({ projectId }: ResponsesViewProps) {
  const toast = useToast();
  const [responses, setResponses] = useState<ResponseWithMentions[]>([]);
  const [loading, setLoading] = useState(true);
  const [openResp, setOpenResp] = useState<ResponseWithMentions | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await brandMonitoringApi.listResponses(projectId, 1, 50);
      setResponses(data);
    } catch (err) {
      toast.error((err as Error).message ?? 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => { void reload(); }, [reload]);

  if (loading) return <Skeleton className="bm-skeleton-card" />;

  return (
    <div className="bm-responses">
      <section className="bm-card">
        <h3 className="bm-card__title">Dernières réponses LLM</h3>
        <p className="bm-card__sub">
          Audit complet de chaque réponse Mistral et des mentions détectées. Clique sur une ligne
          pour voir le texte complet.
        </p>
        {responses.length === 0 ? (
          <p className="bm-empty-data">Aucune réponse encore. Lance un run depuis l'onglet Dashboard.</p>
        ) : (
          <table className="bm-responses-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Prompt</th>
                <th>Mentions détectées</th>
                <th>Sources</th>
                <th>Tokens</th>
                <th>Coût</th>
              </tr>
            </thead>
            <tbody>
              {responses.map(r => (
                <tr key={r.id} onClick={() => setOpenResp(r)} className="bm-responses-table__row">
                  <td>{formatRelative(r.created_at)}</td>
                  <td className="bm-responses-table__prompt">{r.promptText ?? '(prompt supprimé)'}</td>
                  <td>
                    {r.mentions.filter(m => m.count > 0).length === 0 ? (
                      <span className="bm-responses-table__nomention">aucune</span>
                    ) : (
                      r.mentions
                        .filter(m => m.count > 0)
                        .sort((a, b) => b.count - a.count)
                        .map(m => (
                          <span key={m.brand_id} className={`bm-chip ${m.isOwner ? 'bm-chip--owner' : ''} ${m.sentiment ? `bm-chip--sentiment-${m.sentiment}` : ''}`}>
                            {sentimentEmoji(m.sentiment)} {m.brandName}: {m.count}
                          </span>
                        ))
                    )}
                  </td>
                  <td className="bm-responses-table__num">
                    {r.sources && r.sources.length > 0 ? (
                      <span className="bm-chip bm-chip--sources">{r.sources.length}</span>
                    ) : (
                      <span className="bm-responses-table__nomention">—</span>
                    )}
                  </td>
                  <td className="bm-responses-table__num">{r.input_tokens + r.output_tokens}</td>
                  <td className="bm-responses-table__num">{Number(r.cost_eur).toFixed(4)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {openResp && (
        <Modal title="Réponse LLM" size="lg" onClose={() => setOpenResp(null)}>
          <div className="bm-resp-detail">
            <p className="bm-resp-detail__meta">
              <strong>Prompt :</strong> {openResp.promptText ?? '(prompt supprimé)'}
            </p>
            <p className="bm-resp-detail__meta">
              <strong>Modèle :</strong> {openResp.llm_model}
              {' · '}
              <strong>Coût :</strong> {Number(openResp.cost_eur).toFixed(4)} €
              {' · '}
              <strong>Latence :</strong> {(openResp.latency_ms / 1000).toFixed(1)} s
              {' · '}
              <strong>Date :</strong> {formatRelative(openResp.created_at)}
            </p>
            <div className="bm-resp-detail__mentions">
              {openResp.mentions.filter(m => m.count > 0).map(m => (
                <span key={m.brand_id} className={`bm-chip ${m.isOwner ? 'bm-chip--owner' : ''} ${m.sentiment ? `bm-chip--sentiment-${m.sentiment}` : ''}`}>
                  {sentimentEmoji(m.sentiment)} {m.brandName}: {m.count}
                </span>
              ))}
            </div>
            <div className="bm-resp-detail__content">
              <MarkdownContent text={openResp.content} />
            </div>
            {openResp.sources && openResp.sources.length > 0 && (
              <div className="bm-resp-sources">
                <h4 className="bm-resp-sources__title">Sources citées ({openResp.sources.length})</h4>
                <ul className="bm-resp-sources__list">
                  {openResp.sources.map((s, i) => (
                    <li key={i} className="bm-resp-sources__item">
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="bm-resp-sources__link">
                        <span className="bm-resp-sources__num">[{i + 1}]</span>
                        <span className="bm-resp-sources__text">
                          <strong>{s.title ?? new URL(s.url).hostname}</strong>
                          <span className="bm-resp-sources__url">{s.url}</span>
                          {s.snippet && <span className="bm-resp-sources__snippet">{s.snippet}</span>}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

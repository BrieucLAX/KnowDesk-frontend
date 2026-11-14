import { useEffect, useState, useCallback } from 'react';
import { brandMonitoringApi } from '../api/brandMonitoringApi';
import { useToast } from '../../../shared/lib/useToast';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { Modal } from '../../../shared/components/ui/Modal';
import { formatRelative } from '../../../shared/lib/formatDate';
import { MarkdownContent } from '../../../shared/components/ui/MarkdownContent';
import type { ResponseWithMentions, Sentiment } from '../types';
import { Frown, Meh, Smile } from 'lucide-react';

function sentimentIcon(s: Sentiment | null): React.ReactNode {
  if (s === 'positive') return <Smile size={14} role="img" aria-label="Sentiment positif" />;
  if (s === 'negative') return <Frown size={14} role="img" aria-label="Sentiment négatif" />;
  if (s === 'neutral')  return <Meh   size={14} role="img" aria-label="Sentiment neutre" />;
  return null;
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
      toast.error((err as Error).message ?? "Les réponses n'ont pas pu être chargées. Rechargez la page.");
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => { void reload(); }, [reload]);

  if (loading) return <Skeleton className="bm-skeleton-card" />;

  return (
    <div className="bm-responses">
      <section className="bm-card">
        <h3 className="bm-card__title">Dernières réponses des IA</h3>
        <p className="bm-card__sub">
          Le détail de chaque réponse de Mistral et des mentions détectées. Cliquez sur une ligne
          pour voir le texte complet.
        </p>
        {responses.length === 0 ? (
          <p className="bm-empty-data">Aucune réponse pour l'instant. Lancez une analyse depuis l'onglet Tableau de bord.</p>
        ) : (
          <div className="bm-responses-wrap">
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
                  <td data-label="Date">{formatRelative(r.created_at)}</td>
                  <td className="bm-responses-table__prompt">{r.promptText ?? '(prompt supprimé)'}</td>
                  <td data-label="Mentions">
                    {r.mentions.filter(m => m.count > 0).length === 0 ? (
                      <span className="bm-responses-table__nomention">aucune</span>
                    ) : (
                      r.mentions
                        .filter(m => m.count > 0)
                        .sort((a, b) => b.count - a.count)
                        .map(m => (
                          <span key={m.brand_id} className={`bm-chip ${m.isOwner ? 'bm-chip--owner' : ''} ${m.sentiment ? `bm-chip--sentiment-${m.sentiment}` : ''}`}>
                            {sentimentIcon(m.sentiment)} {m.brandName} : {m.count}
                          </span>
                        ))
                    )}
                  </td>
                  <td data-label="Sources" className="bm-responses-table__num">
                    {r.sources && r.sources.length > 0 ? (
                      <span className="bm-chip bm-chip--sources">{r.sources.length}</span>
                    ) : (
                      <span className="bm-responses-table__nomention">—</span>
                    )}
                  </td>
                  <td data-label="Tokens" className="bm-responses-table__num">{r.input_tokens + r.output_tokens}</td>
                  <td data-label="Coût" className="bm-responses-table__num">{Number(r.cost_eur).toFixed(4)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </section>

      {openResp && (
        <Modal title="Réponse de l'IA" size="lg" onClose={() => setOpenResp(null)}>
          <div className="bm-resp-detail">
            <p className="bm-resp-detail__meta">
              <strong>Question :</strong> {openResp.promptText ?? '(prompt supprimé)'}
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
                  {sentimentIcon(m.sentiment)} {m.brandName} : {m.count}
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

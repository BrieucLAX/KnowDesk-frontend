import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../shared/components/ui/Button';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import '../../imports/imports.css';
import { useToast } from '../../../shared/lib/useToast';
import { formatRelative } from '../../../shared/lib/formatDate';
import { importsApi, type ImportItem } from '../../imports/api/importsApi';
import { ImportModal } from '../../imports/components/ImportModal';
import { Plus, Upload } from 'lucide-react';

const STATUS_LABEL: Record<ImportItem['status'], { label: string; tone: 'neutral' | 'success' | 'warning' | 'danger' }> = {
  pending:    { label: 'En attente',     tone: 'neutral' },
  processing: { label: 'En cours…',      tone: 'warning' },
  completed:  { label: 'Terminé',        tone: 'success' },
  failed:     { label: 'Échec',          tone: 'danger'  },
};

const FORMAT_LABEL: Record<ImportItem['format'], string> = {
  pdf:  'PDF',
  docx: 'DOCX',
  pptx: 'PPTX',
};

export function ImportsSettingsSection() {
  const toast = useToast();
  const navigate = useNavigate();

  const [items, setItems]     = useState<ImportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      const list = await importsApi.list();
      setItems(list);
    } catch (err) {
      toast.error((err as Error).message ?? 'Impossible de charger l\'historique des imports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // Auto-refresh toutes les 5s tant qu'au moins un import est en cours
  useEffect(() => {
    const hasInFlight = items.some(i => i.status === 'pending' || i.status === 'processing');
    if (!hasInFlight) return;
    const t = window.setInterval(reload, 5000);
    return () => window.clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map(i => `${i.id}:${i.status}`).join('|')]);

  return (
    <section className="settings-section" aria-labelledby="imports-title">
      <div className="settings-section__header">
        <div>
          <h2 id="imports-title" className="settings-section__title icon-label"><Upload size={20} />Imports de documents</h2>
          <p className="settings-section__desc">
            Convertis tes bases de connaissance existantes (PDF, DOCX, PPTX) en articles
            KnowDesk. Les articles importés sont créés en <strong>brouillon</strong> dans
            une catégorie temporaire <em>📥 Imports — date du jour</em> — relis-les avant
            de les publier.
          </p>
        </div>
        <Button type="button" variant="primary" size="md" onClick={() => setShowModal(true)}>
          <Plus size={20} />Nouvel import
        </Button>
      </div>

      {loading ? (
        <div className="imports-list">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="imports-row-skeleton" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Aucun import pour l'instant"
          description="Clique sur « + Nouvel import » pour transformer un document existant en articles brouillon."
        />
      ) : (
        <ul className="imports-list" role="list">
          {items.map(item => {
            const meta = STATUS_LABEL[item.status];
            const canOpenCategory = item.status === 'completed' && item.category_id;
            return (
              <li key={item.id} className="imports-row">
                <div className="imports-row__main">
                  <div className="imports-row__top">
                    <span className="imports-row__format">{FORMAT_LABEL[item.format]}</span>
                    <span className="imports-row__filename" title={item.filename}>{item.filename}</span>
                    <span className={`imports-row__status imports-row__status--${meta.tone}`}>
                      {meta.label}
                    </span>
                  </div>
                  <div className="imports-row__meta">
                    <span>
                      {item.split_mode === 'split_by_section'
                        ? 'Découpé par section'
                        : item.format === 'pptx'
                          ? '1 slide = 1 article'
                          : '1 fichier = 1 article'}
                    </span>
                    <span>·</span>
                    <span>{formatRelative(item.created_at)}</span>
                    {item.status === 'completed' && (
                      <>
                        <span>·</span>
                        <span>
                          <strong>{item.articles_created}</strong> article{item.articles_created > 1 ? 's' : ''} créé{item.articles_created > 1 ? 's' : ''}
                        </span>
                      </>
                    )}
                    {item.category_name && (
                      <>
                        <span>·</span>
                        <span title={item.category_name}>{item.category_name}</span>
                      </>
                    )}
                  </div>
                  {item.status === 'failed' && item.error_message && (
                    <p className="imports-row__error">{item.error_message}</p>
                  )}
                </div>
                <div className="imports-row__actions">
                  {canOpenCategory && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // KnowledgePage lit le state.preselectCategory si fourni,
                        // sinon on fallback sur localStorage qu'elle lit pour l'expansion.
                        navigate('/knowledge', { state: { preselectCategoryId: item.category_id } });
                      }}
                    >
                      Voir les articles
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {showModal && (
        <ImportModal
          onClose={() => { setShowModal(false); reload(); }}
          onCompleted={() => reload()}
        />
      )}
    </section>
  );
}

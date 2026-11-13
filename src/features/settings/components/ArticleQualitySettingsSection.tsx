import React, { useEffect, useState, useCallback } from 'react';
import { Button }    from '../../../shared/components/ui/Button';
import { Switch }    from '../../../shared/components/ui/Switch';
import { Skeleton }  from '../../../shared/components/ui/Skeleton';
import { useToast }  from '../../../shared/lib/useToast';
import { ApiError }  from '../../../shared/lib/apiClient';
import { useAuthStore, selectUserRole } from '../../../store/authStore';
import { formatRelative } from '../../../shared/lib/formatDate';
import { articleQualityApi, type QualityStats } from '../../articleQuality/api/articleQualityApi';
import { CircleAlert, CircleCheck, RotateCw, Sparkles, TriangleAlert } from 'lucide-react';

/**
 * Section Settings → IA → Auditeur qualité.
 * Admin-only. Permet :
 *   - Activer / désactiver la fonctionnalité (Switch)
 *   - Voir l'état du scoring (X / Y articles scorés, Z à retravailler)
 *   - Lancer un re-scoring de tous les articles publiés
 */
export function ArticleQualitySettingsSection() {
  const toast   = useToast();
  const role    = useAuthStore(selectUserRole);
  const isAdmin = role === 'admin';
  const [enabled,    setEnabled]   = useState<boolean | null>(null);
  const [stats,      setStats]     = useState<QualityStats | null>(null);
  const [loading,    setLoading]   = useState(true);
  const [toggling,   setToggling]  = useState(false);
  const [rescoring,  setRescoring] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [feat, st] = await Promise.all([
        articleQualityApi.getFeature(),
        articleQualityApi.stats(),
      ]);
      setEnabled(feat.enabled);
      setStats(st);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'L\'état de l\'auditeur n\'a pas pu être chargé. Rechargez la page.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { reload(); }, [reload]);

  const handleToggle = useCallback(async (next: boolean) => {
    if (!isAdmin) return;
    setToggling(true);
    try {
      const { enabled: newVal } = await articleQualityApi.setFeature(next);
      setEnabled(newVal);
      toast.success(newVal ? 'Auditeur qualité activé.' : 'Auditeur qualité désactivé.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Le paramètre n\'a pas été modifié. Réessayez.');
    } finally {
      setToggling(false);
    }
  }, [isAdmin, toast]);

  const handleRescoreAll = useCallback(async () => {
    setRescoring(true);
    try {
      const { enqueued } = await articleQualityApi.rescoreAll();
      toast.success(
        enqueued === 0
          ? 'Aucun article publié à évaluer.'
          : `${enqueued} article${enqueued > 1 ? 's' : ''} mis en file d'attente.`,
      );
      // Re-fetch stats après quelques secondes pour montrer la progression
      setTimeout(reload, 3000);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'L\'évaluation n\'a pas pu être lancée. Réessayez.');
    } finally {
      setRescoring(false);
    }
  }, [toast, reload]);

  if (loading) {
    return (
      <section className="settings-section">
        <div className="settings-section__header">
          <h2 className="settings-section__title icon-label"><Sparkles size={20} />Auditeur qualité des articles</h2>
        </div>
        <Skeleton className="sk-p" />
      </section>
    );
  }

  return (
    <section className="settings-section" aria-labelledby="article-quality-title">
      <div className="settings-section__header">
        <h2 id="article-quality-title" className="settings-section__title icon-label">
          <Sparkles size={20} />Auditeur qualité des articles
        </h2>
        <p className="settings-section__desc">
          L'IA évalue vos articles publiés sur 6 dimensions
          (Clarté, Actionnable, Titre et contenu, Structure, Fraîcheur, Vocabulaire)
          et signale ceux à retravailler dans l'écran Analyse. L'évaluation se lance
          automatiquement environ 30 secondes après chaque modification d'un article, et une
          évaluation hebdomadaire couvre les articles pas encore évalués.
        </p>
      </div>

      <div className="settings-toggles">
        <Switch
          id="article-quality-enabled"
          label="Auditeur qualité activé"
          description={isAdmin
            ? 'Désactivé, aucune nouvelle évaluation n\'est lancée. Les évaluations existantes restent visibles dans l\'éditeur, en lecture seule.'
            : 'Seul un administrateur peut modifier ce paramètre.'}
          checked={enabled ?? false}
          onChange={handleToggle}
          disabled={!isAdmin || toggling}
        />
      </div>

      {/* Stats de l'état actuel — 3 paliers de qualité */}
      {stats && (
        <div className="article-quality-stats">
          <div className="article-quality-stats__row">
            <Stat label="Articles publiés"  value={stats.published} />
            <Stat label="Évalués"           value={stats.scored} />
            <Stat label="Non évalués"       value={stats.notScored} muted={stats.notScored === 0} />
            <Stat label="Parfaits"        icon={<CircleCheck size={16} />} value={stats.perfect}  variant="ok" />
            <Stat label="Bons"           icon={<TriangleAlert size={16} />} value={stats.good}     variant="warn" highlight={stats.good > 0} />
            <Stat label="À retravailler" icon={<CircleAlert size={16} />} value={stats.toRework} variant="bad"  highlight={stats.toRework > 0} />
          </div>
          {stats.lastChecked && (
            <p className="article-quality-stats__last">
              Dernière évaluation : {formatRelative(stats.lastChecked)}
              {' · '}
              <span title="Un article peut avoir 1 ou 2 dimensions à revoir et rester dans « Bons ». Il passe en « À retravailler » à partir de 3 dimensions à revoir.">
                Comment ces paliers sont-ils calculés ?
              </span>
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="settings-form__actions">
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={handleRescoreAll}
          disabled={!enabled || rescoring || !stats || stats.published === 0}
          loading={rescoring}
          title={!enabled
            ? 'Activez l\'auditeur pour lancer une évaluation.'
            : stats?.published === 0
              ? 'Aucun article publié dans cette organisation.'
              : 'Place tous les articles publiés en file d\'attente. Comptez environ 10 secondes par article.'}
          leftIcon={<RotateCw size={20} />}
        >
          Évaluer tous les articles publiés maintenant
        </Button>
      </div>

      <p className="field-helper">
        Coût indicatif : environ 1 500 tokens par article avec Mistral Small, soit environ 0,01 € pour 50 articles.
        Deux articles sont traités en parallèle, soit environ 5 minutes pour 60 articles.
      </p>
    </section>
  );
}

function Stat({ label, icon, value, highlight, muted, variant }: {
  label: string; icon?: React.ReactNode; value: number;
  highlight?: boolean; muted?: boolean;
  variant?: 'ok' | 'warn' | 'bad';
}) {
  const variantClass = variant ? ` article-quality-stat--${variant}` : '';
  return (
    <div className={`article-quality-stat${variantClass}${highlight ? ' article-quality-stat--flag' : ''}${muted ? ' article-quality-stat--muted' : ''}`}>
      <span className="article-quality-stat__value">{value}</span>
      <span className="article-quality-stat__label icon-label">{icon}{label}</span>
    </div>
  );
}

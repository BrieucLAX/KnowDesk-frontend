import { useEffect, useState, useCallback } from 'react';
import { brandMonitoringApi } from '../api/brandMonitoringApi';
import { useToast } from '../../../shared/lib/useToast';
import { Button } from '../../../shared/components/ui/Button';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { TimelineChart } from './TimelineChart';
import type { ShareOfVoice, TopicSov, AlignmentPayload, MonitoringRecommendation } from '../types';
import { Check, CircleAlert, Lightbulb, Link, Play, Sparkles, Star, Target, TrendingDown, TriangleAlert } from 'lucide-react';

interface DashboardViewProps {
  projectId:       string;
  onReloadProject: () => void;
}

export function DashboardView({ projectId, onReloadProject }: DashboardViewProps) {
  const toast = useToast();
  const [sov,    setSov]    = useState<ShareOfVoice | null>(null);
  const [topics, setTopics] = useState<TopicSov[]>([]);
  const [alignment, setAlignment] = useState<AlignmentPayload | null>(null);
  const [recos, setRecos] = useState<MonitoringRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [clustering, setClustering] = useState(false);
  const [generatingRecos, setGeneratingRecos] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t, a, rc] = await Promise.all([
        brandMonitoringApi.shareOfVoice(projectId),
        brandMonitoringApi.topics(projectId),
        brandMonitoringApi.alignment(projectId).catch(() => null), // best effort
        brandMonitoringApi.listRecommendations(projectId).catch(() => []),
      ]);
      setSov(s);
      setTopics(t.topics);
      setAlignment(a);
      setRecos(rc);
    } catch (err) {
      toast.error((err as Error).message ?? "Le tableau de bord n'a pas pu être chargé. Rechargez la page.");
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => { void reload(); }, [reload]);

  const handleRun = async () => {
    setRunning(true);
    try {
      await brandMonitoringApi.triggerRun(projectId);
      toast.success('Analyse lancée en arrière-plan. Comptez environ 10 s par question, puis rechargez le tableau de bord pour voir les résultats.');
      onReloadProject();
    } catch (err) {
      toast.error((err as Error).message ?? "L'analyse n'a pas pu être lancée. Réessayez.");
    } finally {
      setRunning(false);
    }
  };

  const handleGenerateRecos = async () => {
    setGeneratingRecos(true);
    try {
      const r = await brandMonitoringApi.generateRecommendations(projectId);
      toast.success(r.generated === 0
        ? "Pas encore assez de signaux pour proposer des recommandations. Lancez d'autres analyses pour en accumuler."
        : `${r.generated} recommandation${r.generated > 1 ? 's' : ''} générée${r.generated > 1 ? 's' : ''}.`);
      await reload();
    } catch (err) {
      toast.error((err as Error).message ?? "Les recommandations n'ont pas pu être générées. Réessayez.");
    } finally {
      setGeneratingRecos(false);
    }
  };

  const handleDismissReco = async (recoId: string) => {
    try {
      await brandMonitoringApi.dismissRecommendation(recoId);
      setRecos(prev => prev.filter(r => r.id !== recoId));
    } catch (err) {
      toast.error((err as Error).message ?? "La recommandation n'a pas pu être archivée. Réessayez.");
    }
  };

  const handleCluster = async () => {
    setClustering(true);
    try {
      const result = await brandMonitoringApi.clusterTopics(projectId);
      toast.success(`${result.assigned} questions regroupées en ${result.topics.length} thèmes (coût : ${result.costEur.toFixed(3)} €).`);
      await reload();
    } catch (err) {
      toast.error((err as Error).message ?? "Les questions n'ont pas pu être regroupées. Réessayez.");
    } finally {
      setClustering(false);
    }
  };

  if (loading) {
    return (
      <div className="bm-grid">
        <Skeleton className="bm-skeleton-card" />
        <Skeleton className="bm-skeleton-card" />
      </div>
    );
  }

  const hasData = (sov?.totalMentions ?? 0) > 0;

  return (
    <div className="bm-dashboard">
      <div className="bm-actions">
        <Button variant="primary" size="sm" onClick={handleRun} loading={running}>
          <Play size={16} />Lancer une analyse
        </Button>
        <Button variant="secondary" size="sm" onClick={handleCluster} loading={clustering}>
          <Sparkles size={16} />Regrouper les questions par thème
        </Button>
        <Button variant="secondary" size="sm" onClick={handleGenerateRecos} loading={generatingRecos}>
          <Lightbulb size={16} />Générer les recommandations
        </Button>
      </div>

      {recos.length > 0 && (
        <section className="bm-card bm-recos">
          <h3 className="bm-card__title">Actions à mener ({recos.length})</h3>
          <p className="bm-card__sub">
            Signaux détectés dans vos données. Cliquez sur « Marquer comme traitée » pour archiver une
            recommandation : elle ne sera plus proposée tant que vous ne la réinitialisez pas.
          </p>
          <ul className="bm-recos__list">
            {recos.map(r => (
              <li key={r.id} className={`bm-reco bm-reco--${r.kind}`}>
                <div className="bm-reco__head">
                  <span className="bm-reco__badge icon-label">{iconForKind(r.kind)}{labelForKind(r.kind)}</span>
                  <strong className="bm-reco__title">{r.title}</strong>
                </div>
                <p className="bm-reco__body">{r.body}</p>
                <div className="bm-reco__actions">
                  <Button variant="secondary" size="sm" onClick={() => handleDismissReco(r.id)} leftIcon={<Check size={16} />}>
                    Marquer comme traitée
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!hasData && (
        <div className="bm-empty-data">
          <p>Aucune donnée pour l'instant. Lancez une analyse pour interroger Mistral sur vos questions suivies.</p>
        </div>
      )}

      {hasData && sov && (() => {
        // R-S6 — si le projet contient des produits (`kind='product'`),
        // on splitte en 2 cards distinctes pour ne pas mélanger les
        // analyses : la part de voix Auchan vs Carrefour (enseignes) est
        // différente de la part de voix Auchan Bio vs Carrefour Bio (produits).
        const brandsOnly   = sov.byBrand.filter(b => (b.kind ?? 'brand') === 'brand');
        const productsOnly = sov.byBrand.filter(b => b.kind === 'product');
        const totalBrand   = brandsOnly.reduce((s, b) => s + b.totalMentions, 0);
        const totalProduct = productsOnly.reduce((s, b) => s + b.totalMentions, 0);
        const recalcPct = (arr: typeof sov.byBrand, total: number) =>
          arr.map(b => ({ ...b, pct: total > 0 ? (b.totalMentions / total) * 100 : 0 }));
        return (
          <>
            <section className="bm-card">
              <h3 className="bm-card__title">Part de voix — marques</h3>
              <p className="bm-card__sub">
                {totalBrand} mentions d'enseignes cumulées sur {sov.responseCount} réponses.
              </p>
              <ShareOfVoiceBars byBrand={recalcPct(brandsOnly, totalBrand)} totalMentions={totalBrand} />
            </section>
            {productsOnly.length > 0 && (
              <section className="bm-card">
                <h3 className="bm-card__title">Part de voix — produits (recommandations d'achat)</h3>
                <p className="bm-card__sub">
                  {totalProduct} mentions de produits cumulées sur {sov.responseCount} réponses.
                  Mesure ce que l'IA recommande sur les questions d'achat.
                </p>
                <ShareOfVoiceBars byBrand={recalcPct(productsOnly, totalProduct)} totalMentions={totalProduct} />
              </section>
            )}
          </>
        );
      })()}

      {hasData && <TimelineChart projectId={projectId} />}

      {hasData && alignment && alignment.byBrand.length > 0 && (
        <section className="bm-card">
          <h3 className="bm-card__title">Alignement narratif</h3>
          <p className="bm-card__sub">
            {alignment.desiredAttributes.length > 0
              ? <>Attributs souhaités du positionnement : {alignment.desiredAttributes.map(a => <span key={a} className="bm-chip bm-chip--owner" style={{marginRight:4}}>{a}</span>)}</>
              : <>Aucun attribut prioritaire défini. Renseignez-les dans l'onglet Paramètres pour obtenir le score d'alignement.</>}
          </p>
          <div className="bm-alignment">
            {alignment.byBrand.map(b => (
              <div key={b.brandId} className={`bm-alignment-row ${b.isOwner ? 'is-owner' : ''}`}>
                <div className="bm-alignment-row__head">
                  <strong className="icon-label">{b.isOwner && <Star size={16} aria-hidden="true" />}{b.brandName}</strong>
                  <span className="bm-alignment-row__meta">
                    {b.mentionsCount === 0
                      ? <em>0 mention : marque absente des réponses des IA</em>
                      : <>
                          {b.mentionsCount} mention{b.mentionsCount > 1 ? 's' : ''} évaluée{b.mentionsCount > 1 ? 's' : ''}
                          {alignment.desiredAttributes.length > 0 && <> · score d'alignement <strong>{b.alignmentScore.toFixed(0)}%</strong></>}
                        </>}
                  </span>
                </div>
                {b.mentionsCount === 0 ? (
                  <p className="bm-alignment-row__zero">
                    {b.isOwner && <TriangleAlert size={16} className="icon-inline bm-alignment-row__warn" />}
                    {b.isOwner
                      ? " Point critique : votre marque n'est mentionnée dans aucune réponse des IA sur les questions suivies actuelles. Ajoutez des questions plus générales (par exemple « Quel opérateur choisir ? ») pour voir si elle y apparaît, ou revoyez votre stratégie de visibilité."
                      : "Cette marque n'est mentionnée dans aucune réponse des IA sur les questions suivies actuelles."}
                  </p>
                ) : b.attributesObserved.length === 0 ? (
                  <p className="bm-alignment-row__zero">
                    Des mentions ont été détectées, mais l'IA d'évaluation n'en a extrait aucun attribut clair.
                  </p>
                ) : (
                  <div className="bm-alignment-row__attrs">
                    {b.attributesObserved.slice(0, 12).map(o => (
                      <span
                        key={o.attr}
                        className={`bm-chip ${o.isDesired ? 'bm-chip--owner' : ''}`}
                        title={`${o.count} mention${o.count > 1 ? 's' : ''} (${o.pct.toFixed(0)}%)${o.isDesired ? ' — attribut souhaité' : ''}`}
                      >
                        {o.attr} <small>×{o.count}</small>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {hasData && topics.length > 0 && (
        <section className="bm-card">
          <h3 className="bm-card__title">Part de voix par thème</h3>
          <p className="bm-card__sub">
            Repérez les thèmes où votre marque est forte et ceux où elle est absente. Si vous voyez
            « (sans thème) », relancez « Regrouper les questions par thème ».
          </p>
          <div className="bm-topics">
            {topics.map(topic => (
              <div key={topic.topic ?? '__null__'} className="bm-topic">
                <div className="bm-topic__head">
                  <strong>{topic.topic ?? '(sans thème)'}</strong>
                  <span className="bm-topic__meta">
                    {topic.promptCount} question{topic.promptCount > 1 ? 's' : ''} · {topic.responseCount} réponses · {topic.totalMentions} mentions
                  </span>
                </div>
                {topic.totalMentions > 0 ? (
                  <ShareOfVoiceBars
                    byBrand={topic.byBrand}
                    totalMentions={topic.totalMentions}
                    compact
                  />
                ) : (
                  <p className="bm-topic__empty">Aucune mention détectée sur ce thème.</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function labelForKind(kind: MonitoringRecommendation['kind']): string {
  switch (kind) {
    case 'absent_from_llm':   return 'Critique';
    case 'missing_topic':     return 'Thème';
    case 'missing_attribute': return 'Positionnement';
    case 'missing_source':    return 'Source';
  }
}

function iconForKind(kind: MonitoringRecommendation['kind']): React.ReactNode {
  switch (kind) {
    case 'absent_from_llm':   return <CircleAlert size={14} />;
    case 'missing_topic':     return <TrendingDown size={14} />;
    case 'missing_attribute': return <Target size={14} />;
    case 'missing_source':    return <Link size={14} />;
  }
}

interface SoVBarsProps {
  byBrand: Array<{ brandId: string; brandName: string; isOwner: boolean; mentions?: number; totalMentions?: number; pct: number }>;
  totalMentions: number;
  compact?: boolean;
}

function ShareOfVoiceBars({ byBrand, compact }: SoVBarsProps) {
  if (byBrand.length === 0) return <p className="bm-bars__empty">Aucune mention détectée.</p>;
  const maxPct = Math.max(...byBrand.map(b => b.pct), 1);
  return (
    <ul className={`bm-bars ${compact ? 'bm-bars--compact' : ''}`}>
      {byBrand.map(b => {
        const mentions = (b as { mentions?: number; totalMentions?: number }).mentions
                      ?? (b as { mentions?: number; totalMentions?: number }).totalMentions
                      ?? 0;
        return (
          <li key={b.brandId} className={`bm-bar ${b.isOwner ? 'is-owner' : ''}`}>
            <div className="bm-bar__label">
              {b.isOwner && <span className="bm-bar__star" aria-hidden="true"><Star size={14} /></span>}
              <span className="bm-bar__name">{b.brandName}</span>
            </div>
            <div className="bm-bar__track">
              <div
                className="bm-bar__fill"
                style={{ width: `${(b.pct / maxPct) * 100}%` }}
              />
            </div>
            <div className="bm-bar__values">
              <span className="bm-bar__pct">{b.pct.toFixed(1)}%</span>
              <span className="bm-bar__count">({mentions})</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

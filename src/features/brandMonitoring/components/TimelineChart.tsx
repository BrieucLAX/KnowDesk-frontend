import { useEffect, useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { brandMonitoringApi } from '../api/brandMonitoringApi';
import { useToast } from '../../../shared/lib/useToast';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import type { Timeline } from '../types';
import { CHART_SERIES, CHART_GRID, CHART_AXIS } from '../../../shared/lib/chartColors';

interface TimelineChartProps {
  projectId: string;
}

// La marque du client prend toujours la première couleur (--primary) ; les
// concurrents se partagent les cinq suivantes. Au-delà de cinq concurrents,
// les couleurs se répètent (le trait épais et l'étoile distinguent le client).
const [OWNER_COLOR, ...COMPETITOR_COLORS] = CHART_SERIES;

type Bucket = 'day' | 'week';

export function TimelineChart({ projectId }: TimelineChartProps) {
  const toast = useToast();
  const [data, setData] = useState<Timeline | null>(null);
  const [bucket, setBucket] = useState<Bucket>('week');
  const [rangeDays, setRangeDays] = useState<number>(90);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    brandMonitoringApi.timeline(projectId, bucket, rangeDays)
      .then(d => { if (!cancel) setData(d); })
      .catch(err => toast.error((err as Error).message ?? 'Chargement timeline impossible.'))
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, [projectId, bucket, rangeDays, toast]);

  // Transformation : agrège chaque bucket en un objet flat { bucket, Auchan: pct, Carrefour: pct, ... }
  // Couleur owner-first dans la légende.
  const { chartData, brands } = useMemo(() => {
    if (!data || data.series.length === 0) return { chartData: [], brands: [] as Array<{ name: string; isOwner: boolean; color: string }> };
    const brandSet = new Map<string, { name: string; isOwner: boolean }>();
    for (const point of data.series) {
      for (const b of point.byBrand) {
        if (!brandSet.has(b.brandId)) brandSet.set(b.brandId, { name: b.brandName, isOwner: b.isOwner });
      }
    }
    const orderedBrands = [...brandSet.values()].sort((a, b) => {
      if (a.isOwner && !b.isOwner) return -1;
      if (!a.isOwner && b.isOwner) return 1;
      return a.name.localeCompare(b.name);
    });
    const ownerCount = orderedBrands.filter(b => b.isOwner).length;
    const brandsWithColor = orderedBrands.map((b, i) => ({ ...b, color: b.isOwner ? OWNER_COLOR : COMPETITOR_COLORS[(i - ownerCount) % COMPETITOR_COLORS.length] }));
    const chartData = data.series.map(point => {
      const row: Record<string, string | number> = {
        bucket: formatBucketLabel(point.bucket, bucket),
      };
      for (const b of point.byBrand) row[b.brandName] = Number(b.pct.toFixed(1));
      return row;
    });
    return { chartData, brands: brandsWithColor };
  }, [data, bucket]);

  return (
    <section className="bm-card">
      <div className="bm-timeline__head">
        <div>
          <h3 className="bm-card__title">Évolution dans le temps</h3>
          <p className="bm-card__sub">Part de voix par marque, en % des mentions cumulées par bucket.</p>
        </div>
        <div className="bm-timeline__controls">
          <label className="bm-timeline__ctrl">
            <span>Granularité</span>
            <select className="bm-select" value={bucket} onChange={e => setBucket(e.target.value as Bucket)}>
              <option value="week">Hebdomadaire</option>
              <option value="day">Quotidienne</option>
            </select>
          </label>
          <label className="bm-timeline__ctrl">
            <span>Période</span>
            <select className="bm-select" value={rangeDays} onChange={e => setRangeDays(Number(e.target.value))}>
              <option value={30}>30 derniers jours</option>
              <option value={90}>90 derniers jours</option>
              <option value={180}>6 derniers mois</option>
              <option value={365}>1 an</option>
            </select>
          </label>
        </div>
      </div>

      {loading && <Skeleton className="bm-skeleton-card" />}

      {!loading && chartData.length === 0 && (
        <p className="bm-empty-data">
          Pas encore assez de données pour cette période. Lance plusieurs runs au fil des semaines
          pour voir l'évolution de ta part de voix.
        </p>
      )}

      {!loading && chartData.length > 0 && (
        <div className="bm-timeline__chart">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="bucket" fontSize={11} stroke={CHART_AXIS} />
              <YAxis
                fontSize={11}
                stroke={CHART_AXIS}
                tickFormatter={(v: number) => `${v}%`}
                domain={[0, 'dataMax']}
              />
              <Tooltip
                formatter={(v: number) => `${v.toFixed(1)}%`}
                contentStyle={{ fontSize: 12, borderRadius: 8, background: 'var(--surface-raised)', borderColor: 'var(--line)', color: 'var(--ink)' }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {brands.map(b => (
                <Line
                  key={b.name}
                  type="monotone"
                  dataKey={b.name}
                  stroke={b.color}
                  strokeWidth={b.isOwner ? 3 : 1.8}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  name={b.isOwner ? `⭐ ${b.name}` : b.name}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

function formatBucketLabel(iso: string, bucket: Bucket): string {
  const d = new Date(iso);
  if (bucket === 'day') {
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }
  // Hebdo : « S15 (7 avr.) » — court mais identifiable
  const week = Math.floor((Number(d) - Number(new Date(d.getUTCFullYear(), 0, 1))) / 86_400_000 / 7) + 1;
  return `S${week} (${d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })})`;
}

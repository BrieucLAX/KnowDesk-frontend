import { useEffect, useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { brandMonitoringApi } from '../api/brandMonitoringApi';
import { useToast } from '../../../shared/lib/useToast';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import type { Timeline } from '../types';
import { chartSeriesStyle, CHART_GRID, CHART_AXIS } from '../../../shared/lib/chartColors';
import { Star } from 'lucide-react';
import { useIsMobile } from '../../../shared/lib/useMediaQuery';

interface TimelineChartProps {
  projectId: string;
}

// La marque du client prend toujours la première couleur (--primary) ; les
// concurrents se partagent les cinq suivantes. Au-delà de cinq concurrents,
// les couleurs se répètent (le trait épais et l'étoile distinguent le client).

type Bucket = 'day' | 'week';

export function TimelineChart({ projectId }: TimelineChartProps) {
  const toast = useToast();
  const [data, setData] = useState<Timeline | null>(null);
  const [bucket, setBucket] = useState<Bucket>('week');
  const [rangeDays, setRangeDays] = useState<number>(90);
  const [loading, setLoading] = useState(true);
  // Sous 768 px, la légende passe sur plusieurs lignes sous le graphique : on
  // donne plus de hauteur pour que le tracé ne soit pas écrasé (lot 6b).
  const isMobile = useIsMobile();

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    brandMonitoringApi.timeline(projectId, bucket, rangeDays)
      .then(d => { if (!cancel) setData(d); })
      .catch(err => toast.error((err as Error).message ?? "L'évolution dans le temps n'a pas pu être chargée. Rechargez la page."))
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, [projectId, bucket, rangeDays, toast]);

  // Transformation : agrège chaque bucket en un objet flat { bucket, Auchan: pct, Carrefour: pct, ... }
  // Couleur owner-first dans la légende.
  const { chartData, brands } = useMemo(() => {
    if (!data || data.series.length === 0) return { chartData: [], brands: [] as Array<{ name: string; isOwner: boolean; color: string; dash?: string }> };
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
    // Marque suivie en premier (--primary), puis les concurrentes ; au-delà de
    // 6 marques, les couleurs reviennent en pointillés, puis en tirets.
    const brandsWithColor = orderedBrands.map((b, i) => ({ ...b, ...chartSeriesStyle(i) }));
    const chartData = data.series.map(point => {
      const row: Record<string, string | number> = {
        bucket: formatBucketLabel(point.bucket, bucket),
      };
      for (const b of point.byBrand) row[b.brandName] = Number(b.pct.toFixed(1));
      return row;
    });
    return { chartData, brands: brandsWithColor };
  }, [data, bucket]);
  const ownerName = brands.find(b => b.isOwner)?.name;

  return (
    <section className="bm-card">
      <div className="bm-timeline__head">
        <div>
          <h3 className="bm-card__title">Évolution dans le temps</h3>
          <p className="bm-card__sub">Part de voix par marque, en % des mentions cumulées sur chaque période.</p>
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
          Pas encore assez de données pour cette période. Lancez plusieurs analyses au fil des semaines
          pour voir l'évolution de votre part de voix.
        </p>
      )}

      {!loading && chartData.length > 0 && (
        <div className="bm-timeline__chart">
          <ResponsiveContainer width="100%" height={isMobile ? 380 : 320}>
            <LineChart data={chartData} margin={{ top: 10, right: isMobile ? 8 : 16, left: isMobile ? -12 : 0, bottom: 0 }}>
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
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                formatter={(value: string) => (
                  ownerName === value
                    ? <span className="icon-label bm-timeline__owner"><Star size={12} aria-hidden="true" />{value}</span>
                    : value
                )}
              />
              {brands.map(b => (
                <Line
                  key={b.name}
                  type="monotone"
                  dataKey={b.name}
                  stroke={b.color}
                  strokeDasharray={b.dash}
                  legendType="plainline"
                  strokeWidth={b.isOwner ? 3 : 1.8}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
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

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import '../kbscore.css';
import { InfoTooltip, type InfoTooltipRow } from '../../../shared/components/ui/Tooltip';
import { useToast } from '../../../shared/lib/useToast';
import { kbscoreApi, type KbScoreResult, type DimensionScore } from '../api/kbscoreApi';

const BAND_LABEL: Record<KbScoreResult['band'], { label: string; tone: string }> = {
  critical:  { label: 'Critique',   tone: 'critical'  },
  warning:   { label: 'À améliorer', tone: 'warning'   },
  good:      { label: 'Bon',        tone: 'good'      },
  excellent: { label: 'Excellent',  tone: 'excellent' },
};

const DIM_META: Array<{
  key:     keyof KbScoreResult['dimensions'];
  label:   string;
  hint:    string;
  /** Lignes de l'info-bulle (Phase « clarté KPI »). null = tooltip pas encore rédigée. */
  tooltip: InfoTooltipRow[] | null;
}> = [
  {
    key:   'coverage',
    label: 'Couverture',
    hint:  '% de recherches qui aboutissent',
    tooltip: [
      { label: 'Quoi',   text: '% des recherches par mots-clés faites par les conseillers dans la barre Cmd+K (base interne) qui donnent au moins 1 résultat.' },
      { label: 'Calcul', text: 'recherches avec au moins 1 résultat ÷ total des recherches sur 30 jours, dans la barre Cmd+K uniquement.' },
      { label: 'Action', text: "en dessous de 80 %, ouvrez « Recherches sans résultat » et créez une FAQ pour combler le manque : c'est le levier le plus rapide." },
    ],
  },
  {
    key:   'satisfaction',
    label: 'Satisfaction FAQ',
    hint:  '% de votes utiles sur les FAQ publiées',
    tooltip: [
      { label: 'Quoi',   text: '% de votes « utile » sur les FAQ publiées de votre base.' },
      { label: 'Calcul', text: "votes utiles ÷ (utiles + non utiles) sur toutes les FAQ publiées. « Pas assez de votes » s'affiche sous 2 votes au total." },
      { label: 'Action', text: 'en dessous de 70 %, ouvrez les FAQ, triez-les par taux de votes utiles croissant et réécrivez celles qui sont mal notées (mauvaise réponse, vocabulaire flou, manque de contexte).' },
    ],
  },
  {
    key:   'freshness',
    label: 'Fraîcheur',
    hint:  'Articles modifiés depuis moins de 6 mois',
    tooltip: [
      { label: 'Quoi',   text: '% des articles publiés actifs mis à jour dans les 6 derniers mois, pondéré par leur nombre de vues. Concerne uniquement les articles (ni les FAQ ni les processus).' },
      { label: 'Calcul', text: 'pour chaque article publié actif, poids = 1 + nombre de vues sur 30 jours (un article populaire compte plus). Score = poids des articles récents (modifiés depuis moins de 6 mois) ÷ poids total.' },
      { label: 'Action', text: "si le score est bas, ouvrez l'écran Analyse, carte « Articles à vérifier », et révisez d'abord les articles très consultés qui n'ont pas été mis à jour récemment." },
    ],
  },
  {
    key:   'activation',
    label: 'Utilisation',
    hint:  'Membres actifs sur 30 jours',
    tooltip: [
      { label: 'Quoi',   text: '% des membres (conseillers, managers, administrateurs) qui ont utilisé KnowDesk dans les 30 derniers jours.' },
      { label: 'Calcul', text: "membres ayant consulté au moins 1 article ou lancé au moins 1 recherche dans la barre Cmd+K sur 30 jours, sur le total des membres actifs de l'organisation." },
      { label: 'Action', text: "si le score est bas, faites une démonstration de Cmd+K en réunion d'équipe et repérez les sujets manquants : les membres reviennent quand ils trouvent leurs réponses." },
    ],
  },
  {
    key:   'clarity',
    label: 'Clarté',
    hint:  'Articles de 200 à 2 000 mots',
    tooltip: [
      { label: 'Quoi',   text: '% des articles publiés actifs dont la longueur reste lisible (200 à 2 000 mots). Concerne uniquement les articles.' },
      { label: 'Calcul', text: "pour chaque article publié actif, on compte les mots du contenu (mise en forme retirée). Les articles trop courts (moins de 200 mots, sans doute incomplets) ou trop longs (plus de 2 000 mots, rarement lus jusqu'au bout) sortent du score." },
      { label: 'Action', text: 'si le score est bas, ouvrez la liste des articles, repérez les très courts (à enrichir avec un exemple ou une procédure complète) et les très longs (à découper en plusieurs articles plus ciblés).' },
    ],
  },
];

function dimTone(score: number | null): string {
  if (score === null) return 'na';
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 50) return 'warning';
  return 'critical';
}

export function KbScoreCard() {
  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData]       = useState<KbScoreResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    kbscoreApi.get()
      .then(r => { if (alive) setData(r); })
      .catch(err => { if (alive) toast.error((err as Error).message ?? "Le score de santé de la base n'a pas pu être calculé. Rechargez la page."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [toast]);

  if (loading) {
    return (
      <section className="kbscore">
        <Skeleton className="kbscore__skel-title" />
        <Skeleton className="kbscore__skel-body" />
      </section>
    );
  }
  if (!data) return null;

  const band = BAND_LABEL[data.band];

  return (
    <section className="kbscore" aria-label="Santé de la base">
      <header className="kbscore__header">
        <div className="kbscore__title-block">
          <h2 className="kbscore__title">
            Santé de la base
            <InfoTooltip
              title="Score de santé de la base"
              rows={[
                { label: 'Quoi',    text: 'note sur 100 qui reflète la santé éditoriale globale de votre base de connaissance.' },
                { label: 'Calcul',  text: 'moyenne pondérée des 5 dimensions ci-dessous (Couverture 30 %, Satisfaction FAQ 25 %, Fraîcheur 20 %, Utilisation 15 %, Clarté 10 %). Une dimension marquée « — » (volume insuffisant) est exclue, et son poids est réparti automatiquement sur les autres.' },
                { label: 'Niveaux', text: 'moins de 50 : Critique · 50 à 74 : À améliorer · 75 à 89 : Bon · 90 et plus : Excellent.' },
                { label: 'Action',  text: "visez 75 ou plus. Commencez par les 3 actions prioritaires affichées ci-dessous : chacune indique son impact estimé en points." },
              ]}
            />
          </h2>
          <p className="kbscore__subtitle">
            Mesure de la santé globale de votre base sur les <strong>{data.windowDays} derniers jours</strong>.
            5 dimensions, combinées en un score pondéré.
          </p>
        </div>
        <div className={`kbscore__hero kbscore__hero--${data.band}`}>
          <div className="kbscore__hero-num">{data.globalScore}</div>
          <div className="kbscore__hero-meta">
            <div className="kbscore__hero-label">/ 100</div>
            <div className={`kbscore__band kbscore__band--${band.tone}`}>{band.label}</div>
          </div>
        </div>
      </header>

      <div className="kbscore__dims" role="list">
        {DIM_META.map(meta => {
          const dim = data.dimensions[meta.key] as DimensionScore;
          const tone = dimTone(dim.score);
          return (
            <div key={meta.key} className={`kbscore__dim kbscore__dim--${tone}`} role="listitem">
              <div className="kbscore__dim-top">
                <span className="kbscore__dim-label">
                  {meta.label}
                  {meta.tooltip && <InfoTooltip title={meta.label} rows={meta.tooltip} />}
                </span>
                <span className="kbscore__dim-score">
                  {dim.score === null ? '—' : `${dim.score}`}
                </span>
              </div>
              <div className="kbscore__dim-bar" aria-hidden="true">
                <div
                  className={`kbscore__dim-bar-fill kbscore__dim-bar-fill--${tone}`}
                  style={{ width: dim.score === null ? '0%' : `${dim.score}%` }}
                />
              </div>
              <div className="kbscore__dim-detail">{dim.detail}</div>
              <div className="kbscore__dim-hint">{meta.hint}</div>
            </div>
          );
        })}
      </div>

      {data.recommendations.length > 0 && (
        <div className="kbscore__recos">
          <h3 className="kbscore__recos-title">{data.recommendations.length} action{data.recommendations.length > 1 ? 's' : ''} prioritaire{data.recommendations.length > 1 ? 's' : ''} cette semaine</h3>
          <ul className="kbscore__recos-list" role="list">
            {data.recommendations.map(reco => (
              <li key={reco.id} className="kbscore__reco">
                <button
                  type="button"
                  className="kbscore__reco-btn"
                  onClick={() => reco.link && navigate(reco.link)}
                  disabled={!reco.link}
                >
                  <span className="kbscore__reco-text">{reco.text}</span>
                  <span className="kbscore__reco-impact" title="Impact estimé sur le score global">
                    +{reco.impactPts} pts
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

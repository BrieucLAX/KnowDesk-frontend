import { describe, it, expect } from 'vitest';
import { CHART_SERIES, chartSeriesStyle } from './chartColors';

describe('chartSeriesStyle', () => {
  it('donne les 5 couleurs en trait plein, dans l’ordre', () => {
    expect([0, 1, 2, 3, 4].map(i => chartSeriesStyle(i))).toEqual(
      CHART_SERIES.map(color => ({ color, dash: undefined })),
    );
  });

  it('reprend les mêmes couleurs en pointillés de 6 à 10, puis en tirets', () => {
    expect(chartSeriesStyle(5)).toEqual({ color: CHART_SERIES[0], dash: '2 4' });
    expect(chartSeriesStyle(9)).toEqual({ color: CHART_SERIES[4], dash: '2 4' });
    expect(chartSeriesStyle(10)).toEqual({ color: CHART_SERIES[0], dash: '8 4' });
  });

  it('n’introduit aucune couleur hors de la palette', () => {
    for (let i = 0; i < 30; i++) expect(CHART_SERIES).toContain(chartSeriesStyle(i).color);
  });

  it('n’emploie pas la prune, réservée à ce que KnowDesk a préparé', () => {
    expect(CHART_SERIES).not.toContain('var(--accent)');
  });
});

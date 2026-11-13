import { describe, it, expect } from 'vitest';
import { CHART_SERIES, chartSeriesStyle } from './chartColors';

describe('chartSeriesStyle', () => {
  it('donne les 6 couleurs en trait plein, dans l’ordre', () => {
    expect([0, 1, 2, 3, 4, 5].map(i => chartSeriesStyle(i))).toEqual(
      CHART_SERIES.map(color => ({ color, dash: undefined })),
    );
  });

  it('reprend les mêmes couleurs en pointillés de 7 à 12, puis en tirets', () => {
    expect(chartSeriesStyle(6)).toEqual({ color: CHART_SERIES[0], dash: '2 4' });
    expect(chartSeriesStyle(11)).toEqual({ color: CHART_SERIES[5], dash: '2 4' });
    expect(chartSeriesStyle(12)).toEqual({ color: CHART_SERIES[0], dash: '8 4' });
  });

  it('n’introduit aucune couleur hors de la palette', () => {
    for (let i = 0; i < 30; i++) expect(CHART_SERIES).toContain(chartSeriesStyle(i).color);
  });
});

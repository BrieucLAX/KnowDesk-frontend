import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { mockViewportWidth } from '../../../test/matchMedia';

vi.mock('../api/brandMonitoringApi', () => ({
  brandMonitoringApi: {
    timeline: vi.fn(() => Promise.resolve({
      bucket: 'week',
      series: [
        { bucket: '2026-10-05', byBrand: [{ brandId: 'b1', brandName: 'Démo Mobile', isOwner: true, pct: 16.8 }] },
        { bucket: '2026-10-12', byBrand: [{ brandId: 'b1', brandName: 'Démo Mobile', isOwner: true, pct: 18.2 }] },
      ],
    })),
  },
}));

import { TimelineChart } from './TimelineChart';

let restore: () => void = () => {};
afterEach(() => restore());

const chartHeight = async (container: HTMLElement) => {
  let el: HTMLElement | null = null;
  await waitFor(() => {
    el = container.querySelector<HTMLElement>('.recharts-responsive-container');
    expect(el).not.toBeNull();
  });
  return (el as unknown as HTMLElement).style.height;
};

describe('TimelineChart — hauteur selon la largeur', () => {
  it('768 px et au-dessus : 320 px', async () => {
    restore = mockViewportWidth(1280);
    const { container } = render(<TimelineChart projectId="p1" />);
    expect(await chartHeight(container)).toBe('320px');
  });

  it('sous 768 px : 380 px, la légende passe sous le graphique sans écraser le tracé', async () => {
    restore = mockViewportWidth(390);
    const { container } = render(<TimelineChart projectId="p1" />);
    expect(await chartHeight(container)).toBe('380px');
  });
});

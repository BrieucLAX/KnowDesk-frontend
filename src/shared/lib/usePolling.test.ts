import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePolling } from './usePolling';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('usePolling', () => {
  it('appelle le rappel à chaque intervalle tant qu\'il est actif, puis s\'arrête', async () => {
    const cb = vi.fn();
    const { rerender } = renderHook(({ active }) => usePolling(cb, 5000, active), { initialProps: { active: true } });

    expect(cb).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(cb).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(cb).toHaveBeenCalledTimes(3);

    rerender({ active: false });
    await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
    expect(cb).toHaveBeenCalledTimes(3);
  });

  it('s\'arrête au démontage', async () => {
    const cb = vi.fn();
    const { unmount } = renderHook(() => usePolling(cb, 1000, true));
    unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(cb).not.toHaveBeenCalled();
  });

  it('saute un tick tant que l\'appel précédent n\'est pas terminé', async () => {
    let resolve: () => void = () => {};
    const cb = vi.fn(() => new Promise<void>(r => { resolve = r; }));
    renderHook(() => usePolling(cb, 1000, true));

    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(cb).toHaveBeenCalledTimes(1);
    await act(async () => { resolve(); await vi.advanceTimersByTimeAsync(1000); });
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('utilise le dernier rappel sans recréer l\'intervalle, et survit à une erreur', async () => {
    const first = vi.fn(() => { throw new Error('réseau'); });
    const second = vi.fn();
    const { rerender } = renderHook(({ cb }) => usePolling(cb, 1000, true), { initialProps: { cb: first as () => unknown } });

    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    rerender({ cb: second });
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });
});

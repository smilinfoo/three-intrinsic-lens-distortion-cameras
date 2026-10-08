import { describe, expect, it } from 'vitest';
import { measureProbes, summarizeProbes } from '../src/demo/measure';

const W = 40;
const H = 30;

/** RGBA buffer in GL order (row 0 = bottom) with a filled square of `color`. */
function bufferWithSquare(cx: number, cy: number, half: number, color: [number, number, number]) {
  const pixels = new Uint8Array(W * H * 4);
  for (let y = Math.round(cy - half); y < Math.round(cy + half); y++) {
    for (let x = Math.round(cx - half); x < Math.round(cx + half); x++) {
      const i = ((H - 1 - y) * W + x) * 4;
      pixels.set([...color, 255], i);
    }
  }
  return pixels;
}

describe('measureProbes', () => {
  it('finds the centroid of a flat-coloured square in top-left-origin coordinates', () => {
    const pixels = bufferWithSquare(20, 10, 2, [0, 255, 0]);
    const [m] = measureProbes(pixels, W, H, [[20.2, 10.1]], { color: [0, 255, 0] });
    expect(m!.found![0]).toBeCloseTo(20, 5);
    expect(m!.found![1]).toBeCloseTo(10, 5);
    expect(m!.error).toBeLessThan(0.3);
  });

  it('reports missing probes as Infinity error', () => {
    const [m] = measureProbes(new Uint8Array(W * H * 4), W, H, [[20, 10]], { color: [0, 255, 0] });
    expect(m!.found).toBeNull();
    expect(m!.error).toBe(Number.POSITIVE_INFINITY);
  });

  it('ignores pixels of other colours', () => {
    const pixels = bufferWithSquare(20, 10, 2, [255, 0, 0]);
    const [m] = measureProbes(pixels, W, H, [[20, 10]], { color: [0, 255, 0] });
    expect(m!.found).toBeNull();
  });

  it('summarizes max/mean error and missing count', () => {
    const summary = summarizeProbes([
      { expected: [0, 0], found: [1, 0], error: 1 },
      { expected: [0, 0], found: [3, 0], error: 3 },
      { expected: [0, 0], found: null, error: Number.POSITIVE_INFINITY },
    ]);
    expect(summary).toEqual({ count: 3, missing: 1, maxError: 3, meanError: 2 });
  });
});

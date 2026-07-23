import { describe, expect, it } from 'vitest';
import {
  distortedNormalizedToPixel,
  pixelToDistortedNormalized,
} from '../../src/projection/intrinsics';
import { applyIntrinsics } from '../../src/projection/pinhole';
import { cameraMatrixFromArray } from '../../src/types';

const INTRINSICS = cameraMatrixFromArray([
  [800, 0, 320],
  [0, 800, 240],
  [0, 0, 1],
]);

describe('pixelToDistortedNormalized', () => {
  it('maps principal point to origin', () => {
    expect(pixelToDistortedNormalized([320, 240], INTRINSICS)).toEqual([0, 0]);
  });

  it('maps offset pixel to normalized coordinate', () => {
    expect(pixelToDistortedNormalized([400, 240], INTRINSICS)).toEqual([0.1, 0]);
    expect(pixelToDistortedNormalized([320, 320], INTRINSICS)).toEqual([0, 0.1]);
  });
});

describe('distortedNormalizedToPixel', () => {
  it('round-trips with pixelToDistortedNormalized', () => {
    const pixels: [number, number][] = [
      [320, 240],
      [400, 280],
      [100, 50],
    ];
    for (const pixel of pixels) {
      const normalized = pixelToDistortedNormalized(pixel, INTRINSICS);
      const roundTrip = distortedNormalizedToPixel(normalized, INTRINSICS);
      expect(roundTrip[0]).toBeCloseTo(pixel[0], 10);
      expect(roundTrip[1]).toBeCloseTo(pixel[1], 10);
    }
  });

  it('round-trips with applyIntrinsics', () => {
    const normalized: [number, number] = [0.12, -0.08];
    const pixel = applyIntrinsics(normalized, INTRINSICS);
    expect(pixelToDistortedNormalized(pixel, INTRINSICS)).toEqual(normalized);
  });
});

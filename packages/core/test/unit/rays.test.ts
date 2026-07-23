import { describe, expect, it } from 'vitest';
import {
  cameraMatrixFromArray,
  normalizedToCameraRay,
  pixelToCameraRayPinhole,
} from '../../src/index';

const INTRINSICS = cameraMatrixFromArray([
  [800, 0, 320],
  [0, 800, 240],
  [0, 0, 1],
]);

describe('normalizedToCameraRay', () => {
  it('returns optical axis for origin on normalized plane', () => {
    const ray = normalizedToCameraRay([0, 0]);
    expect(ray[0]).toBeCloseTo(0, 10);
    expect(ray[1]).toBeCloseTo(0, 10);
    expect(ray[2]).toBeCloseTo(1, 10);
  });

  it('returns a unit vector', () => {
    const ray = normalizedToCameraRay([0.2, -0.1]);
    expect(Math.hypot(ray[0], ray[1], ray[2])).toBeCloseTo(1, 10);
  });

  it('has positive Z for forward-facing directions', () => {
    const ray = normalizedToCameraRay([0.2, -0.1]);
    expect(ray[2]).toBeGreaterThan(0);
  });
});

describe('pixelToCameraRayPinhole', () => {
  it('maps principal point to optical axis', () => {
    const ray = pixelToCameraRayPinhole([320, 240], INTRINSICS);
    expect(ray[0]).toBeCloseTo(0, 10);
    expect(ray[1]).toBeCloseTo(0, 10);
    expect(ray[2]).toBeCloseTo(1, 10);
  });

  it('returns a unit vector', () => {
    const ray = pixelToCameraRayPinhole([400, 200], INTRINSICS);
    expect(Math.hypot(ray[0], ray[1], ray[2])).toBeCloseTo(1, 10);
  });
});

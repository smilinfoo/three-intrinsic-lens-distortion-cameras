import { expect } from 'vitest';
import type { Vec3 } from '../../src/types';

/** Assert unit ray d̂ is parallel to point P (same sight line, Z > 0 hemisphere). */
export function expectRayParallelToPoint(
  ray: Vec3,
  point: Vec3,
  tolerance = 1e-5,
): void {
  const len = Math.hypot(point[0], point[1], point[2]);
  const ux = point[0] / len;
  const uy = point[1] / len;
  const uz = point[2] / len;

  const cx = ray[1] * uz - ray[2] * uy;
  const cy = ray[2] * ux - ray[0] * uz;
  const cz = ray[0] * uy - ray[1] * ux;
  expect(Math.hypot(cx, cy, cz)).toBeLessThanOrEqual(tolerance);

  expect(ray[0] * ux + ray[1] * uy + ray[2] * uz).toBeGreaterThanOrEqual(1 - tolerance);
}

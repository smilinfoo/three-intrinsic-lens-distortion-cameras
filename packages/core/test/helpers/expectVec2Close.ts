import { expect } from 'vitest';
import type { Tolerance, Vec2 } from '../../src/types';

export function expectVec2Close(actual: Vec2, expected: readonly number[], tolerance: Tolerance): void {
  const absTol = tolerance.abs;
  expect(Math.abs(actual[0] - expected[0])).toBeLessThanOrEqual(absTol);
  expect(Math.abs(actual[1] - expected[1])).toBeLessThanOrEqual(absTol);
}

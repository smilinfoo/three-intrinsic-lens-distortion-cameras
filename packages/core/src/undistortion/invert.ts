import type { Vec2 } from '../types';

const DEFAULT_MAX_ITERATIONS = 20;
const DEFAULT_EPSILON = 1e-10;

/** Fixed-point inverse: find normalized (x,y) such that forward(x,y) ≈ distorted. */
export function invertByFixedPoint(
  distorted: Vec2,
  forward: (normalized: Vec2) => Vec2,
  maxIterations = DEFAULT_MAX_ITERATIONS,
  epsilon = DEFAULT_EPSILON,
): Vec2 {
  let x = distorted[0];
  let y = distorted[1];

  for (let i = 0; i < maxIterations; i++) {
    const [xd, yd] = forward([x, y]);
    const ex = distorted[0] - xd;
    const ey = distorted[1] - yd;
    if (ex * ex + ey * ey <= epsilon * epsilon) {
      return [x, y];
    }
    x += ex;
    y += ey;
  }

  return [x, y];
}

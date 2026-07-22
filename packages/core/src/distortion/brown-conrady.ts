import type { BrownConradyCoeffs, CameraMatrix, Vec2, Vec3 } from '../types';
import { applyIntrinsics, normalizeToImagePlane } from '../projection/pinhole';

/** Forward Brown-Conrady (plumb bob) distortion on the normalized image plane. */
export function distortBrownConrady(normalized: Vec2, coeffs: BrownConradyCoeffs): Vec2 {
  const [x, y] = normalized;
  const r2 = x * x + y * y;
  const r4 = r2 * r2;
  const r6 = r4 * r2;
  const radial = 1 + coeffs.k1 * r2 + coeffs.k2 * r4 + coeffs.k3 * r6;

  const xDist =
    x * radial + 2 * coeffs.p1 * x * y + coeffs.p2 * (r2 + 2 * x * x);
  const yDist =
    y * radial + coeffs.p1 * (r2 + 2 * y * y) + 2 * coeffs.p2 * x * y;

  return [xDist, yDist];
}

/** Project a 3D point with Brown-Conrady distortion: normalize → distort → apply K. */
export function projectBrownConrady(
  point: Vec3,
  intrinsics: CameraMatrix,
  coeffs: BrownConradyCoeffs,
): Vec2 {
  return applyIntrinsics(
    distortBrownConrady(normalizeToImagePlane(point), coeffs),
    intrinsics,
  );
}

/** Batch Brown-Conrady projection. */
export function projectBrownConradyPoints(
  points: readonly Vec3[],
  intrinsics: CameraMatrix,
  coeffs: BrownConradyCoeffs,
): Vec2[] {
  return points.map((point) => projectBrownConrady(point, intrinsics, coeffs));
}

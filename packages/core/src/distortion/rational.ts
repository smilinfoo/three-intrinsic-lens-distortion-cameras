import type { RationalCoeffs, CameraMatrix, Vec2, Vec3 } from '../types';
import { applyIntrinsics, normalizeToImagePlane } from '../projection/pinhole';

/** Forward rational polynomial distortion on the normalized image plane. */
export function distortRational(normalized: Vec2, coeffs: RationalCoeffs): Vec2 {
  const [x, y] = normalized;
  const r2 = x * x + y * y;
  const r4 = r2 * r2;
  const r6 = r4 * r2;
  const numerator = 1 + coeffs.k1 * r2 + coeffs.k2 * r4 + coeffs.k3 * r6;
  const denominator = 1 + coeffs.k4 * r2 + coeffs.k5 * r4 + coeffs.k6 * r6;
  const radial = numerator / denominator;

  const xDist =
    x * radial + 2 * coeffs.p1 * x * y + coeffs.p2 * (r2 + 2 * x * x);
  const yDist =
    y * radial + coeffs.p1 * (r2 + 2 * y * y) + 2 * coeffs.p2 * x * y;

  return [xDist, yDist];
}

/** Project a 3D point with rational distortion: normalize → distort → apply K. */
export function projectRational(
  point: Vec3,
  intrinsics: CameraMatrix,
  coeffs: RationalCoeffs,
): Vec2 {
  return applyIntrinsics(
    distortRational(normalizeToImagePlane(point), coeffs),
    intrinsics,
  );
}

/** Batch rational projection. */
export function projectRationalPoints(
  points: readonly Vec3[],
  intrinsics: CameraMatrix,
  coeffs: RationalCoeffs,
): Vec2[] {
  return points.map((point) => projectRational(point, intrinsics, coeffs));
}

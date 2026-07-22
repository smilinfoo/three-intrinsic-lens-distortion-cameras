import type { FisheyeCoeffs, CameraMatrix, Vec2, Vec3 } from '../types';
import { applyIntrinsics, normalizeToImagePlane } from '../projection/pinhole';

const AXIS_EPSILON = 1e-12;

/** Forward OpenCV fisheye distortion on normalized plane coordinates (a, b) = (X/Z, Y/Z). */
export function distortFisheye(normalized: Vec2, coeffs: FisheyeCoeffs): Vec2 {
  const [a, b] = normalized;
  const r2 = a * a + b * b;
  if (r2 <= AXIS_EPSILON * AXIS_EPSILON) {
    return [0, 0];
  }

  const r = Math.sqrt(r2);
  const theta = Math.atan(r);
  const theta2 = theta * theta;
  const theta4 = theta2 * theta2;
  const theta6 = theta4 * theta2;
  const theta8 = theta4 * theta4;
  const thetaD =
    theta *
    (1 +
      coeffs.k1 * theta2 +
      coeffs.k2 * theta4 +
      coeffs.k3 * theta6 +
      coeffs.k4 * theta8);

  const scale = thetaD / r;
  return [scale * a, scale * b];
}

/** Project a 3D point with OpenCV fisheye model: normalize → distort → apply K (alpha = 0). */
export function projectFisheye(
  point: Vec3,
  intrinsics: CameraMatrix,
  coeffs: FisheyeCoeffs,
): Vec2 {
  return applyIntrinsics(
    distortFisheye(normalizeToImagePlane(point), coeffs),
    intrinsics,
  );
}

/** Batch fisheye projection. */
export function projectFisheyePoints(
  points: readonly Vec3[],
  intrinsics: CameraMatrix,
  coeffs: FisheyeCoeffs,
): Vec2[] {
  return points.map((point) => projectFisheye(point, intrinsics, coeffs));
}

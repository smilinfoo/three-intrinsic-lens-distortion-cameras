import type { FisheyeCoeffs, Vec2 } from '../types';
import { distortFisheye } from '../distortion/fisheye';
import { invertByFixedPoint } from './invert';

const AXIS_EPSILON = 1e-12;

/** Inverse OpenCV fisheye distortion on the normalized image plane. */
export function undistortFisheye(distorted: Vec2, coeffs: FisheyeCoeffs): Vec2 {
  const r2 = distorted[0] * distorted[0] + distorted[1] * distorted[1];
  if (r2 <= AXIS_EPSILON * AXIS_EPSILON) {
    return [0, 0];
  }
  return invertByFixedPoint(distorted, (normalized) =>
    distortFisheye(normalized, coeffs),
  );
}

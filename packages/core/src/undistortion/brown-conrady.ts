import type { BrownConradyCoeffs, Vec2 } from '../types';
import { distortBrownConrady } from '../distortion/brown-conrady';
import { invertByFixedPoint } from './invert';

function isZeroBrownConrady(coeffs: BrownConradyCoeffs): boolean {
  return (
    coeffs.k1 === 0 &&
    coeffs.k2 === 0 &&
    coeffs.k3 === 0 &&
    coeffs.p1 === 0 &&
    coeffs.p2 === 0
  );
}

/** Inverse Brown-Conrady (plumb bob) on the normalized image plane. */
export function undistortBrownConrady(
  distorted: Vec2,
  coeffs: BrownConradyCoeffs,
): Vec2 {
  if (isZeroBrownConrady(coeffs)) {
    return [distorted[0], distorted[1]];
  }
  return invertByFixedPoint(distorted, (normalized) =>
    distortBrownConrady(normalized, coeffs),
  );
}

import type { RationalCoeffs, Vec2 } from '../types';
import { distortRational } from '../distortion/rational';
import { invertByFixedPoint } from './invert';

function isZeroRational(coeffs: RationalCoeffs): boolean {
  return (
    coeffs.k1 === 0 &&
    coeffs.k2 === 0 &&
    coeffs.k3 === 0 &&
    coeffs.k4 === 0 &&
    coeffs.k5 === 0 &&
    coeffs.k6 === 0 &&
    coeffs.p1 === 0 &&
    coeffs.p2 === 0
  );
}

/** Inverse rational polynomial distortion on the normalized image plane. */
export function undistortRational(distorted: Vec2, coeffs: RationalCoeffs): Vec2 {
  if (isZeroRational(coeffs)) {
    return [distorted[0], distorted[1]];
  }
  return invertByFixedPoint(distorted, (normalized) =>
    distortRational(normalized, coeffs),
  );
}

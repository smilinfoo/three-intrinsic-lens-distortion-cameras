import type { Vec2 } from '../types';

/** Pinhole has no distortion: distorted normalized equals undistorted normalized. */
export function undistortPinhole(distorted: Vec2): Vec2 {
  return [distorted[0], distorted[1]];
}

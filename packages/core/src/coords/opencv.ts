import type { Vec3 } from '../types';

/** A point is in front of an OpenCV camera when Z > 0. */
export function isInFrontOfOpenCvCamera(point: Vec3): boolean {
  return point[2] > 0;
}

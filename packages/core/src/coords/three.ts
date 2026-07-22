import type { Vec3 } from '../types';

/**
 * Convert a point from OpenCV camera coordinates to Three.js camera coordinates.
 * S = diag(1, -1, -1) — 180° rotation about X.
 */
export function opencvCameraToThreeJs(point: Vec3): Vec3 {
  const [x, y, z] = point;
  return [x, -y, -z];
}

/**
 * Convert a point from Three.js camera coordinates to OpenCV camera coordinates.
 * S is self-inverse.
 */
export function threeJsCameraToOpenCv(point: Vec3): Vec3 {
  return opencvCameraToThreeJs(point);
}

/** A point is in front of a Three.js camera when Z < 0. */
export function isInFrontOfThreeJsCamera(point: Vec3): boolean {
  return point[2] < 0;
}

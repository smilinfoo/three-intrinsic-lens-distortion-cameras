import type { CameraMatrix, Vec2, Vec3 } from '../types';

/** Project a 3D point (OpenCV camera frame) onto the normalized image plane. */
export function normalizeToImagePlane(point: Vec3): Vec2 {
  const [x, y, z] = point;
  return [x / z, y / z];
}

/** Apply intrinsics K to normalized-plane coordinates. */
export function applyIntrinsics(normalized: Vec2, intrinsics: CameraMatrix): Vec2 {
  const [x, y] = normalized;
  return [
    intrinsics.fx * x + intrinsics.cx,
    intrinsics.fy * y + intrinsics.cy,
  ];
}

/** Pinhole projection: OpenCV camera-frame 3D point → pixel (u, v). No distortion. */
export function projectPinhole(point: Vec3, intrinsics: CameraMatrix): Vec2 {
  return applyIntrinsics(normalizeToImagePlane(point), intrinsics);
}

/** Batch pinhole projection. */
export function projectPinholePoints(
  points: readonly Vec3[],
  intrinsics: CameraMatrix,
): Vec2[] {
  return points.map((point) => projectPinhole(point, intrinsics));
}

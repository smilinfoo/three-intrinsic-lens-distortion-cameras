import type { CameraMatrix, Vec2 } from '../types';

/** Map pixel (u, v) to distorted normalized plane coordinates via K⁻¹. */
export function pixelToDistortedNormalized(
  pixel: Vec2,
  intrinsics: CameraMatrix,
): Vec2 {
  const [u, v] = pixel;
  return [
    (u - intrinsics.cx) / intrinsics.fx,
    (v - intrinsics.cy) / intrinsics.fy,
  ];
}

/** Map distorted normalized coordinates to pixel via K (inverse of pixelToDistortedNormalized). */
export function distortedNormalizedToPixel(
  distorted: Vec2,
  intrinsics: CameraMatrix,
): Vec2 {
  const [x, y] = distorted;
  return [
    intrinsics.fx * x + intrinsics.cx,
    intrinsics.fy * y + intrinsics.cy,
  ];
}

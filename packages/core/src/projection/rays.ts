import type {
  BrownConradyCoeffs,
  CameraMatrix,
  FisheyeCoeffs,
  RationalCoeffs,
  Vec2,
  Vec3,
} from '../types';
import { pixelToDistortedNormalized } from './intrinsics';
import { undistortBrownConrady } from '../undistortion/brown-conrady';
import { undistortFisheye } from '../undistortion/fisheye';
import { undistortPinhole } from '../undistortion/pinhole';
import { undistortRational } from '../undistortion/rational';

/** Build a unit ray in the OpenCV camera frame from undistorted normalized (x, y). */
export function normalizedToCameraRay(normalized: Vec2): Vec3 {
  const [x, y] = normalized;
  const invLen = 1 / Math.hypot(x, y, 1);
  return [x * invLen, y * invLen, invLen];
}

/** Pinhole pixel → unit camera ray (OpenCV frame: +X right, +Y down, +Z forward). */
export function pixelToCameraRayPinhole(
  pixel: Vec2,
  intrinsics: CameraMatrix,
): Vec3 {
  const distorted = pixelToDistortedNormalized(pixel, intrinsics);
  return normalizedToCameraRay(undistortPinhole(distorted));
}

/** Brown-Conrady pixel → unit camera ray. */
export function pixelToCameraRayBrownConrady(
  pixel: Vec2,
  intrinsics: CameraMatrix,
  coeffs: BrownConradyCoeffs,
): Vec3 {
  const distorted = pixelToDistortedNormalized(pixel, intrinsics);
  return normalizedToCameraRay(undistortBrownConrady(distorted, coeffs));
}

/** Rational pixel → unit camera ray. */
export function pixelToCameraRayRational(
  pixel: Vec2,
  intrinsics: CameraMatrix,
  coeffs: RationalCoeffs,
): Vec3 {
  const distorted = pixelToDistortedNormalized(pixel, intrinsics);
  return normalizedToCameraRay(undistortRational(distorted, coeffs));
}

/** Fisheye pixel → unit camera ray. */
export function pixelToCameraRayFisheye(
  pixel: Vec2,
  intrinsics: CameraMatrix,
  coeffs: FisheyeCoeffs,
): Vec3 {
  const distorted = pixelToDistortedNormalized(pixel, intrinsics);
  return normalizedToCameraRay(undistortFisheye(distorted, coeffs));
}

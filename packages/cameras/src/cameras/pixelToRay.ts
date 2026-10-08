import {
  opencvCameraToThreeJs,
  pixelToCameraRayBrownConrady,
  pixelToCameraRayFisheye,
  pixelToCameraRayPinhole,
  pixelToCameraRayRational,
  type BrownConradyCoeffs,
  type CameraMatrix,
  type FisheyeCoeffs,
  type RationalCoeffs,
  type Vec2,
  type Vec3,
} from 'intrinsic-lens-distortion';
import type { SensorCamera } from './SensorCamera';
import type { ModelId } from './types';

/** Map a sensor pixel to a unit ray in the Three.js camera frame. */
export function pixelToThreeRay(
  pixel: Vec2,
  model: ModelId,
  intrinsics: CameraMatrix,
  coeffs: {
    brownConrady?: BrownConradyCoeffs | null;
    rational?: RationalCoeffs | null;
    fisheye?: FisheyeCoeffs | null;
  },
): Vec3 {
  let opencvRay: Vec3;
  switch (model) {
    case 'pinhole':
      opencvRay = pixelToCameraRayPinhole(pixel, intrinsics);
      break;
    case 'brown-conrady':
      opencvRay = pixelToCameraRayBrownConrady(
        pixel,
        intrinsics,
        coeffs.brownConrady ?? { k1: 0, k2: 0, p1: 0, p2: 0, k3: 0 },
      );
      break;
    case 'rational':
      opencvRay = pixelToCameraRayRational(
        pixel,
        intrinsics,
        coeffs.rational ?? {
          k1: 0,
          k2: 0,
          p1: 0,
          p2: 0,
          k3: 0,
          k4: 0,
          k5: 0,
          k6: 0,
        },
      );
      break;
    case 'fisheye':
      opencvRay = pixelToCameraRayFisheye(
        pixel,
        intrinsics,
        coeffs.fisheye ?? { k1: 0, k2: 0, k3: 0, k4: 0 },
      );
      break;
    default:
      throw new Error(`Unknown model: ${model satisfies never}`);
  }

  return opencvCameraToThreeJs(opencvRay);
}

/** Map a sensor pixel to a unit ray using an active SensorCamera. */
export function pixelToThreeRayFromCamera(pixel: Vec2, camera: SensorCamera): Vec3 {
  return pixelToThreeRay(pixel, camera.model, camera.intrinsics, {
    brownConrady: camera.brownConrady,
    rational: camera.rational,
    fisheye: camera.fisheye,
  });
}

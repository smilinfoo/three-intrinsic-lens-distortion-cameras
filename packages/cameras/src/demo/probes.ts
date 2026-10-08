import {
  cameraMatrixFromArray,
  pixelToCameraRayBrownConrady,
  pixelToCameraRayFisheye,
  pixelToCameraRayPinhole,
  pixelToCameraRayRational,
  projectBrownConrady,
  projectFisheye,
  projectPinhole,
  projectRational,
  type BrownConradyCoeffs,
  type CameraMatrix,
  type FisheyeCoeffs,
  type RationalCoeffs,
  type Vec2,
  type Vec3,
} from 'intrinsic-lens-distortion';
import { SensorCamera } from '../cameras/SensorCamera';
import type { ModelId } from '../cameras/types';
import { IMAGE_HEIGHT, IMAGE_WIDTH, getModelPreset } from './modelPresets';
import { DEMO_COEFFICIENTS } from './createSensorCamera';

/** Everything needed to build a SensorCamera *and* project points on the CPU with `core`. */
export interface CameraSpec {
  readonly model: ModelId;
  readonly intrinsics: CameraMatrix;
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly brownConrady?: BrownConradyCoeffs;
  readonly rational?: RationalCoeffs;
  readonly fisheye?: FisheyeCoeffs;
}

export function presetSpec(model: ModelId): CameraSpec {
  return {
    model,
    intrinsics: getModelPreset(model).intrinsics,
    imageWidth: IMAGE_WIDTH,
    imageHeight: IMAGE_HEIGHT,
    ...DEMO_COEFFICIENTS[model],
  };
}

/** Same model as `presetSpec`, with a different K — used to prove cameras don't share state. */
export function alternateIntrinsicsSpec(model: ModelId): CameraSpec {
  return {
    ...presetSpec(model),
    intrinsics: cameraMatrixFromArray([
      [620, 0, 300],
      [0, 700, 255],
      [0, 0, 1],
    ]),
  };
}

/** Layer holding the preset probe markers (visible to preset cameras only). */
export const PRESET_PROBE_LAYER = 2;
/** Layer holding the custom-camera probe markers (visible to the custom camera only). */
export const CUSTOM_PROBE_LAYER = 3;

/** Build a SensorCamera that also sees the given probe layer (besides the default layer 0). */
export function cameraFromSpec(spec: CameraSpec, probeLayer: number = PRESET_PROBE_LAYER): SensorCamera {
  const camera = new SensorCamera({ ...spec });
  camera.layers.enable(probeLayer);
  return camera;
}

/** Unit ray in the OpenCV camera frame for a sensor pixel (inverse of {@link projectWithSpec}). */
export function pixelToCvRay(spec: CameraSpec, pixel: Vec2): Vec3 {
  switch (spec.model) {
    case 'pinhole':
      return pixelToCameraRayPinhole(pixel, spec.intrinsics);
    case 'brown-conrady':
      return pixelToCameraRayBrownConrady(pixel, spec.intrinsics, spec.brownConrady!);
    case 'rational':
      return pixelToCameraRayRational(pixel, spec.intrinsics, spec.rational!);
    case 'fisheye':
      return pixelToCameraRayFisheye(pixel, spec.intrinsics, spec.fisheye!);
    default:
      throw new Error(`Unknown model: ${spec.model satisfies never}`);
  }
}

/**
 * Probe points for an arbitrary camera: a 5×5 grid of pixels spanning 15–85 % of the image,
 * un-projected through `core` and placed at depth `z` in the OpenCV frame, so every probe is
 * inside the image for the user's intrinsics. Pixels whose ray points sideways/backwards
 * (possible for very wide fisheye) are skipped.
 */
export function probePointsForSpec(spec: CameraSpec, z: number = PROBE_Z): Vec3[] {
  const points: Vec3[] = [];
  for (const fv of [0.15, 0.325, 0.5, 0.675, 0.85]) {
    for (const fu of [0.15, 0.325, 0.5, 0.675, 0.85]) {
      const ray = pixelToCvRay(spec, [fu * spec.imageWidth, fv * spec.imageHeight]);
      if (ray[2] > 0.05) {
        const t = z / ray[2];
        points.push([ray[0] * t, ray[1] * t, z]);
      }
    }
  }
  return points;
}

/** CPU reference projection (OpenCV conventions, from `core`) of an OpenCV-frame point. */
export function projectWithSpec(spec: CameraSpec, point: Vec3): Vec2 {
  switch (spec.model) {
    case 'pinhole':
      return projectPinhole(point, spec.intrinsics);
    case 'brown-conrady':
      return projectBrownConrady(point, spec.intrinsics, spec.brownConrady!);
    case 'rational':
      return projectRational(point, spec.intrinsics, spec.rational!);
    case 'fisheye':
      return projectFisheye(point, spec.intrinsics, spec.fisheye!);
    default:
      throw new Error(`Unknown model: ${spec.model satisfies never}`);
  }
}

/** Probe depth in the OpenCV camera frame (metres). */
export const PROBE_Z = 2;

/**
 * Probe points in the OpenCV camera frame. Spacing (≥ 0.25 m at Z = 2 ≈ 100 px) keeps
 * neighbouring probes separable; extents stay inside the 640×480 image for every preset.
 */
export const PROBE_POINTS: readonly Vec3[] = (() => {
  const xs = [-0.7, -0.35, 0, 0.35, 0.7];
  const ys = [-0.5, -0.25, 0, 0.25, 0.5];
  const points: Vec3[] = [];
  for (const y of ys) {
    for (const x of xs) {
      points.push([x, y, PROBE_Z]);
    }
  }
  return points;
})();

import {
  brownConradyFromArray,
  cameraMatrixFromArray,
  fisheyeFromArray,
  projectBrownConrady,
  projectFisheye,
  projectPinhole,
  projectRational,
  rationalFromArray,
  type BrownConradyCoeffs,
  type CameraMatrix,
  type FisheyeCoeffs,
  type RationalCoeffs,
  type Vec2,
  type Vec3,
} from '@three-camera-intrinsics-and-distortion-lab/core';

export type ModelId = 'pinhole' | 'brown-conrady' | 'rational' | 'fisheye';

export type ProjectFn = (point: Vec3) => Vec2;

/** Virtual image size implied by fixture K (cx, cy at center of 640×480). */
export const IMAGE_WIDTH = 640;
export const IMAGE_HEIGHT = 480;

const FIXTURE_K = cameraMatrixFromArray([
  [800, 0, 320],
  [0, 800, 240],
  [0, 0, 1],
]);

const ZERO_BROWN: BrownConradyCoeffs = { k1: 0, k2: 0, p1: 0, p2: 0, k3: 0 };
const BROWN_BASIC = brownConradyFromArray([-0.2, 0.05, 0.001, -0.001, 0.001]);
const RATIONAL_BASIC = rationalFromArray([
  -0.2, 0.05, 0.001, -0.001, 0.001, 0.01, -0.003, 0.001,
]);
const FISHEYE_ZERO: FisheyeCoeffs = { k1: 0, k2: 0, k3: 0, k4: 0 };
const FISHEYE_BASIC = fisheyeFromArray([-0.08, 0.01, -0.002, 0.0005]);

export interface ModelPreset {
  readonly id: ModelId;
  readonly label: string;
  readonly baselineLabel: string;
  readonly distortedLabel: string;
  readonly intrinsics: CameraMatrix;
  readonly showBaseline: boolean;
  baselineProject: ProjectFn;
  distortedProject: ProjectFn;
}

function pinholeProject(intrinsics: CameraMatrix): ProjectFn {
  return (point) => projectPinhole(point, intrinsics);
}

function brownConradyProject(intrinsics: CameraMatrix, coeffs: BrownConradyCoeffs): ProjectFn {
  return (point) => projectBrownConrady(point, intrinsics, coeffs);
}

function rationalProject(intrinsics: CameraMatrix, coeffs: RationalCoeffs): ProjectFn {
  return (point) => projectRational(point, intrinsics, coeffs);
}

function fisheyeProject(intrinsics: CameraMatrix, coeffs: FisheyeCoeffs): ProjectFn {
  return (point) => projectFisheye(point, intrinsics, coeffs);
}

export const MODEL_PRESETS: ModelPreset[] = [
  {
    id: 'pinhole',
    label: 'Pinhole',
    baselineLabel: 'Linear',
    distortedLabel: 'Linear',
    intrinsics: FIXTURE_K,
    showBaseline: false,
    baselineProject: pinholeProject(FIXTURE_K),
    distortedProject: pinholeProject(FIXTURE_K),
  },
  {
    id: 'brown-conrady',
    label: 'Brown-Conrady',
    baselineLabel: 'Pinhole (k = 0)',
    distortedLabel: 'Distorted',
    intrinsics: FIXTURE_K,
    showBaseline: true,
    baselineProject: brownConradyProject(FIXTURE_K, ZERO_BROWN),
    distortedProject: brownConradyProject(FIXTURE_K, BROWN_BASIC),
  },
  {
    id: 'rational',
    label: 'Rational polynomial',
    baselineLabel: 'Pinhole (k = 0)',
    distortedLabel: 'Distorted',
    intrinsics: FIXTURE_K,
    showBaseline: true,
    baselineProject: pinholeProject(FIXTURE_K),
    distortedProject: rationalProject(FIXTURE_K, RATIONAL_BASIC),
  },
  {
    id: 'fisheye',
    label: 'OpenCV fisheye',
    baselineLabel: 'Equidistant (k = 0)',
    distortedLabel: 'Distorted',
    intrinsics: FIXTURE_K,
    showBaseline: true,
    baselineProject: fisheyeProject(FIXTURE_K, FISHEYE_ZERO),
    distortedProject: fisheyeProject(FIXTURE_K, FISHEYE_BASIC),
  },
];

export function getModelPreset(id: ModelId): ModelPreset {
  const preset = MODEL_PRESETS.find((p) => p.id === id);
  if (!preset) {
    throw new Error(`Unknown model: ${id}`);
  }
  return preset;
}

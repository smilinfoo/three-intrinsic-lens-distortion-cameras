import {
  brownConradyFromArray,
  fisheyeFromArray,
  rationalFromArray,
  type BrownConradyCoeffs,
  type FisheyeCoeffs,
  type RationalCoeffs,
} from 'intrinsic-lens-distortion';
import { SensorCamera, type SensorCameraOptions } from '../cameras/SensorCamera';
import { getModelPreset, IMAGE_HEIGHT, IMAGE_WIDTH, type ModelId } from './modelPresets';

const BROWN_DISTORTED = brownConradyFromArray([-0.2, 0.05, 0.001, -0.001, 0.001]);
const BROWN_ZERO = brownConradyFromArray([0, 0, 0, 0, 0]);
const RATIONAL_DISTORTED = rationalFromArray([
  -0.2, 0.05, 0.001, -0.001, 0.001, 0.01, -0.003, 0.001,
]);
const FISHEYE_ZERO = fisheyeFromArray([0, 0, 0, 0]);
const FISHEYE_DISTORTED = fisheyeFromArray([-0.08, 0.01, -0.002, 0.0005]);

/** Lab demo coefficients per model (same values the 2D projection panel uses). */
export const DEMO_COEFFICIENTS: Record<
  ModelId,
  {
    brownConrady?: BrownConradyCoeffs;
    rational?: RationalCoeffs;
    fisheye?: FisheyeCoeffs;
  }
> = {
  pinhole: {},
  'brown-conrady': { brownConrady: BROWN_DISTORTED },
  rational: { rational: RATIONAL_DISTORTED },
  fisheye: { fisheye: FISHEYE_DISTORTED },
};

export interface CreateSensorCameraOptions {
  readonly model: ModelId;
  readonly imageWidth?: number;
  readonly imageHeight?: number;
  readonly near?: number;
  readonly far?: number;
}

/** Create a sensor camera for the given distortion model preset. */
export function createSensorCamera(options: CreateSensorCameraOptions): SensorCamera {
  const preset = getModelPreset(options.model);
  const base: SensorCameraOptions = {
    model: options.model,
    intrinsics: preset.intrinsics,
    imageWidth: options.imageWidth ?? IMAGE_WIDTH,
    imageHeight: options.imageHeight ?? IMAGE_HEIGHT,
    near: options.near,
    far: options.far,
    ...DEMO_COEFFICIENTS[options.model],
  };
  return new SensorCamera(base);
}

/** Zero-distortion cameras for models that compare against a baseline. */
export function createBaselineSensorCamera(model: ModelId): SensorCamera | null {
  const intrinsics = getModelPreset(model).intrinsics;
  switch (model) {
    case 'pinhole':
      return null;
    case 'brown-conrady':
      return new SensorCamera({
        model,
        intrinsics,
        imageWidth: IMAGE_WIDTH,
        imageHeight: IMAGE_HEIGHT,
        brownConrady: BROWN_ZERO,
      });
    case 'rational':
      return createSensorCamera({ model: 'pinhole' });
    case 'fisheye':
      return new SensorCamera({
        model,
        intrinsics,
        imageWidth: IMAGE_WIDTH,
        imageHeight: IMAGE_HEIGHT,
        fisheye: FISHEYE_ZERO,
      });
    default:
      return null;
  }
}

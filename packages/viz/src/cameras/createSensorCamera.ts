import {
  brownConradyFromArray,
  fisheyeFromArray,
  rationalFromArray,
} from '@three-camera-intrinsics-and-distortion-lab/core';
import {
  getModelPreset,
  IMAGE_HEIGHT,
  IMAGE_WIDTH,
  type ModelId,
} from '../demo/modelPresets';
import { SensorCamera, type SensorCameraOptions } from './SensorCamera';

const BROWN_DISTORTED = brownConradyFromArray([-0.2, 0.05, 0.001, -0.001, 0.001]);
const BROWN_ZERO = brownConradyFromArray([0, 0, 0, 0, 0]);
const RATIONAL_DISTORTED = rationalFromArray([
  -0.2, 0.05, 0.001, -0.001, 0.001, 0.01, -0.003, 0.001,
]);
const FISHEYE_ZERO = fisheyeFromArray([0, 0, 0, 0]);
const FISHEYE_DISTORTED = fisheyeFromArray([-0.08, 0.01, -0.002, 0.0005]);

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
  const imageWidth = options.imageWidth ?? IMAGE_WIDTH;
  const imageHeight = options.imageHeight ?? IMAGE_HEIGHT;

  const base: Omit<SensorCameraOptions, 'brownConrady' | 'rational' | 'fisheye'> = {
    model: options.model,
    intrinsics: preset.intrinsics,
    imageWidth,
    imageHeight,
    near: options.near,
    far: options.far,
  };

  switch (options.model) {
    case 'pinhole':
      return new SensorCamera(base);
    case 'brown-conrady':
      return new SensorCamera({ ...base, brownConrady: BROWN_DISTORTED });
    case 'rational':
      return new SensorCamera({ ...base, rational: RATIONAL_DISTORTED });
    case 'fisheye':
      return new SensorCamera({ ...base, fisheye: FISHEYE_DISTORTED });
    default:
      throw new Error(`Unknown model: ${options.model satisfies never}`);
  }
}

/** Pinhole baseline cameras for models that compare against zero distortion. */
export function createBaselineSensorCamera(model: ModelId): SensorCamera | null {
  switch (model) {
    case 'pinhole':
      return null;
    case 'brown-conrady':
      return new SensorCamera({
        model: 'brown-conrady',
        intrinsics: getModelPreset(model).intrinsics,
        imageWidth: IMAGE_WIDTH,
        imageHeight: IMAGE_HEIGHT,
        brownConrady: BROWN_ZERO,
      });
    case 'rational':
      return createSensorCamera({ model: 'pinhole' });
    case 'fisheye':
      return new SensorCamera({
        model: 'fisheye',
        intrinsics: getModelPreset(model).intrinsics,
        imageWidth: IMAGE_WIDTH,
        imageHeight: IMAGE_HEIGHT,
        fisheye: FISHEYE_ZERO,
      });
    default:
      return null;
  }
}

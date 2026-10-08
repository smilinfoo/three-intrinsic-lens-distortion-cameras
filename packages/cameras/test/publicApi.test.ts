import {
  brownConradyFromArray,
  cameraMatrixFromArray,
  fisheyeFromArray,
  rationalFromArray,
} from 'intrinsic-lens-distortion';
import { describe, expect, it } from 'vitest';
import * as api from '../src/index';

const K = cameraMatrixFromArray([
  [800, 0, 320],
  [0, 800, 240],
  [0, 0, 1],
]);
const BASE = { intrinsics: K, imageWidth: 640, imageHeight: 480 };

describe('public entry (src/index.ts)', () => {
  it('exports exactly the documented runtime surface', () => {
    expect(Object.keys(api).sort()).toEqual(
      [
        'DistortionRenderPlugin',
        'SENSOR_CAMERA_FAR',
        'SENSOR_CAMERA_NEAR',
        'SENSOR_DISTORTION_USER_DATA_KEY',
        'SensorCamera',
        'SensorRenderer',
        'buildSensorProjectionMatrix',
        'computeSensorViewport',
        'fitRendererToSensor',
        'pixelToThreeRay',
        'pixelToThreeRayFromCamera',
      ].sort(),
    );
  });

  it('constructs every camera model from public symbols only', () => {
    const cameras = [
      new api.SensorCamera({ ...BASE, model: 'pinhole' }),
      new api.SensorCamera({
        ...BASE,
        model: 'brown-conrady',
        brownConrady: brownConradyFromArray([-0.2, 0.05, 0.001, -0.001, 0.001]),
      }),
      new api.SensorCamera({
        ...BASE,
        model: 'rational',
        rational: rationalFromArray([-0.2, 0.05, 0.001, -0.001, 0.001, 0.01, -0.003, 0.001]),
      }),
      new api.SensorCamera({
        ...BASE,
        model: 'fisheye',
        fisheye: fisheyeFromArray([-0.08, 0.01, -0.002, 0.0005]),
      }),
    ];

    expect(cameras.map((c) => c.usesDistortion())).toEqual([false, true, true, true]);
    for (const camera of cameras) {
      const ray = api.pixelToThreeRayFromCamera([320, 240], camera);
      expect(ray[2]).toBeLessThan(0); // looks down −Z in Three.js
    }
    expect(new api.SensorRenderer().plugin).toBeInstanceOf(api.DistortionRenderPlugin);
  });
});

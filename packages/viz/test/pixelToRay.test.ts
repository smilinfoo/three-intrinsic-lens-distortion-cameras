import {
  brownConradyFromArray,
  cameraMatrixFromArray,
  fisheyeFromArray,
  opencvCameraToThreeJs,
  pixelToCameraRayBrownConrady,
  pixelToCameraRayFisheye,
  pixelToCameraRayPinhole,
  pixelToCameraRayRational,
  projectBrownConrady,
  projectFisheye,
  projectPinhole,
  projectRational,
  rationalFromArray,
  vec3,
  type Vec3,
} from '@three-camera-intrinsics-and-distortion-lab/core';
import { describe, expect, it } from 'vitest';
import { createSensorCamera } from '../src/cameras/createSensorCamera';
import { pixelToThreeRay, pixelToThreeRayFromCamera } from '../src/cameras/pixelToRay';

const INTRINSICS = cameraMatrixFromArray([
  [800, 0, 320],
  [0, 800, 240],
  [0, 0, 1],
]);

const TEST_PIXELS: Array<[number, number]> = [
  [320, 240],
  [100, 200],
  [500, 400],
  [640, 0],
];

const BROWN = brownConradyFromArray([-0.2, 0.05, 0.001, -0.001, 0.001]);
const RATIONAL = rationalFromArray([
  -0.2, 0.05, 0.001, -0.001, 0.001, 0.01, -0.003, 0.001,
]);
const FISHEYE = fisheyeFromArray([-0.08, 0.01, -0.002, 0.0005]);

const TEST_POINTS = [
  vec3(0, 0, 1),
  vec3(0.1, -0.05, 1),
  vec3(-0.08, 0.12, 1.5),
];

function normalize(vec: Vec3): Vec3 {
  const length = Math.hypot(vec[0], vec[1], vec[2]);
  return [vec[0] / length, vec[1] / length, vec[2] / length];
}

function expectSameDirection(actual: Vec3, expected: Vec3): void {
  const a = normalize(actual);
  const e = normalize(expected);
  const dot = a[0] * e[0] + a[1] * e[1] + a[2] * e[2];
  expect(dot).toBeCloseTo(1, 3);
}

describe('pixelToThreeRay', () => {
  it('matches opencvCameraToThreeJs(core ray) for pinhole pixels', () => {
    for (const pixel of TEST_PIXELS) {
      const coreRay = pixelToCameraRayPinhole(pixel, INTRINSICS);
      const threeRay = pixelToThreeRay(pixel, 'pinhole', INTRINSICS, {});
      expect(threeRay).toEqual(opencvCameraToThreeJs(coreRay));
    }
  });

  it('matches opencvCameraToThreeJs(core ray) for Brown-Conrady pixels', () => {
    for (const pixel of TEST_PIXELS) {
      const coreRay = pixelToCameraRayBrownConrady(pixel, INTRINSICS, BROWN);
      const threeRay = pixelToThreeRay(pixel, 'brown-conrady', INTRINSICS, {
        brownConrady: BROWN,
      });
      expect(threeRay).toEqual(opencvCameraToThreeJs(coreRay));
    }
  });

  it('matches opencvCameraToThreeJs(core ray) for rational pixels', () => {
    for (const pixel of TEST_PIXELS) {
      const coreRay = pixelToCameraRayRational(pixel, INTRINSICS, RATIONAL);
      const threeRay = pixelToThreeRay(pixel, 'rational', INTRINSICS, {
        rational: RATIONAL,
      });
      expect(threeRay).toEqual(opencvCameraToThreeJs(coreRay));
    }
  });

  it('matches opencvCameraToThreeJs(core ray) for fisheye pixels', () => {
    for (const pixel of TEST_PIXELS) {
      const coreRay = pixelToCameraRayFisheye(pixel, INTRINSICS, FISHEYE);
      const threeRay = pixelToThreeRay(pixel, 'fisheye', INTRINSICS, {
        fisheye: FISHEYE,
      });
      expect(threeRay).toEqual(opencvCameraToThreeJs(coreRay));
    }
  });

  it('round-trips projected OpenCV points in the Three.js camera frame', () => {
    const cases = [
      {
        model: 'pinhole' as const,
        project: (point: Vec3) => projectPinhole(point, INTRINSICS),
        coeffs: {},
      },
      {
        model: 'brown-conrady' as const,
        project: (point: Vec3) => projectBrownConrady(point, INTRINSICS, BROWN),
        coeffs: { brownConrady: BROWN },
      },
      {
        model: 'rational' as const,
        project: (point: Vec3) => projectRational(point, INTRINSICS, RATIONAL),
        coeffs: { rational: RATIONAL },
      },
      {
        model: 'fisheye' as const,
        project: (point: Vec3) => projectFisheye(point, INTRINSICS, FISHEYE),
        coeffs: { fisheye: FISHEYE },
      },
    ];

    for (const { model, project, coeffs } of cases) {
      for (const point of TEST_POINTS) {
        const pixel = project(point);
        const ray = pixelToThreeRay(pixel, model, INTRINSICS, coeffs);
        expectSameDirection(ray, opencvCameraToThreeJs(point));
      }
    }
  });
});

describe('pixelToThreeRayFromCamera', () => {
  it('delegates to the active SensorCamera configuration', () => {
    const camera = createSensorCamera({ model: 'brown-conrady' });
    const pixel: [number, number] = [320, 240];

    expect(pixelToThreeRayFromCamera(pixel, camera)).toEqual(
      pixelToThreeRay(pixel, camera.model, camera.intrinsics, {
        brownConrady: camera.brownConrady,
        rational: camera.rational,
        fisheye: camera.fisheye,
      }),
    );
  });
});

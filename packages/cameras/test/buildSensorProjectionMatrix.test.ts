import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import {
  cameraMatrixFromArray,
  projectPinhole,
  vec3,
} from 'intrinsic-lens-distortion';
import { SensorCamera } from '../src/cameras/SensorCamera';
import { buildSensorProjectionMatrix } from '../src/cameras/buildSensorProjectionMatrix';

const INTRINSICS = cameraMatrixFromArray([
  [800, 0, 320],
  [0, 800, 240],
  [0, 0, 1],
]);
const WIDTH = 640;
const HEIGHT = 480;

const TEST_POINTS = [
  vec3(0, 0, 1),
  vec3(0.1, 0, 1),
  vec3(0, 0.1, 1),
  vec3(0.12, -0.08, 0.5),
  vec3(-0.05, 0.03, 2),
];

function opencvToThreeJsPoint(opencv: readonly [number, number, number]): Vector3 {
  return new Vector3(opencv[0], -opencv[1], -opencv[2]);
}

function projectedPixels(camera: SensorCamera, opencvPoint: readonly [number, number, number]) {
  const projected = opencvToThreeJsPoint(opencvPoint).project(camera);
  return {
    u: ((projected.x + 1) / 2) * WIDTH,
    v: ((1 - projected.y) / 2) * HEIGHT,
  };
}

describe('buildSensorProjectionMatrix', () => {
  it('matches core projectPinhole at standard test points', () => {
    const matrix = buildSensorProjectionMatrix(INTRINSICS, WIDTH, HEIGHT);
    const camera = new SensorCamera({
      model: 'pinhole',
      intrinsics: INTRINSICS,
      imageWidth: WIDTH,
      imageHeight: HEIGHT,
    });
    camera.projectionMatrix.copy(matrix);
    camera.projectionMatrixInverse.copy(matrix).invert();

    for (const point of TEST_POINTS) {
      const expected = projectPinhole(point, INTRINSICS);
      const actual = projectedPixels(camera, point);
      expect(actual.u).toBeCloseTo(expected[0], 4);
      expect(actual.v).toBeCloseTo(expected[1], 4);
    }
  });
});

describe('SensorCamera', () => {
  it('defaults near/far to Three.js PerspectiveCamera values', () => {
    const camera = new SensorCamera({
      model: 'pinhole',
      intrinsics: INTRINSICS,
      imageWidth: WIDTH,
      imageHeight: HEIGHT,
    });
    expect(camera.near).toBe(0.1);
    expect(camera.far).toBe(2000);
  });

  it('reports pinhole as not using distortion plugin', () => {
    const camera = new SensorCamera({
      model: 'pinhole',
      intrinsics: INTRINSICS,
      imageWidth: WIDTH,
      imageHeight: HEIGHT,
    });
    expect(camera.usesDistortion()).toBe(false);
  });
});

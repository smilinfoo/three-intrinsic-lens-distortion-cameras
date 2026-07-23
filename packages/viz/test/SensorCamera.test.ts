import {
  brownConradyFromArray,
  cameraMatrixFromArray,
  fisheyeFromArray,
  rationalFromArray,
} from '@three-camera-lab/core';
import { describe, expect, it } from 'vitest';
import { SensorCamera } from '../src/cameras/SensorCamera';

const INTRINSICS = cameraMatrixFromArray([
  [800, 0, 320],
  [0, 800, 240],
  [0, 0, 1],
]);

const BASE = {
  intrinsics: INTRINSICS,
  imageWidth: 640,
  imageHeight: 480,
};

describe('SensorCamera.usesDistortion', () => {
  it('returns false for pinhole', () => {
    const camera = new SensorCamera({ ...BASE, model: 'pinhole' });
    expect(camera.usesDistortion()).toBe(false);
  });

  it('returns true for Brown-Conrady when any coefficient is non-zero', () => {
    const camera = new SensorCamera({
      ...BASE,
      model: 'brown-conrady',
      brownConrady: brownConradyFromArray([-0.2, 0, 0, 0, 0]),
    });
    expect(camera.usesDistortion()).toBe(true);
  });

  it('returns false for Brown-Conrady with all-zero coefficients', () => {
    const camera = new SensorCamera({
      ...BASE,
      model: 'brown-conrady',
      brownConrady: brownConradyFromArray([0, 0, 0, 0, 0]),
    });
    expect(camera.usesDistortion()).toBe(false);
  });

  it('returns false for Brown-Conrady without coefficient payload', () => {
    const camera = new SensorCamera({ ...BASE, model: 'brown-conrady' });
    expect(camera.usesDistortion()).toBe(false);
  });

  it('returns true for rational when any coefficient is non-zero', () => {
    const camera = new SensorCamera({
      ...BASE,
      model: 'rational',
      rational: rationalFromArray([0, 0, 0, 0.01, 0, 0, 0, 0]),
    });
    expect(camera.usesDistortion()).toBe(true);
  });

  it('returns false for rational with all-zero coefficients', () => {
    const camera = new SensorCamera({
      ...BASE,
      model: 'rational',
      rational: rationalFromArray([0, 0, 0, 0, 0, 0, 0, 0]),
    });
    expect(camera.usesDistortion()).toBe(false);
  });

  it('returns true for fisheye even with zero coefficients', () => {
    const camera = new SensorCamera({
      ...BASE,
      model: 'fisheye',
      fisheye: fisheyeFromArray([0, 0, 0, 0]),
    });
    expect(camera.usesDistortion()).toBe(true);
  });
});

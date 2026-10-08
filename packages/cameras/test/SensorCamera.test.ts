import {
  brownConradyFromArray,
  cameraMatrixFromArray,
  fisheyeFromArray,
  rationalFromArray,
} from 'intrinsic-lens-distortion';
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

describe('SensorCamera mutation', () => {
  it('setIntrinsics refreshes the projection matrix', () => {
    const camera = new SensorCamera({ ...BASE, model: 'pinhole' });
    const before = camera.projectionMatrix.elements[0];

    camera.setIntrinsics(cameraMatrixFromArray([[1600, 0, 320], [0, 1600, 240], [0, 0, 1]]));

    expect(camera.projectionMatrix.elements[0]).toBeCloseTo(before! * 2);
    expect(camera.intrinsics.fx).toBe(1600);
  });

  it('setIntrinsics can change the image size', () => {
    const camera = new SensorCamera({ ...BASE, model: 'pinhole' });
    camera.setIntrinsics(INTRINSICS, 1280, 960);
    expect(camera.imageWidth).toBe(1280);
    expect(camera.imageHeight).toBe(960);
    expect(camera.projectionMatrix.elements[0]).toBeCloseTo((2 * 800) / 1280);
  });

  it('setCoefficients flips usesDistortion', () => {
    const camera = new SensorCamera({
      ...BASE,
      model: 'brown-conrady',
      brownConrady: brownConradyFromArray([0, 0, 0, 0, 0]),
    });
    expect(camera.usesDistortion()).toBe(false);
    camera.setCoefficients({ brownConrady: brownConradyFromArray([-0.1, 0, 0, 0, 0]) });
    expect(camera.usesDistortion()).toBe(true);
  });

  it('clone() produces an independent SensorCamera with the same state', () => {
    const camera = new SensorCamera({
      ...BASE,
      model: 'fisheye',
      fisheye: fisheyeFromArray([-0.08, 0.01, 0, 0]),
    });
    camera.position.set(1, 2, 3);
    const copy = camera.clone();

    expect(copy).not.toBe(camera);
    expect(copy).toBeInstanceOf(SensorCamera);
    expect(copy.model).toBe('fisheye');
    expect(copy.fisheye).toEqual(camera.fisheye);
    expect(copy.position.toArray()).toEqual([1, 2, 3]);
    copy.setIntrinsics(cameraMatrixFromArray([[1, 0, 0], [0, 1, 0], [0, 0, 1]]));
    expect(camera.intrinsics.fx).toBe(800);
  });
});

describe('SensorCamera mutation', () => {
  it('setIntrinsics refreshes the projection matrix', () => {
    const camera = new SensorCamera({ ...BASE, model: 'pinhole' });
    const before = camera.projectionMatrix.elements[0];

    camera.setIntrinsics(cameraMatrixFromArray([[1600, 0, 320], [0, 1600, 240], [0, 0, 1]]));

    expect(camera.projectionMatrix.elements[0]).toBeCloseTo(before! * 2);
    expect(camera.intrinsics.fx).toBe(1600);
  });

  it('setIntrinsics can change the image size', () => {
    const camera = new SensorCamera({ ...BASE, model: 'pinhole' });
    camera.setIntrinsics(INTRINSICS, 1280, 960);
    expect(camera.imageWidth).toBe(1280);
    expect(camera.imageHeight).toBe(960);
    expect(camera.projectionMatrix.elements[0]).toBeCloseTo((2 * 800) / 1280);
  });

  it('setCoefficients flips usesDistortion', () => {
    const camera = new SensorCamera({
      ...BASE,
      model: 'brown-conrady',
      brownConrady: brownConradyFromArray([0, 0, 0, 0, 0]),
    });
    expect(camera.usesDistortion()).toBe(false);
    camera.setCoefficients({ brownConrady: brownConradyFromArray([-0.1, 0, 0, 0, 0]) });
    expect(camera.usesDistortion()).toBe(true);
  });

  it('clone() produces an independent SensorCamera with the same state', () => {
    const camera = new SensorCamera({
      ...BASE,
      model: 'fisheye',
      fisheye: fisheyeFromArray([-0.08, 0.01, 0, 0]),
    });
    camera.position.set(1, 2, 3);
    const copy = camera.clone();

    expect(copy).not.toBe(camera);
    expect(copy).toBeInstanceOf(SensorCamera);
    expect(copy.model).toBe('fisheye');
    expect(copy.fisheye).toEqual(camera.fisheye);
    expect(copy.position.toArray()).toEqual([1, 2, 3]);
    copy.setIntrinsics(cameraMatrixFromArray([[1, 0, 0], [0, 1, 0], [0, 0, 1]]));
    expect(camera.intrinsics.fx).toBe(800);
  });
});

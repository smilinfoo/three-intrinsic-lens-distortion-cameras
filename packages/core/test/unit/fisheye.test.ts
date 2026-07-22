import { describe, expect, it } from 'vitest';
import { distortFisheye, projectFisheye } from '../../src/distortion/fisheye';
import { projectPinhole } from '../../src/projection/pinhole';
import {
  cameraMatrixFromArray,
  vec3,
  type FisheyeCoeffs,
} from '../../src/types';

const INTRINSICS = cameraMatrixFromArray([
  [800, 0, 320],
  [0, 800, 240],
  [0, 0, 1],
]);

const ZERO_COEFFS: FisheyeCoeffs = { k1: 0, k2: 0, k3: 0, k4: 0 };

const BASIC_COEFFS: FisheyeCoeffs = {
  k1: -0.08,
  k2: 0.01,
  k3: -0.002,
  k4: 0.0005,
};

describe('distortFisheye', () => {
  it('leaves the origin unchanged', () => {
    expect(distortFisheye([0, 0], BASIC_COEFFS)).toEqual([0, 0]);
  });

  it('applies equidistant projection when all coefficients are zero', () => {
    const a = 0.2;
    const b = -0.1;
    const r = Math.hypot(a, b);
    const theta = Math.atan(r);
    const scale = theta / r;
    expect(distortFisheye([a, b], ZERO_COEFFS)).toEqual([scale * a, scale * b]);
  });
});

describe('projectFisheye', () => {
  it('projects the optical-axis point to the principal point', () => {
    expect(projectFisheye(vec3(0, 0, 1), INTRINSICS, BASIC_COEFFS)).toEqual([
      320, 240,
    ]);
  });

  it('differs from pinhole when coefficients are zero (equidistant ≠ linear)', () => {
    const point = vec3(0.1, 0, 1);
    expect(projectFisheye(point, INTRINSICS, ZERO_COEFFS)).not.toEqual(
      projectPinhole(point, INTRINSICS),
    );
  });
});

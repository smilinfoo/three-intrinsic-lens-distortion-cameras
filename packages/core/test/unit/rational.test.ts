import { describe, expect, it } from 'vitest';
import { distortBrownConrady } from '../../src/distortion/brown-conrady';
import { distortRational, projectRational } from '../../src/distortion/rational';
import { projectPinhole } from '../../src/projection/pinhole';
import {
  brownConradyFromArray,
  cameraMatrixFromArray,
  rationalFromArray,
  vec3,
  type RationalCoeffs,
} from '../../src/types';

const INTRINSICS = cameraMatrixFromArray([
  [800, 0, 320],
  [0, 800, 240],
  [0, 0, 1],
]);

const ZERO_RATIONAL: RationalCoeffs = {
  k1: 0,
  k2: 0,
  p1: 0,
  p2: 0,
  k3: 0,
  k4: 0,
  k5: 0,
  k6: 0,
};

const BROWN_CONRADY_EQUIV = rationalFromArray([
  -0.2, 0.05, 0.001, -0.001, 0.001, 0, 0, 0,
]);

const RATIONAL_WITH_DENOM: RationalCoeffs = {
  k1: -0.2,
  k2: 0.05,
  p1: 0,
  p2: 0,
  k3: 0.001,
  k4: 0.01,
  k5: -0.003,
  k6: 0.001,
};

describe('distortRational', () => {
  it('leaves the origin unchanged', () => {
    expect(distortRational([0, 0], RATIONAL_WITH_DENOM)).toEqual([0, 0]);
  });

  it('is identity when all coefficients are zero', () => {
    expect(distortRational([0.1, 0.2], ZERO_RATIONAL)).toEqual([0.1, 0.2]);
  });

  it('matches Brown-Conrady when k4, k5, k6 are zero', () => {
    const normalized: [number, number] = [0.15, -0.08];
    const brown = brownConradyFromArray([-0.2, 0.05, 0.001, -0.001, 0.001]);
    expect(distortRational(normalized, BROWN_CONRADY_EQUIV)).toEqual(
      distortBrownConrady(normalized, brown),
    );
  });

  it('differs from Brown-Conrady when the denominator is active', () => {
    const normalized: [number, number] = [0.15, -0.08];
    const brown = brownConradyFromArray([
      RATIONAL_WITH_DENOM.k1,
      RATIONAL_WITH_DENOM.k2,
      0,
      0,
      RATIONAL_WITH_DENOM.k3,
    ]);
    const rational = distortRational(normalized, RATIONAL_WITH_DENOM);
    const brownResult = distortBrownConrady(normalized, brown);
    expect(rational).not.toEqual(brownResult);
  });
});

describe('projectRational', () => {
  it('matches pinhole when distortion is zero', () => {
    const point = vec3(0.1, -0.05, 0.5);
    expect(projectRational(point, INTRINSICS, ZERO_RATIONAL)).toEqual(
      projectPinhole(point, INTRINSICS),
    );
  });

  it('projects the optical-axis point to the principal point', () => {
    expect(projectRational(vec3(0, 0, 1), INTRINSICS, RATIONAL_WITH_DENOM)).toEqual([
      320, 240,
    ]);
  });
});

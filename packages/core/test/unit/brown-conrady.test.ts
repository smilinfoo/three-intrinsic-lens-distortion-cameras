import { describe, expect, it } from 'vitest';
import {
  distortBrownConrady,
  projectBrownConrady,
} from '../../src/distortion/brown-conrady';
import { projectPinhole } from '../../src/projection/pinhole';
import { cameraMatrixFromArray, vec3, type BrownConradyCoeffs } from '../../src/types';

const INTRINSICS = cameraMatrixFromArray([
  [800, 0, 320],
  [0, 800, 240],
  [0, 0, 1],
]);

const ZERO_COEFFS: BrownConradyCoeffs = { k1: 0, k2: 0, p1: 0, p2: 0, k3: 0 };

const BASIC_COEFFS: BrownConradyCoeffs = {
  k1: -0.2,
  k2: 0.05,
  p1: 0.001,
  p2: -0.001,
  k3: 0.001,
};

describe('distortBrownConrady', () => {
  it('leaves the origin unchanged for any coefficients', () => {
    expect(distortBrownConrady([0, 0], BASIC_COEFFS)).toEqual([0, 0]);
  });

  it('is identity when all coefficients are zero', () => {
    expect(distortBrownConrady([0.1, 0.2], ZERO_COEFFS)).toEqual([0.1, 0.2]);
  });

  it('preserves x sign when tangential terms are zero', () => {
    const radialOnly: BrownConradyCoeffs = { k1: -0.1, k2: 0.01, p1: 0, p2: 0, k3: 0 };
    const [xPos] = distortBrownConrady([0.2, 0.1], radialOnly);
    const [xNeg] = distortBrownConrady([-0.2, 0.1], radialOnly);
    expect(Math.sign(xPos)).toBe(1);
    expect(Math.sign(xNeg)).toBe(-1);
  });
});

describe('projectBrownConrady', () => {
  it('matches pinhole when distortion is zero', () => {
    const point = vec3(0.1, -0.05, 0.5);
    expect(projectBrownConrady(point, INTRINSICS, ZERO_COEFFS)).toEqual(
      projectPinhole(point, INTRINSICS),
    );
  });

  it('projects the optical-axis point to the principal point regardless of distortion', () => {
    expect(projectBrownConrady(vec3(0, 0, 1), INTRINSICS, BASIC_COEFFS)).toEqual([
      320, 240,
    ]);
  });
});

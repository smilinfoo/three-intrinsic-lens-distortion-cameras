import { describe, expect, it } from 'vitest';
import {
  applyIntrinsics,
  normalizeToImagePlane,
  projectPinhole,
} from '../../src/projection/pinhole';
import { cameraMatrixFromArray, vec3 } from '../../src/types';

const INTRINSICS = cameraMatrixFromArray([
  [800, 0, 320],
  [0, 800, 240],
  [0, 0, 1],
]);

describe('pinhole projection', () => {
  it('normalizes by Z', () => {
    expect(normalizeToImagePlane(vec3(0.2, -0.1, 2))).toEqual([0.1, -0.05]);
  });

  it('applies intrinsics to the normalized plane', () => {
    expect(applyIntrinsics([0.1, -0.05], INTRINSICS)).toEqual([400, 200]);
  });

  it('projects the optical-axis point to the principal point', () => {
    expect(projectPinhole(vec3(0, 0, 1), INTRINSICS)).toEqual([320, 240]);
  });

  it('projects a point to the right on the image', () => {
    expect(projectPinhole(vec3(0.1, 0, 1), INTRINSICS)).toEqual([400, 240]);
  });

  it('projects a point downward in the image (+Y in OpenCV camera frame)', () => {
    expect(projectPinhole(vec3(0, 0.1, 1), INTRINSICS)).toEqual([320, 320]);
  });
});

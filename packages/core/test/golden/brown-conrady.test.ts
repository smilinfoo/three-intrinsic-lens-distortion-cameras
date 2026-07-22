import { describe, expect, it } from 'vitest';
import {
  brownConradyFromArray,
  cameraMatrixFromArray,
  projectBrownConrady,
  projectPinhole,
  type BrownConradyFixture,
  vec3,
} from '../../src/index';
import { expectVec2Close } from '../helpers/expectVec2Close';
import basicFixture from '../../../../reference/fixtures/brown-conrady/basic.json';
import radialOnlyFixture from '../../../../reference/fixtures/brown-conrady/radial-only.json';
import tangentialOnlyFixture from '../../../../reference/fixtures/brown-conrady/tangential-only.json';
import zeroDistortionFixture from '../../../../reference/fixtures/brown-conrady/zero-distortion.json';
import pinholeBasicFixture from '../../../../reference/fixtures/pinhole/basic.json';

const FIXTURES: { name: string; fixture: BrownConradyFixture }[] = [
  { name: 'basic.json', fixture: basicFixture as BrownConradyFixture },
  { name: 'radial-only.json', fixture: radialOnlyFixture as BrownConradyFixture },
  { name: 'tangential-only.json', fixture: tangentialOnlyFixture as BrownConradyFixture },
  { name: 'zero-distortion.json', fixture: zeroDistortionFixture as BrownConradyFixture },
];

describe('Brown-Conrady golden tests', () => {
  it.each(FIXTURES)('matches OpenCV fixture: $name', ({ fixture }) => {
    const intrinsics = cameraMatrixFromArray(fixture.camera_matrix);
    const coeffs = brownConradyFromArray(fixture.dist_coeffs);

    expect(fixture.points_3d).toHaveLength(fixture.expected_pixels.length);

    for (let i = 0; i < fixture.points_3d.length; i++) {
      const point = fixture.points_3d[i];
      const expected = fixture.expected_pixels[i];
      const actual = projectBrownConrady(vec3(point[0], point[1], point[2]), intrinsics, coeffs);
      expectVec2Close(actual, expected, fixture.tolerance);
    }
  });

  it('zero-distortion fixture matches pinhole fixture pixel-for-pixel', () => {
    const intrinsics = cameraMatrixFromArray(zeroDistortionFixture.camera_matrix);
    const coeffs = brownConradyFromArray(zeroDistortionFixture.dist_coeffs);

    expect(coeffs).toEqual({ k1: 0, k2: 0, p1: 0, p2: 0, k3: 0 });
    expect(zeroDistortionFixture.points_3d).toEqual(pinholeBasicFixture.points_3d);
    expect(zeroDistortionFixture.expected_pixels).toEqual(pinholeBasicFixture.expected_pixels);

    for (let i = 0; i < zeroDistortionFixture.points_3d.length; i++) {
      const point = zeroDistortionFixture.points_3d[i];
      const p = vec3(point[0], point[1], point[2]);
      expect(projectBrownConrady(p, intrinsics, coeffs)).toEqual(projectPinhole(p, intrinsics));
    }
  });
});

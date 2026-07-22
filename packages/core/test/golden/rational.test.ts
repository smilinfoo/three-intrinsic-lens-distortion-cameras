import { describe, expect, it } from 'vitest';
import {
  brownConradyFromArray,
  cameraMatrixFromArray,
  projectBrownConrady,
  projectPinhole,
  projectRational,
  rationalFromArray,
  type RationalFixture,
  vec3,
} from '../../src/index';
import { expectVec2Close } from '../helpers/expectVec2Close';
import brownConradyBasic from '../../../../reference/fixtures/brown-conrady/basic.json';
import basicFixture from '../../../../reference/fixtures/rational/basic.json';
import brownConradyEquivFixture from '../../../../reference/fixtures/rational/brown-conrady-equiv.json';
import radialOnlyFixture from '../../../../reference/fixtures/rational/radial-only.json';
import zeroDistortionFixture from '../../../../reference/fixtures/rational/zero-distortion.json';
import pinholeBasic from '../../../../reference/fixtures/pinhole/basic.json';

const FIXTURES: { name: string; fixture: RationalFixture }[] = [
  { name: 'basic.json', fixture: basicFixture as RationalFixture },
  { name: 'radial-only.json', fixture: radialOnlyFixture as RationalFixture },
  {
    name: 'brown-conrady-equiv.json',
    fixture: brownConradyEquivFixture as RationalFixture,
  },
  { name: 'zero-distortion.json', fixture: zeroDistortionFixture as RationalFixture },
];

describe('rational golden tests', () => {
  it.each(FIXTURES)('matches OpenCV fixture: $name', ({ fixture }) => {
    expect(fixture.dist_coeffs).toHaveLength(8);

    const intrinsics = cameraMatrixFromArray(fixture.camera_matrix);
    const coeffs = rationalFromArray(fixture.dist_coeffs);

    for (let i = 0; i < fixture.points_3d.length; i++) {
      const point = fixture.points_3d[i];
      const expected = fixture.expected_pixels[i];
      const actual = projectRational(vec3(point[0], point[1], point[2]), intrinsics, coeffs);
      expectVec2Close(actual, expected, fixture.tolerance);
    }
  });

  it('brown-conrady-equiv fixture matches brown-conrady/basic.json', () => {
    expect(brownConradyEquivFixture.expected_pixels).toEqual(brownConradyBasic.expected_pixels);

    const intrinsics = cameraMatrixFromArray(brownConradyEquivFixture.camera_matrix);
    const rationalCoeffs = rationalFromArray(brownConradyEquivFixture.dist_coeffs);
    const brownCoeffs = brownConradyFromArray(brownConradyBasic.dist_coeffs);

    for (let i = 0; i < brownConradyEquivFixture.points_3d.length; i++) {
      const point = brownConradyEquivFixture.points_3d[i];
      const p = vec3(point[0], point[1], point[2]);
      expect(projectRational(p, intrinsics, rationalCoeffs)).toEqual(
        projectBrownConrady(p, intrinsics, brownCoeffs),
      );
    }
  });

  it('zero-distortion fixture matches pinhole/basic.json', () => {
    expect(zeroDistortionFixture.expected_pixels).toEqual(pinholeBasic.expected_pixels);

    const intrinsics = cameraMatrixFromArray(zeroDistortionFixture.camera_matrix);
    const coeffs = rationalFromArray(zeroDistortionFixture.dist_coeffs);

    for (let i = 0; i < zeroDistortionFixture.points_3d.length; i++) {
      const point = zeroDistortionFixture.points_3d[i];
      const p = vec3(point[0], point[1], point[2]);
      expect(projectRational(p, intrinsics, coeffs)).toEqual(projectPinhole(p, intrinsics));
    }
  });
});

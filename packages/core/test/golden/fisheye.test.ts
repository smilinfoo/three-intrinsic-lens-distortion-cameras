import { describe, expect, it } from 'vitest';
import {
  cameraMatrixFromArray,
  fisheyeFromArray,
  projectFisheye,
  type FisheyeFixture,
  vec3,
} from '../../src/index';
import { expectVec2Close } from '../helpers/expectVec2Close';
import basicFixture from '../../../../reference/fixtures/fisheye/basic.json';
import mildFixture from '../../../../reference/fixtures/fisheye/mild.json';
import wideAngleFixture from '../../../../reference/fixtures/fisheye/wide-angle.json';
import zeroCoeffFixture from '../../../../reference/fixtures/fisheye/zero-coeff.json';

const FIXTURES: { name: string; fixture: FisheyeFixture }[] = [
  { name: 'basic.json', fixture: basicFixture as FisheyeFixture },
  { name: 'mild.json', fixture: mildFixture as FisheyeFixture },
  { name: 'zero-coeff.json', fixture: zeroCoeffFixture as FisheyeFixture },
  { name: 'wide-angle.json', fixture: wideAngleFixture as FisheyeFixture },
];

describe('fisheye golden tests', () => {
  it.each(FIXTURES)('matches OpenCV fixture: $name', ({ fixture }) => {
    expect(fixture.dist_coeffs).toHaveLength(4);

    const intrinsics = cameraMatrixFromArray(fixture.camera_matrix);
    const coeffs = fisheyeFromArray(fixture.dist_coeffs);

    for (let i = 0; i < fixture.points_3d.length; i++) {
      const point = fixture.points_3d[i];
      const expected = fixture.expected_pixels[i];
      const actual = projectFisheye(vec3(point[0], point[1], point[2]), intrinsics, coeffs);
      expectVec2Close(actual, expected, fixture.tolerance);
    }
  });
});

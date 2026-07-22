import { describe, expect, it } from 'vitest';
import {
  cameraMatrixFromArray,
  projectPinhole,
  type PinholeFixture,
  vec3,
} from '../../src/index';
import { expectVec2Close } from '../helpers/expectVec2Close';
import basicFixture from '../../../../reference/fixtures/pinhole/basic.json';

const fixture = basicFixture as PinholeFixture;

describe('pinhole golden tests', () => {
  it('matches OpenCV fixture: basic.json', () => {
    const intrinsics = cameraMatrixFromArray(fixture.camera_matrix);

    expect(fixture.dist_coeffs.every((c) => c === 0)).toBe(true);
    expect(fixture.points_3d).toHaveLength(fixture.expected_pixels.length);

    for (let i = 0; i < fixture.points_3d.length; i++) {
      const point = fixture.points_3d[i];
      const expected = fixture.expected_pixels[i];
      const actual = projectPinhole(vec3(point[0], point[1], point[2]), intrinsics);
      expectVec2Close(actual, expected, fixture.tolerance);
    }
  });
});

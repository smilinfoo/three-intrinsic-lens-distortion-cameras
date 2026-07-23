import { describe, expect, it } from 'vitest';
import {
  brownConradyFromArray,
  cameraMatrixFromArray,
  fisheyeFromArray,
  pixelToDistortedNormalized,
  rationalFromArray,
  type UndistortFixture,
  undistortBrownConrady,
  undistortFisheye,
  undistortPinhole,
  undistortRational,
} from '../../src/index';
import { expectVec2Close } from '../helpers/expectVec2Close';
import pinholeBasic from '../../../../reference/fixtures/undistort/pinhole/basic.json';
import brownBasic from '../../../../reference/fixtures/undistort/brown-conrady/basic.json';
import brownRadial from '../../../../reference/fixtures/undistort/brown-conrady/radial-only.json';
import rationalBasic from '../../../../reference/fixtures/undistort/rational/basic.json';
import fisheyeBasic from '../../../../reference/fixtures/undistort/fisheye/basic.json';
import fisheyeMild from '../../../../reference/fixtures/undistort/fisheye/mild.json';

const FIXTURES: { name: string; fixture: UndistortFixture }[] = [
  { name: 'pinhole/basic.json', fixture: pinholeBasic as UndistortFixture },
  { name: 'brown-conrady/basic.json', fixture: brownBasic as UndistortFixture },
  { name: 'brown-conrady/radial-only.json', fixture: brownRadial as UndistortFixture },
  { name: 'rational/basic.json', fixture: rationalBasic as UndistortFixture },
  { name: 'fisheye/basic.json', fixture: fisheyeBasic as UndistortFixture },
  { name: 'fisheye/mild.json', fixture: fisheyeMild as UndistortFixture },
];

describe('undistort golden tests', () => {
  it.each(FIXTURES)('matches OpenCV fixture: $name', ({ fixture }) => {
    const intrinsics = cameraMatrixFromArray(fixture.camera_matrix);

    expect(fixture.pixels).toHaveLength(fixture.expected_normalized.length);

    for (let i = 0; i < fixture.pixels.length; i++) {
      const pixel = fixture.pixels[i];
      const expected = fixture.expected_normalized[i];
      const distorted = pixelToDistortedNormalized(
        [pixel[0], pixel[1]],
        intrinsics,
      );

      let actual;
      switch (fixture.model) {
        case 'pinhole':
          actual = undistortPinhole(distorted);
          break;
        case 'brown-conrady':
          actual = undistortBrownConrady(
            distorted,
            brownConradyFromArray(fixture.dist_coeffs),
          );
          break;
        case 'rational':
          actual = undistortRational(
            distorted,
            rationalFromArray(fixture.dist_coeffs),
          );
          break;
        case 'fisheye':
          actual = undistortFisheye(
            distorted,
            fisheyeFromArray(fixture.dist_coeffs),
          );
          break;
        default:
          throw new Error(`Unknown model: ${fixture.model}`);
      }

      expectVec2Close(actual, expected, fixture.tolerance);
    }
  });
});

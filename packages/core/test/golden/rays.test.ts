import { describe, it } from 'vitest';
import {
  brownConradyFromArray,
  cameraMatrixFromArray,
  fisheyeFromArray,
  pixelToCameraRayBrownConrady,
  pixelToCameraRayFisheye,
  pixelToCameraRayPinhole,
  pixelToCameraRayRational,
  projectBrownConrady,
  projectFisheye,
  projectPinhole,
  projectRational,
  rationalFromArray,
  type BrownConradyFixture,
  type FisheyeFixture,
  type PinholeFixture,
  type RationalFixture,
  vec3,
} from '../../src/index';
import { expectRayParallelToPoint } from '../helpers/expectRayParallel';
import pinholeBasic from '../../../../reference/fixtures/pinhole/basic.json';
import brownBasic from '../../../../reference/fixtures/brown-conrady/basic.json';
import brownRadial from '../../../../reference/fixtures/brown-conrady/radial-only.json';
import brownTangential from '../../../../reference/fixtures/brown-conrady/tangential-only.json';
import brownZero from '../../../../reference/fixtures/brown-conrady/zero-distortion.json';
import rationalBasic from '../../../../reference/fixtures/rational/basic.json';
import rationalRadial from '../../../../reference/fixtures/rational/radial-only.json';
import rationalZero from '../../../../reference/fixtures/rational/zero-distortion.json';
import fisheyeBasic from '../../../../reference/fixtures/fisheye/basic.json';
import fisheyeMild from '../../../../reference/fixtures/fisheye/mild.json';
import fisheyeZero from '../../../../reference/fixtures/fisheye/zero-coeff.json';
import fisheyeWide from '../../../../reference/fixtures/fisheye/wide-angle.json';

const RAY_TOLERANCE = 1e-5;

describe('pinhole ray round-trip', () => {
  it('matches forward projection for pinhole/basic.json', () => {
    const fixture = pinholeBasic as PinholeFixture;
    const intrinsics = cameraMatrixFromArray(fixture.camera_matrix);

    for (let i = 0; i < fixture.points_3d.length; i++) {
      const point = vec3(
        fixture.points_3d[i][0],
        fixture.points_3d[i][1],
        fixture.points_3d[i][2],
      );
      const pixel = projectPinhole(point, intrinsics);
      const ray = pixelToCameraRayPinhole(pixel, intrinsics);
      expectRayParallelToPoint(ray, point, RAY_TOLERANCE);
    }
  });
});

describe('Brown-Conrady ray round-trip', () => {
  const FIXTURES: BrownConradyFixture[] = [
    brownBasic,
    brownRadial,
    brownTangential,
    brownZero,
  ] as BrownConradyFixture[];

  it.each(FIXTURES.map((f, i) => [i, f] as const))(
    'matches forward projection for fixture %i',
    (_index, fixture) => {
      const intrinsics = cameraMatrixFromArray(fixture.camera_matrix);
      const coeffs = brownConradyFromArray(fixture.dist_coeffs);

      for (let i = 0; i < fixture.points_3d.length; i++) {
        const point = vec3(
          fixture.points_3d[i][0],
          fixture.points_3d[i][1],
          fixture.points_3d[i][2],
        );
        const pixel = projectBrownConrady(point, intrinsics, coeffs);
        const ray = pixelToCameraRayBrownConrady(pixel, intrinsics, coeffs);
        expectRayParallelToPoint(ray, point, RAY_TOLERANCE);
      }
    },
  );
});

describe('rational ray round-trip', () => {
  const FIXTURES: RationalFixture[] = [
    rationalBasic,
    rationalRadial,
    rationalZero,
  ] as RationalFixture[];

  it.each(FIXTURES.map((f, i) => [i, f] as const))(
    'matches forward projection for fixture %i',
    (_index, fixture) => {
      const intrinsics = cameraMatrixFromArray(fixture.camera_matrix);
      const coeffs = rationalFromArray(fixture.dist_coeffs);

      for (let i = 0; i < fixture.points_3d.length; i++) {
        const point = vec3(
          fixture.points_3d[i][0],
          fixture.points_3d[i][1],
          fixture.points_3d[i][2],
        );
        const pixel = projectRational(point, intrinsics, coeffs);
        const ray = pixelToCameraRayRational(pixel, intrinsics, coeffs);
        expectRayParallelToPoint(ray, point, RAY_TOLERANCE);
      }
    },
  );
});

describe('fisheye ray round-trip', () => {
  const FIXTURES: FisheyeFixture[] = [
    fisheyeBasic,
    fisheyeMild,
    fisheyeZero,
    fisheyeWide,
  ] as FisheyeFixture[];

  it.each(FIXTURES.map((f, i) => [i, f] as const))(
    'matches forward projection for fixture %i',
    (_index, fixture) => {
      const intrinsics = cameraMatrixFromArray(fixture.camera_matrix);
      const coeffs = fisheyeFromArray(fixture.dist_coeffs);

      for (let i = 0; i < fixture.points_3d.length; i++) {
        const point = vec3(
          fixture.points_3d[i][0],
          fixture.points_3d[i][1],
          fixture.points_3d[i][2],
        );
        const pixel = projectFisheye(point, intrinsics, coeffs);
        const ray = pixelToCameraRayFisheye(pixel, intrinsics, coeffs);
        expectRayParallelToPoint(ray, point, RAY_TOLERANCE);
      }
    },
  );
});

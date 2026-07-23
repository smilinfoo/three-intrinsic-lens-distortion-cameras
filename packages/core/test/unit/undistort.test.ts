import { describe, expect, it } from 'vitest';
import { distortBrownConrady } from '../../src/distortion/brown-conrady';
import { distortFisheye } from '../../src/distortion/fisheye';
import { distortRational } from '../../src/distortion/rational';
import { undistortBrownConrady } from '../../src/undistortion/brown-conrady';
import { undistortFisheye } from '../../src/undistortion/fisheye';
import { undistortPinhole } from '../../src/undistortion/pinhole';
import { undistortRational } from '../../src/undistortion/rational';
import type {
  BrownConradyCoeffs,
  FisheyeCoeffs,
  RationalCoeffs,
  Vec2,
} from '../../src/types';

const ZERO_BROWN: BrownConradyCoeffs = { k1: 0, k2: 0, p1: 0, p2: 0, k3: 0 };
const BASIC_BROWN: BrownConradyCoeffs = {
  k1: -0.2,
  k2: 0.05,
  p1: 0.001,
  p2: -0.001,
  k3: 0.001,
};

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
const BASIC_RATIONAL: RationalCoeffs = {
  k1: -0.2,
  k2: 0.05,
  p1: 0.001,
  p2: -0.001,
  k3: 0.001,
  k4: 0.01,
  k5: -0.003,
  k6: 0.001,
};

const ZERO_FISHEYE: FisheyeCoeffs = { k1: 0, k2: 0, k3: 0, k4: 0 };
const BASIC_FISHEYE: FisheyeCoeffs = { k1: -0.08, k2: 0.01, k3: -0.002, k4: 0.0005 };

const ROUND_TRIP_POINTS: Vec2[] = [
  [0, 0],
  [0.1, 0],
  [0, 0.1],
  [0.12, -0.08],
  [-0.05, 0.03],
];

function expectRoundTrip(
  normalized: Vec2,
  distort: (n: Vec2) => Vec2,
  undistort: (d: Vec2) => Vec2,
  tolerance = 1e-8,
): void {
  const distorted = distort(normalized);
  const recovered = undistort(distorted);
  expect(Math.abs(recovered[0] - normalized[0])).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(recovered[1] - normalized[1])).toBeLessThanOrEqual(tolerance);
}

describe('undistortPinhole', () => {
  it('is identity', () => {
    expect(undistortPinhole([0.1, 0.2])).toEqual([0.1, 0.2]);
  });
});

describe('undistortBrownConrady', () => {
  it('is identity when coefficients are zero', () => {
    expect(undistortBrownConrady([0.1, 0.2], ZERO_BROWN)).toEqual([0.1, 0.2]);
  });

  for (const point of ROUND_TRIP_POINTS) {
    it(`round-trips distort∘undistort for ${JSON.stringify(point)}`, () => {
      expectRoundTrip(
        point,
        (n) => distortBrownConrady(n, BASIC_BROWN),
        (d) => undistortBrownConrady(d, BASIC_BROWN),
      );
    });
  }
});

describe('undistortRational', () => {
  it('is identity when coefficients are zero', () => {
    expect(undistortRational([0.1, 0.2], ZERO_RATIONAL)).toEqual([0.1, 0.2]);
  });

  for (const point of ROUND_TRIP_POINTS) {
    it(`round-trips distort∘undistort for ${JSON.stringify(point)}`, () => {
      expectRoundTrip(
        point,
        (n) => distortRational(n, BASIC_RATIONAL),
        (d) => undistortRational(d, BASIC_RATIONAL),
      );
    });
  }
});

describe('undistortFisheye', () => {
  it('returns origin for distorted origin', () => {
    expect(undistortFisheye([0, 0], BASIC_FISHEYE)).toEqual([0, 0]);
  });

  it('recovers undistorted coords at k=0 (equidistant, not pinhole identity)', () => {
    const normalized: Vec2 = [0.2, 0.1];
    const distorted = distortFisheye(normalized, ZERO_FISHEYE);
    const recovered = undistortFisheye(distorted, ZERO_FISHEYE);
    expect(recovered[0]).toBeCloseTo(normalized[0], 8);
    expect(recovered[1]).toBeCloseTo(normalized[1], 8);
    expect(distorted).not.toEqual(normalized);
  });

  for (const point of ROUND_TRIP_POINTS.filter(([x, y]) => x !== 0 || y !== 0)) {
    it(`round-trips distort∘undistort for ${JSON.stringify(point)}`, () => {
      expectRoundTrip(
        point,
        (n) => distortFisheye(n, BASIC_FISHEYE),
        (d) => undistortFisheye(d, BASIC_FISHEYE),
      );
    });
  }
});

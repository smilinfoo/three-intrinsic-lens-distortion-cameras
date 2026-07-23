/** 2D vector: pixel (u, v) or normalized (x, y). */
export type Vec2 = readonly [number, number];

/** 3D vector in camera or world space. */
export type Vec3 = readonly [number, number, number];

/** OpenCV pinhole intrinsics: u = fx*x + cx, v = fy*y + cy. */
export interface CameraMatrix {
  readonly fx: number;
  readonly fy: number;
  readonly cx: number;
  readonly cy: number;
}

/** Numeric tolerance for golden-test comparisons. */
export interface Tolerance {
  readonly abs: number;
  readonly rel: number;
}

/** Golden fixture schema for pinhole projection tests. */
export interface PinholeFixture {
  readonly model: 'pinhole';
  readonly opencv_version: string;
  readonly camera_matrix: readonly (readonly number[])[];
  readonly dist_coeffs: readonly number[];
  readonly points_3d: readonly (readonly number[])[];
  readonly expected_pixels: readonly (readonly number[])[];
  readonly tolerance: Tolerance;
}

/** OpenCV Brown-Conrady (plumb bob) distortion coefficients. */
export interface BrownConradyCoeffs {
  readonly k1: number;
  readonly k2: number;
  readonly p1: number;
  readonly p2: number;
  readonly k3: number;
}

/** Golden fixture schema for Brown-Conrady projection tests. */
export interface BrownConradyFixture {
  readonly model: 'brown-conrady';
  readonly opencv_version: string;
  readonly camera_matrix: readonly (readonly number[])[];
  readonly dist_coeffs: readonly number[];
  readonly points_3d: readonly (readonly number[])[];
  readonly expected_pixels: readonly (readonly number[])[];
  readonly tolerance: Tolerance;
}

/** OpenCV rational polynomial distortion coefficients (8-parameter model). */
export interface RationalCoeffs {
  readonly k1: number;
  readonly k2: number;
  readonly p1: number;
  readonly p2: number;
  readonly k3: number;
  readonly k4: number;
  readonly k5: number;
  readonly k6: number;
}

/** Golden fixture schema for rational polynomial projection tests. */
export interface RationalFixture {
  readonly model: 'rational';
  readonly opencv_version: string;
  readonly camera_matrix: readonly (readonly number[])[];
  readonly dist_coeffs: readonly number[];
  readonly points_3d: readonly (readonly number[])[];
  readonly expected_pixels: readonly (readonly number[])[];
  readonly tolerance: Tolerance;
}

/** OpenCV fisheye distortion coefficients. */
export interface FisheyeCoeffs {
  readonly k1: number;
  readonly k2: number;
  readonly k3: number;
  readonly k4: number;
}

/** Golden fixture schema for inverse distortion (normalized plane) tests. */
export interface UndistortFixture {
  readonly model: 'pinhole' | 'brown-conrady' | 'rational' | 'fisheye';
  readonly direction: 'inverse-normalized';
  readonly opencv_version: string;
  readonly camera_matrix: readonly (readonly number[])[];
  readonly dist_coeffs: readonly number[];
  readonly pixels: readonly (readonly number[])[];
  readonly expected_normalized: readonly (readonly number[])[];
  readonly tolerance: Tolerance;
}

/** Golden fixture schema for fisheye projection tests. */
export interface FisheyeFixture {
  readonly model: 'fisheye';
  readonly opencv_version: string;
  readonly camera_matrix: readonly (readonly number[])[];
  readonly dist_coeffs: readonly number[];
  readonly points_3d: readonly (readonly number[])[];
  readonly expected_pixels: readonly (readonly number[])[];
  readonly tolerance: Tolerance;
}

export function cameraMatrixFromArray(matrix: readonly (readonly number[])[]): CameraMatrix {
  return {
    fx: matrix[0][0],
    fy: matrix[1][1],
    cx: matrix[0][2],
    cy: matrix[1][2],
  };
}

export function brownConradyFromArray(dist: readonly number[]): BrownConradyCoeffs {
  return {
    k1: dist[0],
    k2: dist[1],
    p1: dist[2],
    p2: dist[3],
    k3: dist[4] ?? 0,
  };
}

export function rationalFromArray(dist: readonly number[]): RationalCoeffs {
  return {
    k1: dist[0],
    k2: dist[1],
    p1: dist[2],
    p2: dist[3],
    k3: dist[4] ?? 0,
    k4: dist[5] ?? 0,
    k5: dist[6] ?? 0,
    k6: dist[7] ?? 0,
  };
}

export function fisheyeFromArray(dist: readonly number[]): FisheyeCoeffs {
  return {
    k1: dist[0],
    k2: dist[1],
    k3: dist[2] ?? 0,
    k4: dist[3] ?? 0,
  };
}

export function vec2(x: number, y: number): Vec2 {
  return [x, y];
}

export function vec3(x: number, y: number, z: number): Vec3 {
  return [x, y, z];
}

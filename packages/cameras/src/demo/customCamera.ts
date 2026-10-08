import { cameraMatrixFromArray } from 'intrinsic-lens-distortion';
import type { ModelId } from '../cameras/types';
import { presetSpec, type CameraSpec } from './probes';

/** Coefficient field names per model, in the order OpenCV documents them. */
export const COEFFICIENT_FIELDS: Record<ModelId, readonly string[]> = {
  pinhole: [],
  'brown-conrady': ['k1', 'k2', 'p1', 'p2', 'k3'],
  rational: ['k1', 'k2', 'p1', 'p2', 'k3', 'k4', 'k5', 'k6'],
  fisheye: ['k1', 'k2', 'k3', 'k4'],
};

export const MIN_IMAGE_SIZE = 64;
export const MAX_IMAGE_SIZE = 4096;

/** Raw numbers from the form. */
export interface CustomCameraInput {
  readonly model: ModelId;
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly fx: number;
  readonly fy: number;
  readonly cx: number;
  readonly cy: number;
  readonly coefficients: Readonly<Record<string, number>>;
}

export type CustomCameraResult =
  | { readonly ok: true; readonly spec: CameraSpec }
  | { readonly ok: false; readonly errors: string[] };

/** Preset values for `model`, as form input. */
export function defaultInput(model: ModelId): CustomCameraInput {
  const spec = presetSpec(model);
  const coeffs: Record<string, number> = {
    ...(spec.brownConrady ?? spec.rational ?? spec.fisheye ?? {}),
  };
  return {
    model,
    imageWidth: spec.imageWidth,
    imageHeight: spec.imageHeight,
    fx: spec.intrinsics.fx,
    fy: spec.intrinsics.fy,
    cx: spec.intrinsics.cx,
    cy: spec.intrinsics.cy,
    coefficients: coeffs,
  };
}

/** Validate user input and build a {@link CameraSpec}; never throws. */
export function specFromInput(input: CustomCameraInput): CustomCameraResult {
  const errors: string[] = [];
  const finite = (name: string, value: number): void => {
    if (!Number.isFinite(value)) {
      errors.push(`${name} must be a number`);
    }
  };

  for (const [name, value] of [
    ['fx', input.fx],
    ['fy', input.fy],
    ['cx', input.cx],
    ['cy', input.cy],
  ] as const) {
    finite(name, value);
  }
  if (Number.isFinite(input.fx) && input.fx <= 0) {
    errors.push('fx must be > 0');
  }
  if (Number.isFinite(input.fy) && input.fy <= 0) {
    errors.push('fy must be > 0');
  }

  for (const [name, value] of [
    ['image width', input.imageWidth],
    ['image height', input.imageHeight],
  ] as const) {
    if (!Number.isInteger(value) || value < MIN_IMAGE_SIZE || value > MAX_IMAGE_SIZE) {
      errors.push(`${name} must be a whole number between ${MIN_IMAGE_SIZE} and ${MAX_IMAGE_SIZE}`);
    }
  }

  const names = COEFFICIENT_FIELDS[input.model];
  for (const name of names) {
    finite(name, input.coefficients[name] ?? Number.NaN);
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const c = input.coefficients as Record<string, number>;
  const base = {
    model: input.model,
    intrinsics: cameraMatrixFromArray([
      [input.fx, 0, input.cx],
      [0, input.fy, input.cy],
      [0, 0, 1],
    ]),
    imageWidth: input.imageWidth,
    imageHeight: input.imageHeight,
  };

  switch (input.model) {
    case 'pinhole':
      return { ok: true, spec: base };
    case 'brown-conrady':
      return { ok: true, spec: { ...base, brownConrady: { k1: c.k1!, k2: c.k2!, p1: c.p1!, p2: c.p2!, k3: c.k3! } } };
    case 'rational':
      return { ok: true, spec: { ...base, rational: {
          k1: c.k1!, k2: c.k2!, p1: c.p1!, p2: c.p2!, k3: c.k3!, k4: c.k4!, k5: c.k5!, k6: c.k6!,
        } } };
    case 'fisheye':
      return { ok: true, spec: { ...base, fisheye: { k1: c.k1!, k2: c.k2!, k3: c.k3!, k4: c.k4! } } };
    default:
      return { ok: false, errors: [`Unknown model: ${input.model satisfies never}`] };
  }
}

import { describe, expect, it } from 'vitest';
import { COEFFICIENT_FIELDS, defaultInput, specFromInput } from '../src/demo/customCamera';
import { presetSpec, probePointsForSpec, projectWithSpec, type CameraSpec } from '../src/demo/probes';

const MODELS = ['pinhole', 'brown-conrady', 'rational', 'fisheye'] as const;

describe('specFromInput', () => {
  it.each(MODELS)('round-trips the %s preset', (model) => {
    const result = specFromInput(defaultInput(model));
    expect(result.ok).toBe(true);
    if (result.ok) {
      const preset = presetSpec(model);
      expect(result.spec.intrinsics).toEqual(preset.intrinsics);
      expect(result.spec.brownConrady).toEqual(preset.brownConrady);
      expect(result.spec.rational).toEqual(preset.rational);
      expect(result.spec.fisheye).toEqual(preset.fisheye);
    }
  });

  it('lists coefficient fields that exist on the model preset', () => {
    for (const model of MODELS) {
      expect(Object.keys(defaultInput(model).coefficients).sort()).toEqual(
        [...COEFFICIENT_FIELDS[model]].sort(),
      );
    }
  });

  it('collects every validation problem', () => {
    const base = defaultInput('brown-conrady');
    const result = specFromInput({
      ...base,
      fx: -5,
      fy: Number.NaN,
      imageWidth: 10,
      imageHeight: 480.5,
      coefficients: { ...base.coefficients, k1: Number.NaN },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(' | ')).toMatch(/fx must be > 0/);
      expect(result.errors.join(' | ')).toMatch(/fy must be a number/);
      expect(result.errors.join(' | ')).toMatch(/image width/);
      expect(result.errors.join(' | ')).toMatch(/image height/);
      expect(result.errors.join(' | ')).toMatch(/k1 must be a number/);
    }
  });

  it('ignores coefficients that do not belong to the model', () => {
    const result = specFromInput({ ...defaultInput('pinhole'), coefficients: { k1: Number.NaN } });
    expect(result.ok).toBe(true);
  });
});

describe('probePointsForSpec', () => {
  const unusual = (model: (typeof MODELS)[number]): CameraSpec => ({
    ...presetSpec(model),
    imageWidth: 800,
    imageHeight: 600,
    intrinsics: { fx: 500, fy: 520, cx: 410, cy: 290 },
  });

  it.each(MODELS)('places %s probes inside the image at their un-projected pixels', (model) => {
    const spec = unusual(model);
    const points = probePointsForSpec(spec);
    expect(points).toHaveLength(25);
    for (const point of points) {
      const [u, v] = projectWithSpec(spec, point);
      expect(u).toBeGreaterThan(0);
      expect(u).toBeLessThan(spec.imageWidth);
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(spec.imageHeight);
    }
    // centre probe un-projects from the image centre
    const [u, v] = projectWithSpec(spec, points[12]!);
    expect(u).toBeCloseTo(0.5 * spec.imageWidth, 3);
    expect(v).toBeCloseTo(0.5 * spec.imageHeight, 3);
  });
});

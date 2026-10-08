import type { Vec2 } from 'intrinsic-lens-distortion';

export interface ProbeMeasurement {
  readonly expected: Vec2;
  /** Centroid of matching pixels (continuous, edge-origin pixel coordinates), or null if none. */
  readonly found: Vec2 | null;
  /** Distance in pixels between expected and found; `Infinity` when nothing was found. */
  readonly error: number;
}

export interface MeasureOptions {
  /** RGB of the probe colour to look for. */
  readonly color: readonly [number, number, number];
  /** Half-size in pixels of the window searched around each expected position. */
  readonly window?: number;
  /** Per-channel colour tolerance. */
  readonly tolerance?: number;
}

/**
 * Locate flat-coloured probe markers in an RGBA readback and compare them with expected
 * pixel positions. `pixels` is in GL order (row 0 = bottom), as returned by `readPixels`.
 * Positions are continuous coordinates with the origin at the image's top-left *edge*
 * (pixel i covers [i, i+1)) — the convention of the shader's NDC mapping.
 */
export function measureProbes(
  pixels: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  expected: readonly Vec2[],
  options: MeasureOptions,
): ProbeMeasurement[] {
  const window = options.window ?? 10;
  const tol = options.tolerance ?? 30;
  const [r, g, b] = options.color;

  return expected.map(([eu, ev]) => {
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    const x0 = Math.max(0, Math.floor(eu - window));
    const x1 = Math.min(width - 1, Math.ceil(eu + window));
    const y0 = Math.max(0, Math.floor(ev - window));
    const y1 = Math.min(height - 1, Math.ceil(ev + window));

    for (let y = y0; y <= y1; y++) {
      const glRow = height - 1 - y;
      for (let x = x0; x <= x1; x++) {
        const i = (glRow * width + x) * 4;
        if (
          Math.abs(pixels[i]! - r) <= tol &&
          Math.abs(pixels[i + 1]! - g) <= tol &&
          Math.abs(pixels[i + 2]! - b) <= tol
        ) {
          sumX += x + 0.5;
          sumY += y + 0.5;
          count++;
        }
      }
    }

    if (count === 0) {
      return { expected: [eu, ev] as Vec2, found: null, error: Number.POSITIVE_INFINITY };
    }
    const found: Vec2 = [sumX / count, sumY / count];
    return { expected: [eu, ev] as Vec2, found, error: Math.hypot(found[0] - eu, found[1] - ev) };
  });
}

export interface ProbeSummary {
  readonly count: number;
  readonly missing: number;
  readonly maxError: number;
  readonly meanError: number;
}

export function summarizeProbes(measurements: readonly ProbeMeasurement[]): ProbeSummary {
  const found = measurements.filter((m) => m.found !== null);
  const errors = found.map((m) => m.error);
  return {
    count: measurements.length,
    missing: measurements.length - found.length,
    maxError: errors.length ? Math.max(...errors) : Number.POSITIVE_INFINITY,
    meanError: errors.length ? errors.reduce((a, c) => a + c, 0) / errors.length : Number.POSITIVE_INFINITY,
  };
}

import { vec3, type Vec3 } from 'intrinsic-lens-distortion';

export type Segment = readonly [Vec3, Vec3];

function linspace(min: number, max: number, count: number): number[] {
  if (count <= 1) {
    return [min];
  }
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, i) => min + i * step);
}

/** Grid line segments on plane Z = z0 in the OpenCV camera frame. */
export function generateGridSegments(
  z0: number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  divisions: number,
): Segment[] {
  const segments: Segment[] = [];
  const xs = linspace(xMin, xMax, divisions);
  const ys = linspace(yMin, yMax, divisions);

  for (const x of xs) {
    segments.push([vec3(x, yMin, z0), vec3(x, yMax, z0)]);
  }
  for (const y of ys) {
    segments.push([vec3(xMin, y, z0), vec3(xMax, y, z0)]);
  }

  return segments;
}

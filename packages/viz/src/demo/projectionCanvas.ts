import type { Vec2 } from '@three-camera-lab/core';
import type { ProjectFn } from './modelPresets';
import type { Segment } from './gridPoints';

export function projectSegment(
  segment: Segment,
  project: ProjectFn,
): readonly [Vec2, Vec2] | null {
  const [start, end] = segment;
  if (start[2] <= 0 || end[2] <= 0) {
    return null;
  }
  return [project(start), project(end)];
}

export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, width, height);
}

export function drawImageFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

  ctx.fillStyle = '#666';
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, 3, 0, Math.PI * 2);
  ctx.fill();
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  segments: readonly Segment[],
  project: ProjectFn,
  color: string,
  lineWidth: number,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();

  for (const segment of segments) {
    const projected = projectSegment(segment, project);
    if (!projected) {
      continue;
    }
    const [[u0, v0], [u1, v1]] = projected;
    ctx.moveTo(u0, v0);
    ctx.lineTo(u1, v1);
  }

  ctx.stroke();
}

export function drawLegend(
  ctx: CanvasRenderingContext2D,
  entries: readonly { color: string; label: string }[],
  x: number,
  y: number,
): void {
  ctx.font = '12px system-ui, sans-serif';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const rowY = y + i * 18;
    ctx.fillStyle = entry.color;
    ctx.fillRect(x, rowY - 4, 16, 2);
    ctx.fillStyle = '#ccc';
    ctx.fillText(entry.label, x + 22, rowY);
  }
}

export interface RenderOptions {
  readonly width: number;
  readonly height: number;
  readonly segments: readonly Segment[];
  readonly baselineProject?: ProjectFn;
  readonly baselineLabel?: string;
  readonly distortedProject: ProjectFn;
  readonly distortedLabel: string;
  readonly showBaseline: boolean;
}

export function renderProjectionCanvas(
  ctx: CanvasRenderingContext2D,
  options: RenderOptions,
): void {
  const { width, height, segments } = options;

  clearCanvas(ctx, width, height);
  drawImageFrame(ctx, width, height);

  if (options.showBaseline && options.baselineProject) {
    drawGrid(ctx, segments, options.baselineProject, '#666666', 1);
  }

  drawGrid(ctx, segments, options.distortedProject, '#44ccff', 1.5);

  const legend: { color: string; label: string }[] = [];
  if (options.showBaseline && options.baselineLabel) {
    legend.push({ color: '#666666', label: options.baselineLabel });
  }
  legend.push({ color: '#44ccff', label: options.distortedLabel });
  drawLegend(ctx, legend, 12, height - 12 - (legend.length - 1) * 18);
}

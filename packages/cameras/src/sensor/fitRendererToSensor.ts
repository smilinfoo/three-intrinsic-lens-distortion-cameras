import { Vector2, type WebGLRenderer } from 'three';
import type { SensorCamera } from '../cameras/SensorCamera';

export interface SensorViewport {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Largest rectangle with the sensor's aspect ratio that fits (centered) in a
 * `canvasWidth` × `canvasHeight` area. Pure function — no renderer needed.
 */
export function computeSensorViewport(
  camera: Pick<SensorCamera, 'imageWidth' | 'imageHeight'>,
  canvasWidth: number,
  canvasHeight: number,
): SensorViewport {
  const sensorAspect = camera.imageWidth / camera.imageHeight;
  const canvasAspect = canvasWidth / canvasHeight;
  if (canvasAspect > sensorAspect) {
    const width = canvasHeight * sensorAspect;
    return { x: (canvasWidth - width) / 2, y: 0, width, height: canvasHeight };
  }
  const height = canvasWidth / sensorAspect;
  return { x: 0, y: (canvasHeight - height) / 2, width: canvasWidth, height };
}

export interface FitRendererOptions {
  /**
   * `exact` — drawing buffer becomes `imageWidth × imageHeight` (CSS size left to you).
   * `letterbox` — keep the current canvas size; confine rendering to the centered
   * sensor-aspect sub-rectangle with viewport + scissor. Default: `exact`.
   */
  readonly mode?: 'exact' | 'letterbox';
}

/**
 * Make the canvas match the sensor's aspect ratio so overlays on a sensor image align.
 * The NDC mapping assumes the viewport spans the full `imageWidth × imageHeight` image;
 * a canvas with a different aspect would otherwise stretch the result.
 */
export function fitRendererToSensor(
  renderer: WebGLRenderer,
  camera: Pick<SensorCamera, 'imageWidth' | 'imageHeight'>,
  options: FitRendererOptions = {},
): SensorViewport {
  const mode = options.mode ?? 'exact';

  if (mode === 'exact') {
    renderer.setPixelRatio(1);
    renderer.setSize(camera.imageWidth, camera.imageHeight, false);
    renderer.setScissorTest(false);
    const full = { x: 0, y: 0, width: camera.imageWidth, height: camera.imageHeight };
    renderer.setViewport(full.x, full.y, full.width, full.height);
    return full;
  }

  const size = renderer.getSize(new Vector2());
  const viewport = computeSensorViewport(camera, size.x, size.y);
  renderer.setViewport(viewport.x, viewport.y, viewport.width, viewport.height);
  renderer.setScissor(viewport.x, viewport.y, viewport.width, viewport.height);
  renderer.setScissorTest(true);
  return viewport;
}

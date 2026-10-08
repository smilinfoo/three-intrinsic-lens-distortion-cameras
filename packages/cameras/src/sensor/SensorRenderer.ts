/**
 * Sensor rendering — canonical usage
 * ===================================
 *
 * ```typescript
 * import * as THREE from 'three';
 * import { SensorCamera, SensorRenderer } from 'three-intrinsic-lens-distortion-cameras';
 * import { brownConradyFromArray, cameraMatrixFromArray } from 'intrinsic-lens-distortion';
 *
 * const camera = new SensorCamera({
 *   model: 'brown-conrady', // or 'rational' | 'fisheye' | 'pinhole'
 *   intrinsics: cameraMatrixFromArray([[fx, 0, cx], [0, fy, cy], [0, 0, 1]]),
 *   imageWidth: 1920,
 *   imageHeight: 1080,
 *   brownConrady: brownConradyFromArray([k1, k2, p1, p2, k3]),
 * });
 *
 * const renderer = new THREE.WebGLRenderer();
 * fitRendererToSensor(renderer, camera);        // canvas aspect must match the sensor image
 *
 * const sensor = new SensorRenderer();
 * sensor.render(renderer, scene, camera);       // built-in materials only
 * ```
 *
 * One scene can be rendered through any number of cameras (one `SensorRenderer` or several);
 * a stock `THREE.Camera` rendered afterwards through `renderer.render` is unaffected.
 *
 * Position the camera like any Three.js camera (looks down −Z, +Y up). OpenCV↔Three.js
 * frame conversion happens inside the shader — do not rotate scene content.
 *
 * ### Rays (picking)
 *
 * ```typescript
 * const ray = pixelToThreeRayFromCamera([u, v], camera);
 * ```
 *
 * @module sensor/SensorRenderer
 */

import type * as THREE from 'three';
import type { SensorCamera } from '../cameras/SensorCamera';
import {
  DistortionRenderPlugin,
  type DistortionRenderPluginOptions,
} from '../render/DistortionRenderPlugin';

export interface SensorRendererOptions extends DistortionRenderPluginOptions {
  /** Default camera used by {@link SensorRenderer.render} when none is passed. */
  readonly camera?: SensorCamera;
}

export class SensorRenderer {
  readonly plugin: DistortionRenderPlugin;
  private camera: SensorCamera | null;

  constructor(options: SensorRendererOptions | SensorCamera = {}) {
    const resolved = isSensorCamera(options) ? { camera: options } : options;
    this.plugin = new DistortionRenderPlugin(resolved);
    this.camera = resolved.camera ?? null;
  }

  getCamera(): SensorCamera | null {
    return this.camera;
  }

  setCamera(camera: SensorCamera): void {
    this.camera = camera;
  }

  /** Patch the scene for `camera` without rendering (optional; `render` does this itself). */
  prepareScene(scene: THREE.Object3D, camera: SensorCamera | null = this.camera): void {
    if (camera) {
      this.plugin.prepareScene(scene, camera);
    }
  }

  /**
   * Render `scene` through `camera` (defaults to the camera set on this renderer).
   * Distortion is armed only for the duration of the call.
   */
  render(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: SensorCamera | null = this.camera,
  ): void {
    if (!camera) {
      throw new Error('SensorRenderer.render: no camera — pass one or call setCamera().');
    }

    this.plugin.beginRender(scene, camera);
    try {
      renderer.render(scene, camera);
    } finally {
      this.plugin.endRender();
    }
  }
}

function isSensorCamera(value: SensorRendererOptions | SensorCamera): value is SensorCamera {
  return (value as SensorCamera).isCamera === true;
}

/**
 * Sensor rendering — canonical usage
 * ===================================
 *
 * This module docstring is the **only** usage example in the repository.
 * `main.ts`, README, and other docs link here — do not duplicate snippets elsewhere.
 *
 * ```typescript
 * import * as THREE from 'three';
 * import { SensorRenderer } from './sensor/SensorRenderer';
 *
 * const renderer = new THREE.WebGLRenderer({ antialias: true });
 * renderer.setSize(width, height);
 * document.body.appendChild(renderer.domElement);
 *
 * const scene = new THREE.Scene();
 *
 * // Demo presets: pick model by id (intrinsics + distortion from modelPresets).
 * const sensor = SensorRenderer.create({ model: 'brown-conrady' });
 *
 * // Add content with built-in materials — no geometry or material edits required.
 * scene.add(mesh, lineSegments, points, instancedMesh);
 *
 * function animate(): void {
 *   requestAnimationFrame(animate);
 *   sensor.render(renderer, scene);
 * }
 * animate();
 * ```
 *
 * ### Switch distortion model
 *
 * ```typescript
 * sensor.setModel('fisheye', scene);
 * ```
 *
 * Re-attaches {@link DistortionRenderPlugin} when needed and marks materials for
 * recompile. Pass `scene` so built-in materials pick up the new shader path.
 *
 * ### Pinhole (no distortion)
 *
 * `model: 'pinhole'` uses {@link SensorCamera.projectionMatrix} only; the distortion
 * plugin detaches automatically (`usesDistortion()` is false).
 *
 * ### Custom intrinsics / coefficients
 *
 * Use {@link SensorCamera} directly, then wrap with `new SensorRenderer(camera)`:
 *
 * ```typescript
 * import { brownConradyFromArray, cameraMatrixFromArray } from '@three-camera-lab/core';
 * import { SensorCamera } from './cameras/SensorCamera';
 *
 * const camera = new SensorCamera({
 *   model: 'brown-conrady',
 *   intrinsics: cameraMatrixFromArray([[fx, 0, cx], [0, fy, cy], [0, 0, 1]]),
 *   imageWidth: 1920,
 *   imageHeight: 1080,
 *   brownConrady: brownConradyFromArray([k1, k2, p1, p2, k3]),
 * });
 * const sensor = new SensorRenderer(camera);
 * ```
 *
 * Near/far default to `0.1` / `2000` (native `THREE.PerspectiveCamera` defaults).
 *
 * ### Rays (picking)
 *
 * ```typescript
 * import { pixelToThreeRayFromCamera } from './cameras/pixelToRay';
 * const ray = pixelToThreeRayFromCamera([u, v], sensor.getCamera());
 * ```
 *
 * @module sensor/SensorRenderer
 */

import * as THREE from 'three';
import {
  createSensorCamera,
  type CreateSensorCameraOptions,
} from '../cameras/createSensorCamera';
import type { SensorCamera } from '../cameras/SensorCamera';
import type { ModelId } from '../demo/modelPresets';
import {
  attachDistortionPlugin,
  DistortionRenderPlugin,
} from '../render/DistortionRenderPlugin';

export class SensorRenderer {
  readonly plugin: DistortionRenderPlugin;
  private camera: SensorCamera;

  constructor(camera: SensorCamera) {
    this.plugin = new DistortionRenderPlugin();
    this.camera = camera;
    attachDistortionPlugin(this.plugin, this.camera);
  }

  /** Create a sensor renderer from a demo model preset. */
  static create(options: CreateSensorCameraOptions): SensorRenderer {
    return new SensorRenderer(createSensorCamera(options));
  }

  getCamera(): SensorCamera {
    return this.camera;
  }

  setCamera(camera: SensorCamera, scene?: THREE.Object3D): void {
    this.camera = camera;
    attachDistortionPlugin(this.plugin, this.camera);
    if (scene) {
      this.forceMaterialRecompile(scene);
    }
  }

  /** Switch demo preset model; pass `scene` to recompile patched materials. */
  setModel(model: ModelId, scene?: THREE.Object3D): void {
    this.setCamera(createSensorCamera({ model }), scene);
  }

  prepareScene(scene: THREE.Object3D): void {
    this.plugin.prepareScene(scene);
  }

  /** Prepare distortion patches (when active) and render. */
  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
    this.prepareScene(scene);
    renderer.render(scene, this.camera);
  }

  forceMaterialRecompile(scene: THREE.Object3D): void {
    scene.traverse((object) => {
      if (
        object instanceof THREE.Mesh ||
        object instanceof THREE.LineSegments ||
        object instanceof THREE.Line ||
        object instanceof THREE.Points
      ) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          material.needsUpdate = true;
        }
      }
    });
  }
}

export { createSensorCamera, type CreateSensorCameraOptions };
export { SensorCamera, type SensorCameraOptions } from '../cameras/SensorCamera';
export { DistortionRenderPlugin, attachDistortionPlugin } from '../render/DistortionRenderPlugin';
export { pixelToThreeRayFromCamera } from '../cameras/pixelToRay';

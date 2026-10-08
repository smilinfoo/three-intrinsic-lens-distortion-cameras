import * as THREE from 'three';
import type { SensorCamera } from '../cameras/SensorCamera';
import {
  BROWN_CONRADY_GLSL,
  FISHEYE_GLSL,
  OPENCV_PROJECT_GLSL,
  RATIONAL_GLSL,
} from '../shaders/chunks/distortion.glsl';

const PROJECT_VERTEX_TOKEN = '#include <project_vertex>';
const COMMON_TOKEN = '#include <common>';

/** Constant program cache key suffix: model and coefficients are uniforms, not shader variants. */
export const SENSOR_PROGRAM_CACHE_KEY = 'sensor-distortion-v1';

/** `material.userData` flag that opts a custom ShaderMaterial (using `<project_vertex>`) in. */
export const SENSOR_DISTORTION_USER_DATA_KEY = 'sensorDistortion';

const DISTORTION_UNIFORMS_GLSL = /* glsl */ `
uniform float uSensorActive;
uniform float uFx;
uniform float uFy;
uniform float uCx;
uniform float uCy;
uniform float uImageWidth;
uniform float uImageHeight;
uniform int uDistortionModel;
uniform float uBrownK1;
uniform float uBrownK2;
uniform float uBrownK3;
uniform float uBrownP1;
uniform float uBrownP2;
uniform float uRatK1;
uniform float uRatK2;
uniform float uRatK3;
uniform float uRatK4;
uniform float uRatK5;
uniform float uRatK6;
uniform float uRatP1;
uniform float uRatP2;
uniform float uFishK1;
uniform float uFishK2;
uniform float uFishK3;
uniform float uFishK4;
`;

function createSensorUniforms(): Record<string, THREE.IUniform<number>> {
  const names = [
    'uSensorActive',
    'uFx',
    'uFy',
    'uCx',
    'uCy',
    'uImageWidth',
    'uImageHeight',
    'uDistortionModel',
    'uBrownK1',
    'uBrownK2',
    'uBrownK3',
    'uBrownP1',
    'uBrownP2',
    'uRatK1',
    'uRatK2',
    'uRatK3',
    'uRatK4',
    'uRatK5',
    'uRatK6',
    'uRatP1',
    'uRatP2',
    'uFishK1',
    'uFishK2',
    'uFishK3',
    'uFishK4',
  ];
  return Object.fromEntries(names.map((name) => [name, { value: 0 }]));
}

/**
 * Process-wide uniform objects shared (by reference) by every patched material.
 * `SensorRenderer.render` writes the active camera into them just before drawing,
 * so patched materials never hold per-camera state and need no recompile when a
 * camera, its intrinsics or its coefficients change.
 */
export const SENSOR_UNIFORMS = createSensorUniforms();

function distortionModelUniform(model: SensorCamera['model']): number {
  switch (model) {
    case 'brown-conrady':
      return 1;
    case 'rational':
      return 2;
    case 'fisheye':
      return 3;
    default:
      return 0;
  }
}

/** Write the camera's intrinsics, model and coefficients into the shared uniforms. */
export function writeSensorUniforms(camera: SensorCamera): void {
  const u = SENSOR_UNIFORMS;
  const { intrinsics } = camera;
  u.uFx!.value = intrinsics.fx;
  u.uFy!.value = intrinsics.fy;
  u.uCx!.value = intrinsics.cx;
  u.uCy!.value = intrinsics.cy;
  u.uImageWidth!.value = camera.imageWidth;
  u.uImageHeight!.value = camera.imageHeight;
  u.uDistortionModel!.value = distortionModelUniform(camera.model);

  const b = camera.brownConrady;
  u.uBrownK1!.value = b?.k1 ?? 0;
  u.uBrownK2!.value = b?.k2 ?? 0;
  u.uBrownK3!.value = b?.k3 ?? 0;
  u.uBrownP1!.value = b?.p1 ?? 0;
  u.uBrownP2!.value = b?.p2 ?? 0;

  const r = camera.rational;
  u.uRatK1!.value = r?.k1 ?? 0;
  u.uRatK2!.value = r?.k2 ?? 0;
  u.uRatK3!.value = r?.k3 ?? 0;
  u.uRatK4!.value = r?.k4 ?? 0;
  u.uRatK5!.value = r?.k5 ?? 0;
  u.uRatK6!.value = r?.k6 ?? 0;
  u.uRatP1!.value = r?.p1 ?? 0;
  u.uRatP2!.value = r?.p2 ?? 0;

  const f = camera.fisheye;
  u.uFishK1!.value = f?.k1 ?? 0;
  u.uFishK2!.value = f?.k2 ?? 0;
  u.uFishK3!.value = f?.k3 ?? 0;
  u.uFishK4!.value = f?.k4 ?? 0;
}

interface MaterialBackup {
  hadOwnOnBeforeCompile: boolean;
  onBeforeCompile: THREE.Material['onBeforeCompile'];
  hadOwnCacheKey: boolean;
  customProgramCacheKey: THREE.Material['customProgramCacheKey'];
}

/** Patch bookkeeping is per material, never per plugin: any number of plugins can share a scene. */
const PATCHED_MATERIALS = new WeakMap<THREE.Material, MaterialBackup>();
const WARNED_MATERIALS = new WeakSet<THREE.Material>();

/** Inject distortion helpers at global scope — never inside main() where project_vertex lives. */
function injectGlobalDistortionGlsl(source: string): string {
  const helpers = [
    DISTORTION_UNIFORMS_GLSL,
    BROWN_CONRADY_GLSL,
    RATIONAL_GLSL,
    FISHEYE_GLSL,
    OPENCV_PROJECT_GLSL,
  ].join('\n');

  if (source.includes(COMMON_TOKEN)) {
    return source.replace(COMMON_TOKEN, `${COMMON_TOKEN}\n${helpers}`);
  }

  return `${helpers}\n${source}`;
}

function patchVertexShader(source: string): string {
  if (!source.includes(PROJECT_VERTEX_TOKEN)) {
    return source;
  }

  const customProject = /* glsl */ `
vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
  mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = opencvProjectDistorted( mvPosition );
`;

  const withGlobals = injectGlobalDistortionGlsl(source);
  return withGlobals.replace(PROJECT_VERTEX_TOKEN, customProject);
}

/** Built-in materials whose vertex shader goes through `<project_vertex>`. */
function isPatchableMaterial(material: THREE.Material): boolean {
  if (material.userData?.[SENSOR_DISTORTION_USER_DATA_KEY] === true) {
    return true;
  }
  return (
    material instanceof THREE.MeshBasicMaterial ||
    material instanceof THREE.MeshStandardMaterial ||
    material instanceof THREE.MeshPhongMaterial ||
    material instanceof THREE.MeshLambertMaterial ||
    material instanceof THREE.MeshToonMaterial ||
    material instanceof THREE.MeshNormalMaterial ||
    material instanceof THREE.MeshMatcapMaterial ||
    material instanceof THREE.LineBasicMaterial ||
    material instanceof THREE.LineDashedMaterial ||
    material instanceof THREE.PointsMaterial ||
    material instanceof THREE.ShadowMaterial
  );
}

function patchMaterial(material: THREE.Material): void {
  if (PATCHED_MATERIALS.has(material)) {
    return;
  }

  const hadOwnOnBeforeCompile = Object.hasOwn(material, 'onBeforeCompile');
  const hadOwnCacheKey = Object.hasOwn(material, 'customProgramCacheKey');
  const priorOnBeforeCompile = material.onBeforeCompile;
  const priorCacheKey = material.customProgramCacheKey;
  // Base Material.customProgramCacheKey() hashes onBeforeCompile's source, which our patch
  // would otherwise change; capture the pre-patch value once so user hooks still key correctly.
  const staticPriorKey = hadOwnCacheKey ? null : priorCacheKey.call(material);

  PATCHED_MATERIALS.set(material, {
    hadOwnOnBeforeCompile,
    onBeforeCompile: priorOnBeforeCompile,
    hadOwnCacheKey,
    customProgramCacheKey: priorCacheKey,
  });

  material.onBeforeCompile = (shader, renderer) => {
    priorOnBeforeCompile.call(material, shader, renderer);
    shader.vertexShader = patchVertexShader(shader.vertexShader);
    // By reference: later writes to SENSOR_UNIFORMS reach every patched material.
    Object.assign(shader.uniforms, SENSOR_UNIFORMS);
  };

  material.customProgramCacheKey = () => {
    const prior = staticPriorKey ?? priorCacheKey.call(material);
    return `${prior}|${SENSOR_PROGRAM_CACHE_KEY}`;
  };

  material.needsUpdate = true;
}

function unpatchMaterial(material: THREE.Material): void {
  const backup = PATCHED_MATERIALS.get(material);
  if (!backup) {
    return;
  }

  if (backup.hadOwnOnBeforeCompile) {
    material.onBeforeCompile = backup.onBeforeCompile;
  } else {
    delete (material as Partial<THREE.Material>).onBeforeCompile;
  }

  if (backup.hadOwnCacheKey) {
    material.customProgramCacheKey = backup.customProgramCacheKey;
  } else {
    delete (material as Partial<THREE.Material>).customProgramCacheKey;
  }

  material.needsUpdate = true;
  PATCHED_MATERIALS.delete(material);
}

/** True if `material` currently carries the sensor-distortion patch. */
export function isMaterialPatched(material: THREE.Material): boolean {
  return PATCHED_MATERIALS.has(material);
}

type Renderable = THREE.Mesh | THREE.Line | THREE.Points;

function isRenderable(object: THREE.Object3D): object is Renderable {
  return (
    object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points
  );
}

function materialsOf(object: Renderable): THREE.Material[] {
  return Array.isArray(object.material) ? object.material : [object.material];
}

export interface DistortionRenderPluginOptions {
  /**
   * Disable frustum culling on scene objects while a distorting camera renders.
   * Culling uses the camera's pinhole projection matrix, which wrongly rejects objects
   * that barrel/fisheye distortion pulls into the image. Default: true.
   */
  readonly disableFrustumCulling?: boolean;
  /** Warn once per material that distortion cannot patch (custom shaders, sprites). Default: true. */
  readonly warnUnsupported?: boolean;
}

/**
 * Global render hook: patches built-in materials for forward sensor distortion.
 *
 * Stateless with respect to cameras: pass the camera to {@link beginRender}. Patch state
 * lives on the materials, so any number of plugins/renderers can share one scene.
 */
export class DistortionRenderPlugin {
  private readonly disableFrustumCulling: boolean;
  private readonly warnUnsupported: boolean;
  private culledObjects: THREE.Object3D[] = [];

  constructor(options: DistortionRenderPluginOptions = {}) {
    this.disableFrustumCulling = options.disableFrustumCulling ?? true;
    this.warnUnsupported = options.warnUnsupported ?? true;
  }

  /**
   * Patch the scene's built-in materials (idempotent) when `camera` distorts.
   * A non-distorting camera leaves materials alone: already-patched ones fall back to the
   * stock projection through `uSensorActive`.
   */
  prepareScene(scene: THREE.Object3D, camera: SensorCamera): void {
    if (!camera.usesDistortion()) {
      return;
    }

    scene.traverse((object) => {
      if (!isRenderable(object)) {
        return;
      }
      for (const material of materialsOf(object)) {
        if (isPatchableMaterial(material)) {
          patchMaterial(material);
        } else {
          this.warnOnce(material);
        }
      }
    });
  }

  /** Remove the patch from every material in the scene, restoring original hooks. */
  restoreScene(scene: THREE.Object3D): void {
    scene.traverse((object) => {
      if (isRenderable(object)) {
        for (const material of materialsOf(object)) {
          unpatchMaterial(material);
        }
      }
    });
  }

  /** Patch if needed, publish `camera` to the shader uniforms and arm the distortion path. */
  beginRender(scene: THREE.Object3D, camera: SensorCamera): void {
    this.prepareScene(scene, camera);
    writeSensorUniforms(camera);
    const distorting = camera.usesDistortion();
    SENSOR_UNIFORMS.uSensorActive!.value = distorting ? 1 : 0;

    if (distorting && this.disableFrustumCulling) {
      scene.traverse((object) => {
        if (isRenderable(object) && object.frustumCulled) {
          object.frustumCulled = false;
          this.culledObjects.push(object);
        }
      });
    }
  }

  /** Disarm the distortion path and restore frustum culling. Safe to call repeatedly. */
  endRender(): void {
    SENSOR_UNIFORMS.uSensorActive!.value = 0;
    for (const object of this.culledObjects) {
      object.frustumCulled = true;
    }
    this.culledObjects.length = 0;
  }

  private warnOnce(material: THREE.Material): void {
    if (!this.warnUnsupported || WARNED_MATERIALS.has(material)) {
      return;
    }
    WARNED_MATERIALS.add(material);
    console.warn(
      `[sensor-distortion] ${material.type} is not patched and will render undistorted. ` +
        `Set material.userData.${SENSOR_DISTORTION_USER_DATA_KEY} = true on a custom ` +
        `ShaderMaterial that includes <project_vertex> to opt in.`,
    );
  }
}

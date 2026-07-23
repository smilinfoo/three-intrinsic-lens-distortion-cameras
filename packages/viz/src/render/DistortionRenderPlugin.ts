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

const PATCHED_MATERIALS = new WeakSet<THREE.Material>();

interface MaterialBackup {
  onBeforeCompile?: (parameters: unknown, renderer: THREE.WebGLRenderer) => void;
  customProgramCacheKey?: () => string;
}

const MATERIAL_BACKUPS = new WeakMap<THREE.Material, MaterialBackup>();

const DISTORTION_UNIFORMS_GLSL = /* glsl */ `
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

function buildUniforms(camera: SensorCamera): Record<string, THREE.IUniform> {
  const { intrinsics } = camera;
  const uniforms: Record<string, THREE.IUniform> = {
    uFx: { value: intrinsics.fx },
    uFy: { value: intrinsics.fy },
    uCx: { value: intrinsics.cx },
    uCy: { value: intrinsics.cy },
    uImageWidth: { value: camera.imageWidth },
    uImageHeight: { value: camera.imageHeight },
    uDistortionModel: { value: distortionModelUniform(camera.model) },
    uBrownK1: { value: 0 },
    uBrownK2: { value: 0 },
    uBrownK3: { value: 0 },
    uBrownP1: { value: 0 },
    uBrownP2: { value: 0 },
    uRatK1: { value: 0 },
    uRatK2: { value: 0 },
    uRatK3: { value: 0 },
    uRatK4: { value: 0 },
    uRatK5: { value: 0 },
    uRatK6: { value: 0 },
    uRatP1: { value: 0 },
    uRatP2: { value: 0 },
    uFishK1: { value: 0 },
    uFishK2: { value: 0 },
    uFishK3: { value: 0 },
    uFishK4: { value: 0 },
  };

  if (camera.brownConrady) {
    const c = camera.brownConrady;
    uniforms.uBrownK1.value = c.k1;
    uniforms.uBrownK2.value = c.k2;
    uniforms.uBrownK3.value = c.k3;
    uniforms.uBrownP1.value = c.p1;
    uniforms.uBrownP2.value = c.p2;
  }

  if (camera.rational) {
    const c = camera.rational;
    uniforms.uRatK1.value = c.k1;
    uniforms.uRatK2.value = c.k2;
    uniforms.uRatK3.value = c.k3;
    uniforms.uRatK4.value = c.k4;
    uniforms.uRatK5.value = c.k5;
    uniforms.uRatK6.value = c.k6;
    uniforms.uRatP1.value = c.p1;
    uniforms.uRatP2.value = c.p2;
  }

  if (camera.fisheye) {
    const c = camera.fisheye;
    uniforms.uFishK1.value = c.k1;
    uniforms.uFishK2.value = c.k2;
    uniforms.uFishK3.value = c.k3;
    uniforms.uFishK4.value = c.k4;
  }

  return uniforms;
}

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

function isPatchableMaterial(material: THREE.Material): boolean {
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
    material instanceof THREE.SpriteMaterial
  );
}

function unpatchMaterial(material: THREE.Material): void {
  if (!PATCHED_MATERIALS.has(material)) {
    return;
  }

  const backup = MATERIAL_BACKUPS.get(material);
  if (backup?.onBeforeCompile) {
    material.onBeforeCompile = backup.onBeforeCompile;
  } else {
    delete material.onBeforeCompile;
  }

  if (backup?.customProgramCacheKey) {
    material.customProgramCacheKey = backup.customProgramCacheKey;
  } else {
    delete material.customProgramCacheKey;
  }

  material.needsUpdate = true;
  PATCHED_MATERIALS.delete(material);
  MATERIAL_BACKUPS.delete(material);
}

/** Global render hook: patches built-in materials for forward sensor distortion. */
export class DistortionRenderPlugin {
  private camera: SensorCamera | null = null;

  attach(camera: SensorCamera): void {
    this.camera = camera;
  }

  detach(): void {
    this.camera = null;
  }

  /** Patch or restore materials in the scene graph for the active camera. */
  prepareScene(scene: THREE.Object3D): void {
    const camera = this.camera;
    const useDistortion = camera?.usesDistortion() ?? false;

    scene.traverse((object) => {
      if (
        object instanceof THREE.Mesh ||
        object instanceof THREE.Line ||
        object instanceof THREE.LineSegments ||
        object instanceof THREE.Points
      ) {
        if (useDistortion && camera) {
          this.ensureMaterialPatched(object.material, camera);
        } else {
          this.ensureMaterialUnpatched(object.material);
        }
      }
    });
  }

  private ensureMaterialUnpatched(material: THREE.Material | THREE.Material[]): void {
    if (Array.isArray(material)) {
      for (const entry of material) {
        this.ensureMaterialUnpatched(entry);
      }
      return;
    }

    if (!isPatchableMaterial(material)) {
      return;
    }

    unpatchMaterial(material);
  }

  private ensureMaterialPatched(
    material: THREE.Material | THREE.Material[],
    camera: SensorCamera,
  ): void {
    if (Array.isArray(material)) {
      for (const entry of material) {
        this.ensureMaterialPatched(entry, camera);
      }
      return;
    }

    if (!isPatchableMaterial(material)) {
      return;
    }

    if (PATCHED_MATERIALS.has(material)) {
      material.needsUpdate = true;
      return;
    }

    const priorOnBeforeCompile = material.onBeforeCompile?.bind(material);

    MATERIAL_BACKUPS.set(material, {
      onBeforeCompile: priorOnBeforeCompile,
      customProgramCacheKey: material.customProgramCacheKey?.bind(material),
    });

    material.onBeforeCompile = (shader, renderer) => {
      priorOnBeforeCompile?.(shader, renderer);

      shader.vertexShader = patchVertexShader(shader.vertexShader);

      const active = this.camera;
      if (active) {
        Object.assign(shader.uniforms, buildUniforms(active));
      }
    };

    material.customProgramCacheKey = () => {
      const active = this.camera;
      return active?.usesDistortion() ? `sensor-distortion-${active.model}` : 'sensor-distortion-off';
    };

    material.needsUpdate = true;
    PATCHED_MATERIALS.add(material);
  }
}

export function attachDistortionPlugin(
  plugin: DistortionRenderPlugin,
  camera: SensorCamera,
): void {
  plugin.attach(camera);
}

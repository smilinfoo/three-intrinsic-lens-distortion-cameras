import * as THREE from 'three';
import type { SensorCamera } from '../cameras/SensorCamera';
import {
  BROWN_CONRADY_GLSL,
  FISHEYE_GLSL,
  OPENCV_PROJECT_GLSL,
  RATIONAL_GLSL,
} from '../shaders/chunks/distortion.glsl';

const PROJECT_VERTEX_TOKEN = '#include <project_vertex>';

const PATCHED_MATERIALS = new WeakSet<THREE.Material>();

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

function patchVertexShader(source: string): string {
  if (!source.includes(PROJECT_VERTEX_TOKEN)) {
    return source;
  }

  const helpers = [BROWN_CONRADY_GLSL, RATIONAL_GLSL, FISHEYE_GLSL, OPENCV_PROJECT_GLSL].join(
    '\n',
  );

  const customProject = /* glsl */ `
vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = opencvProjectDistorted( mvPosition );
`;

  return source.replace(PROJECT_VERTEX_TOKEN, `${helpers}\n${customProject}`);
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

/** Global render hook: patches built-in materials for forward sensor distortion. */
export class DistortionRenderPlugin {
  private camera: SensorCamera | null = null;

  attach(camera: SensorCamera): void {
    this.camera = camera;
  }

  detach(): void {
    this.camera = null;
  }

  /** Patch materials in the scene graph for the active distortion camera. */
  prepareScene(scene: THREE.Object3D): void {
    const camera = this.camera;
    if (!camera?.usesDistortion()) {
      return;
    }

    scene.traverse((object) => {
      if (
        object instanceof THREE.Mesh ||
        object instanceof THREE.Line ||
        object instanceof THREE.LineSegments ||
        object instanceof THREE.Points
      ) {
        this.ensureMaterialPatched(object.material, camera);
      }
    });
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
      return active ? `sensor-distortion-${active.model}` : 'sensor-distortion-off';
    };

    material.needsUpdate = true;
    PATCHED_MATERIALS.add(material);
  }
}

export function attachDistortionPlugin(
  plugin: DistortionRenderPlugin,
  camera: SensorCamera,
): void {
  if (camera.usesDistortion()) {
    plugin.attach(camera);
  } else {
    plugin.detach();
  }
}

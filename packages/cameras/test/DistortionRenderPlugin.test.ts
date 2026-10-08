import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSensorCamera } from '../src/demo/createSensorCamera';
import {
  DistortionRenderPlugin,
  isMaterialPatched,
  SENSOR_PROGRAM_CACHE_KEY,
  SENSOR_UNIFORMS,
} from '../src/render/DistortionRenderPlugin';

const SAMPLE_VERTEX_SHADER = /* glsl */ `
#include <common>
void main() {
  #include <begin_vertex>
  #include <project_vertex>
}
`;

function sceneWith(object: THREE.Object3D): THREE.Scene {
  const scene = new THREE.Scene();
  scene.add(object);
  return scene;
}

function lineObject(material: THREE.Material = new THREE.LineBasicMaterial()): THREE.LineSegments {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.1, 0, 0], 3));
  return new THREE.LineSegments(geometry, material);
}

function compile(material: THREE.Material): {
  vertexShader: string;
  uniforms: Record<string, THREE.IUniform>;
} {
  const shader = {
    vertexShader: SAMPLE_VERTEX_SHADER,
    uniforms: {} as Record<string, THREE.IUniform>,
  };
  material.onBeforeCompile(shader as never, {} as THREE.WebGLRenderer);
  return shader;
}

function assertDistortionHelpersAreGlobal(vertexShader: string): void {
  const mainIndex = vertexShader.indexOf('void main()');
  expect(mainIndex).toBeGreaterThan(-1);
  expect(vertexShader.indexOf('uniform float uFx')).toBeLessThan(mainIndex);
  expect(vertexShader.indexOf('vec2 distortBrownConrady')).toBeLessThan(mainIndex);
  expect(vertexShader.indexOf('vec4 opencvProjectDistorted')).toBeLessThan(mainIndex);

  const mainBody = vertexShader.slice(vertexShader.indexOf('{', mainIndex));
  expect(mainBody).not.toContain('vec2 distortBrownConrady(vec2');
  expect(mainBody).not.toContain('vec4 opencvProjectDistorted(vec4');
}

afterEach(() => {
  SENSOR_UNIFORMS.uSensorActive!.value = 0;
  vi.restoreAllMocks();
});

describe('DistortionRenderPlugin patching', () => {
  const BUILT_IN_MATERIALS: Array<[string, () => THREE.Material]> = [
    ['MeshBasicMaterial', () => new THREE.MeshBasicMaterial()],
    ['MeshLambertMaterial', () => new THREE.MeshLambertMaterial()],
    ['MeshPhongMaterial', () => new THREE.MeshPhongMaterial()],
    ['MeshStandardMaterial', () => new THREE.MeshStandardMaterial()],
    ['MeshPhysicalMaterial', () => new THREE.MeshPhysicalMaterial()],
    ['MeshToonMaterial', () => new THREE.MeshToonMaterial()],
    ['MeshNormalMaterial', () => new THREE.MeshNormalMaterial()],
    ['MeshMatcapMaterial', () => new THREE.MeshMatcapMaterial()],
    ['LineBasicMaterial', () => new THREE.LineBasicMaterial()],
    ['LineDashedMaterial', () => new THREE.LineDashedMaterial()],
    ['PointsMaterial', () => new THREE.PointsMaterial()],
    ['ShadowMaterial', () => new THREE.ShadowMaterial()],
  ];

  it.each(BUILT_IN_MATERIALS)('patches %s when the camera distorts', (_name, make) => {
    const plugin = new DistortionRenderPlugin();
    const material = make();
    const scene = sceneWith(new THREE.Mesh(new THREE.BufferGeometry(), material));

    plugin.prepareScene(scene, createSensorCamera({ model: 'brown-conrady' }));

    expect(isMaterialPatched(material)).toBe(true);
  });

  it('patches InstancedMesh materials', () => {
    const plugin = new DistortionRenderPlugin();
    const material = new THREE.MeshStandardMaterial();
    const scene = sceneWith(new THREE.InstancedMesh(new THREE.BoxGeometry(), material, 4));

    plugin.prepareScene(scene, createSensorCamera({ model: 'fisheye' }));

    expect(isMaterialPatched(material)).toBe(true);
  });

  it('patches every entry of a multi-material mesh', () => {
    const plugin = new DistortionRenderPlugin();
    const materials = [new THREE.MeshBasicMaterial(), new THREE.MeshStandardMaterial()];
    const scene = sceneWith(new THREE.Mesh(new THREE.BoxGeometry(), materials));

    plugin.prepareScene(scene, createSensorCamera({ model: 'rational' }));

    expect(materials.every(isMaterialPatched)).toBe(true);
  });

  it('injects distortion GLSL at global scope and replaces project_vertex', () => {
    const plugin = new DistortionRenderPlugin();
    const material = new THREE.LineBasicMaterial();
    plugin.prepareScene(sceneWith(lineObject(material)), createSensorCamera({ model: 'brown-conrady' }));

    const { vertexShader } = compile(material);
    assertDistortionHelpersAreGlobal(vertexShader);
    expect(vertexShader).not.toContain('#include <project_vertex>');
    expect(vertexShader).toContain('gl_Position = opencvProjectDistorted( mvPosition );');
    expect(vertexShader).toContain('uniform float uSensorActive;');
  });

  it('does not patch when the camera does not distort (pinhole)', () => {
    const plugin = new DistortionRenderPlugin();
    const material = new THREE.LineBasicMaterial();

    plugin.prepareScene(sceneWith(lineObject(material)), createSensorCamera({ model: 'pinhole' }));

    expect(isMaterialPatched(material)).toBe(false);
    expect(compile(material).vertexShader).toBe(SAMPLE_VERTEX_SHADER);
  });

  it('restoreScene restores original hooks', () => {
    const plugin = new DistortionRenderPlugin();
    const material = new THREE.LineBasicMaterial();
    const scene = sceneWith(lineObject(material));
    material.onBeforeCompile = () => {};
    material.customProgramCacheKey = () => 'original-key';
    const originalHook = material.onBeforeCompile;

    plugin.prepareScene(scene, createSensorCamera({ model: 'brown-conrady' }));
    expect(compile(material).vertexShader).toContain('opencvProjectDistorted');

    plugin.restoreScene(scene);

    expect(isMaterialPatched(material)).toBe(false);
    expect(material.onBeforeCompile).toBe(originalHook);
    expect(material.customProgramCacheKey()).toBe('original-key');
    expect(compile(material).vertexShader).toBe(SAMPLE_VERTEX_SHADER);
  });

  it('restoreScene removes own properties that did not exist before patching', () => {
    const plugin = new DistortionRenderPlugin();
    const material = new THREE.LineBasicMaterial();
    const scene = sceneWith(lineObject(material));

    plugin.prepareScene(scene, createSensorCamera({ model: 'fisheye' }));
    plugin.restoreScene(scene);

    expect(Object.hasOwn(material, 'onBeforeCompile')).toBe(false);
    expect(Object.hasOwn(material, 'customProgramCacheKey')).toBe(false);
  });

  it('calls any prior onBeforeCompile hook before applying the patch', () => {
    const plugin = new DistortionRenderPlugin();
    const material = new THREE.LineBasicMaterial();
    const priorCompile = vi.fn();
    material.onBeforeCompile = priorCompile;

    plugin.prepareScene(sceneWith(lineObject(material)), createSensorCamera({ model: 'brown-conrady' }));
    compile(material);

    expect(priorCompile).toHaveBeenCalledOnce();
  });

  it('does not patch custom ShaderMaterial / RawShaderMaterial and warns once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const plugin = new DistortionRenderPlugin();
    const shader = new THREE.ShaderMaterial({
      vertexShader: 'void main() { gl_Position = vec4(0.0); }',
      fragmentShader: 'void main() { gl_FragColor = vec4(1.0); }',
    });
    const raw = new THREE.RawShaderMaterial({
      vertexShader: 'void main() { gl_Position = vec4(0.0); }',
      fragmentShader: 'void main() { gl_FragColor = vec4(1.0); }',
    });
    const scene = new THREE.Scene();
    scene.add(lineObject(shader), lineObject(raw));
    const camera = createSensorCamera({ model: 'brown-conrady' });

    plugin.prepareScene(scene, camera);
    plugin.prepareScene(scene, camera);

    expect(isMaterialPatched(shader)).toBe(false);
    expect(isMaterialPatched(raw)).toBe(false);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('patches a custom ShaderMaterial that opts in via userData', () => {
    const plugin = new DistortionRenderPlugin();
    const material = new THREE.ShaderMaterial({
      vertexShader: SAMPLE_VERTEX_SHADER,
      fragmentShader: 'void main() { gl_FragColor = vec4(1.0); }',
    });
    material.userData.sensorDistortion = true;

    plugin.prepareScene(sceneWith(lineObject(material)), createSensorCamera({ model: 'fisheye' }));

    expect(isMaterialPatched(material)).toBe(true);
  });

  it('never patches internal depth / distance materials', () => {
    const plugin = new DistortionRenderPlugin({ warnUnsupported: false });
    const depth = new THREE.MeshDepthMaterial();
    const distance = new THREE.MeshDistanceMaterial();
    const scene = new THREE.Scene();
    scene.add(
      new THREE.Mesh(new THREE.BufferGeometry(), depth),
      new THREE.Mesh(new THREE.BufferGeometry(), distance),
    );

    plugin.prepareScene(scene, createSensorCamera({ model: 'brown-conrady' }));

    expect(isMaterialPatched(depth)).toBe(false);
    expect(isMaterialPatched(distance)).toBe(false);
  });
});

describe('shared uniforms and cache key', () => {
  it('shares one uniform object set by reference across materials and plugins', () => {
    const a = new THREE.LineBasicMaterial();
    const b = new THREE.MeshBasicMaterial();
    const scene = new THREE.Scene();
    scene.add(lineObject(a), new THREE.Mesh(new THREE.BufferGeometry(), b));
    const camera = createSensorCamera({ model: 'brown-conrady' });

    new DistortionRenderPlugin().prepareScene(scene, camera);
    new DistortionRenderPlugin().prepareScene(scene, camera);

    const ua = compile(a).uniforms;
    const ub = compile(b).uniforms;
    for (const name of Object.keys(SENSOR_UNIFORMS)) {
      expect(ua[name]).toBe(SENSOR_UNIFORMS[name]);
      expect(ub[name]).toBe(SENSOR_UNIFORMS[name]);
    }
  });

  it('uses a constant program cache key regardless of the active model', () => {
    const plugin = new DistortionRenderPlugin();
    const material = new THREE.LineBasicMaterial();
    const scene = sceneWith(lineObject(material));

    plugin.prepareScene(scene, createSensorCamera({ model: 'fisheye' }));
    const first = material.customProgramCacheKey();
    plugin.prepareScene(scene, createSensorCamera({ model: 'brown-conrady' }));

    expect(material.customProgramCacheKey()).toBe(first);
    expect(first).toContain(SENSOR_PROGRAM_CACHE_KEY);
  });

  it('keeps a user-provided cache key as part of the combined key', () => {
    const plugin = new DistortionRenderPlugin();
    const material = new THREE.LineBasicMaterial();
    material.customProgramCacheKey = () => 'user-key';

    plugin.prepareScene(sceneWith(lineObject(material)), createSensorCamera({ model: 'fisheye' }));

    expect(material.customProgramCacheKey()).toBe(`user-key|${SENSOR_PROGRAM_CACHE_KEY}`);
  });

  it('does not set needsUpdate again on already-patched materials (no per-frame recompile)', () => {
    const plugin = new DistortionRenderPlugin();
    const material = new THREE.LineBasicMaterial();
    const scene = sceneWith(lineObject(material));
    const camera = createSensorCamera({ model: 'brown-conrady' });

    plugin.prepareScene(scene, camera);
    const version = material.version;
    plugin.prepareScene(scene, camera);
    plugin.beginRender(scene, camera);
    plugin.endRender();

    expect(material.version).toBe(version);
  });
});

describe('beginRender / endRender', () => {
  it('writes the camera into the shared uniforms and arms the shader', () => {
    const plugin = new DistortionRenderPlugin();
    const camera = createSensorCamera({ model: 'rational' });
    plugin.beginRender(new THREE.Scene(), camera);

    expect(SENSOR_UNIFORMS.uSensorActive!.value).toBe(1);
    expect(SENSOR_UNIFORMS.uFx!.value).toBe(camera.intrinsics.fx);
    expect(SENSOR_UNIFORMS.uFy!.value).toBe(camera.intrinsics.fy);
    expect(SENSOR_UNIFORMS.uCx!.value).toBe(camera.intrinsics.cx);
    expect(SENSOR_UNIFORMS.uCy!.value).toBe(camera.intrinsics.cy);
    expect(SENSOR_UNIFORMS.uImageWidth!.value).toBe(camera.imageWidth);
    expect(SENSOR_UNIFORMS.uImageHeight!.value).toBe(camera.imageHeight);
    expect(SENSOR_UNIFORMS.uDistortionModel!.value).toBe(2);
    expect(SENSOR_UNIFORMS.uRatK1!.value).toBe(camera.rational?.k1);

    plugin.endRender();
    expect(SENSOR_UNIFORMS.uSensorActive!.value).toBe(0);
  });

  it('leaves the shader inactive for a non-distorting camera', () => {
    const plugin = new DistortionRenderPlugin();
    plugin.beginRender(new THREE.Scene(), createSensorCamera({ model: 'pinhole' }));
    expect(SENSOR_UNIFORMS.uSensorActive!.value).toBe(0);
  });

  it('picks up coefficient changes without any material recompile', () => {
    const plugin = new DistortionRenderPlugin();
    const material = new THREE.LineBasicMaterial();
    const scene = sceneWith(lineObject(material));
    const camera = createSensorCamera({ model: 'brown-conrady' });

    plugin.beginRender(scene, camera);
    plugin.endRender();
    const version = material.version;
    const k1 = SENSOR_UNIFORMS.uBrownK1!.value;

    camera.setCoefficients({
      brownConrady: { ...camera.brownConrady!, k1: k1 - 0.1 },
    });
    plugin.beginRender(scene, camera);

    expect(SENSOR_UNIFORMS.uBrownK1!.value).toBeCloseTo(k1 - 0.1);
    expect(material.version).toBe(version);
    plugin.endRender();
  });

  it('disables frustum culling while armed and restores it afterwards', () => {
    const plugin = new DistortionRenderPlugin();
    const culled = lineObject();
    const alreadyOff = lineObject();
    alreadyOff.frustumCulled = false;
    const scene = new THREE.Scene();
    scene.add(culled, alreadyOff);

    plugin.beginRender(scene, createSensorCamera({ model: 'fisheye' }));
    expect(culled.frustumCulled).toBe(false);

    plugin.endRender();
    expect(culled.frustumCulled).toBe(true);
    expect(alreadyOff.frustumCulled).toBe(false);
  });

  it('keeps frustum culling when disabled by option', () => {
    const plugin = new DistortionRenderPlugin({ disableFrustumCulling: false });
    const object = lineObject();
    plugin.beginRender(sceneWith(object), createSensorCamera({ model: 'fisheye' }));
    expect(object.frustumCulled).toBe(true);
    plugin.endRender();
  });
});

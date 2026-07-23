import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { createSensorCamera } from '../src/cameras/createSensorCamera';
import { DistortionRenderPlugin } from '../src/render/DistortionRenderPlugin';

const SAMPLE_VERTEX_SHADER = /* glsl */ `
#include <common>
void main() {
  #include <begin_vertex>
  #include <project_vertex>
}
`;

function buildLineScene(material = new THREE.LineBasicMaterial({ color: 0x44ccff })): THREE.Scene {
  const scene = new THREE.Scene();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.1, 0, 0], 3));
  scene.add(new THREE.LineSegments(geometry, material));
  return scene;
}

function compileVertexShader(material: THREE.Material): string {
  const shader = {
    vertexShader: SAMPLE_VERTEX_SHADER,
    uniforms: {} as Record<string, THREE.IUniform>,
  };
  material.onBeforeCompile?.(shader, {} as THREE.WebGLRenderer);
  return shader.vertexShader;
}

function compileUniforms(material: THREE.Material): Record<string, THREE.IUniform> {
  const shader = {
    vertexShader: SAMPLE_VERTEX_SHADER,
    uniforms: {} as Record<string, THREE.IUniform>,
  };
  material.onBeforeCompile?.(shader, {} as THREE.WebGLRenderer);
  return shader.uniforms;
}

function assertDistortionHelpersAreGlobal(vertexShader: string): void {
  const mainIndex = vertexShader.indexOf('void main()');
  expect(mainIndex).toBeGreaterThan(-1);
  expect(vertexShader.indexOf('uniform float uFx')).toBeLessThan(mainIndex);
  expect(vertexShader.indexOf('vec2 distortBrownConrady')).toBeLessThan(mainIndex);
  expect(vertexShader.indexOf('vec4 opencvProjectDistorted')).toBeLessThan(mainIndex);

  const mainBodyStart = vertexShader.indexOf('{', mainIndex);
  const mainBody = vertexShader.slice(mainBodyStart);
  expect(mainBody).not.toContain('vec2 distortBrownConrady(vec2');
  expect(mainBody).not.toContain('vec4 opencvProjectDistorted(vec4');
}

describe('DistortionRenderPlugin', () => {
  it('patches built-in materials when the camera uses distortion', () => {
    const plugin = new DistortionRenderPlugin();
    const camera = createSensorCamera({ model: 'brown-conrady' });
    const material = new THREE.LineBasicMaterial({ color: 0x44ccff });
    const scene = buildLineScene(material);

    plugin.attach(camera);
    plugin.prepareScene(scene);

    expect(material.onBeforeCompile).toBeTypeOf('function');
    expect(material.customProgramCacheKey).toBeTypeOf('function');
  });

  it('injects distortion GLSL at global scope and replaces project_vertex', () => {
    const plugin = new DistortionRenderPlugin();
    const camera = createSensorCamera({ model: 'brown-conrady' });
    const material = new THREE.LineBasicMaterial({ color: 0x44ccff });

    plugin.attach(camera);
    plugin.prepareScene(buildLineScene(material));

    const vertexShader = compileVertexShader(material);
    assertDistortionHelpersAreGlobal(vertexShader);
    expect(vertexShader).not.toContain('#include <project_vertex>');
    expect(vertexShader).toContain('gl_Position = opencvProjectDistorted( mvPosition );');
  });

  it('assigns intrinsics and model uniforms during compile', () => {
    const plugin = new DistortionRenderPlugin();
    const camera = createSensorCamera({ model: 'rational' });
    const material = new THREE.MeshBasicMaterial({ color: 0x4488ff });

    plugin.attach(camera);
    plugin.prepareScene(buildLineScene(material));

    const uniforms = compileUniforms(material);
    expect(uniforms.uFx?.value).toBe(camera.intrinsics.fx);
    expect(uniforms.uFy?.value).toBe(camera.intrinsics.fy);
    expect(uniforms.uCx?.value).toBe(camera.intrinsics.cx);
    expect(uniforms.uCy?.value).toBe(camera.intrinsics.cy);
    expect(uniforms.uImageWidth?.value).toBe(camera.imageWidth);
    expect(uniforms.uImageHeight?.value).toBe(camera.imageHeight);
    expect(uniforms.uDistortionModel?.value).toBe(2);
    expect(uniforms.uRatK1?.value).toBe(camera.rational?.k1);
  });

  it('uses a model-specific program cache key while distortion is active', () => {
    const plugin = new DistortionRenderPlugin();
    const material = new THREE.LineBasicMaterial({ color: 0x44ccff });

    plugin.attach(createSensorCamera({ model: 'fisheye' }));
    plugin.prepareScene(buildLineScene(material));
    expect(material.customProgramCacheKey?.()).toBe('sensor-distortion-fisheye');

    plugin.attach(createSensorCamera({ model: 'brown-conrady' }));
    expect(material.customProgramCacheKey?.()).toBe('sensor-distortion-brown-conrady');
  });

  it('restores original material hooks when switching back to pinhole', () => {
    const plugin = new DistortionRenderPlugin();
    const material = new THREE.LineBasicMaterial({ color: 0x44ccff });
    const scene = buildLineScene(material);
    material.onBeforeCompile = () => {};
    material.customProgramCacheKey = () => 'original-key';

    plugin.attach(createSensorCamera({ model: 'brown-conrady' }));
    plugin.prepareScene(scene);
    expect(compileVertexShader(material)).toContain('opencvProjectDistorted');

    plugin.attach(createSensorCamera({ model: 'pinhole' }));
    plugin.prepareScene(scene);

    expect(material.customProgramCacheKey?.()).toBe('original-key');
    expect(compileVertexShader(material)).toBe(SAMPLE_VERTEX_SHADER);
  });

  it('calls any prior onBeforeCompile hook before applying the patch', () => {
    const plugin = new DistortionRenderPlugin();
    const material = new THREE.LineBasicMaterial({ color: 0x44ccff });
    const priorCompile = vi.fn();
    material.onBeforeCompile = priorCompile;

    plugin.attach(createSensorCamera({ model: 'brown-conrady' }));
    plugin.prepareScene(buildLineScene(material));
    compileVertexShader(material);

    expect(priorCompile).toHaveBeenCalledOnce();
  });

  it('does not patch custom ShaderMaterial instances', () => {
    const plugin = new DistortionRenderPlugin();
    const material = new THREE.ShaderMaterial({
      vertexShader: 'void main() { gl_Position = vec4(0.0); }',
      fragmentShader: 'void main() { gl_FragColor = vec4(1.0); }',
    });
    const originalCompile = material.onBeforeCompile;

    plugin.attach(createSensorCamera({ model: 'brown-conrady' }));
    plugin.prepareScene(buildLineScene(material));

    expect(material.onBeforeCompile).toBe(originalCompile);
  });

  it('does not patch custom RawShaderMaterial instances', () => {
    const plugin = new DistortionRenderPlugin();
    const material = new THREE.RawShaderMaterial({
      vertexShader: 'void main() { gl_Position = vec4(0.0); }',
      fragmentShader: 'void main() { gl_FragColor = vec4(1.0); }',
    });
    const originalCompile = material.onBeforeCompile;

    plugin.attach(createSensorCamera({ model: 'brown-conrady' }));
    plugin.prepareScene(buildLineScene(material));

    expect(material.onBeforeCompile).toBe(originalCompile);
  });

  it('does not patch materials when no camera is attached', () => {
    const plugin = new DistortionRenderPlugin();
    const material = new THREE.LineBasicMaterial({ color: 0x44ccff });
    const scene = buildLineScene(material);

    plugin.prepareScene(scene);

    expect(compileVertexShader(material)).toBe(SAMPLE_VERTEX_SHADER);
    expect(material.customProgramCacheKey?.()).not.toMatch(/^sensor-distortion-/);
  });
});

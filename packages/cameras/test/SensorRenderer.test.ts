import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSensorCamera } from '../src/demo/createSensorCamera';
import { SENSOR_UNIFORMS } from '../src/render/DistortionRenderPlugin';
import { computeSensorViewport } from '../src/sensor/fitRendererToSensor';
import { SensorRenderer } from '../src/sensor/SensorRenderer';

afterEach(() => {
  SENSOR_UNIFORMS.uSensorActive!.value = 0;
});

function fakeRenderer(onRender: () => void): THREE.WebGLRenderer {
  return { render: vi.fn(onRender) } as unknown as THREE.WebGLRenderer;
}

describe('SensorRenderer', () => {
  it('arms distortion only for the duration of renderer.render', () => {
    const sensor = new SensorRenderer();
    const camera = createSensorCamera({ model: 'brown-conrady' });
    let activeDuring = -1;
    const renderer = fakeRenderer(() => {
      activeDuring = SENSOR_UNIFORMS.uSensorActive!.value;
    });

    sensor.render(renderer, new THREE.Scene(), camera);

    expect(activeDuring).toBe(1);
    expect(SENSOR_UNIFORMS.uSensorActive!.value).toBe(0);
    expect(renderer.render).toHaveBeenCalledWith(expect.any(THREE.Scene), camera);
  });

  it('disarms distortion and restores culling even if rendering throws', () => {
    const sensor = new SensorRenderer();
    const scene = new THREE.Scene();
    const line = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial());
    scene.add(line);
    const renderer = fakeRenderer(() => {
      throw new Error('GL lost');
    });

    expect(() =>
      sensor.render(renderer, scene, createSensorCamera({ model: 'fisheye' })),
    ).toThrow('GL lost');
    expect(SENSOR_UNIFORMS.uSensorActive!.value).toBe(0);
    expect(line.frustumCulled).toBe(true);
  });

  it('renders each call with its own camera values (several cameras, one scene)', () => {
    const scene = new THREE.Scene();
    scene.add(new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial()));
    const brown = createSensorCamera({ model: 'brown-conrady' });
    const fisheye = createSensorCamera({ model: 'fisheye' });
    const seen: number[] = [];
    const renderer = fakeRenderer(() => seen.push(SENSOR_UNIFORMS.uDistortionModel!.value));

    // Two separate SensorRenderers, same scene: each must use its own camera.
    new SensorRenderer({ camera: brown }).render(renderer, scene);
    new SensorRenderer({ camera: fisheye }).render(renderer, scene);
    new SensorRenderer().render(renderer, scene, brown);

    expect(seen).toEqual([1, 3, 1]);
  });

  it('throws a clear error when no camera is available', () => {
    expect(() => new SensorRenderer().render(fakeRenderer(() => {}), new THREE.Scene())).toThrow(
      /no camera/,
    );
  });

  it('accepts a camera directly as constructor argument', () => {
    const camera = createSensorCamera({ model: 'pinhole' });
    expect(new SensorRenderer(camera).getCamera()).toBe(camera);
  });
});

describe('computeSensorViewport', () => {
  const sensor = { imageWidth: 640, imageHeight: 480 };

  it('returns the full canvas when aspect matches', () => {
    expect(computeSensorViewport(sensor, 320, 240)).toEqual({ x: 0, y: 0, width: 320, height: 240 });
  });

  it('pillarboxes a canvas that is too wide', () => {
    expect(computeSensorViewport(sensor, 800, 480)).toEqual({ x: 80, y: 0, width: 640, height: 480 });
  });

  it('letterboxes a canvas that is too tall', () => {
    expect(computeSensorViewport(sensor, 640, 600)).toEqual({ x: 0, y: 60, width: 640, height: 480 });
  });
});

import { describe, expect, it } from 'vitest';
import { isInFrontOfOpenCvCamera } from '../../src/coords/opencv';
import {
  isInFrontOfThreeJsCamera,
  opencvCameraToThreeJs,
  threeJsCameraToOpenCv,
} from '../../src/coords/three';
import { vec3, type Vec3 } from '../../src/types';

function expectVec3Components(actual: Vec3, x: number, y: number, z: number): void {
  expect(actual[0]).toBeCloseTo(x);
  expect(actual[1]).toBeCloseTo(y);
  expect(actual[2]).toBeCloseTo(z);
}

describe('OpenCV ↔ Three.js camera coordinates', () => {
  it('maps a point in front of the camera', () => {
    expectVec3Components(opencvCameraToThreeJs(vec3(0, 0, 1)), 0, 0, -1);
    expect(isInFrontOfOpenCvCamera(vec3(0, 0, 1))).toBe(true);
    expect(isInFrontOfThreeJsCamera(vec3(0, 0, -1))).toBe(true);
  });

  it('maps a point above the image center', () => {
    expectVec3Components(opencvCameraToThreeJs(vec3(0, -1, 0)), 0, 1, 0);
  });

  it('maps a point to the right', () => {
    expectVec3Components(opencvCameraToThreeJs(vec3(1, 0, 0)), 1, 0, 0);
  });

  it('is self-inverse', () => {
    const opencv = vec3(0.2, -0.3, 1.5);
    expect(threeJsCameraToOpenCv(opencvCameraToThreeJs(opencv))).toEqual(opencv);
  });
});

import type { CameraMatrix } from '@three-camera-intrinsics-and-distortion-lab/core';
import * as THREE from 'three';

/** Default clip planes — match native THREE.PerspectiveCamera. */
export const SENSOR_CAMERA_NEAR = 0.1;
export const SENSOR_CAMERA_FAR = 2000;

/**
 * Build a Three.js projection matrix from OpenCV intrinsics K.
 * Maps eye-space coordinates (Three.js camera: visible when Z < 0) to clip space
 * consistent with OpenCV pixel output at the given image size.
 */
export function buildSensorProjectionMatrix(
  intrinsics: CameraMatrix,
  imageWidth: number,
  imageHeight: number,
  near: number = SENSOR_CAMERA_NEAR,
  far: number = SENSOR_CAMERA_FAR,
): THREE.Matrix4 {
  const { fx, fy, cx, cy } = intrinsics;
  const m = new THREE.Matrix4();
  const e = m.elements;

  const depthA = -(far + near) / (far - near);
  const depthB = -(2 * far * near) / (far - near);

  // Column-major: clip = M * [xe, ye, ze, 1]^T
  e[0] = (2 * fx) / imageWidth;
  e[4] = 0;
  e[8] = 1 - (2 * cx) / imageWidth;
  e[12] = 0;

  e[1] = 0;
  e[5] = (2 * fy) / imageHeight;
  e[9] = (2 * cy) / imageHeight - 1;
  e[13] = 0;

  e[2] = 0;
  e[6] = 0;
  e[10] = depthA;
  e[14] = depthB;

  e[3] = 0;
  e[7] = 0;
  e[11] = -1;
  e[15] = 0;

  return m;
}

import type {
  BrownConradyCoeffs,
  CameraMatrix,
  FisheyeCoeffs,
  RationalCoeffs,
} from '@three-camera-lab/core';
import * as THREE from 'three';
import type { ModelId } from '../demo/modelPresets';
import {
  buildSensorProjectionMatrix,
  SENSOR_CAMERA_FAR,
  SENSOR_CAMERA_NEAR,
} from './buildSensorProjectionMatrix';

export type DistortionModelId = ModelId;

export interface SensorCameraOptions {
  readonly model: DistortionModelId;
  readonly intrinsics: CameraMatrix;
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly near?: number;
  readonly far?: number;
  readonly brownConrady?: BrownConradyCoeffs;
  readonly rational?: RationalCoeffs;
  readonly fisheye?: FisheyeCoeffs;
}

/** OpenCV-calibrated sensor camera for Three.js rendering. */
export class SensorCamera extends THREE.Camera {
  readonly model: DistortionModelId;
  readonly intrinsics: CameraMatrix;
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly near: number;
  readonly far: number;
  readonly brownConrady: BrownConradyCoeffs | null;
  readonly rational: RationalCoeffs | null;
  readonly fisheye: FisheyeCoeffs | null;

  constructor(options: SensorCameraOptions) {
    super();
    this.model = options.model;
    this.intrinsics = options.intrinsics;
    this.imageWidth = options.imageWidth;
    this.imageHeight = options.imageHeight;
    this.near = options.near ?? SENSOR_CAMERA_NEAR;
    this.far = options.far ?? SENSOR_CAMERA_FAR;
    this.brownConrady = options.brownConrady ?? null;
    this.rational = options.rational ?? null;
    this.fisheye = options.fisheye ?? null;
    this.updateProjectionMatrix();
  }

  /** Whether forward distortion requires DistortionRenderPlugin. */
  usesDistortion(): boolean {
    switch (this.model) {
      case 'pinhole':
        return false;
      case 'brown-conrady':
        return !isZeroBrownConrady(this.brownConrady);
      case 'rational':
        return !isZeroRational(this.rational);
      case 'fisheye':
        return true;
      default:
        return false;
    }
  }

  override updateProjectionMatrix(): void {
    this.projectionMatrix.copy(
      buildSensorProjectionMatrix(
        this.intrinsics,
        this.imageWidth,
        this.imageHeight,
        this.near,
        this.far,
      ),
    );
    this.projectionMatrixInverse.copy(this.projectionMatrix).invert();
  }
}

function isZeroBrownConrady(coeffs: BrownConradyCoeffs | null): boolean {
  if (!coeffs) {
    return true;
  }
  return (
    coeffs.k1 === 0 &&
    coeffs.k2 === 0 &&
    coeffs.k3 === 0 &&
    coeffs.p1 === 0 &&
    coeffs.p2 === 0
  );
}

function isZeroRational(coeffs: RationalCoeffs | null): boolean {
  if (!coeffs) {
    return true;
  }
  return (
    coeffs.k1 === 0 &&
    coeffs.k2 === 0 &&
    coeffs.k3 === 0 &&
    coeffs.k4 === 0 &&
    coeffs.k5 === 0 &&
    coeffs.k6 === 0 &&
    coeffs.p1 === 0 &&
    coeffs.p2 === 0
  );
}

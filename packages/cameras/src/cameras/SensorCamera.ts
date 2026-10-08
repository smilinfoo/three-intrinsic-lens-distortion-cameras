import type {
  BrownConradyCoeffs,
  CameraMatrix,
  FisheyeCoeffs,
  RationalCoeffs,
} from 'intrinsic-lens-distortion';
import * as THREE from 'three';
import {
  buildSensorProjectionMatrix,
  SENSOR_CAMERA_FAR,
  SENSOR_CAMERA_NEAR,
} from './buildSensorProjectionMatrix';
import type { DistortionModelId } from './types';

export type { DistortionModelId };

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

export interface SensorCameraCoefficients {
  readonly brownConrady?: BrownConradyCoeffs | null;
  readonly rational?: RationalCoeffs | null;
  readonly fisheye?: FisheyeCoeffs | null;
}

/**
 * OpenCV-calibrated sensor camera for Three.js rendering.
 *
 * Positioned like any Three.js camera (looks down −Z, +Y up). Intrinsics and
 * coefficients are mutable via {@link setIntrinsics} / {@link setCoefficients};
 * the render path picks the new values up on the next `SensorRenderer.render`
 * without recompiling any material.
 */
export class SensorCamera extends THREE.Camera {
  readonly model: DistortionModelId;
  intrinsics: CameraMatrix;
  imageWidth: number;
  imageHeight: number;
  near: number;
  far: number;
  brownConrady: BrownConradyCoeffs | null;
  rational: RationalCoeffs | null;
  fisheye: FisheyeCoeffs | null;

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

  /** Replace K (and optionally the image size) and refresh the projection matrix. */
  setIntrinsics(intrinsics: CameraMatrix, imageWidth?: number, imageHeight?: number): this {
    this.intrinsics = intrinsics;
    if (imageWidth !== undefined) {
      this.imageWidth = imageWidth;
    }
    if (imageHeight !== undefined) {
      this.imageHeight = imageHeight;
    }
    this.updateProjectionMatrix();
    return this;
  }

  /** Replace distortion coefficients. Only the payload matching {@link model} is used. */
  setCoefficients(coefficients: SensorCameraCoefficients): this {
    if (coefficients.brownConrady !== undefined) {
      this.brownConrady = coefficients.brownConrady;
    }
    if (coefficients.rational !== undefined) {
      this.rational = coefficients.rational;
    }
    if (coefficients.fisheye !== undefined) {
      this.fisheye = coefficients.fisheye;
    }
    return this;
  }

  updateProjectionMatrix(): void {
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

  override copy(source: this, recursive?: boolean): this {
    super.copy(source, recursive);
    (this as { model: DistortionModelId }).model = source.model;
    this.intrinsics = source.intrinsics;
    this.imageWidth = source.imageWidth;
    this.imageHeight = source.imageHeight;
    this.near = source.near;
    this.far = source.far;
    this.brownConrady = source.brownConrady;
    this.rational = source.rational;
    this.fisheye = source.fisheye;
    this.updateProjectionMatrix();
    return this;
  }

  override clone(): this {
    return new SensorCamera({
      model: this.model,
      intrinsics: this.intrinsics,
      imageWidth: this.imageWidth,
      imageHeight: this.imageHeight,
      near: this.near,
      far: this.far,
      brownConrady: this.brownConrady ?? undefined,
      rational: this.rational ?? undefined,
      fisheye: this.fisheye ?? undefined,
    }).copy(this as never) as this;
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

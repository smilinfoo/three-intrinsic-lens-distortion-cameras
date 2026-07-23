/**
 * Pure camera math package.
 * No Three.js dependencies — implementations will be added incrementally.
 */

export const PACKAGE_NAME = '@three-camera-lab/core';

export * from './types';
export * from './coords/opencv';
export * from './coords/three';
export * from './projection/pinhole';
export * from './projection/intrinsics';
export * from './projection/rays';
export * from './distortion/brown-conrady';
export * from './distortion/rational';
export * from './distortion/fisheye';
export * from './undistortion/pinhole';
export * from './undistortion/brown-conrady';
export * from './undistortion/rational';
export * from './undistortion/fisheye';

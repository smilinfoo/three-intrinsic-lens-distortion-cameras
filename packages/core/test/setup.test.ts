import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from '../src/index';

describe('@three-camera-intrinsics-and-distortion-lab/core', () => {
  it('exports the package name', () => {
    expect(PACKAGE_NAME).toBe('@three-camera-intrinsics-and-distortion-lab/core');
  });
});

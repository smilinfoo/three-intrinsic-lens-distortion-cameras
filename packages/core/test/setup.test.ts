import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from '../src/index';

describe('@three-camera-lab/core', () => {
  it('exports the package name', () => {
    expect(PACKAGE_NAME).toBe('@three-camera-lab/core');
  });
});

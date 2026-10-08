import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from '../src/index';

describe('intrinsic-lens-distortion', () => {
  it('exports the package name', () => {
    expect(PACKAGE_NAME).toBe('intrinsic-lens-distortion');
  });
});

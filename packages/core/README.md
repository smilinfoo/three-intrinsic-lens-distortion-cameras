# intrinsic-lens-distortion

OpenCV-compatible camera math in TypeScript — pinhole, Brown-Conrady, rational polynomial and
fisheye: forward projection, inverse undistortion and pixel→ray. No Three.js dependency.
Verified against OpenCV golden fixtures.

```ts
import {
  cameraMatrixFromArray,
  brownConradyFromArray,
  projectBrownConrady,
} from 'intrinsic-lens-distortion';

const K = cameraMatrixFromArray([[800, 0, 320], [0, 800, 240], [0, 0, 1]]);
const coeffs = brownConradyFromArray([-0.2, 0.05, 0.001, -0.001, 0.001]);
const [u, v] = projectBrownConrady([0.1, 0, 1], K, coeffs);
```

ESM only. See the [repository](https://github.com/smilinfoo/three-camera-intrinsics-and-distortion-lab)
for conventions and model references.

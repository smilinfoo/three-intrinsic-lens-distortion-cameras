# three-intrinsic-lens-distortion-cameras

Render a Three.js scene through an OpenCV-calibrated camera — pinhole, Brown-Conrady, rational
polynomial or fisheye — using built-in materials unchanged. Distortion is applied in the vertex
stage via a shader patch (`Material.onBeforeCompile`).

```ts
import * as THREE from 'three';
import { SensorCamera, SensorRenderer, fitRendererToSensor } from 'three-intrinsic-lens-distortion-cameras';
import { cameraMatrixFromArray, brownConradyFromArray } from 'intrinsic-lens-distortion';

const camera = new SensorCamera({
  model: 'brown-conrady', // or 'rational' | 'fisheye' | 'pinhole'
  intrinsics: cameraMatrixFromArray([[fx, 0, cx], [0, fy, cy], [0, 0, 1]]),
  imageWidth: 1920,
  imageHeight: 1080,
  brownConrady: brownConradyFromArray([k1, k2, p1, p2, k3]),
});

const renderer = new THREE.WebGLRenderer();
fitRendererToSensor(renderer, camera); // canvas aspect must match the sensor image

const sensor = new SensorRenderer();
sensor.render(renderer, scene, camera);
```

- Peer dependency: `three` **0.178.x** (shader chunk names are version-sensitive). `@types/three` is an optional peer.
- Supported: built-in `Mesh*`, `Line*`, `Points` materials (incl. instancing). Custom `ShaderMaterial`s opt in with
  `material.userData.sensorDistortion = true` if they include `<project_vertex>`. Sprites are not supported.
- Distortion is per-vertex: tessellate large flat geometry or straight edges stay straight between vertices.
- One scene can be rendered through any number of cameras; a stock Three.js camera rendering the same scene afterwards is unaffected.
- WebGL 2 only.
- Object selection / ray picking is **not implemented yet (planned)**. `pixelToThreeRayFromCamera` returns only the ray direction for a pixel; don't use `THREE.Raycaster.setFromCamera` with a distorting `SensorCamera` (it assumes the pinhole projection).

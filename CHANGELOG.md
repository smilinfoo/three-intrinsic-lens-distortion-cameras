# Changelog

All notable changes to this project are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/) for future npm releases.
Until the packages are published to npm, versions mark **lab milestones** in the monorepo. Since `[Unreleased]` the packages are publish-ready (no longer `"private"`) but still **not published**.

## [Unreleased]

Phase 9 — publishable camera library. **Still not published to npm.**

### Changed (breaking, 0.x)

- **Packages renamed** (never published under the old names): `@three-camera-intrinsics-and-distortion-lab/core` → `intrinsic-lens-distortion`, `@three-camera-intrinsics-and-distortion-lab/viz` → `three-intrinsic-lens-distortion-cameras`. The `viz` directory is now `packages/cameras`. The project is titled "Three.js Intrinsic Lens-Distortion Cameras".
- `SensorRenderer.render(renderer, scene, camera?)` now takes the camera per call, so one scene can be rendered through any number of cameras. `new SensorRenderer()` no longer needs a camera.
- Removed `SensorRenderer.create()`, `setModel()` and `forceMaterialRecompile()`, and `DistortionRenderPlugin.attach()`/`detach()`. Model presets (`createSensorCamera`) moved to the demo and are no longer part of the library.
- `DistortionRenderPlugin.prepareScene(scene, camera)` now takes the camera. A pinhole or zero-distortion camera no longer patches or unpatches materials. `restoreScene(scene)` removes the patch explicitly.
- `SensorCamera` intrinsics, image size and coefficients are now mutable (`setIntrinsics`, `setCoefficients`) and `clone()` works.
- `three` is now a peer dependency (`>=0.178.0 <0.179.0`); `@types/three` is an optional peer.

### Fixed

- Several `SensorRenderer`s on one scene used the first one's camera for every view, and distortion was recompiled every frame.
- Rendering a scene with a stock camera after a sensor render came out distorted.
- Same-model cameras with different intrinsics could render with stale values.
- Barrel and fisheye distortion could wrongly cull objects at the image edge (frustum culling is now disabled while a distorting camera renders).
- `SpriteMaterial` was listed as patchable but never was; it is now documented as unsupported.

### Added

- Public entry `packages/cameras/src/index.ts`; `fitRendererToSensor` / `computeSensorViewport` for sensor-aspect canvases.
- Opt-in patching of custom `ShaderMaterial`s that include `<project_vertex>` (`material.userData.sensorDistortion = true`), `ShadowMaterial` support, and a one-time warning for unsupported materials.
- `core` and the cameras package build to ESM + `.d.ts` (tsup), are no longer private, and have `exports`, `files`, READMEs and LICENSE.
- `npm run pack:check`, `npm run test:consumer` and `npm run typecheck`; `@types/three` added so types are actually checked.
- Example scene (one lit scene through four cameras, CPU-projection overlay, per-view error readout) and a "Try your own camera" form that checks a custom K against `core`.
- Playwright visual suite (`npm run test:visual`, software WebGL) checking GPU output within 1 px of `core`, plus multi-camera, material and form tests.
- CI jobs for typecheck, library and demo builds, pack check, consumer smoke test and the visual suite.

### Known limitations (new)

- Distortion is per-vertex: tessellate flat geometry. Points at or behind the camera plane aren't rendered, so fisheye above 180° isn't supported.
- Sprites and `Line2` are unsupported. WebGL 2 only.
- **No object selection / ray picking yet (planned).** Only the pixel→ray direction (`pixelToThreeRayFromCamera`) is provided; nothing intersects rays with the scene. `THREE.Raycaster.setFromCamera` is not valid for distorting `SensorCamera`s.
- The shader uses pixel-edge coordinates while OpenCV uses pixel centres, so there can be up to 0.5 px of difference against a real photo.

### Test summary

| Package | Tests |
|---------|------:|
| `core` | 87 |
| `cameras` | 80 |
| **Total** | **167** |

Plus 29 Playwright visual tests (`npm run test:visual`, not part of `npm test`).

## [0.1.0] - 2026-07-23

First public lab release — Phases 0–8 complete. **Not published to npm.**

### Added

#### `@three-camera-intrinsics-and-distortion-lab/core`

- OpenCV-compatible camera math (no Three.js dependency):
  - **Pinhole** — forward projection, undistortion, pixel→camera ray
  - **Brown-Conrady** — forward distortion, iterative inverse, pixel→ray
  - **Rational polynomial** — forward, inverse, pixel→ray
  - **OpenCV fisheye** — forward, inverse, pixel→ray
- OpenCV ↔ Three.js coordinate helpers (`coords/opencv.ts`, `coords/three.ts`)
- Golden tests against Python/OpenCV fixtures under `reference/fixtures/`
- **87 tests** in `core`

#### `@three-camera-intrinsics-and-distortion-lab/viz`

- Split demo: 2D OpenCV projection canvas + Three.js sensor view
- `SensorRenderer`, `SensorCamera`, `DistortionRenderPlugin` (built-in materials only)
- GLSL distortion chunks mirroring `core` forward math
- `pixelToThreeRayFromCamera` with documented frame conversion
- Model switcher: pinhole, Brown-Conrady, rational, fisheye
- **25 tests** in `viz` (plugin lifecycle, matrix parity, pixel→ray; no GPU goldens)

#### Reference & tooling

- Python/OpenCV fixture generator and `npm run verify:opencv`
- GitHub Actions CI: `npm test`, `npm run build`, OpenCV verification
- Docs: coordinate conventions, per-model equations, sensor rendering architecture, phase plans
- `CONTRIBUTING.md`, MIT `LICENSE`

### Known limitations

- Packages are **not on npm** — clone and import TypeScript sources from the monorepo
- **Extrinsics** (`rvec` / `tvec` → Three.js pose) not implemented
- Custom `ShaderMaterial` / `RawShaderMaterial` not supported by the distortion plugin
- Viz is visual sanity only; numerical correctness is gated by `core` golden tests

### Test summary

| Package | Tests |
|---------|------:|
| `core` | 87 |
| `viz` | 25 |
| **Total** | **112** |

[Unreleased]: https://github.com/smilinfoo/three-intrinsic-lens-distortion-cameras/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/smilinfoo/three-intrinsic-lens-distortion-cameras/releases/tag/v0.1.0

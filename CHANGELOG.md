# Changelog

All notable changes to this project are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/) for future npm releases.
Until `@three-camera-intrinsics-and-distortion-lab/core` is published, versions mark **lab milestones** in the monorepo (packages remain `"private": true`).

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

[0.1.0]: https://github.com/smilinfoo/three-camera-intrinsics-and-distortion-lab/releases/tag/v0.1.0

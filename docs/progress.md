# Progress

Last updated: 2026-07-23

Public-facing overview: [README](../README.md) · CI: [.github/workflows/ci.yml](../.github/workflows/ci.yml)

## Documentation map

| Doc | Purpose |
|-----|---------|
| [docs/progress.md](./progress.md) | **Start here** — current phase, next step, prompts |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Setup, package boundaries, PR checklist |
| [docs/plans/](./plans/) | Per-phase implementation plans |
| [docs/models/](./models/) | Per-model equations and API reference |
| [docs/coordinate-conventions.md](./coordinate-conventions.md) | Coordinate frames, pipelines, policies |
| [docs/sensor-rendering.md](./sensor-rendering.md) | SensorCamera + DistortionRenderPlugin architecture |

---

## Current position

**Phase 8 — Sensor cameras & distortion render plugin** ✅ complete

All planned phases (0–8) implemented.

---

## Phase checklist

| Phase | Plan | Status |
|-------|------|--------|
| **0 — Scaffold** | — | ✅ Done |
| **1 — Conventions + types** | [coordinate-conventions.md](./coordinate-conventions.md) | ✅ Done |
| **2 — Pinhole** | [plans/phase-2-pinhole.md](./plans/phase-2-pinhole.md) | ✅ Done |
| **3 — Brown-Conrady** | [plans/phase-3-brown-conrady.md](./plans/phase-3-brown-conrady.md) | ✅ Done |
| **4 — Rational polynomial** | [plans/phase-4-rational.md](./plans/phase-4-rational.md) | ✅ Done |
| **5 — OpenCV fisheye** | [plans/phase-5-fisheye.md](./plans/phase-5-fisheye.md) | ✅ Done |
| **6 — Viz (minimal)** | [plans/phase-6-viz.md](./plans/phase-6-viz.md) | ✅ Done |
| **7 — Inverse distortion & pixel-to-ray** | [plans/phase-7-inverse-and-rays.md](./plans/phase-7-inverse-and-rays.md) | ✅ Done |
| **8 — Sensor cameras & render plugin** | [plans/phase-8-threejs-camera.md](./plans/phase-8-threejs-camera.md) | ✅ Done |

---

## Implemented

### Core (`@three-camera-intrinsics-and-distortion-lab/core`)

| Model | Forward | Inverse | Rays |
|-------|---------|---------|------|
| Pinhole | `projection/pinhole.ts` | `undistortion/pinhole.ts` | `pixelToCameraRayPinhole` |
| Brown-Conrady | `distortion/brown-conrady.ts` | `undistortion/brown-conrady.ts` | `pixelToCameraRayBrownConrady` |
| Rational | `distortion/rational.ts` | `undistortion/rational.ts` | `pixelToCameraRayRational` |
| Fisheye | `distortion/fisheye.ts` | `undistortion/fisheye.ts` | `pixelToCameraRayFisheye` |

**87 tests** in `core`. **25 tests** in `viz`. **112 total** (`npm test`).

### Viz (`@three-camera-intrinsics-and-distortion-lab/viz`)

| Component | Path |
|-----------|------|
| **`SensorRenderer`** (entry point — **see module docstring for usage**) | `sensor/SensorRenderer.ts` |
| `SensorCamera` | `cameras/SensorCamera.ts` |
| `createSensorCamera()` | `cameras/createSensorCamera.ts` |
| `buildSensorProjectionMatrix()` | `cameras/buildSensorProjectionMatrix.ts` |
| `DistortionRenderPlugin` | `render/DistortionRenderPlugin.ts` |
| GLSL distortion mirrors | `shaders/chunks/distortion.glsl.ts` |
| `pixelToThreeRayFromCamera()` | `cameras/pixelToRay.ts` |

Viz tests cover projection matrix parity, `DistortionRenderPlugin` patch/unpatch lifecycle, `usesDistortion()`, and pixel→ray frame conversion. **`npm run dev`** — split demo: 2D reference canvas + Three.js sensor view (grid lines, points, instanced markers).

---

## Commands

```bash
npm run setup && npm test && npm run dev
```

GitHub Actions runs `npm test`, `npm run build`, and `npm run verify:opencv` on push/PR.

---

## Publishing

Repo is public as a **lab** today; **`@three-camera-intrinsics-and-distortion-lab/core` npm library** is planned soon. See [README](../README.md#lab-today-library-soon) and [CHANGELOG](../CHANGELOG.md).

---

## Next steps (optional enhancements)

- Sensor image backdrop (pre-captured photo aligned via shared `K`)
- OpenCV extrinsics → Three.js camera pose
- Additional distortion backends beyond OpenCV
- Ray picking UI wired to `pixelToThreeRayFromCamera`

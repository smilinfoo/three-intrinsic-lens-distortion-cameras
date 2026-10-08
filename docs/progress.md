# Progress

Last updated: 2026-10-04

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

**Phase 9 — Publishable camera library** ✅ code complete (release docs, naming and npm org still to do)

All planned phases (0–9) implemented. Nothing is published to npm.

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
| **9 — Publishable library** | Public API, shared-uniform plugin, example scene, GPU parity tests, packaging, custom-camera demo form | ✅ Code done; release prep pending |

---

## Implemented

### Core (`intrinsic-lens-distortion`)

| Model | Forward | Inverse | Rays |
|-------|---------|---------|------|
| Pinhole | `projection/pinhole.ts` | `undistortion/pinhole.ts` | `pixelToCameraRayPinhole` |
| Brown-Conrady | `distortion/brown-conrady.ts` | `undistortion/brown-conrady.ts` | `pixelToCameraRayBrownConrady` |
| Rational | `distortion/rational.ts` | `undistortion/rational.ts` | `pixelToCameraRayRational` |
| Fisheye | `distortion/fisheye.ts` | `undistortion/fisheye.ts` | `pixelToCameraRayFisheye` |

**87 tests** in `core`. **80 tests** in `cameras`. **167 total** (`npm test`, no browser or GPU). Plus the GPU/visual suite (`npm run test:visual`, Playwright + software WebGL).

### Cameras (`three-intrinsic-lens-distortion-cameras`)

Public entry: `packages/cameras/src/index.ts` (nothing from `demo/` or `main.ts` is exported).

| Component | Path |
|-----------|------|
| `SensorCamera` (mutable K / coefficients, `clone`) | `cameras/SensorCamera.ts` |
| `ModelId`, `DistortionModelId` | `cameras/types.ts` |
| `buildSensorProjectionMatrix()` | `cameras/buildSensorProjectionMatrix.ts` |
| `pixelToThreeRay()`, `pixelToThreeRayFromCamera()` | `cameras/pixelToRay.ts` |
| `DistortionRenderPlugin` (shared uniforms, `beginRender`/`endRender`) | `render/DistortionRenderPlugin.ts` |
| **`SensorRenderer`** (`render(renderer, scene, camera)` — **module docstring is the canonical usage**) | `sensor/SensorRenderer.ts` |
| `fitRendererToSensor()`, `computeSensorViewport()` | `sensor/fitRendererToSensor.ts` |
| GLSL distortion mirrors | `shaders/chunks/distortion.glsl.ts` |

Demo / example scene (not published): `main.ts`, `scene/createScene.ts`, `demo/` (presets, probes, measurement, custom-camera validation).

Unit tests cover patching across built-in materials, shared-uniform lifecycle, camera mutation, public API surface, projection matrix parity and pixel→ray conversion. Visual tests (`packages/cameras/test/visual/`) render probe points through each model and require ≤ 1 px agreement with `core`, plus multi-camera isolation, stock-camera isolation, live coefficient changes, per-material coverage and the custom-camera form.

**`npm run dev`** — demo: 2D reference canvas, one lit/textured scene through four sensor cameras with a CPU-projection overlay and per-view probe error, and a **"Try your own camera"** form (model, image size, `fx`/`fy`/`cx`/`cy`, coefficients) that checks the GPU render against `core`.

---

## Commands

```bash
npm run setup && npm test && npm run dev
npm run build            # both libraries → dist/ (ESM + .d.ts)
npm run build:demo       # demo app → packages/cameras/demo-dist/
npm run test:visual      # GPU checks (first run: npx playwright install chromium)
npm run pack:check       # publint + type resolution + dry-run pack (publishes nothing)
npm run test:consumer    # install packed tarballs into a throwaway project (publishes nothing)
```

GitHub Actions runs `npm test`, `typecheck`, `build`, `build:demo`, `pack:check`, `test:consumer`, the visual suite (screenshots uploaded as an artifact) and `npm run verify:opencv` on push/PR.

---

## Publishing

Both packages are publish-ready (ESM + types, `publint` and type-resolution clean, consumer-install verified, `three@0.178.x` peer range) but **nothing is published**. Remaining release work:

- Release docs and package READMEs review, CHANGELOG entry
- Package naming decision (`cameras` is a lab name; consider a Three.js-oriented name before first publish) and npm org/scope ownership
- `npm publish --provenance` once the above is settled

See [README](../README.md#status-and-availability) and [CHANGELOG](../CHANGELOG.md).

---

## Next steps (optional enhancements)

- Sensor image backdrop (pre-captured photo aligned via shared `K`) — mind the half-pixel origin note in [sensor-rendering.md](./sensor-rendering.md)
- OpenCV extrinsics → Three.js camera pose
- Additional distortion backends beyond OpenCV
- **Object selection / ray picking (planned — not implemented):** today only the pixel→ray direction exists. Add a world-space ray from a sensor pixel (apply `camera.matrixWorld`), a `Raycaster` wrapper that is correct for distorting cameras (`setFromCamera` is not), and a demo click-to-select
- Optional geometry subdivision helper so flat meshes distort smoothly without manual tessellation
- Commit screenshot baselines generated on CI and enable regression comparison there

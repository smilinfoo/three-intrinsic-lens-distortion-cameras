# Three.js Intrinsic Lens-Distortion Cameras

> **Status:** Pre-release (0.x) — **not on npm yet**. Core math is verified against OpenCV golden fixtures and the Three.js layer is checked against it on the GPU, but the API may still change and the [known limitations](#scope--limitations) apply. Treat it as suitable for evaluation or prototyping, but lets talk before using it  production.
> Need now or have a specific use case? [Open an issue](https://github.com/smilinfoo/three-camera-intrinsics-and-distortion-lab/issues/new/choose) or contact [@smilinfoo](https://github.com/smilinfoo).

The original use was compareing data tags, bounds and other labeling givien in flat cartesian points to a 2d image taakenb with a given distortion profile.  It is a Three.js cameras that renders a scene, seen through a lens with the given intrisics ad distor. Give it OpenCV intrinsics and lens-distortion coefficients (pinhole, Brown-Conrady, rational polynomial or fisheye) and it projects your 3D geometry through that model, with built-in materials unchanged, so 3D bounding boxes, points and labels land on the same pixels as content derived from the 2D image. 


```typescript
import { SensorCamera, SensorRenderer, fitRendererToSensor } from 'three-intrinsic-lens-distortion-cameras';
import { cameraMatrixFromArray, brownConradyFromArray } from 'intrinsic-lens-distortion';

const camera = new SensorCamera({
  model: 'brown-conrady', // or 'rational' | 'fisheye' | 'pinhole'
  intrinsics: cameraMatrixFromArray([[fx, 0, cx], [0, fy, cy], [0, 0, 1]]),
  imageWidth: 1920,
  imageHeight: 1080,
  brownConrady: brownConradyFromArray([k1, k2, p1, p2, k3]),
});
fitRendererToSensor(renderer, camera);
new SensorRenderer().render(renderer, scene, camera); // built-in materials, unchanged
```

Details and the other models are under [Usage](#usage-from-source). The focus is **camera intrinsics and lens distortion** — not multi-camera rigs, SLAM, or finding the intrinics.

**Docs:** [progress](./docs/progress.md) · [changelog](./CHANGELOG.md) · [contributing](./CONTRIBUTING.md) · [coordinate conventions](./docs/coordinate-conventions.md) · [sensor rendering](./docs/sensor-rendering.md) · [model reference](./docs/models/)

## What's in the box

| Package | What it is | Use it for |
|---------|------------|------------|
| **`three-intrinsic-lens-distortion-cameras`** | **The cameras.** `SensorCamera`, `SensorRenderer` and `DistortionRenderPlugin` (public entry `src/index.ts`): a `THREE.Camera` plus a shader patch that renders a scene through a pinhole, Brown-Conrady, rational or fisheye model. Also hosts the demo / example scene (not exported) | Rendering a Three.js scene as seen by a real distorted camera |
| **`intrinsic-lens-distortion`** | The math underneath: forward projection, inverse undistortion and pixel→ray in plain TypeScript (no Three.js), OpenCV-compatible | The numerical contract; also usable on its own |
| **`reference/`** | Python/OpenCV fixture generator + verification | Producing the golden vectors that pin `core` to OpenCV; optional for library users |

**How it is verified:** Python/OpenCV generates test vectors that `core` must match. The GPU path in `cameras` is then checked against `core` in headless Chromium, and the browser demo lets you enter your own intrinsics and see whether the GPU render matches the CPU projection.

### Status and availability

Both packages build to `dist/` (ESM + `.d.ts`) and are no longer marked private, but **nothing is published to npm yet**. Until then, clone the repo and build locally (`npm run build`), or install the packed tarballs (`npm pack` in each package). Do not expect semver stability yet.

API is **0.x** — correct and tested, but still evolving before a 1.0 release. Treat **`core` as the numerical contract**; `cameras` is the Three.js layer on top of it.

## Setup for dev

```bash
npm run setup    # JS deps + Python .venv (for fixtures / verify only)
npm test         # 167 tests (87 core + 80 cameras) — no GPU or browser needed
npm run dev      # demo: one scene through four sensor cameras + a form for your own intrinsics
npm run test:visual   # GPU-vs-core checks in headless Chromium (first run: npx playwright install chromium)
```

Python is only needed for regenerating fixtures or running `npm run verify:opencv`. Core tests run with Node alone.

## Scope & limitations

- **Models:** OpenCV pinhole, Brown-Conrady, rational polynomial, OpenCV fisheye
- **Correctness gate:** golden tests in `core` (not the demo)
- **Sensor rendering:** built-in Three.js `Mesh*` / `Line*` / `Points` materials (incl. instancing and shadows). Custom `ShaderMaterial`s are not patched unless they include `<project_vertex>` and set `material.userData.sensorDistortion = true`; 
- **SPRITES ARE UNSUPPORTED ([details](./docs/sensor-rendering.md))**
- **Distortion is per-vertex:** fragments interpolate linearly, so tessellate large flat geometry or straight edges stay straight between vertices. Points at or behind the camera plane (Z ≤ 0) are not rendered, so fisheye FOV above 180° is unsupported
- **Renderer:** WebGL 2 only (no WebGPU)
- **Pixel origin:** the sensor view treats `(u, v)` as measured from the pixel's top-left *edge*, while OpenCV and `core` measure from the pixel *centre* (`core` adds no ±0.5 offset). Expect up to half a pixel of difference when overlaying on a real photo; the visual tests compare in the shader's convention
- **Coordinates:** OpenCV vs Three.js frame conversion is documented and applied in the cameras package — read [coordinate-conventions.md](./docs/coordinate-conventions.md) before integrating
- **Object selection / ray picking is not implemented yet (planned).** There is currently no way to click a pixel and select the object under it. The library only returns the ray *direction* for a pixel (`pixelToThreeRayFromCamera`); it does no intersection against the scene. Do **not** use `THREE.Raycaster.setFromCamera(ndc, sensorCamera)` with a distorting camera — it assumes the pinhole projection matrix and will pick the wrong objects. Until selection lands, build the ray from `pixelToThreeRayFromCamera`, transform it by `camera.matrixWorld`, and intersect it yourself
- **Extrinsics:** OpenCV `rvec` / `tvec` → Three.js camera pose is **not implemented**; demo geometry is authored in the OpenCV camera frame with identity extrinsics

## Usage (from source)

### Cameras — render a scene through a sensor camera

```typescript
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
sensor.render(renderer, scene, camera); // scene content uses built-in materials, unchanged
```

- `SensorCamera` is a `THREE.Camera`: position it like any camera (looks down −Z, +Y up). The OpenCV↔Three.js frame conversion happens in the shader — do not rotate scene content.
- Pass the camera per call, so **one scene can be rendered through any number of cameras**. A stock `THREE.Camera` rendering the same scene afterwards is unaffected.
- Intrinsics and coefficients are mutable (`camera.setIntrinsics(...)`, `camera.setCoefficients(...)`); changes apply on the next render with no shader recompile.
- `fitRendererToSensor(renderer, camera, { mode: 'letterbox' })` keeps an existing canvas size and confines rendering to a centered sensor-aspect rectangle.
- `pixelToThreeRayFromCamera([u, v], camera)` returns the unit ray *direction* for a sensor pixel in the camera frame. It is a building block only: scene intersection and object selection are not implemented yet (see limitations).

The same snippet lives in the module docstring of [`SensorRenderer`](./packages/cameras/src/sensor/SensorRenderer.ts) and in [`packages/cameras/README.md`](./packages/cameras/README.md).

### Core — projection

```typescript
import {
  cameraMatrixFromArray,
  brownConradyFromArray,
  projectBrownConrady,
} from 'intrinsic-lens-distortion';

const K = cameraMatrixFromArray([[800, 0, 320], [0, 800, 240], [0, 0, 1]]);
const coeffs = brownConradyFromArray([-0.2, 0.05, 0.001, -0.001, 0.001]);
const pixel = projectBrownConrady([0.1, 0, 1], K, coeffs);
```

## Demo / example scene (`npm run dev`)

- **Left:** 2D grid in OpenCV pixel space — independent canvas reference for the selected model
- **Right:** **one** standard Three.js scene (lit, textured, tessellated floor and wall, one sphere per built-in material, box, calibration grid, shadows) rendered through **four** sensor cameras at once: pinhole, Brown-Conrady, rational, fisheye
- **CPU overlay (magenta):** `core` projects the same 3D points on the CPU and draws them on top of each GPU view. Green probe markers are scene points; they should sit under the magenta crosses. Each view shows its maximum probe error in pixels
- **Try your own camera:** the form under the four views takes a model, image size, `fx`/`fy`/`cx`/`cy` and that model's coefficients (OpenCV order). It renders a fifth view through your camera, places probe points from *your* intrinsics (so they land inside your image), and reports whether the GPU render matches the CPU projection from `core` (✓ ≤ 1 px, with errors for invalid input). Use it to sanity-check calibration values before wiring them into your own scene
- The example imports only the public entry (`packages/cameras/src/index.ts`), so it doubles as an API-shape check

The demo is for visual sanity; trust `core` golden tests for numerical correctness.

## Commands

| Command | Description |
|---------|-------------|
| `npm run setup` | Install JS deps + create `.venv` with Python reference package |
| `npm run setup:python` | Create/update `.venv` only |
| `npm test` | Vitest — 167 tests (87 `core`, 80 `cameras`); no browser or GPU |
| `npm run typecheck` | `tsc --noEmit` for both packages |
| `npm run build` | Build both libraries to `dist/` (ESM + `.d.ts`; `core` first, then `cameras`) |
| `npm run build:demo` | Build the demo app to `packages/cameras/demo-dist/` |
| `npm run dev` | Vite dev server (demo / example scene) |
| `npm run test:visual` | Playwright + software WebGL (a few minutes — software rendering is slow): GPU-vs-`core` parity, multi-camera, material coverage, the custom-camera form; writes screenshots to `packages/cameras/artifacts/visual/`. First run needs `npx playwright install chromium` |
| `npm run pack:check` | Build, `npm pack --dry-run`, `publint`, type-resolution check (`attw`). Publishes nothing |
| `npm run test:consumer` | Install the packed tarballs into a throwaway project, type-check, bundle and import them. Publishes nothing |
| `npm run generate:fixtures` | Regenerate OpenCV golden JSON fixtures |
| `npm run verify:opencv` | OpenCV smoke test inside `.venv` |

CI (GitHub Actions): `npm test`, `typecheck`, `build`, `build:demo`, `pack:check`, `test:consumer`, the visual suite (with screenshots uploaded as an artifact), and `npm run verify:opencv` on every push/PR.

Screenshot baseline comparison is opt-in: `npm run test:visual:regression -w three-intrinsic-lens-distortion-cameras` (baselines are software-GL renders; regenerate with `--update-snapshots` after intended changes).

## Project layout

```
three-camera-intrinsics-and-distortion-lab/
├── docs/                 # Conventions, architecture, phase plans, model equations
├── packages/
│   ├── core/             # intrinsic-lens-distortion — camera math (library target)
│   └── cameras/              # Three.js library (SensorCamera, SensorRenderer) + demo / example scene + visual tests
├── reference/            # Python/OpenCV fixtures + generator
├── scripts/
└── .github/workflows/    # CI
```

## Prerequisites

- **Node.js 20+** — required
- **Python 3.10+** — optional (fixtures, OpenCV verification)

```bash
PYTHON=/path/to/python3.12 npm run setup:python   # pin interpreter if needed
```

## Dependencies

| Package | Version | Notes |
|---------|---------|--------|
| **three** | `0.178.0` (dev); peer range `>=0.178.0 <0.179.0` | Sensor rendering uses WebGL 2 / GLSL 3.0 and `Material.onBeforeCompile`. Test before widening the range — shader chunk names and compile lifecycle change across Three.js releases. `@types/three` is an optional peer. |
| **tsup** | `^8.5` | Library builds (ESM + `.d.ts`) |
| **@playwright/test** | `^1.63` | Visual suite only (software WebGL in Chromium) |
| **vite** | `^7.0.5` | Demo dev/build only |
| **vitest** | `^3.2.4` | Tests |
| **opencv-python** | `>=4.9` | Fixture generator only (Python `.venv`) |

Run `npm audit` periodically; CI does not fail on audit today — check locally before releases.

**Local-only paths (gitignored):** `dist/`, `.venv/`, `.env` — never commit build output, virtualenvs, or secrets.

## Testing strategy

1. **Unit tests** — hand-crafted edge cases per model (symmetry, zero distortion, behind-camera policy)
2. **Golden tests** — Python-generated fixtures under `reference/fixtures/`; primary correctness gate
3. **Cameras unit tests** — plugin patching across built-in materials, shared-uniform lifecycle, projection matrix parity, camera mutation, public API surface, pixel→ray frame conversion
4. **Visual tests** (`npm run test:visual`) — real GPU path in headless Chromium: probe points rendered through each camera must land within 1 px of the `core` projection; several cameras on one scene must not interfere; a stock camera afterwards must be undistorted; every built-in material must compile and render; the "Try your own camera" form must accept valid intrinsics (any model, image size and principal point), reject invalid ones, and report a pass only when the GPU matches `core`
5. **Packaging checks** — `pack:check` and `test:consumer` prove the tarballs install, type-check and bundle in a fresh project

See [docs/progress.md](./docs/progress.md) for the full phase checklist (Phases 0–8 complete).

## Convention documentation

Authoritative reference: [docs/coordinate-conventions.md](./docs/coordinate-conventions.md).

| Topic | Status |
|-------|--------|
| OpenCV vs Three.js camera frames | ✅ |
| Distortion on normalized plane, before `K` | ✅ |
| Behind-camera points (`Z ≤ 0`) | ✅ Excluded from fixtures |
| Golden-test tolerance | ✅ `1e-4` px absolute |
| Per-model coefficient layouts | ✅ [docs/models/](./docs/models/) |

## License

[MIT](./LICENSE)

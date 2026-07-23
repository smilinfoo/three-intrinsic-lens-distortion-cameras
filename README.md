# Three-Camera Intrinsics and Distortion Lab

> **Status:** Public research lab — **not on npm**, **not for production use** yet.
> **Planned:** publish `@three-camera-intrinsics-and-distortion-lab/core` with built artifacts and semver.
> Need it sooner or have a specific use case? [Open an issue](https://github.com/smilinfoo/three-camera-intrinsics-and-distortion-lab/issues/new/choose) or contact [@smilinfoo](https://github.com/smilinfoo).

OpenCV-compatible camera projection, undistortion, and pixel→ray math in TypeScript — verified against OpenCV golden fixtures, with a reference Three.js sensor-rendering demo.

**Docs:** [progress](./docs/progress.md) · [changelog](./CHANGELOG.md) · [contributing](./CONTRIBUTING.md) · [coordinate conventions](./docs/coordinate-conventions.md) · [sensor rendering](./docs/sensor-rendering.md) · [model reference](./docs/models/)

## What this is

**Three-Camera Intrinsics and Distortion Lab** is an educational monorepo focused on **camera intrinsics and lens distortion** (not general multi-camera rigs, SLAM, or full calibration workflows). Python/OpenCV generates golden test vectors; TypeScript implements the same math and (optionally) renders it in Three.js.

| Package | Role today | For library users |
|---------|------------|-------------------|
| **`@three-camera-intrinsics-and-distortion-lab/core`** | Portable camera math (no Three.js) | **Primary reusable API** — forward projection, inverse undistortion, pixel→ray |
| **`@three-camera-intrinsics-and-distortion-lab/viz`** | Reference demo + sensor rendering (`SensorRenderer`) | Illustrates Three.js integration; source import from the monorepo for now |
| **`reference/`** | Python/OpenCV fixture generator + verification | Optional — not required to use `core` in your own project |

### Lab today, library soon

The repo is set up as a **clone-and-explore lab** (see [status](#three-camera-intrinsics-and-distortion-lab) above): packages are `"private": true`, exports point at TypeScript sources, and the viz app is the main way to see sensor rendering in action.

Until npm publish, clone the repo and import from source — do not expect semver stability or published tarballs. The viz layer may follow **`core`** on npm once the sensor API settles. Treat **`core` as the contract** and viz as a worked example.

API is **0.x** — correct and tested, but still evolving before a 1.0 library release.

## Quick start

```bash
npm run setup    # JS deps + Python .venv (for fixtures / verify only)
npm test         # 112 tests (87 core + 25 viz)
npm run dev      # split demo: 2D projection canvas + Three.js sensor view
```

Python is only needed for regenerating fixtures or running `npm run verify:opencv`. Core tests run with Node alone.

## Scope & limitations

- **Models:** OpenCV pinhole, Brown-Conrady, rational polynomial, OpenCV fisheye
- **Correctness gate:** golden tests in `core` (not the viz demo)
- **Sensor rendering:** built-in Three.js materials only — custom `ShaderMaterial` / `RawShaderMaterial` are not patched ([details](./docs/sensor-rendering.md))
- **Coordinates:** OpenCV vs Three.js frame conversion is documented and applied in viz — read [coordinate-conventions.md](./docs/coordinate-conventions.md) before integrating
- **Extrinsics:** OpenCV `rvec` / `tvec` → Three.js camera pose is **not implemented**; demo geometry is authored in the OpenCV camera frame with identity extrinsics

## Usage (from source)

### Core — projection

```typescript
import {
  cameraMatrixFromArray,
  brownConradyFromArray,
  projectBrownConrady,
} from '@three-camera-intrinsics-and-distortion-lab/core';

const K = cameraMatrixFromArray([[800, 0, 320], [0, 800, 240], [0, 0, 1]]);
const coeffs = brownConradyFromArray([-0.2, 0.05, 0.001, -0.001, 0.001]);
const pixel = projectBrownConrady([0.1, 0, 1], K, coeffs);
```

### Viz — sensor rendering

Canonical usage lives in the module docstring of [`SensorRenderer`](./packages/viz/src/sensor/SensorRenderer.ts) (do not duplicate elsewhere):

```typescript
import { SensorRenderer } from './sensor/SensorRenderer';

const sensor = SensorRenderer.create({ model: 'brown-conrady' });
scene.add(mesh, lineSegments, points, instancedMesh);
sensor.render(renderer, scene);
sensor.setModel('fisheye', scene);
```

## Demo (`npm run dev`)

- **Left:** 2D grid in OpenCV pixel space — baseline (gray) vs distorted (cyan) overlay
- **Right:** Three.js sensor view — same grid rendered through `SensorCamera` + `DistortionRenderPlugin`
- **Model switcher:** pinhole, Brown-Conrady, rational, fisheye

Viz is for visual sanity; trust `core` golden tests for numerical correctness.

## Commands

| Command | Description |
|---------|-------------|
| `npm run setup` | Install JS deps + create `.venv` with Python reference package |
| `npm run setup:python` | Create/update `.venv` only |
| `npm test` | Vitest — 112 tests (87 `core`, 25 `viz`) |
| `npm run build` | Production build of the viz app |
| `npm run dev` | Vite dev server (split demo) |
| `npm run generate:fixtures` | Regenerate OpenCV golden JSON fixtures |
| `npm run verify:opencv` | OpenCV smoke test inside `.venv` |

CI (GitHub Actions): `npm test`, `npm run build`, and `npm run verify:opencv` on every push/PR.

## Project layout

```
three-camera-intrinsics-and-distortion-lab/
├── docs/                 # Conventions, architecture, phase plans, model equations
├── packages/
│   ├── core/             # @three-camera-intrinsics-and-distortion-lab/core — camera math (library target)
│   └── viz/              # Demo app + SensorRenderer (reference integration)
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
| **three** | `0.178.0` (pinned) | Sensor rendering uses WebGL 2 / GLSL 3.0 and `Material.onBeforeCompile`. Test before upgrading — shader chunk names and compile lifecycle change across Three.js releases. |
| **vite** | `^7.0.5` | Viz dev/build only |
| **vitest** | `^3.2.4` | Tests |
| **opencv-python** | `>=4.9` | Fixture generator only (Python `.venv`) |

Run `npm audit` periodically; CI does not fail on audit today — check locally before releases.

**Local-only paths (gitignored):** `dist/`, `.venv/`, `.env` — never commit build output, virtualenvs, or secrets.

## Testing strategy

1. **Unit tests** — hand-crafted edge cases per model (symmetry, zero distortion, behind-camera policy)
2. **Golden tests** — Python-generated fixtures under `reference/fixtures/`; primary correctness gate
3. **Viz tests** — plugin lifecycle, projection matrix parity, pixel→ray frame conversion (not GPU goldens)

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

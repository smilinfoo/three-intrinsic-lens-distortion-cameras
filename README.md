# Three Camera Lab

Educational laboratory for implementing OpenCV-compatible camera models in JavaScript, with Python/OpenCV as the numerical reference.

**Session progress:** [docs/progress.md](./docs/progress.md) · **Phase plans:** [docs/plans/](./docs/plans/) · **Model docs:** [docs/models/](./docs/models/)

## Project layout

```
three-camera-lab/
├── docs/
│   ├── progress.md              # Current phase + next step
│   ├── coordinate-conventions.md
│   ├── sensor-rendering.md      # SensorCamera + DistortionRenderPlugin (Phase 8)
│   ├── plans/                   # Per-phase implementation plans
│   └── models/                  # Per-model equations + API
├── packages/
│   ├── core/                    # Pure JS camera math (no Three.js)
│   └── viz/                     # Three.js visualization
├── reference/                   # Python/OpenCV + fixtures
└── scripts/
```

## Prerequisites

- Node.js 20+
- Python 3.10+ on your `PATH` (from any source: system, Homebrew, pyenv, conda, etc.)

All Python work runs in a project-local virtual environment at `.venv/`. Setup uses the standard library `venv` module, so no conda or global `pip` configuration is required.

## Setup

```bash
# Install JS dependencies and create/populate .venv
npm run setup
```

Or step by step:

```bash
npm install
npm run setup:python
```

To use a specific interpreter when creating `.venv`:

```bash
PYTHON=/path/to/python3.12 npm run setup:python
```

## Commands

| Command | Description |
|---|---|
| `npm run setup` | Install JS deps + create `.venv` and install Python reference package |
| `npm run setup:python` | Create/update `.venv` only |
| `npm run generate:fixtures` | Regenerate OpenCV golden JSON fixtures |
| `npm test` | Run Vitest (87 tests in `@three-camera-lab/core`) |
| `npm run dev` | Start the Vite dev server (Three.js scene) |
| `npm run verify:opencv` | Run OpenCV verification inside `.venv` |

## Packages

### `@three-camera-lab/core`

Pure camera mathematics. No Three.js dependency. Implements pinhole, Brown-Conrady, rational polynomial, and OpenCV fisheye forward projection with golden tests against OpenCV fixtures.

### `@three-camera-lab/viz`

Three.js visualization layer. Depends on `core` for projection math. **`npm run dev`** opens a split demo: 2D projection grid (model switcher, OpenCV pixel space) + Three.js scene.

Phase 8 (planned) adds **sensor-accurate rendering**: [`SensorCamera`](./docs/sensor-rendering.md) + [`DistortionRenderPlugin`](./docs/sensor-rendering.md) so 3D content displays with lens distortion without modifying user meshes or materials. See [sensor-rendering.md](./docs/sensor-rendering.md).

### Viz demo (Phase 6)

- **Left panel:** grid projected with `core` functions — gray baseline + cyan distorted overlay
- **Model switcher:** pinhole, Brown-Conrady, rational, fisheye
- **Fisheye baseline:** equidistant (k = 0), not pinhole
- Visual sanity check only; golden tests in `core` are the correctness gate

### `reference/`

Python/OpenCV ground truth. Generates golden test vectors and provides verification tooling.

## Development order

| Step | Status | Deliverable |
|------|--------|-------------|
| 1. Coordinate conventions | ✅ Done | [docs/coordinate-conventions.md](./docs/coordinate-conventions.md) |
| 2. Pinhole + golden tests | ✅ Done | `projection/pinhole.ts`, `reference/fixtures/pinhole/` |
| 3. Brown-Conrady distortion | ✅ Done | [models/brown-conrady.md](./docs/models/brown-conrady.md) |
| 4. Rational polynomial | ✅ Done | [models/rational.md](./docs/models/rational.md) |
| 5. OpenCV fisheye | ✅ Done | [models/fisheye.md](./docs/models/fisheye.md) |
| 6. Viz per model | ✅ Done | `npm run dev` — projection grid demo |
| 7. Inverse distortion & pixel-to-ray | ✅ Done | [plans/phase-7-inverse-and-rays.md](./docs/plans/phase-7-inverse-and-rays.md) |
| 8. Sensor cameras & render plugin | 📝 Planned | [plans/phase-8-threejs-camera.md](./docs/plans/phase-8-threejs-camera.md), [sensor-rendering.md](./docs/sensor-rendering.md) |

Detailed phase checklist: [docs/progress.md](./docs/progress.md) · Plans: [docs/plans/](./docs/plans/)

## Testing strategy

Three layers, all model-scoped:

### 1. Unit tests (JavaScript, hand-crafted)

- Origin, points on optical axis, points at normalized plane edge
- Zero distortion → pinhole identity
- Symmetry cases where the model is symmetric
- Known degeneracies (e.g. `Z ≤ 0` behind camera — see convention doc)

### 2. Golden tests (Python-generated fixtures)

Primary correctness gate. Each model has its own fixture subdirectory under `reference/fixtures/` and golden test file.

Shared fixture fields: `model`, `opencv_version`, `camera_matrix`, `dist_coeffs`, `points_3d`, `expected_pixels`, `tolerance`.

Pinhole example (`dist_coeffs` length 5; rational uses 8; fisheye will use 4):

```json
{
  "model": "pinhole",
  "opencv_version": "5.0.0",
  "camera_matrix": [[fx, 0, cx], [0, fy, cy], [0, 0, 1]],
  "dist_coeffs": [0, 0, 0, 0, 0],
  "points_3d": [[x, y, z], ...],
  "expected_pixels": [[u, v], ...],
  "tolerance": { "abs": 1e-4, "rel": 1e-6 }
}
```

### 3. Cross-check scripts (optional, later)

- Random parameter sampling in Python → batch compare in JS
- Report max/mean error per model
- Useful for regression when refactoring

**What not to test in viz:** numerical correctness. Viz is for intuition; `core` golden tests are the gate.

**CI suggestion (later):** generate fixtures (cached) → vitest golden → typecheck. Python runs only when fixture generator or OpenCV pin changes.

## Convention documentation

Authoritative reference: [docs/coordinate-conventions.md](./docs/coordinate-conventions.md).

| Topic | Status |
|-------|--------|
| OpenCV vs Three.js camera frames (diagram + transform matrix) | ✅ Documented |
| When distortion is applied (normalized plane, before `K`) | ✅ Documented |
| Pinhole projection pipeline + fixture assumptions | ✅ Documented |
| Pixel center / sub-pixel output from `cv2.projectPoints` | ✅ Verified and documented |
| Behind-camera points (`Z ≤ 0`) | ✅ Policy set (exclude from fixtures) |
| Golden-test floating-point tolerance | ✅ `1e-4` px absolute |
| Distortion coefficient layouts | ✅ All forward models in [docs/models/](./docs/models/) |
| Fisheye vs pinhole code paths | ✅ Separate module and API (`cv2.fisheye.projectPoints`) |

## License

Private — educational project.

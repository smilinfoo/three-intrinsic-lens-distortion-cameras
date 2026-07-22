# Three Camera Lab

Educational laboratory for implementing OpenCV-compatible camera models in JavaScript, with Python/OpenCV as the numerical reference.

**Session progress:** see [docs/progress.md](./docs/progress.md) for current phase and next steps.

## Project layout

```
three-camera-lab/
├── docs/                    # Convention and model documentation
├── packages/
│   ├── core/                # Pure JS camera math (no Three.js)
│   └── viz/                 # Three.js visualization
├── reference/               # Python/OpenCV reference + fixtures
└── scripts/                 # Utility scripts
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
| `npm test` | Run Vitest across all packages |
| `npm run dev` | Start the Vite dev server (Three.js scene) |
| `npm run verify:opencv` | Run OpenCV verification inside `.venv` |

## Packages

### `@three-camera-lab/core`

Pure camera mathematics. No Three.js dependency. Currently implements pinhole projection with golden tests against OpenCV fixtures. Distortion models will be added incrementally.

### `@three-camera-lab/viz`

Three.js visualization layer. Depends on `core` for projection math. Currently renders a basic scene (grid, axes, cube).

### `reference/`

Python/OpenCV ground truth. Generates golden test vectors and provides verification tooling.

## Development order

| Step | Status | Deliverable |
|------|--------|-------------|
| 1. Coordinate conventions | ✅ Done | [docs/coordinate-conventions.md](./docs/coordinate-conventions.md) |
| 2. Pinhole + golden tests | ✅ Done | `projection/pinhole.ts`, `reference/fixtures/pinhole/` |
| 3. Distortion models | 🔄 Next | Brown-Conrady, rational, fisheye — one at a time |
| 4. Viz per model | ⬜ Pending | Grid / overlay demos using `core` |
| 5. Custom cameras / shaders | ⬜ Pending | `packages/viz/cameras`, `shaders` |

Detailed phase checklist: [docs/progress.md](./docs/progress.md).

## Testing strategy

Three layers, all model-scoped:

### 1. Unit tests (JavaScript, hand-crafted)

- Origin, points on optical axis, points at normalized plane edge
- Zero distortion → pinhole identity
- Symmetry cases where the model is symmetric
- Known degeneracies (e.g. `Z ≤ 0` behind camera — see convention doc)

### 2. Golden tests (Python-generated fixtures)

Primary correctness gate. Each model gets its own fixture subdirectory and golden test file.

Pinhole fixture schema (in use):

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
| Distortion coefficient layouts | ⬜ Summary table only; per-model notes in Phase 3+ |
| Fisheye vs pinhole code paths | ⬜ Planned — separate modules and docs |

## License

Private — educational project.

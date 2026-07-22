# Three Camera Lab

Educational laboratory for implementing OpenCV-compatible camera models in JavaScript, with Python/OpenCV as the numerical reference.

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
| `npm test` | Run Vitest across all packages |
| `npm run dev` | Start the Vite dev server (Three.js scene) |
| `npm run verify:opencv` | Run OpenCV verification inside `.venv` |

## Packages

### `@three-camera-lab/core`

Pure camera mathematics. No Three.js dependency. Camera model implementations will be added incrementally with golden tests against Python-generated fixtures.

### `@three-camera-lab/viz`

Three.js visualization layer. Depends on `core` for projection math. Currently renders a basic scene (grid, axes, cube).

### `reference/`

Python/OpenCV ground truth. Generates golden test vectors and provides verification tooling.

## Development order

1. Document coordinate conventions (`docs/coordinate-conventions.md`)
2. Pinhole projection + golden tests
3. Distortion models (Brown-Conrady, rational, fisheye) one at a time
4. Three.js visualization per model
5. Custom cameras and shader implementations

## License

Private — educational project.

# Progress

Last updated: 2026-07-21

Use this file to resume work. The detailed plan lives in [README.md](../README.md).

---

## Current position

**Phase 1 — Conventions + types** (in progress, ~60% complete)

Phases 0 and the core convention work are done. Types and coordinate helpers are not started yet. No camera math exists.

---

## Phase checklist

| Phase | Status | Notes |
|-------|--------|-------|
| **0 — Scaffold** | ✅ Done | Monorepo, Vitest, Vite/Three.js scene, Python `.venv`, OpenCV verify script |
| **1 — Conventions + types** | 🔄 In progress | Convention doc largely written; `types.ts` and `coords/` not implemented |
| **2 — Pinhole only** | ⬜ Not started | |
| **3 — Brown-Conrady** | ⬜ Not started | |
| **4 — Rational polynomial** | ⬜ Not started | |
| **5 — OpenCV fisheye** | ⬜ Not started | |
| **6 — Viz (minimal)** | ⬜ Not started | Basic Three.js scene exists; no projection overlay yet |
| **7 — Undistortion / inverse** | ⬜ Not started | |
| **8 — Three.js camera / shaders** | ⬜ Not started | |

---

## What is done

### Infrastructure (Phase 0)
- npm workspaces: `packages/core`, `packages/viz`
- Vitest placeholder test passing in `core`
- Vite + basic Three.js scene (grid, axes, cube) in `viz`
- Python reference package at `reference/` with `verify_opencv.py`
- Project-local `.venv` via `npm run setup:python` (stdlib `venv`, conda-independent)
- Remote: `origin` → `github.com/smilinfoo/three-camera-intrinsics-and-distortion-lab`

### Documentation
- [coordinate-conventions.md](./coordinate-conventions.md) — **OpenCV vs Three.js** fully documented:
  - Axis conventions and ASCII diagrams
  - Transform matrix `S = diag(1, −1, −1)` (180° rotation about X)
  - Layer usage rules (`core` = OpenCV, `viz` = Three.js, convert in `coords/`)
  - World/extrinsics notes (identity extrinsics for initial golden tests)
- [README.md](../README.md) — expanded dev plan, testing strategy, convention checklist

### Git (latest commits)
```
897742b Expand README with a more specific development plan.
84191a4 Document OpenCV and Three.js camera coordinate conventions.
62958d4 Initial setup and phase 0
```

---

## What is not done yet

### Phase 1 remaining
- [ ] `packages/core/src/types.ts` — `Vec2`, `Vec3`, `CameraMatrix`, etc.
- [ ] `packages/core/src/coords/opencv.ts` — OpenCV frame helpers
- [ ] `packages/core/src/coords/three.ts` — Three.js frame helpers (implement `S` transform)
- [ ] Unit tests for coordinate conversion (hand-crafted points from convention doc)
- [ ] Finish convention doc stubs before golden tests:
  - [ ] Pixel center convention — verify against `cv2.projectPoints` output
  - [ ] Finalize edge-case policies (behind-camera, tolerance values)

### Phase 2 (blocked on Phase 1)
- [ ] `reference/src/camera_lab_ref/generate_fixtures.py` — pinhole fixture generator
- [ ] `reference/fixtures/pinhole/*.json`
- [ ] `packages/core/src/projection/pinhole.ts`
- [ ] Golden tests in `packages/core/test/golden/`

---

## Next step (start here tomorrow)

**Complete Phase 1, then begin Phase 2 pinhole.**

### Step 1 — Types and coordinate helpers (~1 session)

1. Add `packages/core/src/types.ts` with minimal shared types.
2. Implement `opencvCameraToThreeJs()` / `threeJsCameraToOpenCv()` in `coords/`.
3. Add unit tests using the verification table in [coordinate-conventions.md §3](./coordinate-conventions.md#verification-against-visibility-rules):
   - `(0, 0, +1)` OpenCV → `(0, 0, −1)` Three.js
   - `(0, −1, 0)` OpenCV → `(0, +1, 0)` Three.js
   - `(+1, 0, 0)` OpenCV → `(+1, 0, 0)` Three.js

### Step 2 — Pinhole end-to-end pipeline

1. Verify pixel-center convention with a quick Python script against `cv2.projectPoints`.
2. Write `generate_fixtures.py` for zero-distortion pinhole (identity extrinsics, points in OpenCV camera frame).
3. Implement `projection/pinhole.ts`: normalize → apply `K` → `(u, v)`.
4. Add golden test loading fixtures and comparing to OpenCV output.

**Do not** start distortion models until pinhole golden tests pass.

---

## Resume commands

```bash
cd /Users/jeffreygray/workspace/three-camera-lab

# If fresh machine / new shell
npm run setup          # npm install + .venv

# Verify environment
npm test
npm run verify:opencv

# Dev server (Three.js scene)
npm run dev
```

---

## Key files to open first

| File | Why |
|------|-----|
| [docs/coordinate-conventions.md](./coordinate-conventions.md) | Contract for all math |
| [packages/core/src/coords/](../packages/core/src/coords/) | Where Phase 1 code goes |
| [packages/core/src/projection/](../packages/core/src/projection/) | Where pinhole goes |
| [reference/src/camera_lab_ref/verify_opencv.py](../reference/src/camera_lab_ref/verify_opencv.py) | Template for Python reference scripts |

---

## Decisions already made (don't re-litigate)

1. **OpenCV is ground truth** — JS matches Python fixtures, not the other way around.
2. **`core` uses OpenCV conventions internally** — Three.js conversion only at the boundary.
3. **One module per distortion model** — no generic plugin system yet.
4. **Python runs in `.venv`** — never use system/global pip for project work.
5. **Golden tests before viz** — visualization is sanity check, not correctness gate.
6. **Initial golden tests use identity extrinsics** — 3D points already in OpenCV camera frame.

---

## Prompt to paste when resuming

> Continue three-camera-lab. Read `docs/progress.md` and `docs/coordinate-conventions.md`. We are finishing Phase 1 (types + coords helpers), then starting Phase 2 pinhole projection with Python fixtures and golden tests.

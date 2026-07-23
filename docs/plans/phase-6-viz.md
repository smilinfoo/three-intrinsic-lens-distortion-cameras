# Phase 6 Plan — Viz (Minimal Projection Overlays)

Status: **✅ complete**

Related: [coordinate-conventions.md](../coordinate-conventions.md) §3–4 (OpenCV ↔ Three.js)

---

## Goal

Add **visual sanity-check demos** in `@three-camera-intrinsics-and-distortion-lab/viz` that use `core` projection functions to render distorted vs undistorted grid overlays — one demo per forward model (pinhole, Brown-Conrady, rational, fisheye).

**Purpose:** intuition and pedagogy. **Not** a correctness gate — golden tests in `core` remain authoritative.

**In scope:** 2D projection overlays driven by `core`, model switcher, shared grid generator, manual visual QA notes.  
**Out of scope:** automated full-frame GPU golden tests (viz unit tests cover plugin lifecycle; see `packages/viz/test/`), reimplementing math in viz.

---

## Design decision: 2D overlay first

Avoid placing projected geometry in the Three.js scene graph for Phase 6. OpenCV math runs in **OpenCV camera frame**; Three.js uses **Y-up, −Z view**. Mixing them in 3D caused silent bugs in Phases 1–5 — keep the boundary explicit.

**Recommended layout:**

```
┌─────────────────────────────────────────────┐
│  [Model: pinhole ▼]  [ coeffs preset ▼ ]    │
├──────────────────────┬──────────────────────┤
│  2D projection view │  Three.js scene       │
│  (canvas, OpenCV    │  (existing grid/cube  │
│   pixel space u,v)  │   — unchanged or      │
│                     │   simplified)         │
│  • undistorted grid │                       │
│  • distorted grid   │                       │
└──────────────────────┴──────────────────────┘
```

- **Left (primary):** HTML `<canvas>` drawing in **pixel coordinates** `(u, v)` from `core` — no Three.js frame conversion needed for projection display.
- **Right (optional):** keep current `createScene()` as context, or simplify to a static backdrop.

Alternative (even more minimal): **full-width 2D canvas only**, drop Three.js from the demo entry until Phase 8. Either is acceptable; the plan assumes **split view** to preserve existing scaffold.

---

## Data flow

```
Grid of 3D points (OpenCV camera frame, Z > 0)
        │
        ▼
  core.project*()  ──→  (u, v) pixels
        │
        ▼
  Canvas 2D line/point draw (flip v for screen Y-down = image Y-down)
```

**Intrinsics and coeffs:** use the same `K` and coefficient presets as golden fixtures (`reference/fixtures/*/basic.json`) so the visual matches what tests already validate.

**Grid generation (viz-only):**

```typescript
// Example: lines on plane Z = z0, varying X and Y
for (x of linspace(-0.3, 0.3, n)) points.push(vec3(x, yMin, z0), vec3(x, yMax, z0));
for (y of linspace(-0.3, 0.3, n)) points.push(vec3(xMin, y, z0), vec3(xMax, y, z0));
```

Points stay in **OpenCV camera frame** (`Z > 0`). No extrinsics.

---

## Per-model demo behavior

| Model | `core` entry | Undistorted overlay | Distorted overlay |
|-------|--------------|---------------------|-------------------|
| Pinhole | `projectPinhole` | Same as distorted (identity) | Collapse to one grid |
| Brown-Conrady | `projectBrownConrady` | `projectPinhole` (k=0) | fixture basic coeffs |
| Rational | `projectRational` | pinhole or k4=k5=k6=0 case | fixture basic coeffs |
| Fisheye | `projectFisheye` | **equidistant** (k=0 fisheye, not pinhole) | fixture basic coeffs |

**Fisheye note:** “undistorted” baseline for comparison is **equidistant** (`zero-coeff.json` behavior), not pinhole — label clearly in UI (“equidistant vs distorted”).

---

## Files to add / modify

| File | Action |
|------|--------|
| `docs/plans/phase-6-viz.md` | This plan |
| `packages/viz/src/demo/gridPoints.ts` | **New** — generate OpenCV-frame grid line segments |
| `packages/viz/src/demo/projectionCanvas.ts` | **New** — project segments, draw on 2D canvas |
| `packages/viz/src/demo/modelPresets.ts` | **New** — K + coeffs per model (from fixture values) |
| `packages/viz/src/demo/createProjectionDemo.ts` | **New** — wire UI + canvas |
| `packages/viz/src/main.ts` | Refactor to mount projection demo |
| `packages/viz/index.html` | Add layout containers + model `<select>` |
| `packages/viz/src/scene/createScene.ts` | Optional: slim down or move to secondary panel |
| `docs/progress.md` | Update on completion |
| `README.md` | Document demo usage under `npm run dev` |

**Do not add:**

- New projection math in `viz` (import from `@three-camera-intrinsics-and-distortion-lab/core` only)
- `coords/three.ts` usage unless later placing 3D markers (defer to Phase 8)
- Vitest tests for pixel values in viz

---

## Implementation steps

### Step 1 — Shared demo utilities

**`gridPoints.ts`**

- `generateGridSegments(z0, xRange, yRange, divisions): Vec3[][]` — returns line segments as pairs of endpoints.

**`modelPresets.ts`**

- Export presets mirroring fixture `basic.json` for each model:
  - `cameraMatrixFromArray` + coeff parsers from `core`
  - Labels for UI

**`projectionCanvas.ts`**

- `projectSegment(segment, projectFn): [Vec2, Vec2] | null` — skip if either endpoint behind camera
- `drawGrid(ctx, segments, projectFn, color, imageWidth, imageHeight)`
- Map pixel `(u, v)` to canvas: `x = u`, `y = v` (image origin top-left matches canvas)

### Step 2 — UI shell

- `<select id="model">` with options: pinhole, brown-conrady, rational, fisheye
- Two legend colors: baseline (gray) vs distorted (cyan)
- Fixed virtual image size matching fixture context (e.g. 640×480) with `K` from fixtures

### Step 3 — Wire `main.ts`

- Split container: projection canvas + Three.js viewport
- On model change: redraw canvas with appropriate `projectPinhole` / `projectBrownConrady` / etc.
- Animation loop only for Three.js panel (if kept)

### Step 4 — Manual test checklist (document in plan + README)

| Model | Visual expectation |
|-------|-------------------|
| Pinhole | Straight grid lines |
| Brown-Conrady | Visible barrel/pincushion bend vs gray baseline |
| Rational | Stronger bend than Brown-Conrady with same preset family |
| Fisheye | Strong wide-angle curvature; baseline is equidistant not straight |

---

## Canvas coordinate notes

OpenCV pixels: **+u right, +v down**, origin top-left.

HTML canvas: **+x right, +y down** — same as image space. No Y-flip needed if drawing directly in pixel coordinates.

Optional: scale canvas to fit panel while preserving aspect ratio (`640/480`).

---

## Definition of done

- [x] `npm run dev` shows projection grid demo with model switcher
- [x] All four models render using `core` imports only
- [x] Pinhole shows linear grid; distortion models show baseline vs distorted overlay
- [x] Fisheye baseline labeled equidistant (not “pinhole”)
- [x] README updated with brief demo description
- [x] `docs/progress.md` updated; Phase 6 marked ✅
- [x] No new numerical tests in viz; `npm test` still 41 passing in `core`

---

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Reimplementing projection in viz | Import only from `core`; code review |
| OpenCV vs Three.js frame mix-ups | Keep projection on 2D canvas in pixel space |
| Fisheye “undistorted” confused with pinhole | Explicit UI labels + use fisheye k=0 baseline |
| Behind-camera grid points | Skip segments where `Z ≤ 0` |
| Canvas sizing / DPR | Use fixed logical image size; scale with CSS |

---

## What not to abstract yet (Phase 8 territory)

- Custom `THREE.PerspectiveCamera` matching OpenCV `K` and distortion
- Shader-based live distortion preview
- Generic `createProjector(model: string)` factory
- World/extrinsic calibration pose from OpenCV `rvec/tvec`
- Undistortion preview
- Automated screenshot comparison

---

## Phase 7 / 8 preview

| Phase | Relationship to Phase 6 |
|-------|---------------------------|
| **7 — Undistortion / inverse** | [plans/phase-7-inverse-and-rays.md](./plans/phase-7-inverse-and-rays.md) | Could add inverse grid overlay |
| **8 — Custom camera / shaders** | Replace 2D canvas approximation with GPU-accurate rendering |

---

## Prompt to implement

> Implement Phase 6 per `docs/plans/phase-6-viz.md`: 2D projection grid canvas using `core` projectors, model switcher for all four models, split or full-width layout. Manual visual QA only. No custom Three.js camera or shaders.

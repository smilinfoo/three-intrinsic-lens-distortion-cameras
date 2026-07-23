# Phase 8 Plan — OpenCV Three.js Cameras (Placeholder)

Status: **placeholder — not approved**

Related: [coordinate-conventions.md](../coordinate-conventions.md) §3–4, [phase-6-viz.md](./phase-6-viz.md), [phase-7-inverse-and-rays.md](./phase-7-inverse-and-rays.md)

> **This document is a draft placeholder.** Do not implement until the plan is reviewed and approved.

---

## Goal

Wire the **right-hand Three.js panel** (`npm run dev`) to render through OpenCV-compatible custom cameras that visually match the **left-hand 2D projection canvas** (Phase 6) and remain consistent with golden tests in `core` (Phases 2–7).

| Today | Phase 8 |
|-------|---------|
| Left: `core.project*` on 2D canvas | Unchanged (reference overlay) |
| Right: stock `PerspectiveCamera` + cube | Custom OpenCV camera + scene grid |
| No link between panels | Same `K`, coeffs, and model from shared preset |

**Approach:** Camera-based integration to **minimize shader dependence**. Linear intrinsics (`K`) are encoded in a supplied **`projectionMatrix`**. Non-linear distortion uses **minimal vertex-shader insertions** owned by the camera — not a standalone shader-heavy render pipeline.

**In scope:** Pinhole + all four distortion models; `projectionMatrix` from `K`; distortion via camera-attached shader patches; ray picking via Phase 7 APIs; demo wiring.

**Out of scope:** Extrinsics / `rvec,tvec`; full-image undistort maps (`cv2.initUndistortRectifyMap`); generic camera factory; automated visual regression; new numerical math in `viz` beyond matrix assembly and documented GLSL mirrors.

---

## Design principles

1. **Camera-first** — Each model is a `THREE.Camera` subclass that owns intrinsics, coeffs, image size, near/far, and update lifecycle.
2. **Projection matrix for linear part** — `fx, fy, cx, cy` encoded in `camera.projectionMatrix`; pinhole needs no custom shader.
3. **Shader insertions only for non-linearity** — Forward distortion in the vertex path before clip-space; camera registers patches on scene materials.
4. **Core is ground truth** — JS projection / undistort / rays in `@three-camera-lab/core`; GLSL chunks are documented mirrors of `distortion/*.ts`.
5. **Frame boundary explicit** — OpenCV ↔ Three.js via `coords/three.ts` only at the viz boundary.

---

## Near / far planes

Use the same defaults as native `THREE.PerspectiveCamera`:

| Parameter | Default | Notes |
|-----------|---------|-------|
| `near` | `0.1` | Three.js constructor default |
| `far` | `2000` | Three.js constructor default |

OpenCV cameras accept optional `near` / `far` overrides but default to these values. The demo's current `createScene()` uses `far = 100`; Phase 8 should align with Three.js defaults unless a preset explicitly overrides them.

FOV is **not** the primary parameter — intrinsics come from OpenCV `K`. Near/far define the clip range for the custom projection matrix only.

---

## Architecture

```
packages/core/                          (unchanged — math authority)
  projection/*, distortion/*, undistortion/*, rays.ts, coords/three.ts

packages/viz/src/
  cameras/
    OpenCvCameraBase.ts                 shared: K, imageSize, near/far, model id
    buildOpenCvProjectionMatrix.ts      K + near/far → THREE.Matrix4
    OpenCvPinholeCamera.ts              projectionMatrix only
    OpenCvBrownConradyCamera.ts         + distortion uniforms + shader plugin
    OpenCvRationalCamera.ts
    OpenCvFisheyeCamera.ts
    OpenCvDistortionShaderPlugin.ts     onBeforeCompile insertions (minimal)
    pixelToRay.ts                       wraps core pixelToCameraRay* + frame flip
  shaders/chunks/
    brown-conrady.glsl.ts               mirrors core forward distort
    rational.glsl.ts
    fisheye.glsl.ts
  demo/
    modelPresets.ts                     shared K + coeffs (extend or split presets)
    createProjectionDemo.ts             left panel (unchanged role)
  scene/
    createScene.ts                      accepts OpenCv*Camera
  main.ts                               model switcher drives camera + left canvas
```

**Dependency direction:** `viz/cameras` → `core` only. No `core` → Three.js.

---

## Rendering pipeline

```
World vertex (Three.js, Y-up)
        │
        ▼
  modelViewMatrix  →  camera-space point (Three.js: visible if Z < 0)
        │
        ├─ Pinhole path ──────────────────────────────────────┐
        │   projectionMatrix from K  →  clip space            │
        │                                                       │
        └─ Distorted path ──────────────────────────────────────┤
            VS insertion:                                       │
              Three.js cam → OpenCV cam (S on position)         │
              normalize (x,y) = (X/Z, Y/Z)                      │
              forward distort* (GLSL chunk = core equations)    │
              apply K (linear) → NDC / clip                     │
                                                                ▼
                                                         stock fragment shaders
```

Distortion insertions run in the **vertex shader** so standard materials (`MeshStandardMaterial`, `LineBasicMaterial`, etc.) work without custom fragment shaders.

---

## Sub-phases (implementation order)

### 8A — Pinhole camera (`projectionMatrix` only)

| Item | Detail |
|------|--------|
| Module | `buildOpenCvProjectionMatrix.ts`, `OpenCvPinholeCamera.ts` |
| Behavior | `updateProjectionMatrix()` builds matrix from `K`, image size, `near=0.1`, `far=2000` |
| Wiring | Replace `PerspectiveCamera` in `createScene.ts` |
| Shaders | None |
| QA | Unit-test matrix at sample points; manual alignment with left pinhole grid |

### 8B — Distortion shader plugin (Brown-Conrady, rational)

| Item | Detail |
|------|--------|
| Module | `OpenCvDistortionShaderPlugin.ts`, GLSL chunks, `OpenCvBrownConradyCamera`, `OpenCvRationalCamera` |
| Behavior | Camera owns coeffs as uniforms; patches materials via `onBeforeCompile` |
| Pinhole | Plugin disabled — pure `projectionMatrix` path |
| QA | Manual match vs left 2D distorted grid |

### 8C — Fisheye camera

| Item | Detail |
|------|--------|
| Module | `fisheye.glsl.ts`, `OpenCvFisheyeCamera.ts` |
| Note | k = 0 baseline is **equidistant**, not pinhole (same as Phase 6) |
| QA | Curvature matches left panel; k = 0 ≠ pinhole regression |

### 8D — Rays and picking

| Item | Detail |
|------|--------|
| Module | `pixelToRay.ts`, optional `OpenCvRaycaster` |
| API | `core.pixelToCameraRay*` → `opencvCameraToThreeJs` on direction |
| Shaders | None |

### 8E — Demo integration

| Item | Detail |
|------|--------|
| Behavior | Model dropdown swaps left canvas preset **and** right `OpenCv*Camera` |
| Config | Shared preset object (extend `modelPresets.ts` or split `cameraPresets.ts`) |
| Scene | 3D grid analogous to Phase 6; geometry under `S = Rx(π)` group if authored in OpenCV frame |

---

## Scene / coordinate strategy

Phase 6 grid points live in the **OpenCV camera frame** (`Z > 0` forward). Three.js uses **Y-up, −Z view**.

**Recommended:** Place demo geometry under a group with fixed rotation `Rx(π)` (= `S`) so content authored in OpenCV coordinates matches Phase 6 inputs. Camera at origin, looks down −Z. All frame conversions via `opencvCameraToThreeJs` / `threeJsCameraToOpenCv`.

**Extrinsics:** Identity only (camera-frame points). OpenCV `rvec/tvec` pose conversion deferred.

---

## Shared configuration

One preset drives both panels:

```typescript
interface CameraPreset {
  id: ModelId;
  intrinsics: CameraMatrix;
  // dist coeffs per model
  createCamera(width, height, near?, far?): OpenCvCamera;
  baselineProject / distortedProject;  // left 2D canvas
}
```

Left panel: `core.project*`. Right panel: `createCamera()` with defaults `near=0.1`, `far=2000`.

---

## Testing strategy

| Layer | Approach |
|-------|----------|
| `core` | Existing 87 tests unchanged |
| `buildOpenCvProjectionMatrix` | New unit tests in `viz` (matrix spot-checks) |
| GLSL distortion | Manual visual QA vs left canvas |
| Ray helper | Unit test: direction ∥ known 3D point |
| Full render | No automated pixel golden tests (consistent with Phase 6) |

### Manual QA matrix

| Model | Left (2D) | Right (3D camera) |
|-------|-----------|-------------------|
| Pinhole | Straight grid | Straight grid, aligns with left |
| Brown-Conrady | Gray vs cyan bend | Same bend via VS insertion |
| Rational | Stronger bend | Matches left |
| Fisheye | Equidistant baseline | k = 0 baseline ≠ pinhole |

---

## Files to add / modify

| File | Sub-phase | Action |
|------|-----------|--------|
| `docs/plans/phase-8-threejs-camera.md` | — | This plan (placeholder) |
| `packages/viz/src/cameras/*.ts` | 8A–8D | Custom cameras + matrix builder + plugin |
| `packages/viz/src/shaders/chunks/*.ts` | 8B–8C | GLSL mirrors |
| `packages/viz/src/scene/createScene.ts` | 8A | Accept `OpenCv*Camera` |
| `packages/viz/src/main.ts` | 8E | Wire model switcher to camera |
| `packages/viz/src/demo/modelPresets.ts` | 8E | Shared preset / `createCamera` |
| `docs/progress.md` | — | Update on completion |
| `docs/coordinate-conventions.md` | 8A | Document projection matrix + near/far policy |

**Do not:**

- Duplicate projection math outside `core` + documented GLSL mirrors
- Add numerical golden tests in `viz`
- Implement before plan approval

---

## Definition of done

- [ ] Plan reviewed and approved
- [ ] `OpenCvPinholeCamera` renders via `projectionMatrix` from `K` (no custom FS)
- [ ] Brown-Conrady, rational, fisheye use minimal VS insertions only
- [ ] Near/far default to `0.1` / `2000` (Three.js `PerspectiveCamera` defaults)
- [ ] Model switcher drives both left canvas and right camera
- [ ] Right panel grid qualitatively matches left for all four models
- [ ] Ray helper uses `pixelToCameraRay*` + `opencvCameraToThreeJs`
- [ ] `npm test` green in `core`; viz unit tests for projection matrix
- [ ] `docs/progress.md` updated; this plan marked ✅ complete

---

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| GLSL drifts from core JS | Named mirror files; CPU vs GPU spot-checks |
| Principal point + aspect in projection matrix | Dedicated builder with unit tests |
| `onBeforeCompile` fragility | Centralize in one plugin; pin Three.js version |
| Built-in materials resist patching | Document supported materials; prefer `LineBasicMaterial` |
| Fisheye k = 0 ≠ pinhole | Separate camera class; explicit UI labels |
| Behind-camera geometry | Cull when OpenCV `Z ≤ 0` |

---

## Open decisions (pending approval)

- [ ] Scene geometry: OpenCV frame under `S`-rotated group vs per-vertex conversion at load
- [ ] Which materials are in scope for distortion patching (`LineBasicMaterial` only vs all mesh materials)
- [ ] Whether 8D ray picking is required for initial release or can follow 8E

---

## Prompts

**Implement 8A only (after approval):**

> Implement Phase 8A per `docs/plans/phase-8-threejs-camera.md`: `OpenCvPinholeCamera` + `buildOpenCvProjectionMatrix`, near=0.1 far=2000, wire into `createScene`. Manual QA vs 2D pinhole grid. No distortion shaders.

**Implement full Phase 8 (after approval):**

> Implement Phase 8 per `docs/plans/phase-8-threejs-camera.md`: 8A → 8B → 8C → 8D → 8E. Camera-based; distortion via minimal VS insertions only.

# Phase 8 Plan — Sensor Cameras & Distortion Render Plugin (Placeholder)

Status: **✅ complete**

Related: [sensor-rendering.md](../sensor-rendering.md) (architecture rationale), [coordinate-conventions.md](../coordinate-conventions.md) §3–4, [phase-6-viz.md](./phase-6-viz.md), [phase-7-inverse-and-rays.md](./phase-7-inverse-and-rays.md)

> Implemented 2026-07-23. See [sensor-rendering.md](../sensor-rendering.md) for architecture rationale.

---

## Goal

Enable **sensor-accurate 3D rendering** in Three.js: project points, lines, meshes, and instanced geometry as if seen through a calibrated sensor (OpenCV models first; extensible later), superimposable on a pre-captured 2D sensor image.

Wire the **right-hand Three.js panel** (`npm run dev`) to use this path while the **left-hand 2D canvas** (Phase 6) remains a reference overlay.

| Today | Phase 8 |
|-------|---------|
| Left: `core.project*` on 2D canvas | Unchanged (reference) |
| Right: stock `PerspectiveCamera` + cube | `SensorCamera` + `DistortionRenderPlugin` |
| User must understand demo internals | User supplies model + `K` + params only |

**Primary use case:** Distorted 3D annotations aligned with a fixed sensor photograph sharing the same intrinsics and distortion model.

See [sensor-rendering.md](../sensor-rendering.md) for full architectural rationale.

---

## Design principles

1. **Two first-class components** — **`SensorCamera`** (custom `THREE.Camera`: config, `projectionMatrix`, uniforms) and **`DistortionRenderPlugin`** (global material/render hook). The camera is the user API; the plugin is what makes "no material edits" possible. Neither replaces the other.

2. **Sensor-first UX** — User selects distortion model via `SensorRenderer.create({ model })` or supplies custom `SensorCamera`. Frame conversion, normalized-plane math, and plugin wiring are internal.

3. **No user geometry/material changes** — Points, lines, meshes, and `InstancedMesh` with **built-in** Three.js materials render without modification. The plugin patches standard materials at compile/render time.

4. **Projection matrix for the linear part** — `fx, fy, cx, cy` + near/far encoded in `SensorCamera.projectionMatrix`. Pinhole / zero-distortion needs no plugin.

5. **Plugin for the non-linear part** — Forward distortion runs in a **vertex-shader insertion** applied by `DistortionRenderPlugin`. Not a standalone fragment-shader render pipeline; stock fragment shaders unchanged.

6. **Core is ground truth** — Numerical definitions in `@three-camera-lab/core`. GLSL chunks in `viz` are documented mirrors of `distortion/*.ts`.

7. **Frame boundary explicit** — OpenCV ↔ Three.js via `coords/three.ts` only inside camera/plugin code, not in user scene code.

8. **Forward distortion for sensor overlay** — Project 3D content to **distorted** pixel locations to align with a real sensor image. Do not use undistort-then-warp-framebuffer as the primary path.

9. **Extensible models** — OpenCV models ship first; new backends add core forward math + GLSL chunk + camera factory branch without breaking the user API.

---

## Near / far planes

Use the same defaults as native `THREE.PerspectiveCamera`:

| Parameter | Default | Notes |
|-----------|---------|-------|
| `near` | `0.1` | Three.js constructor default |
| `far` | `2000` | Three.js constructor default |

FOV is **not** the primary parameter — intrinsics come from OpenCV `K`. Near/far define the clip range for the custom projection matrix.

---

## Architecture

```
packages/core/                          (unchanged — math authority)
  projection/*, distortion/*, undistortion/*, rays.ts, coords/three.ts

packages/viz/src/
  cameras/
    SensorCameraBase.ts                 K, imageSize, near/far, model id, uniforms
    buildSensorProjectionMatrix.ts      K + near/far → THREE.Matrix4
    createSensorCamera.ts               factory: model + params → SensorCamera
    OpenCvPinholeCamera.ts              projectionMatrix only; plugin off
    OpenCvBrownConradyCamera.ts
    OpenCvRationalCamera.ts
    OpenCvFisheyeCamera.ts
    pixelToRay.ts                       core pixelToCameraRay* + frame flip
  render/
    DistortionRenderPlugin.ts           FIRST-CLASS: global onBeforeCompile / render hook
    attachDistortionPlugin.ts           bind plugin ↔ camera ↔ renderer
  shaders/chunks/
    brown-conrady.glsl.ts               mirrors core forward distort
    rational.glsl.ts
    fisheye.glsl.ts
  demo/
    modelPresets.ts                     shared K + coeffs
    createProjectionDemo.ts             left panel (unchanged)
  scene/
    createScene.ts                      SensorCamera + plugin attach
  main.ts                               model switcher + optional sensor image backdrop
```

**Dependency direction:** `viz` → `core` only. No `core` → Three.js.

### Component interaction

```
SensorRenderer.create({ model, … })
        │
        ▼
   SensorCamera ──────────────► projectionMatrix (pinhole / K)
        │                       uniforms (dist coeffs, image size)
        │
        ▼
DistortionRenderPlugin (owned by SensorRenderer)
        │
        ▼
sensor.render(renderer, scene)  →  built-in materials patched automatically
```

**Usage:** single source of truth in `packages/viz/src/sensor/SensorRenderer.ts` module docstring.

---

## Material support policy

**In scope (Phase 8 target):** All built-in materials using Three.js standard projection chunks — `MeshBasicMaterial`, `MeshStandardMaterial`, `MeshPhongMaterial`, `LineBasicMaterial`, `PointsMaterial`, etc.

**Out of scope (document exclusions):** Custom `ShaderMaterial` / `RawShaderMaterial`; `CSS2DRenderer`; sprites; materials that bypass `#include <project_vertex>`.

**InstancedMesh:** Supported — instance transform applied before camera-space distortion.

---

## Rendering pipeline

See [sensor-rendering.md](../sensor-rendering.md) for rationale. Summary:

- Pinhole: `projectionMatrix` only, plugin disabled.
- Distorted: plugin injects forward distort in vertex stage before clip-space.

---

## Sub-phases (implementation order)

### 8A — Pinhole `SensorCamera` (`projectionMatrix` only)

| Item | Detail |
|------|--------|
| Module | `buildSensorProjectionMatrix.ts`, `SensorCameraBase.ts`, `OpenCvPinholeCamera.ts`, `createSensorCamera.ts` |
| Behavior | `updateProjectionMatrix()` from `K`, image size, `near=0.1`, `far=2000` |
| Plugin | Not attached for pinhole |
| Wiring | Replace `PerspectiveCamera` in `createScene.ts` |
| QA | Matrix unit tests; manual alignment with left pinhole grid |

### 8B — `DistortionRenderPlugin` (first-class) + Brown-Conrady / rational

**This sub-phase delivers the plugin as a standalone component, not an implementation detail of camera classes.**

| Item | Detail |
|------|--------|
| **`DistortionRenderPlugin`** | Global render hook: registers `onBeforeCompile` (or equivalent) for built-in materials; reads uniforms from active `SensorCamera`; applies VS insertion from GLSL chunks |
| **`attachDistortionPlugin(renderer, camera)`** | Lifecycle: attach on camera change, detach for pinhole, handle material compile order |
| **GLSL chunks** | `brown-conrady.glsl.ts`, `rational.glsl.ts` — mirrors of `core/distortion/*` |
| **`OpenCvBrownConradyCamera` / `OpenCvRationalCamera`** | Extend base; expose coeffs + model id; **do not** embed patching logic — delegate to plugin |
| **Acceptance** | Add mesh + lines + points + `InstancedMesh` to scene with stock materials; switch to Brown-Conrady; **no material/geometry edits**; overlay aligns with left 2D canvas |
| **Pinhole** | Plugin detached — pure `projectionMatrix` path |
| **QA** | Manual match vs left 2D distorted grid; spot-check CPU `core.project*` vs GPU at sample pixels |

**8B definition of done (plugin):**

- [ ] Plugin is a separate module under `viz/src/render/`
- [ ] Camera classes only supply config + uniforms; plugin owns all material patching
- [ ] At least one mesh, one line, one points cloud, one `InstancedMesh` render correctly under distortion without user-side material changes

### 8C — Fisheye via plugin

| Item | Detail |
|------|--------|
| Module | `fisheye.glsl.ts`, `OpenCvFisheyeCamera.ts` |
| Plugin | Reuses `DistortionRenderPlugin` with fisheye chunk + uniforms |
| Note | k = 0 baseline is **equidistant**, not pinhole (Phase 6 parity) |
| QA | Curvature matches left panel |

### 8D — Rays and picking

| Item | Detail |
|------|--------|
| Module | `pixelToRay.ts`, optional `SensorRaycaster` |
| API | `core.pixelToCameraRay*` → `opencvCameraToThreeJs` on direction |
| Shaders | None |

### 8E — Demo integration + sensor image overlay

| Item | Detail |
|------|--------|
| Behavior | Model dropdown → left canvas + `createSensorCamera()` |
| Backdrop | Optional pre-rendered sensor image behind WebGL canvas (same `K` + image size) |
| Scene | 3D grid under `S = Rx(π)` group if authored in OpenCV frame |
| Config | Shared preset from `modelPresets.ts` |

---

## Scene / coordinate strategy

Demo geometry may live in OpenCV camera frame under a group with rotation `Rx(π)` (= `S`). Extrinsics / `rvec,tvec` deferred.

---

## Shared configuration

```typescript
interface SensorPreset {
  id: ModelId;
  intrinsics: CameraMatrix;
  createSensorCamera(width, height, near?, far?): SensorCamera;
  baselineProject / distortedProject;  // left 2D canvas only
}
```

---

## Testing strategy

| Layer | Approach |
|-------|----------|
| `core` | 87 tests unchanged |
| `buildSensorProjectionMatrix` | Viz unit tests |
| `DistortionRenderPlugin` | Manual QA: mesh + line + points + instanced without material edits |
| GLSL vs CPU | Spot-check sample vertices |
| Full render | No automated pixel golden tests in viz |

---

## Files to add / modify

| File | Sub-phase | Action |
|------|-----------|--------|
| `docs/sensor-rendering.md` | — | Architecture rationale (reference) |
| `docs/plans/phase-8-threejs-camera.md` | — | This plan |
| `packages/viz/src/cameras/*.ts` | 8A, 8C | Sensor cameras + factory |
| `packages/viz/src/render/DistortionRenderPlugin.ts` | **8B** | **First-class plugin** |
| `packages/viz/src/shaders/chunks/*.ts` | 8B–8C | GLSL mirrors |
| `packages/viz/src/scene/createScene.ts` | 8A, 8B | Camera + plugin attach |
| `docs/coordinate-conventions.md` | 8A | Pointer to sensor-rendering |

---

## Definition of done

- [x] Plan reviewed and approved
- [x] `SensorCamera` + `createSensorCamera()` user API
- [x] **`DistortionRenderPlugin` implemented as separate first-class module**
- [x] Built-in materials render distorted content without user material/geometry edits
- [x] Mesh (instanced), line, and points in demo scene
- [x] Near/far default `0.1` / `2000`
- [x] All four OpenCV models wired via model switcher
- [x] `pixelToThreeRayFromCamera` helper
- [x] `npm test` green (87 core + 3 viz)
- [ ] Optional sensor image backdrop (deferred)

---

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Plugin misses some built-in materials | Central registry; test matrix per material type |
| GLSL drifts from core | Named mirror files; CPU spot-checks |
| Material compile order / hot reload | Document attach lifecycle; recompile on camera change |
| Custom user shaders unsupported | Document exclusions in sensor-rendering.md |
| `onBeforeCompile` API changes | Pin Three.js version; single plugin module |

---

## Open decisions

- [x] Scene geometry: OpenCV frame under `S`-rotated group (`opencvFrame.rotation.x = π`)
- [ ] Sensor image backdrop: HTML img vs textured quad in scene (deferred)
- [x] Ray helper implemented; picking UI deferred

**Resolved:**

- Material policy: built-in materials via global plugin ✅
- Architecture: `SensorCamera` + `DistortionRenderPlugin` as peers ✅

---

## Prompts

**Implement 8A only (after approval):**

> Implement Phase 8A: `SensorCamera` pinhole + `buildSensorProjectionMatrix`, `createSensorCamera`, near=0.1 far=2000. No plugin yet.

**Implement 8B (after approval):**

> Implement Phase 8B: `DistortionRenderPlugin` as first-class module under `viz/src/render/`, Brown-Conrady + rational GLSL chunks, camera supplies uniforms only. Verify mesh/line/points/InstancedMesh without material edits.

**Implement full Phase 8 (after approval):**

> Implement Phase 8 per plan: 8A → 8B → 8C → 8D → 8E. SensorCamera + DistortionRenderPlugin architecture.

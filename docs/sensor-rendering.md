# Sensor Rendering Architecture

Status: **implemented** (Phase 8 ✅, hardened in Phase 9 ✅). Architecture reference for `SensorCamera` / `SensorRenderer` / `DistortionRenderPlugin`.

Related: [coordinate-conventions.md](./coordinate-conventions.md), [plans/phase-8-threejs-camera.md](./plans/phase-8-threejs-camera.md)

---

## Goal

Render arbitrary Three.js content — points, lines, meshes, instanced geometry — **as if collected by a physical sensor** with known intrinsics and lens distortion, without requiring users to modify geometry or materials.

**Primary use case:** Display 3D annotations (points, lines, models) with **forward distortion applied**, superimposed on a **pre-captured 2D sensor image** from the same camera calibration.

**Initial models:** OpenCV (pinhole, Brown-Conrady, rational, fisheye). The architecture should allow additional distortion backends later without changing user-facing scene code.

**UX target:** User supplies the camera model, `K` and coefficients. No knowledge of normalized planes, iterative undistort, or frame conversion required.

---

## Design decision: two cooperating components

A custom **`THREE.Camera` subclass alone is not sufficient.** The library has three pieces:

| Component | Role |
|-----------|------|
| **`SensorCamera`** (custom `THREE.Camera`) | User-facing data: model id, intrinsics `K`, distortion coefficients, image size, near/far. Builds the pinhole `projectionMatrix`. Values are mutable (`setIntrinsics`, `setCoefficients`). |
| **`DistortionRenderPlugin`** | Patches **built-in** Three.js materials once (`onBeforeCompile`) so forward distortion runs in the vertex path, and owns the shared uniforms. User meshes and materials stay unchanged. |
| **`SensorRenderer`** | Public render entry: `render(renderer, scene, camera)` publishes the camera to the plugin, renders, and always disarms the plugin afterwards (also on error). |

```
User code                                   Internal
─────────                                   ────────
scene.add(mesh, lines, points)           →  unchanged
sensor.render(renderer, scene, camera)   →  plugin.beginRender(scene, camera)
                                              · patch built-in materials (idempotent)
                                              · write camera → shared uniforms
                                              · uSensorActive = 1
                                            renderer.render(scene, camera)
                                            plugin.endRender()  (finally)
                                              · uSensorActive = 0, culling restored
```

**Why not camera-only?**

- **Linear intrinsics (`K`)** fit in `camera.projectionMatrix` ✅
- **Non-linear distortion** depends on each vertex's direction from the camera ❌ cannot be encoded in a single 4×4 matrix for all vertices

Distortion must run in the **vertex shader**. The camera owns *what* to apply; the plugin owns *how* to apply it across the scene without per-material user edits.

---

## Why forward distortion (not framebuffer warp)

For overlay on a real sensor photo, annotations must land at **distorted pixel locations** — where the sensor actually recorded them.

| Approach | Fits sensor overlay? |
|----------|----------------------|
| **Forward distortion at projection** (vertex stage) | ✅ Yes — 3D point → distorted `(u,v)` matching the image |
| Render undistorted, warp framebuffer to distorted | ❌ Wrong direction for aligning 3D vectors with a distorted photo |
| CPU re-project / rebuild geometry each frame | ❌ Violates "don't change mesh" |

---

## Rendering pipeline

```
World vertex (Three.js scene graph)
        │
        ▼
  modelViewMatrix  →  camera-space (Three.js: visible when Z < 0)
        │
        ├─ uSensorActive == 0 (stock camera / pinhole sensor) ───┐
        │   projectionMatrix · mvPosition  (stock projection)     │
        │                                                         │
        └─ uSensorActive == 1 ────────────────────────────────────┤
            camera-space → OpenCV camera-space (S)                │
            normalize (x,y) = (X/Z, Y/Z)                          │
            forward distort (GLSL mirror of core)                 │
            apply K → NDC (u/W, v/H), keep pinhole depth          │
                                                                  ▼
                                                        stock fragment shaders
```

- **Pinhole sensor cameras** do not patch anything: `SensorCamera.projectionMatrix` is exact.
- **Distorting cameras** patch built-in materials with a minimal **vertex-only** insertion (no custom fragment pipeline). Model selection (`uDistortionModel`) and all coefficients are uniforms, so one compiled program serves every model.
- Math authority remains in `intrinsic-lens-distortion`. GLSL chunks in `cameras` are documented mirrors of `distortion/*.ts`, and a GPU parity test checks them against `core` (see Verification).

### Shared uniforms (why one program works for many cameras)

All patched materials reference **the same uniform objects** (`SENSOR_UNIFORMS`). `SensorRenderer.render` writes the active camera into them just before drawing and sets `uSensorActive` to `0` afterwards. Consequences:

- Several cameras — even of the same model with different `K` — can render one scene, via one or several `SensorRenderer`s.
- Changing intrinsics or coefficients needs **no recompile** (a plain uniform write).
- Rendering the scene with a stock Three.js camera afterwards is undistorted, because the shader falls back to `projectionMatrix * mvPosition` when `uSensorActive` is `0`.
- The program cache key is a constant (`sensor-distortion-v1`, combined with any user-provided key). Patch bookkeeping lives on the material, not the plugin, so patches are never owned by one plugin instance.

Earlier iterations baked uniforms in at compile time and tied patch state to the first plugin that touched a material; that rendered every view with the first camera and relied on forcing a recompile every frame.

---

## Material policy

**Target:** All **built-in** Three.js mesh/line/point materials work without user modification.

| Content type | Support |
|--------------|---------|
| `Mesh` + `MeshBasicMaterial`, `MeshLambertMaterial`, `MeshPhongMaterial`, `MeshStandardMaterial`, `MeshPhysicalMaterial`, `MeshToonMaterial`, `MeshNormalMaterial`, `MeshMatcapMaterial`, `ShadowMaterial` | ✅ |
| `LineSegments` / `Line` + `LineBasicMaterial`, `LineDashedMaterial` | ✅ |
| `Points` + `PointsMaterial` | ✅ |
| `InstancedMesh`, multi-material meshes | ✅ (per-instance transform, then shared projection hook) |
| Shadows | ✅ (Three's internal depth/distance materials are never patched; the light's shadow pass is unaffected) |
| Custom `ShaderMaterial` that includes `<project_vertex>` | ⚙️ opt-in: `material.userData.sensorDistortion = true` |

**Not supported (documented, with a one-time console warning where detectable):**

- Other custom `ShaderMaterial` / `RawShaderMaterial` that bypass the projection chunk
- `Sprite` / `SpriteMaterial` (no `project_vertex` in the sprite shader)
- `Line2` / `LineMaterial` and other `examples/jsm` line types, `CSS2DRenderer`
- WebGPU / WebGL 1

### Behaviours to know

- **Distortion is per-vertex.** Fragments interpolate linearly between vertices, so large flat triangles stay straight. Tessellate flat geometry (the example scene's floor and wall are subdivided for this reason).
- **Behind-camera points** (`Z_cv ≤ 0`) are sent outside clip space; triangles straddling the camera plane are not rendered correctly, and fisheye FOV above 180° is unsupported.
- **Frustum culling** uses the camera's pinhole projection matrix, which wrongly rejects objects that distortion pulls into the image. While a distorting camera renders, `frustumCulled` is disabled on scene objects and restored afterwards (`disableFrustumCulling` option, default on).
- **Canvas aspect.** The NDC mapping assumes the viewport spans the full `imageWidth × imageHeight` image. Use `fitRendererToSensor` (exact size or letterbox) so overlays align.
- **No object selection yet.** Distortion only affects *rendering*; real geometry is unchanged. Picking an object under a sensor pixel needs the inverse path (pixel → undistorted ray → intersect scene), which `core`/`pixelToThreeRayFromCamera` provide only as far as the ray direction. Scene intersection is planned, not implemented, and `THREE.Raycaster.setFromCamera` is invalid for distorting cameras because it uses the pinhole `projectionMatrix`.
- **Pixel origin.** The shader maps `u` from the pixel's top-left *edge* (`ndc = 2u/W − 1`); OpenCV/`core` use the pixel *centre* with no ±0.5 offset. Expect up to half a pixel difference against a real photo.

---

## Usage

**Single source of truth:** module docstring in [`packages/cameras/src/sensor/SensorRenderer.ts`](../packages/cameras/src/sensor/SensorRenderer.ts) (mirrored in the root README and [`packages/cameras/README.md`](../packages/cameras/README.md)).

```typescript
const camera = new SensorCamera({ model: 'brown-conrady', intrinsics, imageWidth, imageHeight, brownConrady });
fitRendererToSensor(renderer, camera);
const sensor = new SensorRenderer();
sensor.render(renderer, scene, camera);
```

Position the camera like any Three.js camera (looks down −Z, +Y up). Frame conversion (`opencvCameraToThreeJs`) happens inside the shader — user scene content is not rotated.

A background sensor image (HTML `<img>` behind the canvas, or a textured quad) uses the **same** `K`, image size and distortion model so overlays align.

Presets (`createSensorCamera({ model })`, model switching) live in the **demo app only** — they are not part of the library's public API (`packages/cameras/src/index.ts`).

---

## Verification

| Layer | Where | What |
|-------|-------|------|
| Unit | `packages/cameras/test/*.test.ts` | Patching per material class, shared-uniform identity, constant cache key, no per-frame `needsUpdate`, arming/disarming (incl. on throw), culling restore, camera mutation, public API surface |
| GPU parity | `packages/cameras/test/visual/` (Playwright, software WebGL) | Probe points rendered through each model land within 1 px of the `core` projection; several cameras on one scene; coefficient changes on a live camera; stock camera afterwards undistorted; every built-in material renders |
| Visual | demo (`npm run dev`) | One scene through four cameras with a CPU-projection overlay (magenta) and per-view probe error; **"Try your own camera"** form for custom intrinsics/coefficients with a pass/fail check against `core` |

---

## Extensibility beyond OpenCV

New distortion backends add:

1. Forward math in `core` (if not already present)
2. A GLSL chunk mirror in `cameras/shaders/chunks/` and a model id in `uDistortionModel`
3. `SensorCamera` coefficient payload + a branch in `writeSensorUniforms`

The user-facing API (`new SensorCamera({ model, … })`, `SensorRenderer.render`) stays stable. OpenCV models are the first backend, not the architecture ceiling.

---

## Layer responsibilities

| Layer | Responsibility |
|-------|------------------|
| `reference/` | OpenCV ground truth, golden fixtures |
| `packages/core/` | All numerical camera math (OpenCV conventions) |
| `packages/core/coords/three.ts` | OpenCV ↔ Three.js point/direction conversion |
| `packages/cameras/cameras/` | `SensorCamera`, projection matrix builder, pixel→ray helper |
| `packages/cameras/render/` | `DistortionRenderPlugin`, shared uniforms |
| `packages/cameras/sensor/` | `SensorRenderer`, `fitRendererToSensor` |
| `packages/cameras/shaders/chunks/` | GLSL mirrors of core forward distortion |
| `packages/cameras/src/index.ts` | Public API surface (nothing from `demo/` or `main.ts`) |
| `packages/cameras/src/demo/`, `scene/`, `main.ts` | Demo app and example scene (not published) |
| User scene | Meshes, materials, instancing — **unchanged** |

**Do not** duplicate projection math in `cameras` beyond matrix assembly and documented GLSL mirrors.

---

## Relationship to Phase 6 / 7 / 9

| Phase | Role |
|-------|------|
| **6** | 2D canvas overlay in OpenCV pixel space — pedagogical reference |
| **7** | Inverse path + rays in `core` — picking, validation, custom-camera probe placement |
| **8** | GPU sensor rendering via `SensorCamera` + `DistortionRenderPlugin` |
| **9** | Publishable library: public entry, shared-uniform plugin, example scene, GPU parity tests, packaging |

---

## Summary

| Question | Answer |
|----------|--------|
| Are camera extensions the right **user API**? | ✅ Yes — via `SensorCamera` + `SensorRenderer` |
| Are camera extensions **sufficient alone**? | ❌ No — the plugin patches materials and owns the uniforms |
| Can users avoid changing meshes/materials? | ✅ Yes, for built-in materials, via the global patch |
| Can one scene be rendered through several cameras? | ✅ Yes — camera passed per render call, shared uniforms |
| Correct approach for distorted overlay on sensor image? | ✅ Forward distortion at projection time |
| OpenCV-only forever? | ❌ No — pluggable model id + core/cameras backend per model |

Implementation plan: [plans/phase-8-threejs-camera.md](./plans/phase-8-threejs-camera.md).

# Sensor Rendering Architecture

Status: **implemented** (Phase 8 ✅). Architecture reference for `SensorRenderer` / `DistortionRenderPlugin`.

Related: [coordinate-conventions.md](./coordinate-conventions.md), [plans/phase-8-threejs-camera.md](./plans/phase-8-threejs-camera.md)

---

## Goal

Render arbitrary Three.js content — points, lines, meshes, instanced geometry — **as if collected by a physical sensor** with known intrinsics and lens distortion, without requiring users to modify geometry or materials.

**Primary use case:** Display 3D annotations (points, lines, models) with **forward distortion applied**, superimposed on a **pre-captured 2D sensor image** from the same camera calibration.

**Initial models:** OpenCV (pinhole, Brown-Conrady, rational, fisheye). The architecture should allow additional distortion backends later without changing user-facing scene code.

**UX target:** User selects a distortion model and supplies `K` and parameters. No knowledge of normalized planes, iterative undistort, or frame conversion required.

---

## Design decision: two cooperating components

A custom **`THREE.Camera` subclass alone is not sufficient.** Phase 8 uses two first-class pieces:

| Component | Role |
|-----------|------|
| **`SensorCamera`** (custom `THREE.Camera`) | User-facing API: model id, intrinsics `K`, distortion params, image size, near/far. Builds pinhole `projectionMatrix`. Supplies uniforms to the render plugin. |
| **`DistortionRenderPlugin`** | Global render hook: patches **standard** Three.js materials at compile/render time so forward distortion runs in the vertex path. User meshes and materials stay unchanged. |

```
User code                          Internal
─────────                          ────────
scene.add(mesh, lines, points)  →  unchanged
sensor.render(renderer, scene)  →  SensorRenderer → SensorCamera + DistortionRenderPlugin
SensorRenderer.create({ model })
```

**Why not camera-only?**

- **Linear intrinsics (`K`)** fit in `camera.projectionMatrix` ✅
- **Non-linear distortion** depends on each vertex's direction from the camera ❌ cannot be encoded in a single 4×4 matrix for all vertices

Distortion must run in the **vertex shader** (or an equivalent full-scene technique). The camera owns *what* to apply; the plugin owns *how* to apply it across the scene without per-material user edits.

---

## Why forward distortion (not framebuffer warp)

For overlay on a real sensor photo, annotations must land at **distorted pixel locations** — where the sensor actually recorded them.

| Approach | Fits sensor overlay? |
|----------|----------------------|
| **Forward distortion at projection** (vertex stage) | ✅ Yes — 3D point → distorted `(u,v)` matching the image |
| Render undistorted, warp framebuffer to distorted | ❌ Wrong direction for aligning 3D vectors with a distorted photo |
| CPU re-project / rebuild geometry each frame | ❌ Violates "don't change mesh" |

Forward distortion in the projection path is the correct model for this use case.

---

## Rendering pipeline

```
World vertex (Three.js scene graph)
        │
        ▼
  modelViewMatrix  →  camera-space (Three.js: visible when Z < 0)
        │
        ├─ Pinhole (no distortion) ─────────────────────────────┐
        │   projectionMatrix from K  →  clip space               │
        │                                                          │
        └─ Distorted models ──────────────────────────────────────┤
            DistortionRenderPlugin (vertex insertion):             │
              camera-space → OpenCV camera-space (S)               │
              normalize (x,y) = (X/Z, Y/Z)                         │
              forward distort (GLSL mirror of core)                │
              apply K → clip / NDC                                 │
                                                                   ▼
                                                            stock fragment shaders
```

- **Pinhole:** `DistortionRenderPlugin` inactive; `SensorCamera.projectionMatrix` only.
- **Distorted models:** plugin active; minimal **vertex** insertions only (no custom fragment pipeline).

Math authority remains in `@three-camera-intrinsics-and-distortion-lab/core`. GLSL chunks in `viz` are documented mirrors of `distortion/*.ts`.

---

## Material policy

**Target:** All **built-in** Three.js materials work without user modification.

| Content type | Expected support |
|--------------|------------------|
| `Mesh` + `MeshBasicMaterial`, `MeshStandardMaterial`, … | ✅ |
| `LineSegments` / `Line` + `LineBasicMaterial` | ✅ |
| `Points` + `PointsMaterial` | ✅ |
| `InstancedMesh` | ✅ (per-instance transform, then shared projection hook) |

**Explicit exclusions (document, do not promise):**

- Custom `ShaderMaterial` / `RawShaderMaterial` that bypass Three.js projection chunks
- `CSS2DRenderer`, sprites, some `examples/jsm` line types
- Materials compiled before the plugin is registered

The plugin applies patches globally (e.g. via centralized `onBeforeCompile` handling tied to render lifecycle), not by requiring users to call `camera.patchMaterial(material)` for every asset.

---

## Usage

**Single source of truth:** module docstring in [`packages/viz/src/sensor/SensorRenderer.ts`](../packages/viz/src/sensor/SensorRenderer.ts).

Do not add usage examples elsewhere — link to that file. The demo (`main.ts`) follows it via `SensorRenderer.create()` and `sensor.render()`.

Background sensor image (HTML `<img>` behind canvas, or textured quad) uses the **same** `K`, image size, and distortion model so overlays align.

Frame conversion (`opencvCameraToThreeJs`) happens inside the camera/plugin — not in user code.

---

## Extensibility beyond OpenCV

New distortion backends add:

1. Forward math in `core` (if not already present)
2. A GLSL chunk mirror in `viz/shaders/chunks/`
3. A `SensorCamera` factory branch + plugin uniform layout

The user-facing API (`SensorRenderer.create({ model, … })` or custom `SensorCamera`) stays stable. OpenCV models are the first backend, not the architecture ceiling.

---

## Layer responsibilities

| Layer | Responsibility |
|-------|------------------|
| `reference/` | OpenCV ground truth, golden fixtures |
| `packages/core/` | All numerical camera math (OpenCV conventions) |
| `packages/core/coords/three.ts` | OpenCV ↔ Three.js point/direction conversion |
| `packages/viz/cameras/` | `SensorCamera` subclasses, projection matrix builder |
| `packages/viz/render/` (or `cameras/plugin/`) | `DistortionRenderPlugin` |
| `packages/viz/shaders/chunks/` | GLSL mirrors of core forward distortion |
| User scene | Meshes, materials, instancing — **unchanged** |

**Do not** duplicate projection math in `viz` beyond matrix assembly and documented GLSL mirrors.

---

## Relationship to Phase 6 / 7

| Phase | Role |
|-------|------|
| **6** | 2D canvas overlay in OpenCV pixel space — pedagogical reference |
| **7** | Inverse path + rays in `core` — picking, validation, future tools |
| **8** | GPU sensor rendering via `SensorCamera` + `DistortionRenderPlugin` |

Phase 6 left panel remains a visual reference. Phase 7 `pixelToCameraRay*` supports picking under a sensor camera. Viz unit tests cover plugin patch/unpatch lifecycle (see `packages/viz/test/DistortionRenderPlugin.test.ts`).

---

## Summary

| Question | Answer |
|----------|--------|
| Are camera extensions the right **user API**? | ✅ Yes — via `SensorRenderer` / `SensorCamera` |
| Are camera extensions **sufficient alone**? | ❌ No — `SensorRenderer` wraps camera + `DistortionRenderPlugin` |
| Can users avoid changing meshes/materials? | ✅ Yes, for built-in materials, via global plugin |
| Correct approach for distorted overlay on sensor image? | ✅ Forward distortion at projection time |
| OpenCV-only forever? | ❌ No — pluggable model id + core/viz backend per model |

Implementation plan: [plans/phase-8-threejs-camera.md](./plans/phase-8-threejs-camera.md).

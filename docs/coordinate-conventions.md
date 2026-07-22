# Coordinate Conventions

This document is the contract between:

- **OpenCV / Python reference** (`reference/`) — numerical ground truth
- **Pure JavaScript camera math** (`packages/core/`) — uses OpenCV conventions internally
- **Three.js visualization** (`packages/viz/`) — converts at the rendering boundary

**Rule:** All projection math in `core` and all golden tests match OpenCV. Three.js frame conversion happens only in `coords/` helpers and the viz layer.

---

## 1. OpenCV camera frame

OpenCV defines a **right-handed** camera coordinate system attached to the physical camera.

| Axis | Direction | Notes |
|------|-----------|-------|
| **+X** | Right | Parallel to image rows, increasing `u` |
| **+Y** | Down | Parallel to image columns, increasing `v` |
| **+Z** | Forward | Along the optical axis, into the scene |

A point is **in front of the camera** when `Z > 0`.

```
                    scene (Z > 0)
                         │
                         ▼  +Z (optical axis)
                    ┌─────────┐
                    │  image  │
                    │         │
           ─────────┼─────────┼─────────▶ +X (right)
                    │    ●    │           principal point
                    │         │
                    ▼ +Y (down)

        Camera sits at the origin, looking down +Z.
        Image plane is at Z = f (conceptually; projection uses similar triangles).
```

### OpenCV image / pixel coordinates

Separate from the 3D camera frame, OpenCV uses 2D image coordinates:

| Symbol | Meaning |
|--------|---------|
| `(u, v)` | Pixel coordinates in the image |
| **+u** | Right |
| **+v** | Down |
| Origin | Top-left corner of the image (pixel `(0, 0)`) |

The **normalized image plane** (before distortion, before applying intrinsics):

```
x = X / Z
y = Y / Z
```

Pixel coordinates follow the pinhole model:

```
u = fx * x + cx
v = fy * y + cy
```

where `K = [[fx, 0, cx], [0, fy, cy], [0, 0, 1]]` is the camera matrix.

Distortion is applied to `(x, y)` on the normalized plane, **before** multiplying by `K`.

---

## 2. Three.js camera frame

Three.js `PerspectiveCamera` (and all built-in cameras) use a **right-handed** local frame with a fixed viewing direction.

| Axis | Direction | Notes |
|------|-----------|-------|
| **+X** | Right | |
| **+Y** | Up | World `up` vector defaults to `(0, 1, 0)` |
| **+Z** | Backward | Camera looks down **−Z** |

A point is **in front of the camera** when `Z < 0` (negative Z in camera space).

```
                         +Y (up)
                          │
                          │
                          │
        ──────────────────●──────────────────▶ +X (right)
                       camera
                          │
                          │  viewing direction = −Z
                          ▼
                        −Z (into scene)

        Camera sits at the origin, looking down −Z.
        Visible objects have negative Z in camera space.
```

Three.js world space is also right-handed with **+Y up**. This matches typical 3D authoring but **not** the OpenCV camera frame.

---

## 3. OpenCV ↔ Three.js camera transform

The two camera frames share **+X right** but differ in **Y** (down vs up) and **Z** (forward vs backward). The conversion is a **180° rotation about the X axis** — no translation, no scaling.

### Diagram (same physical camera, two conventions)

```
   OpenCV frame                    Three.js frame
   ─────────────                   ────────────────

        +Y ↓                             +Y ↑
             │                                │
             │                                │
   ──────────●──────────▶ +X          ───────●───────▶ +X
             │                                │
             │                                │
        +Z ↙ (into scene)               −Z ↙ (into scene)
        looks down +Z                   looks down −Z
```

Both cameras sit at the same physical location and point at the same scene content. Only the axis labels differ.

### Transform matrix

Using **column vectors** for 3D points (consistent with OpenCV and Three.js math libraries):

```
p_cv  = [X, Y, Z]ᵀ    ← OpenCV camera coordinates
p_three = [X, Y, Z]ᵀ  ← Three.js camera coordinates
```

**OpenCV → Three.js:**

```
p_three = S · p_cv

S = [  1   0   0 ]
    [  0  −1   0 ]
    [  0   0  −1 ]
```

Expanded:

```
X_three =  X_cv
Y_three = −Y_cv
Z_three = −Z_cv
```

**Three.js → OpenCV** (same matrix — `S` is its own inverse, `S⁻¹ = S`):

```
p_cv = S · p_three
```

### Verification against visibility rules

| Point location | OpenCV | Three.js |
|----------------|--------|----------|
| 1 m in front of camera | `Z_cv = +1` | `Z_three = −1` ✓ (visible) |
| 1 m above center | `Y_cv = −1` | `Y_three = +1` ✓ |
| 1 m to the right | `X_cv = +1` | `X_three = +1` ✓ |

### Matrix form for point batches

For `N` points stored as rows `(N×3)` (common in JS):

```javascript
// OpenCV (N×3) → Three.js (N×3)
pThree[i] = [ pCv[i][0], -pCv[i][1], -pCv[i][2] ];
```

For column vectors used with `Matrix4`:

```javascript
// Three.js Matrix4: build S as a pure rotation (determinant = +1)
const S = new Matrix4().makeRotationX(Math.PI);
// p_three = S * p_cv
```

---

## 4. Where each convention is used

| Layer | Coordinate system | Notes |
|-------|-------------------|-------|
| `reference/` (Python) | OpenCV | `cv2.projectPoints`, calibration output |
| `packages/core/` | OpenCV | All projection, distortion, golden-test comparisons |
| `packages/viz/` | Three.js | Scene graph, `PerspectiveCamera`, shaders |
| Boundary | `coords/opencv.ts`, `coords/three.ts` | Explicit conversion helpers |

**Do not** silently flip axes inside distortion or projection code. Conversions belong in `coords/`.

---

## 5. World coordinates and extrinsics

OpenCV extrinsics `(rvec, tvec)` map a **world/object point** into the **OpenCV camera frame**:

```
p_cv = R · p_world + t
```

where `R` is the 3×3 rotation from `cv2.Rodrigues(rvec)` and `t` is a 3×1 translation.

Three.js places cameras in the scene graph; `camera.matrixWorld` maps from camera-local to world coordinates.

Converting an OpenCV calibration to a Three.js camera pose requires:

1. Apply the OpenCV extrinsic to get `p_cv`.
2. Optionally convert world-frame conventions if the calibration world frame differs from the Three.js scene.
3. Apply `S` only when moving between **camera-local** OpenCV and Three.js frames.

World-frame alignment depends on how the calibration target was defined (chessboard on a table vs vertical wall, etc.). Document the world frame per dataset; do not assume it matches the Three.js scene origin.

> **Initial implementation note:** Golden tests will use identity extrinsics (`rvec = 0`, `tvec = 0`) with 3D points already expressed in the OpenCV camera frame. Extrinsic conversion will be added when viz needs a calibrated camera pose.

---

## 6. Normalized vs pixel coordinates

Pinhole projection (no distortion) follows this pipeline in `packages/core`:

```
(X, Y, Z)  →  (x, y) = (X/Z, Y/Z)  →  (u, v) = (fx·x + cx, fy·y + cy)
   3D              normalized               pixels
```

| Space | Coordinates | Range |
|-------|-------------|-------|
| OpenCV camera frame | `(X, Y, Z)` | `Z > 0` in front of camera |
| Normalized plane | `(x, y) = (X/Z, Y/Z)` | Unbounded (distortion applied here in later phases) |
| Pixels | `(u, v)` | Sub-pixel floats from `cv2.projectPoints` |

Golden fixtures use identity extrinsics with 3D points already in the OpenCV camera frame. JS implementation: `projection/pinhole.ts`.

### Fixture schema (pinhole)

```json
{
  "model": "pinhole",
  "opencv_version": "5.0.0",
  "camera_matrix": [[800, 0, 320], [0, 800, 240], [0, 0, 1]],
  "dist_coeffs": [0, 0, 0, 0, 0],
  "points_3d": [[0, 0, 1], ...],
  "expected_pixels": [[320, 240], ...],
  "tolerance": { "abs": 1e-4, "rel": 1e-6 }
}
```

Generated by `reference/src/camera_lab_ref/generate_fixtures.py`, stored in `reference/fixtures/pinhole/`.

---

## 7. Distortion coefficient layouts

Coefficient order must match OpenCV exactly. Per-model details: [docs/models/](./models/).

| Model | OpenCV function | Coefficient order | Status |
|-------|-----------------|-------------------|--------|
| Pinhole (none) | `cv2.projectPoints` | `[0, 0, 0, 0, 0]` | ✅ Implemented |
| Brown-Conrady (plumb bob) | `cv2.projectPoints` | `[k1, k2, p1, p2, k3]` | ✅ [docs/models/brown-conrady.md](./models/brown-conrady.md) |
| Rational | `cv2.projectPoints` | `[k1, k2, p1, p2, k3, k4, k5, k6]` | ✅ [docs/models/rational.md](./models/rational.md) |
| Fisheye | `cv2.fisheye.projectPoints` | `[k1, k2, k3, k4]` | Phase 5 |

Fisheye uses a separate OpenCV API and separate JS module — do not unify with pinhole/Brown-Conrady paths.

---

## 8. Edge cases and golden-test policy

These policies apply to all golden tests (pinhole is already in use).

| Case | Policy |
|------|--------|
| Point behind camera (`Z_cv ≤ 0`) | **Exclude** from golden fixtures. No defined JS behavior yet. |
| Pixel / sub-pixel output | Use **`cv2.projectPoints` output directly** — no manual 0.5 px offset. See below. |
| Angles | Radians everywhere unless noted |
| Floating-point tolerance | Absolute **≤ 1e-4 px** per coordinate unless a fixture overrides |

### Pixel center convention (verified)

OpenCV's pinhole model is:

```
u = fx · (X/Z) + cx
v = fy · (Y/Z) + cy
```

There is **no** additional half-pixel shift in this formula or in `cv2.projectPoints`.

**Verification** (OpenCV 5.0.0, `reference/fixtures/pinhole/basic.json`):

| 3D point (camera frame) | Expected `(u, v)` from OpenCV |
|-------------------------|-------------------------------|
| `(0, 0, 1)` | `(320, 240)` — equals `(cx, cy)` exactly |
| `(0.1, 0, 1)` | `(400, 240)` — `fx·0.1 + cx` |

Golden tests compare JS output to these floating-point values. Do not round to integer pixels or add ±0.5 offsets.

---

## Quick reference

```
OpenCV camera:     +X right,  +Y down,    +Z forward,   visible when Z > 0
Three.js camera:   +X right,  +Y up,      +Z backward,  visible when Z < 0

OpenCV → Three.js:  diag(1, −1, −1)  =  rotation π about X
Three.js → OpenCV:  same matrix (self-inverse)
```

# Phase 5 Plan — OpenCV Fisheye Forward Distortion

Status: **✅ complete**

Model reference: [docs/models/fisheye.md](../models/fisheye.md)

---

## Goal

Implement OpenCV's **fisheye camera model** forward projection, validated against `cv2.fisheye.projectPoints`.

**Pipeline:**

```
(X, Y, Z)  →  (a, b) = (X/Z, Y/Z)  →  (a', b') = fisheye_distort(a, b)  →  (u, v) = K·(a', b')
```

**In scope:** forward projection, 4-coeff fixtures, unit + golden tests, model docs.  
**Out of scope:** undistortion (`cv2.fisheye.undistortPoints`), viz, generic distortion framework, skew parameter `alpha ≠ 0`.

---

## How fisheye differs from prior models

| Aspect | Pinhole / Brown-Conrady / Rational | OpenCV fisheye |
|--------|-------------------------------------|----------------|
| OpenCV API | `cv2.projectPoints` | `cv2.fisheye.projectPoints` |
| Distortion domain | Normalized plane radius `r² = x² + y²` | Angle `θ = atan(r)` from optical axis |
| Radial model | Polynomial (and rational) in `r` | Polynomial in `θ` |
| Tangential terms | `p1`, `p2` (Brown/Rational) | **None** |
| Coefficients | 5 or 8 | **4:** `[k1, k2, k3, k4]` |
| Zero coeffs | Pinhole (linear `r`) | **Equidistant** (`θ_d = θ`) — **not pinhole** |

**Critical:** Do not expect zero-coeff fisheye fixtures to match `pinhole/basic.json`. Golden tests compare JS to OpenCV only, plus internal consistency checks.

---

## Math / equations

Given a 3D point `(X, Y, Z)` in the **OpenCV camera frame** with `Z > 0`:

### 1. Perspective to normalized plane

```
a = X / Z
b = Y / Z
r = sqrt(a² + b²)
θ = atan(r)
```

### 2. Fisheye radial distortion (in angle space)

```
θ_d = θ · (1 + k1·θ² + k2·θ⁴ + k3·θ⁶ + k4·θ⁸)
```

### 3. Distorted normalized coordinates

When `r > 0`:

```
a' = (θ_d / r) · a
b' = (θ_d / r) · b
```

When `r = 0` (point on the optical axis):

```
a' = 0,  b' = 0
```

### 4. Apply intrinsics (α = 0)

OpenCV fisheye supports skew `alpha` in the general form `u = fx·(a' + α·b') + cx`. Initial implementation uses **α = 0** (matches default `cv2.fisheye.projectPoints`):

```
u = fx · a' + cx
v = fy · b' + cy
```

Same `K` matrix layout as pinhole: `[[fx, 0, cx], [0, fy, cy], [0, 0, 1]]`.

---

## OpenCV API mapping

### Python reference (fixture generation)

```python
import cv2
import numpy as np

object_points = np.array([points_3d], dtype=np.float64)  # N×1×3 or 1×N×3
rvec = np.zeros((3, 1), dtype=np.float64)   # identity extrinsics
tvec = np.zeros((3, 1), dtype=np.float64)
K = camera_matrix                          # 3×3
D = np.array(dist_coeffs, dtype=np.float64)  # shape (4, 1) or (4,)

image_points, _ = cv2.fisheye.projectPoints(object_points, rvec, tvec, K, D)
```

**Notes:**

- Use a **separate** helper in `generate_fixtures.py` — do not route fisheye through `project_points()` which calls `cv2.projectPoints`.
- `rvec`/`tvec` shape may be `(3, 1)` (verify against existing OpenCV 5.x in `.venv`).
- Identity extrinsics; 3D points already in OpenCV camera frame (same convention as prior phases).

### JavaScript API (to implement)

```typescript
distortFisheye(normalized: Vec2, coeffs: FisheyeCoeffs): Vec2
projectFisheye(point: Vec3, intrinsics: CameraMatrix, coeffs: FisheyeCoeffs): Vec2
projectFisheyePoints(points, intrinsics, coeffs): Vec2[]
```

Reuse `applyIntrinsics` from `projection/pinhole.ts` for step 4 (α = 0). Do **not** reuse Brown-Conrady/rational distort functions.

---

## Files to add / modify

| File | Action |
|------|--------|
| `docs/models/fisheye.md` | **New** — equations, API, fixtures, r=0 edge case |
| `packages/core/src/distortion/fisheye.ts` | **New** — `distortFisheye`, `projectFisheye` |
| `packages/core/src/types.ts` | Add `FisheyeCoeffs`, `FisheyeFixture`, `fisheyeFromArray()` |
| `packages/core/src/index.ts` | Export fisheye symbols |
| `reference/src/camera_lab_ref/generate_fixtures.py` | Add `project_fisheye_points()`, `write_fisheye_fixtures()` |
| `reference/fixtures/fisheye/*.json` | **New** — golden vectors |
| `packages/core/test/unit/fisheye.test.ts` | **New** |
| `packages/core/test/golden/fisheye.test.ts` | **New** |
| `docs/progress.md` | Update on completion |
| `docs/coordinate-conventions.md` §7 | Mark fisheye ✅ |
| `docs/plans/README.md` | Mark Phase 5 complete when done |

**Do not modify:** `brown-conrady.ts`, `rational.ts`, `pinhole.ts` behavior.

---

## Implementation steps

### Step 0 — Fixture generator split

Add dedicated fisheye projection in Python:

```python
def project_fisheye_points(points_3d, camera_matrix, dist_coeffs) -> list[list[float]]:
    D = np.array(dist_coeffs, dtype=np.float64).reshape(4, 1)
    # cv2.fisheye.projectPoints(...)
```

Call from `write_fisheye_fixtures()` in `main()`.

### Step 1 — Document model

Create `docs/models/fisheye.md` during implementation (equations above, coefficient table, `alpha=0` note, no pinhole equivalence at k=0).

### Step 2 — Types

```typescript
export interface FisheyeCoeffs {
  readonly k1: number;
  readonly k2: number;
  readonly k3: number;
  readonly k4: number;
}

export interface FisheyeFixture {
  readonly model: 'fisheye';
  // camera_matrix, dist_coeffs (length 4), points_3d, expected_pixels, tolerance
}
```

### Step 3 — Python fixtures

Reuse `STANDARD_CAMERA_MATRIX` and `STANDARD_POINTS_3D` for cross-model comparability on the **input** side; expected pixels will differ from pinhole.

| Fixture | Purpose | Coeffs `[k1, k2, k3, k4]` |
|---------|---------|----------------------------|
| `basic.json` | Moderate fisheye distortion | e.g. `[-0.08, 0.01, -0.002, 0.0005]` |
| `mild.json` | Small distortion | e.g. `[-0.03, 0.001, 0, 0]` |
| `zero-coeff.json` | Equidistant projection (`θ_d = θ`) | `[0, 0, 0, 0]` |
| `wide-angle.json` | Stronger but numerically safe | e.g. `[-0.15, 0.02, -0.004, 0.001]` |

**Do not** add a `pinhole-equiv.json` — fisheye with zero coeffs is equidistant, not pinhole.

### Step 4 — JS module

`distortion/fisheye.ts`:

- Compute `a`, `b`, `r`, `θ`, `θ_d` per equations above
- Handle `r === 0` explicitly → `[0, 0]`
- Consider `r` below a tiny epsilon (e.g. `1e-12`) as axis point if floating-point noise appears
- `projectFisheye` composes: normalized `(a,b)` → `distortFisheye` → `applyIntrinsics`

### Step 5 — Unit tests

| Test | Expected |
|------|----------|
| Optical axis `(0, 0, Z)` | `(cx, cy)` for any coeffs |
| `r = 0` in distort | `(0, 0)` |
| All coeffs zero | `distortFisheye` matches equidistant: `(θ/r)·a` when `r > 0` |
| Zero coeffs ≠ pinhole | For `(0.1, 0, 1)`, fisheye ≠ `projectPinhole` (documents model difference) |
| Mild coeffs | hand-check one point or compare to precomputed value from Python snippet |

### Step 6 — Golden tests

`test/golden/fisheye.test.ts`:

- `it.each` over all fixtures in `reference/fixtures/fisheye/`
- Assert `dist_coeffs.length === 4`
- Compare every point to `expected_pixels` within tolerance
- **Do not** cross-assert against pinhole fixtures
- Optional: `zero-coeff.json` internal consistency — JS equidistant matches OpenCV (already covered by golden loop)

---

## Fixture schema

```json
{
  "model": "fisheye",
  "opencv_version": "5.0.0",
  "camera_matrix": [[800, 0, 320], [0, 800, 240], [0, 0, 1]],
  "dist_coeffs": [k1, k2, k3, k4],
  "points_3d": [[x, y, z], ...],
  "expected_pixels": [[u, v], ...],
  "tolerance": { "abs": 1e-4, "rel": 1e-6 }
}
```

---

## Testing summary

```
Unit tests (hand-crafted)
  ├── optical axis → principal point
  ├── r=0 edge case
  ├── zero-coeff equidistant behavior
  ├── zero-coeff ≠ pinhole (explicit)
  └── optional single numeric spot-check

Golden tests (OpenCV fixtures)
  ├── basic.json
  ├── mild.json
  ├── zero-coeff.json
  └── wide-angle.json
```

Target: **~10–14 new tests**; existing **33 tests** must remain green.

---

## Definition of done

- [x] `projectFisheye` matches `cv2.fisheye.projectPoints` for all fixtures
- [x] `r = 0` / optical-axis edge cases handled
- [x] Zero-coeff case matches OpenCV equidistant (not pinhole)
- [x] `npm run generate:fixtures` writes `reference/fixtures/fisheye/`
- [x] `npm test` green (41 total tests)
- [x] `docs/models/fisheye.md` written
- [x] `docs/progress.md` and `docs/coordinate-conventions.md` §7 updated
- [x] This plan marked ✅ complete

---

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Wrong API (`projectPoints` vs `fisheye.projectPoints`) | Separate Python helper; golden tests gate correctness |
| `r = 0` division by zero | Explicit branch; test optical-axis points |
| Assuming k=0 → pinhole | Document and unit-test inequality vs pinhole |
| Large θ blows up polynomial | Keep fixture coeffs moderate; points stay within reasonable FOV |
| `rvec`/`tvec` shape mismatch in Python | Match shapes used in `verify_opencv.py` / test in `.venv` first |
| Skew `alpha` | Defer; document α = 0; add later if needed |

---

## What not to abstract yet

- No unified `project(model, point, coeffs)` dispatcher
- No shared base between fisheye and Brown-Conrady/rational
- No `cv2.fisheye.undistortPoints` / iterative inverse
- No viz overlays (Phase 6)
- No skew parameter `alpha` until a fixture requires it
- No merging fisheye into `generate_fixtures.project_points()` — keep APIs separate

---

## Prompt to implement

> Implement Phase 5 OpenCV fisheye per `docs/plans/phase-5-fisheye.md`: add `project_fisheye_points` to `generate_fixtures.py`, generate fixtures, add `distortion/fisheye.ts`, unit + golden tests, and `docs/models/fisheye.md`. No viz or undistortion.

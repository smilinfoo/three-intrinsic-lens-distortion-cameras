# OpenCV Fisheye Distortion

OpenCV's fisheye camera model projects wide-angle lenses using distortion in **angle space** rather than normalized-plane radius. Validated against `cv2.fisheye.projectPoints`.

## OpenCV mapping

```python
cv2.fisheye.projectPoints(objectPoints, rvec, tvec, camera_matrix, dist_coeffs)
```

| Parameter | Layout |
|-----------|--------|
| `dist_coeffs` (`D`) | `[k1, k2, k3, k4]` — four elements |

Implementation: `packages/core/src/distortion/fisheye.ts`

Golden fixtures: `reference/fixtures/fisheye/`

Phase plan: [docs/plans/phase-5-fisheye.md](../plans/phase-5-fisheye.md)

## Pipeline

```
(X, Y, Z)  →  (a, b) = (X/Z, Y/Z)  →  (a', b') = fisheye_distort(a, b)  →  (u, v) = (fx·a' + cx, fy·b' + cy)
```

Skew `alpha` is **0** (OpenCV default). No tangential terms.

## Forward projection equations

Given `(X, Y, Z)` in the OpenCV camera frame with `Z > 0`:

```
a = X/Z,  b = Y/Z
r = sqrt(a² + b²)
θ = atan(r)

θ_d = θ · (1 + k1·θ² + k2·θ⁴ + k3·θ⁶ + k4·θ⁸)
```

When `r > 0`:

```
a' = (θ_d / r) · a
b' = (θ_d / r) · b
```

When `r = 0` (optical axis):

```
a' = 0,  b' = 0
```

Intrinsics (α = 0):

```
u = fx · a' + cx
v = fy · b' + cy
```

## Difference from pinhole / Brown-Conrady

| Zero coefficients | Behavior |
|-------------------|----------|
| Pinhole / Brown-Conrady / Rational | Linear: `(a', b') = (a, b)` |
| **Fisheye** | **Equidistant:** `(a', b') = (θ/r)·(a, b)` where `θ = atan(r)` |

Do **not** cross-check zero-coeff fisheye fixtures against `pinhole/basic.json`.

## JavaScript API

```typescript
distortFisheye(normalized: Vec2, coeffs: FisheyeCoeffs): Vec2
projectFisheye(point: Vec3, intrinsics: CameraMatrix, coeffs: FisheyeCoeffs): Vec2
```

## Golden fixtures

| File | Purpose |
|------|---------|
| `basic.json` | Moderate fisheye distortion |
| `mild.json` | Small distortion |
| `zero-coeff.json` | Equidistant projection (k = 0) |
| `wide-angle.json` | Stronger distortion |

Regenerate: `npm run generate:fixtures`

## Not in scope (this phase)

- Inverse / undistortion (`cv2.fisheye.undistortPoints`)
- Skew coefficient `alpha ≠ 0`
- Unification with Brown-Conrady or rational modules

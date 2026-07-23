# Rational Polynomial Distortion

OpenCV's extended lens distortion model: Brown-Conrady radial terms in both numerator and denominator. Used by `cv2.projectPoints` with **eight** distortion coefficients.

## OpenCV mapping

```python
cv2.projectPoints(objectPoints, rvec, tvec, camera_matrix, dist_coeffs)
```

| Parameter | Layout |
|-----------|--------|
| `dist_coeffs` | `[k1, k2, p1, p2, k3, k4, k5, k6]` |

Implementation: `packages/core/src/distortion/rational.ts`

Golden fixtures: `reference/fixtures/rational/`

Phase plan: [docs/plans/phase-4-rational.md](../plans/phase-4-rational.md)

## Pipeline

```
(X, Y, Z)  →  (x, y) = (X/Z, Y/Z)  →  (x', y') = distort(x, y)  →  (u, v) = (fx·x' + cx, fy·y' + cy)
```

Distortion is applied on the **normalized image plane**, before intrinsics.

## Forward distortion equations

Given normalized coordinates `(x, y)` and coefficients `[k1, k2, p1, p2, k3, k4, k5, k6]`:

```
r² = x² + y²
radial = (1 + k1·r² + k2·r⁴ + k3·r⁶) / (1 + k4·r² + k5·r⁴ + k6·r⁶)

x' = x·radial + 2·p1·x·y + p2·(r² + 2·x²)
y' = y·radial + p1·(r² + 2·y²) + 2·p2·x·y
```

### Reduction rules

| Condition | Equivalent model |
|-----------|------------------|
| `k4 = k5 = k6 = 0` | Brown-Conrady with same k1–k3, p1, p2 |
| All eight coeffs zero | Pinhole (no distortion) |
| `(x, y) = (0, 0)` | Maps to `(0, 0)` for any coefficients |

## JavaScript API

```typescript
distortRational(normalized: Vec2, coeffs: RationalCoeffs): Vec2
projectRational(point: Vec3, intrinsics: CameraMatrix, coeffs: RationalCoeffs): Vec2
undistortRational(distorted: Vec2, coeffs: RationalCoeffs): Vec2
pixelToCameraRayRational(pixel: Vec2, intrinsics: CameraMatrix, coeffs: RationalCoeffs): Vec3
```

## Inverse distortion (Phase 7)

OpenCV reference: `cv2.undistortPoints` with 8-coeff vector. Iterative fixed-point inverse using forward `distortRational`. When k4–k6 = 0, matches Brown-Conrady inverse behavior.

Golden fixtures: `reference/fixtures/undistort/rational/`

## Golden fixtures

| File | Purpose |
|------|---------|
| `basic.json` | Moderate rational radial + tangential |
| `radial-only.json` | `p1 = p2 = 0`; numerator and denominator active |
| `brown-conrady-equiv.json` | k4=k5=k6=0; must match `brown-conrady/basic.json` |
| `zero-distortion.json` | All zeros; must match `pinhole/basic.json` |

Regenerate: `npm run generate:fixtures`

## Not in scope

- 12-coefficient thin-prism / tilt model
- Five-coefficient vectors (use Brown-Conrady module instead)

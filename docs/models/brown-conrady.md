# Brown-Conrady (Plumb Bob) Distortion

OpenCV's standard lens distortion model for pinhole cameras. Used by `cv2.projectPoints` with up to five distortion coefficients.

## OpenCV mapping

```python
cv2.projectPoints(objectPoints, rvec, tvec, camera_matrix, dist_coeffs)
```

| Parameter | Layout |
|-----------|--------|
| `dist_coeffs` | `[k1, k2, p1, p2, k3]` |

Implementation: `packages/core/src/distortion/brown-conrady.ts`

Golden fixtures: `reference/fixtures/brown-conrady/`

Phase plan: [docs/plans/phase-3-brown-conrady.md](../plans/phase-3-brown-conrady.md)

## Pipeline

```
(X, Y, Z)  →  (x, y) = (X/Z, Y/Z)  →  (x', y') = distort(x, y)  →  (u, v) = (fx·x' + cx, fy·y' + cy)
```

Distortion is applied on the **normalized image plane**, before intrinsics — same as OpenCV.

## Forward distortion equations

Given normalized coordinates `(x, y)` and coefficients `[k1, k2, p1, p2, k3]`:

```
r² = x² + y²
radial = 1 + k1·r² + k2·r⁴ + k3·r⁶

x' = x·radial + 2·p1·x·y + p2·(r² + 2·x²)
y' = y·radial + p1·(r² + 2·y²) + 2·p2·x·y
```

### Term roles

| Term | Type | Effect |
|------|------|--------|
| `k1, k2, k3` | Radial | Barrel / pincushion distortion |
| `p1, p2` | Tangential | Decentering (lens not perfectly aligned) |

### Special cases

- **All zeros:** `(x', y') = (x, y)` — equivalent to pinhole projection.
- **Origin:** `(0, 0)` maps to `(0, 0)` for any coefficients (r = 0).

## JavaScript API

```typescript
distortBrownConrady(normalized: Vec2, coeffs: BrownConradyCoeffs): Vec2
projectBrownConrady(point: Vec3, intrinsics: CameraMatrix, coeffs: BrownConradyCoeffs): Vec2
```

## Golden fixtures

| File | Purpose |
|------|---------|
| `basic.json` | Moderate radial + tangential |
| `radial-only.json` | `p1 = p2 = 0` |
| `tangential-only.json` | `k1 = k2 = k3 = 0` |
| `zero-distortion.json` | Regression check vs pinhole |

Regenerate: `npm run generate:fixtures`

## Not in scope (this phase)

- Inverse / undistortion
- Rational polynomial model — see [docs/models/rational.md](../models/rational.md) (Phase 4)
- Four-coefficient variant (`k3` omitted) — fixtures always supply five values

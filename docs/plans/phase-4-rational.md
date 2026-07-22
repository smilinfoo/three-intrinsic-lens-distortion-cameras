# Phase 4 Plan — Rational Polynomial Distortion

Status: **✅ complete**

Model reference (post-implementation): [docs/models/rational.md](../models/rational.md)

---

## Goal

Implement OpenCV's **rational polynomial radial model** (8-coefficient extension of Brown-Conrady), validated against `cv2.projectPoints`.

**Pipeline:**

```
(X, Y, Z)  →  (x, y)  →  (x', y') = distort_rational(x, y)  →  (u, v) = K·(x', y')
```

**In scope:** forward projection, 8-coeff fixtures, tests, model docs.  
**Out of scope:** undistortion, viz, fisheye (Phase 5), generic distortion framework, 12-coeff thin-prism model.

---

## How rational differs from Brown-Conrady

Brown-Conrady (Phase 3) uses a polynomial radial multiplier:

```
radial = 1 + k1·r² + k2·r⁴ + k3·r⁶
```

Rational model adds a denominator:

```
radial = (1 + k1·r² + k2·r⁴ + k3·r⁶) / (1 + k4·r² + k5·r⁴ + k6·r⁶)
```

Tangential terms are identical to Brown-Conrady:

```
x' = x·radial + 2·p1·x·y + p2·(r² + 2·x²)
y' = y·radial + p1·(r² + 2·y²) + 2·p2·x·y
```

**OpenCV coefficient order (8 params):**

```
[k1, k2, p1, p2, k3, k4, k5, k6]
```

**Reduction rules:**

| Condition | Reduces to |
|-----------|------------|
| `k4 = k5 = k6 = 0` | Brown-Conrady |
| All 8 coeffs zero | Pinhole |

Same API: `cv2.projectPoints` with an 8-element `dist_coeffs` vector.

---

## Files to add / modify

| File | Action |
|------|--------|
| `docs/models/rational.md` | Model reference (equations, API, fixtures) |
| `packages/core/src/distortion/rational.ts` | `distortRational()`, `projectRational()` |
| `packages/core/src/types.ts` | `RationalCoeffs`, `RationalFixture`, `rationalFromArray()` |
| `packages/core/src/index.ts` | Export rational symbols |
| `reference/src/camera_lab_ref/generate_fixtures.py` | 8-coeff support + rational fixtures |
| `reference/fixtures/rational/*.json` | Golden vectors |
| `packages/core/test/unit/rational.test.ts` | Hand-crafted tests |
| `packages/core/test/golden/rational.test.ts` | OpenCV fixture tests |
| `docs/progress.md` | Update on completion |
| `docs/coordinate-conventions.md` §7 | Mark rational ✅ |

**Reuse:** `normalizeToImagePlane`, `applyIntrinsics`, `expectVec2Close`, standard `K` and test points.

**Do not:** merge into `brown-conrady.ts`, add generic distortion dispatcher, change existing pinhole/Brown-Conrady behavior.

---

## Implementation steps

### Step 0 — Refactor fixture generator

Extend `project_points()` to accept variable-length `dist_coeffs` (up to 8 for rational).

### Step 1 — Python fixtures

| Fixture | Purpose |
|---------|---------|
| `basic.json` | Full rational + tangential |
| `radial-only.json` | `p1 = p2 = 0`; numerator and denominator active |
| `brown-conrady-equiv.json` | Same k1–k3, p1, p2 as Brown-Conrady basic; k4=k5=k6=0 |
| `zero-distortion.json` | All zeros — pinhole regression |

### Step 2 — Types + JS module

Separate `distortion/rational.ts`; duplicate tangential terms (keep modules independent).

### Step 3 — Tests

**Unit:** origin, identity, Brown-Conrady equivalence when k4=k5=k6=0, pinhole equivalence, denominator active.

**Golden:** all fixtures; cross-check `brown-conrady-equiv` vs `brown-conrady/basic`, `zero-distortion` vs `pinhole/basic`.

---

## Definition of done

- [x] `projectRational` matches `cv2.projectPoints` for all fixtures
- [x] `k4=k5=k6=0` reproduces Brown-Conrady exactly
- [x] All-zero reproduces pinhole exactly
- [x] `npm run generate:fixtures` writes `reference/fixtures/rational/`
- [x] `npm test` green
- [x] `docs/models/rational.md` written
- [x] `docs/progress.md` updated

---

## Risks

| Risk | Mitigation |
|------|------------|
| Denominator near zero | Moderate fixture coeffs |
| 5 vs 8 coeff OpenCV behavior | Always pass 8 elements for rational fixtures |
| Tangential duplication | Accept until fisheye phase |

---

## Prompt to implement

> Implement Phase 4 rational polynomial per this plan: refactor fixture generator, generate fixtures, add `distortion/rational.ts`, unit + golden tests, and `docs/models/rational.md`.

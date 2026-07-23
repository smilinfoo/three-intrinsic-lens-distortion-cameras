# Phase 7 Plan — Inverse Distortion and Pixel-to-Ray Mapping

Status: **complete**

Sub-phases: **7A** inverse distortion · **7B** pixel → normalized · **7C** pixel → camera ray

Related: [coordinate-conventions.md](../coordinate-conventions.md) §6, [models/](../models/)

---

## Goal

Implement the **inverse** of the forward pipeline (Phases 2–5): given a distorted pixel `(u, v)`, recover the corresponding **unit ray** in the OpenCV camera frame.

**Forward (already done):**

```
(X, Y, Z)  →  normalize  →  distort  →  apply K  →  (u, v)
```

**Inverse (Phase 7):**

```
(u, v)  →  7B: K⁻¹  →  (x_d, y_d)  →  7A: undistort  →  (x, y)  →  7C: ray  →  d̂
```

**In scope:** 7A, 7B, 7C for pinhole, Brown-Conrady, rational, fisheye; Python golden fixtures; round-trip tests.  
**Out of scope:** viz overlays, custom Three.js camera (Phase 8), world/extrinsics, generic inverse framework.

---

## Sub-phase overview

| Step | Name | Input → Output | OpenCV reference |
|------|------|----------------|------------------|
| **7B** | Pixel → normalized (distorted) | `(u, v)` → `(x_d, y_d)` | Part of `undistortPoints` (implicit K⁻¹) |
| **7A** | Inverse distortion | `(x_d, y_d)` → `(x, y)` | `cv2.undistortPoints` / `cv2.fisheye.undistortPoints` |
| **7C** | Pixel → camera ray | `(u, v)` → unit `Vec3` | Compose 7B + 7A + normalize `[x,y,1]` |

**Implementation order:** **7B → 7A → 7C** (7B is closed-form; 7A needs per-model work; 7C composes both).

**Golden-test order:** Can validate 7B alone, then 7A (on normalized distorted coords), then full 7C round-trip.

---

## 7B — Pixel → normalized camera coordinate (distorted)

Apply **inverse intrinsics** to map a pixel to the **distorted** normalized plane.

```
x_d = (u - cx) / fx
y_d = (v - cy) / fy
```

| Property | Value |
|----------|-------|
| Module | `packages/core/src/projection/intrinsics.ts` (or extend `pinhole.ts`) |
| Function | `pixelToDistortedNormalized(u, v, K): Vec2` |
| Inverse of | `applyIntrinsics` on distorted coords |
| Models | Same for all (K is shared) |
| Golden | Trivial round-trip with `applyIntrinsics`; hand-crafted `(u,v)` ↔ `(x_d,y_d)` |

**Tests:**

- `(cx, cy)` → `(0, 0)`
- `(fx·0.1 + cx, cy)` → `(0.1, 0)`
- Round-trip: `applyIntrinsics(pixelToDistortedNormalized(u,v,K), K) ≈ (u,v)`

No OpenCV call needed for 7B alone — pure algebra.

---

## 7A — Inverse distortion

Map **distorted normalized** `(x_d, y_d)` → **undistorted normalized** `(x, y)`.

Forward (existing): `distortModel(normalized) → distortedNormalized`

Inverse: no general closed form for Brown-Conrady / rational; **iterative** (Newton) or use OpenCV as oracle for golden tests.

### OpenCV reference APIs

| Model | Python API | Notes |
|-------|------------|-------|
| Pinhole | *(identity)* | `(x, y) = (x_d, y_d)` |
| Brown-Conrady | `cv2.undistortPoints` | Input N×1×2 pixels; pass `P=None` → normalized output |
| Rational | `cv2.undistortPoints` | 8-coeff vector |
| Fisheye | `cv2.fisheye.undistortPoints` | Separate API; 4 coeffs |

`cv2.undistortPoints` effectively performs **7B + 7A** when given pixel input. For testing **7A in isolation**, either:

- Feed **already-normalized distorted** points via a dedicated code path, or
- Compare full `undistortPoints(pixel)` against `undistortModel(pixelToDistortedNormalized(pixel))`.

### Per-model strategy

| Model | 7A approach | Identity case |
|-------|-------------|---------------|
| Pinhole | `undistortPinhole` = identity | — |
| Brown-Conrady | Iterative inverse of plumb bob | k,p = 0 → identity |
| Rational | Iterative inverse (forward uses rational radial) | k4–k6 = 0 → Brown-Conrady inverse |
| Fisheye | Iterative inverse in θ-space | k = 0 → equidistant inverse (≠ pinhole) |

**Suggested modules:**

```
packages/core/src/undistortion/
  pinhole.ts      # identity
  brown-conrady.ts
  rational.ts
  fisheye.ts
```

**Functions:**

```typescript
undistortPinhole(distorted: Vec2): Vec2
undistortBrownConrady(distorted: Vec2, coeffs): Vec2
undistortRational(distorted: Vec2, coeffs): Vec2
undistortFisheye(distorted: Vec2, coeffs): Vec2
```

**Iterative inverse (Brown-Conrady / rational):**

1. Start `x = x_d, y = y_d`
2. Repeat: compute forward `distort(x,y)`; update using Newton / fixed-point until `‖forward - (x_d,y_d)‖ < ε`
3. Cap iterations; document failure policy

**Fisheye inverse:** invert θ_d → θ then `(a,b) = (θ/r)·(x_d,y_d)` — follow OpenCV fisheye math; golden vs `cv2.fisheye.undistortPoints`.

### Golden fixtures (7A)

New Python generator section:

```python
# Pixels from forward projectPoints → undistortPoints → expected normalized (x, y)
cv2.undistortPoints(pixels, K, dist, P=None)
# fisheye: cv2.fisheye.undistortPoints(pixels, K, D, P=None)
```

Fixture dir: `reference/fixtures/undistort/<model>/` with schema:

```json
{
  "model": "brown-conrady",
  "direction": "inverse-normalized",
  "camera_matrix": [...],
  "dist_coeffs": [...],
  "pixels": [[u, v], ...],
  "expected_normalized": [[x, y], ...],
  "tolerance": { "abs": 1e-5, "rel": 1e-6 }
}
```

Tolerance may be tighter on normalized plane than pixel space (1e-5 rad/plane units).

### Round-trip tests (7A + forward)

For each model:

```
(x, y)  →  distort  →  undistort  ≈  (x, y)
```

Separate from OpenCV golden — catches implementation bugs in both directions.

---

## 7C — Pixel → camera ray

Compose **7B + 7A + normalization** to produce a **unit direction** in the OpenCV camera frame.

```
(x_d, y_d) = pixelToDistortedNormalized(u, v, K)     // 7B
(x, y)     = undistortModel(x_d, y_d, coeffs)         // 7A
d          = normalize([x, y, 1])                     // 7C
```

```typescript
function normalizedToCameraRay(normalized: Vec2): Vec3 {
  const [x, y] = normalized;
  const invLen = 1 / Math.hypot(x, y, 1);  // ||[x,y,1]||
  return [x * invLen, y * invLen, invLen];
}

function pixelToCameraRay(u, v, K, coeffs, model): Vec3
```

| Property | Value |
|----------|-------|
| Module | `packages/core/src/projection/rays.ts` (or `undistortion/rays.ts`) |
| Frame | OpenCV camera: +X right, +Y down, +Z forward |
| Length | Unit vector (`‖d̂‖ = 1`) |

**Ray semantics:** direction from camera origin through the scene point; any positive scale `t·d̂` lies on the same sight line with `Z > 0` when `d̂_z > 0`.

### Golden fixtures (7C)

**Round-trip (primary gate):**

1. Start with 3D point `P = (X, Y, Z)` in camera frame, `Z > 0`
2. Forward: `(u, v) = project(P)`
3. Inverse: `d̂ = pixelToCameraRay(u, v, …)`
4. Assert: `d̂ ∥ P` (cross product ≈ 0, or `d̂ · P/‖P‖ ≈ 1`)

Fixture: reuse `points_3d` from forward fixtures; no new OpenCV output required if round-trip passes.

**Optional OpenCV cross-check:** sample pixels, call `undistortPoints`, build ray from output — should match JS.

### Edge cases

| Case | Policy |
|------|--------|
| Pixel at principal point | Ray ≈ `[0, 0, 1]` (optical axis) |
| Ray with `d̂_z ≤ 0` | Exclude from fixtures (behind camera) |
| Undistort fails to converge | Return error / NaN; exclude from golden fixtures initially |
| Fisheye wide angle | Use moderate pixels inside image bounds |

---

## Files to add / modify

| File | Sub-phase | Action |
|------|-----------|--------|
| `packages/core/src/projection/intrinsics.ts` | 7B | `pixelToDistortedNormalized`, `distortedNormalizedToPixel` |
| `packages/core/src/undistortion/*.ts` | 7A | Per-model `undistort*` |
| `packages/core/src/projection/rays.ts` | 7C | `normalizedToCameraRay`, `pixelToCameraRay*` per model |
| `packages/core/src/types.ts` | all | Inverse fixture types if needed |
| `reference/.../generate_fixtures.py` | 7A | `undistort` fixture generation |
| `reference/fixtures/undistort/` | 7A | Golden JSON per model |
| `packages/core/test/unit/intrinsics.test.ts` | 7B | |
| `packages/core/test/unit/undistort-*.test.ts` | 7A | Round-trip + isolated |
| `packages/core/test/golden/undistort-*.test.ts` | 7A | vs OpenCV |
| `packages/core/test/unit/rays.test.ts` | 7C | |
| `packages/core/test/golden/rays.test.ts` | 7C | Round-trip from forward fixtures |
| `docs/models/*.md` | all | Add inverse sections |
| `docs/coordinate-conventions.md` | 7C | Document ray convention |
| `docs/progress.md` | — | Update on completion |

**Do not:** merge undistort into forward `distortion/` files; keep `undistortion/` separate mirroring forward layout.

---

## Implementation steps (sequenced)

### Phase 7B (1 session)

1. Add `intrinsics.ts` with inverse K
2. Unit tests + round-trip with `applyIntrinsics`
3. Export from `core` index

### Phase 7A (2–3 sessions, vertical by model)

For each model (pinhole → Brown-Conrady → rational → fisheye):

1. Python undistort fixtures from OpenCV
2. Implement `undistort*`
3. Unit: identity, round-trip with forward `distort*`
4. Golden: vs OpenCV normalized output

### Phase 7C (1 session)

1. `normalizedToCameraRay` + per-model `pixelToCameraRay*`
2. Unit: principal point, unit length, `d̂_z > 0`
3. Golden round-trip: all forward fixture `points_3d` → project → ray → parallel to original

---

## Testing summary

```
7B — unit only (algebra + round-trip with K)

7A — unit: identity, round-trip distort∘undistort
     golden: cv2.undistortPoints / cv2.fisheye.undistortPoints

7C — unit: unit norm, optical axis
     golden: forward 3D point → pixel → ray ∥ point (all models)
```

Target: **~25–35 new tests**; existing **41 forward tests** unchanged.

---

## Definition of done

- [x] 7B: `pixelToDistortedNormalized` tested
- [x] 7A: all four models undistort with OpenCV golden + round-trip
- [x] 7C: `pixelToCameraRay` round-trips forward projection for all fixture points
- [x] `reference/fixtures/undistort/` populated
- [x] Model docs updated with inverse sections
- [x] `coordinate-conventions.md` documents camera ray convention
- [x] `npm test` green
- [x] No viz changes required (optional Phase 6 enhancement later)

---

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Iterative inverse doesn't converge | Match OpenCV iteration strategy; cap iterations; golden tests |
| `undistortPoints` bundles 7B+7A | Test 7B separately; compare decomposed vs OpenCV combined |
| Fisheye inverse ≠ pinhole at k=0 | Separate module; equidistant round-trip tests |
| Rational inverse complexity | Reuse Brown-Conrady Newton structure; forward rational for residual |
| Tolerance too tight on normalized plane | Start 1e-5; relax if OpenCV float drift |

---

## What not to abstract yet

- Generic `undistort(model, point)` factory
- Shared Newton solver base class
- World-frame rays (extrinsics)
- Three.js ray conversion in `core` (viz / Phase 8)
- `cv2.initUndistortRectifyMap` / full image remap

---

## Phase 8 preview

Custom Three.js camera and shaders may **consume** `pixelToCameraRay` output, converting to Three.js frame via `coords/three.ts` when placing rays in the scene graph.

---

## Prompts

**Implement 7B only:**

> Implement Phase 7B per `docs/plans/phase-7-inverse-and-rays.md`: inverse intrinsics in `core`, unit tests. No undistortion yet.

**Implement full Phase 7:**

> Implement Phase 7 per `docs/plans/phase-7-inverse-and-rays.md`: 7B → 7A (all models, OpenCV golden) → 7C (pixel-to-ray round-trip). No viz.

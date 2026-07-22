# Phase 3 Plan — Brown-Conrady Forward Distortion

Status: **✅ complete**

Model reference: [docs/models/brown-conrady.md](../models/brown-conrady.md)

---

## Goal

Implement OpenCV-compatible Brown-Conrady (plumb bob) forward distortion on the normalized image plane, validated against `cv2.projectPoints`.

## Deliverables (done)

- `packages/core/src/distortion/brown-conrady.ts`
- `reference/fixtures/brown-conrady/` — basic, radial-only, tangential-only, zero-distortion
- Unit + golden tests
- `docs/models/brown-conrady.md`

## Pipeline

```
normalize → distortBrownConrady → applyIntrinsics
```

Coefficients: `[k1, k2, p1, p2, k3]`

## Out of scope (deferred to later phases)

- Undistortion / inverse
- Rational polynomial (Phase 4)
- Viz overlays

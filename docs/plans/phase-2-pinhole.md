# Phase 2 Plan — Pinhole Projection

Status: **✅ complete**

---

## Goal

Implement zero-distortion pinhole projection in OpenCV camera frame conventions, validated against `cv2.projectPoints`.

## Deliverables (done)

- `packages/core/src/projection/pinhole.ts` — normalize → apply `K`
- `reference/fixtures/pinhole/basic.json`
- Unit tests: `test/unit/pinhole.test.ts`
- Golden tests: `test/golden/pinhole.test.ts`
- Pipeline documented in [coordinate-conventions.md §6](../coordinate-conventions.md)

## Pipeline

```
(X, Y, Z)  →  (x, y) = (X/Z, Y/Z)  →  (u, v) = (fx·x + cx, fy·y + cy)
```

Identity extrinsics; 3D points in OpenCV camera frame.

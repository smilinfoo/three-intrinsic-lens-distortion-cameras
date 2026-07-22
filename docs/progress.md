# Progress

Last updated: 2026-07-22

Use this file to resume work. The detailed plan lives in [README.md](../README.md).

---

## Current position

**Phase 2 — Pinhole only** ✅ complete

Phase 1 (types + coords) and Phase 2 (pinhole projection + golden tests) are done. Next up: Brown-Conrady distortion.

---

## Phase checklist

| Phase | Status | Notes |
|-------|--------|-------|
| **0 — Scaffold** | ✅ Done | Monorepo, Vitest, Vite/Three.js scene, Python `.venv`, OpenCV verify script |
| **1 — Conventions + types** | ✅ Done | `types.ts`, `coords/opencv.ts`, `coords/three.ts`, unit tests |
| **2 — Pinhole only** | ✅ Done | `projection/pinhole.ts`, Python fixtures, golden tests passing |
| **3 — Brown-Conrady** | ⬜ Not started | Next phase |
| **4 — Rational polynomial** | ⬜ Not started | |
| **5 — OpenCV fisheye** | ⬜ Not started | |
| **6 — Viz (minimal)** | ⬜ Not started | Basic Three.js scene exists; no projection overlay yet |
| **7 — Undistortion / inverse** | ⬜ Not started | |
| **8 — Three.js camera / shaders** | ⬜ Not started | |

---

## What is done

### Phase 1
- `packages/core/src/types.ts` — `Vec2`, `Vec3`, `CameraMatrix`, `PinholeFixture`
- `packages/core/src/coords/opencv.ts` — `isInFrontOfOpenCvCamera`
- `packages/core/src/coords/three.ts` — `opencvCameraToThreeJs`, `threeJsCameraToOpenCv`
- Unit tests: `test/unit/coords.test.ts`

### Phase 2
- `packages/core/src/projection/pinhole.ts` — normalize → apply `K` → `(u, v)`
- `reference/src/camera_lab_ref/generate_fixtures.py` — pinhole fixture generator
- `reference/fixtures/pinhole/basic.json` — OpenCV-generated golden vectors
- Golden test: `test/golden/pinhole.test.ts`
- Unit tests: `test/unit/pinhole.test.ts`
- `npm run generate:fixtures` script

### Commands
```bash
npm run setup              # JS + Python .venv
npm test                   # 11 tests (unit + golden)
npm run generate:fixtures  # Regenerate JSON from OpenCV
npm run verify:opencv      # Python smoke test
npm run dev                # Three.js scene
```

---

## Next step (start here)

**Phase 3 — Brown-Conrady forward distortion**

1. Extend `generate_fixtures.py` with Brown-Conrady cases (`cv2.projectPoints`, non-zero dist coeffs).
2. Add `packages/core/src/distortion/brown-conrady.ts` — forward distortion on normalized plane.
3. Wire distortion into projection pipeline (normalize → distort → apply `K`).
4. Golden tests against `reference/fixtures/brown-conrady/`.

**Do not** start viz overlays until Brown-Conrady golden tests pass.

---

## Prompt to paste when resuming

> Continue three-camera-lab. Read `docs/progress.md`. Phase 2 pinhole is complete. Start Phase 3 Brown-Conrady forward distortion with Python fixtures and golden tests.

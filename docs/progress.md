# Progress

Last updated: 2026-07-22

Use this file to resume work. The detailed plan lives in [README.md](../README.md).

---

## Current position

**Phase 3 — Brown-Conrady** ✅ complete

Phases 0–3 are done. Next up: Phase 4 rational polynomial distortion.

---

## Phase checklist

| Phase | Status | Notes |
|-------|--------|-------|
| **0 — Scaffold** | ✅ Done | Monorepo, Vitest, Vite/Three.js scene, Python `.venv`, OpenCV verify script |
| **1 — Conventions + types** | ✅ Done | `types.ts`, `coords/opencv.ts`, `coords/three.ts`, unit tests |
| **2 — Pinhole only** | ✅ Done | `projection/pinhole.ts`, Python fixtures, golden tests passing |
| **3 — Brown-Conrady** | ✅ Done | `distortion/brown-conrady.ts`, 4 fixtures, unit + golden tests |
| **4 — Rational polynomial** | ⬜ Not started | Next phase |
| **5 — OpenCV fisheye** | ⬜ Not started | |
| **6 — Viz (minimal)** | ⬜ Not started | Basic Three.js scene exists; no projection overlay yet |
| **7 — Undistortion / inverse** | ⬜ Not started | |
| **8 — Three.js camera / shaders** | ⬜ Not started | |

---

## What is done

### Phase 3
- `packages/core/src/distortion/brown-conrady.ts` — `distortBrownConrady`, `projectBrownConrady`
- `packages/core/src/types.ts` — `BrownConradyCoeffs`, `BrownConradyFixture`, `brownConradyFromArray`
- `reference/fixtures/brown-conrady/` — `basic`, `radial-only`, `tangential-only`, `zero-distortion`
- Unit tests: `test/unit/brown-conrady.test.ts`
- Golden tests: `test/golden/brown-conrady.test.ts`
- Model docs: [docs/models/brown-conrady.md](./models/brown-conrady.md)

### Prior phases
- Phase 1: types, coords helpers
- Phase 2: pinhole projection + golden tests

### Commands
```bash
npm run setup              # JS + Python .venv
npm test                   # 21 tests (unit + golden)
npm run generate:fixtures  # Regenerate JSON from OpenCV
npm run verify:opencv      # Python smoke test
npm run dev                # Three.js scene
```

---

## Next step (start here)

**Phase 4 — Rational polynomial forward distortion**

1. Document model in `docs/models/rational.md`.
2. Extend `generate_fixtures.py` with rational-polynomial cases.
3. Add `packages/core/src/distortion/rational.ts`.
4. Golden tests against `reference/fixtures/rational/`.

**Do not** start viz overlays or undistortion until forward models are solid.

---

## Prompt to paste when resuming

> Continue three-camera-lab. Read `docs/progress.md`. Phase 3 Brown-Conrady is complete. Start Phase 4 rational polynomial forward distortion with Python fixtures and golden tests.

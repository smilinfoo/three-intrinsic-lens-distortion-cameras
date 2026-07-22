# Progress

Last updated: 2026-07-22

## Documentation map

| Doc | Purpose |
|-----|---------|
| [docs/progress.md](./progress.md) | **Start here** — current phase, next step, prompts |
| [docs/plans/](./plans/) | Per-phase implementation plans |
| [docs/models/](./models/) | Per-model equations and API reference |
| [docs/coordinate-conventions.md](./coordinate-conventions.md) | Coordinate frames, pipelines, policies |

---

## Current position

**Phase 5 — OpenCV fisheye** ✅ complete

All forward distortion models (Phases 2–5) are implemented. **Next:** Phase 6 viz (minimal projection overlays).

---

## Phase checklist

| Phase | Plan | Status |
|-------|------|--------|
| **0 — Scaffold** | — | ✅ Done |
| **1 — Conventions + types** | [coordinate-conventions.md](./coordinate-conventions.md) | ✅ Done |
| **2 — Pinhole** | [plans/phase-2-pinhole.md](./plans/phase-2-pinhole.md) | ✅ Done |
| **3 — Brown-Conrady** | [plans/phase-3-brown-conrady.md](./plans/phase-3-brown-conrady.md) | ✅ Done |
| **4 — Rational polynomial** | [plans/phase-4-rational.md](./plans/phase-4-rational.md) | ✅ Done |
| **5 — OpenCV fisheye** | [plans/phase-5-fisheye.md](./plans/phase-5-fisheye.md) | ✅ Done |
| **6 — Viz (minimal)** | *(to be added)* | ⬜ **Next** |
| **7 — Undistortion / inverse** | *(to be added)* | ⬜ Not started |
| **8 — Three.js camera / shaders** | *(to be added)* | ⬜ Not started |

---

## Implemented models

| Model | Core module | OpenCV API | Fixtures |
|-------|-------------|------------|----------|
| Pinhole | `projection/pinhole.ts` | `cv2.projectPoints` | `pinhole/` |
| Brown-Conrady | `distortion/brown-conrady.ts` | `cv2.projectPoints` | `brown-conrady/` |
| Rational | `distortion/rational.ts` | `cv2.projectPoints` | `rational/` |
| Fisheye | `distortion/fisheye.ts` | `cv2.fisheye.projectPoints` | `fisheye/` |

**41 tests passing** (10 test files).

---

## Commands

```bash
npm run setup              # JS + Python .venv
npm test                   # 41 tests
npm run generate:fixtures  # Regenerate JSON from OpenCV
npm run verify:opencv      # Python smoke test
npm run dev                # Three.js scene
```

---

## Next step (start here)

**Phase 6 — Viz (minimal projection overlays)**

1. Add `docs/plans/phase-6-viz.md`.
2. Per-model grid/overlay demo using `core` projection functions.
3. Visual sanity check only — golden tests remain the correctness gate.

---

## Prompt to paste when resuming

> Continue three-camera-lab. Read `docs/progress.md`. Phase 5 fisheye is complete. Plan Phase 6 minimal viz overlays per model.

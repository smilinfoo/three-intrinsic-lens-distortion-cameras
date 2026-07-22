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

**Phase 4 — Rational polynomial** ✅ complete

Phases 0–4 are done. **Next:** plan then implement Phase 5 (OpenCV fisheye).

---

## Phase checklist

| Phase | Plan | Status |
|-------|------|--------|
| **0 — Scaffold** | — | ✅ Done |
| **1 — Conventions + types** | [coordinate-conventions.md](./coordinate-conventions.md) | ✅ Done |
| **2 — Pinhole** | [plans/phase-2-pinhole.md](./plans/phase-2-pinhole.md) | ✅ Done |
| **3 — Brown-Conrady** | [plans/phase-3-brown-conrady.md](./plans/phase-3-brown-conrady.md) | ✅ Done |
| **4 — Rational polynomial** | [plans/phase-4-rational.md](./plans/phase-4-rational.md) | ✅ Done |
| **5 — OpenCV fisheye** | [plans/phase-5-fisheye.md](./plans/phase-5-fisheye.md) | ⬜ **Plan next** |
| **6 — Viz (minimal)** | *(to be added)* | ⬜ Not started |
| **7 — Undistortion / inverse** | *(to be added)* | ⬜ Not started |
| **8 — Three.js camera / shaders** | *(to be added)* | ⬜ Not started |

---

## Implemented models

| Model | Core module | Fixtures | Tests |
|-------|-------------|----------|-------|
| Pinhole | `projection/pinhole.ts` | `reference/fixtures/pinhole/` | unit + golden |
| Brown-Conrady | `distortion/brown-conrady.ts` | `reference/fixtures/brown-conrady/` | unit + golden |
| Rational | `distortion/rational.ts` | `reference/fixtures/rational/` | unit + golden |

**33 tests passing** (8 test files).

---

## Commands

```bash
npm run setup              # JS + Python .venv
npm test                   # 33 tests
npm run generate:fixtures  # Regenerate JSON from OpenCV
npm run verify:opencv      # Python smoke test
npm run dev                # Three.js scene
```

---

## Next step (start here)

### 1. Plan Phase 5 (no code yet)

Fill in [plans/phase-5-fisheye.md](./plans/phase-5-fisheye.md). Fisheye differs from prior models:

- API: `cv2.fisheye.projectPoints` (not `cv2.projectPoints`)
- Coefficients: `[k1, k2, k3, k4]`
- Separate equations — do not merge into Brown-Conrady/rational modules

### 2. Then implement

Fixtures → `distortion/fisheye.ts` → tests → `docs/models/fisheye.md`. No viz, no undistortion.

---

## Prompts

**To plan Phase 5:**

> Plan but do not implement Phase 5 OpenCV fisheye. Read `docs/progress.md`, `docs/coordinate-conventions.md`, and completed plans in `docs/plans/`. Save to `docs/plans/phase-5-fisheye.md` and update progress. No viz or undistortion.

**To implement Phase 5 (after plan is approved):**

> Implement Phase 5 OpenCV fisheye per `docs/plans/phase-5-fisheye.md`: fixtures via `cv2.fisheye.projectPoints`, then `distortion/fisheye.ts`, unit + golden tests, and `docs/models/fisheye.md`. No viz or undistortion.

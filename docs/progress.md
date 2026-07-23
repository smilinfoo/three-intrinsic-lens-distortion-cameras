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

**Phase 7 — Inverse distortion and pixel-to-ray mapping** ✅ complete

**Next:** Phase 8 — Three.js camera / shaders (not started).

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
| **6 — Viz (minimal)** | [plans/phase-6-viz.md](./plans/phase-6-viz.md) | ✅ Done |
| **7 — Inverse distortion & pixel-to-ray** | [plans/phase-7-inverse-and-rays.md](./plans/phase-7-inverse-and-rays.md) | ✅ Done |
| **8 — Three.js camera / shaders** | [plans/phase-8-threejs-camera.md](./plans/phase-8-threejs-camera.md) | 📝 Placeholder (not approved) |

### Phase 7 sub-steps

| Step | Name | Status |
|------|------|--------|
| **7B** | Pixel → distorted normalized `(u,v) → (x_d,y_d)` | ✅ Done |
| **7A** | Inverse distortion `(x_d,y_d) → (x,y)` | ✅ Done |
| **7C** | Pixel → camera ray `(u,v) → d̂` | ✅ Done |

---

## Implemented

| Model | Forward | Inverse | Rays |
|-------|---------|---------|------|
| Pinhole | `projection/pinhole.ts` | `undistortion/pinhole.ts` | `pixelToCameraRayPinhole` |
| Brown-Conrady | `distortion/brown-conrady.ts` | `undistortion/brown-conrady.ts` | `pixelToCameraRayBrownConrady` |
| Rational | `distortion/rational.ts` | `undistortion/rational.ts` | `pixelToCameraRayRational` |
| Fisheye | `distortion/fisheye.ts` | `undistortion/fisheye.ts` | `pixelToCameraRayFisheye` |

Shared: `projection/intrinsics.ts` (7B), `projection/rays.ts` (7C).

Fixtures: forward in `reference/fixtures/<model>/`; inverse in `reference/fixtures/undistort/<model>/`.

**87 tests** in `core`. Viz: `npm run dev` projection grid demo.

---

## Commands

```bash
npm run setup && npm test && npm run dev
```

---

## Next step (start here)

**Phase 8 — Three.js camera / shaders**

Consume `pixelToCameraRay*` output; convert to Three.js frame via `coords/three.ts` when placing rays in the scene graph.

---

## Prompts

**Implement Phase 8:**

> Add custom Three.js camera or shader path that uses `pixelToCameraRay` from core, converting rays to Three.js frame at the viz boundary.

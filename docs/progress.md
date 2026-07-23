# Progress

Last updated: 2026-07-23

## Documentation map

| Doc | Purpose |
|-----|---------|
| [docs/progress.md](./progress.md) | **Start here** — current phase, next step, prompts |
| [docs/plans/](./plans/) | Per-phase implementation plans |
| [docs/models/](./models/) | Per-model equations and API reference |
| [docs/coordinate-conventions.md](./coordinate-conventions.md) | Coordinate frames, pipelines, policies |
| [docs/sensor-rendering.md](./sensor-rendering.md) | Sensor camera + distortion plugin architecture (Phase 8) |

---

## Current position

**Phase 7 — Inverse distortion and pixel-to-ray mapping** ✅ complete

**Next:** Phase 8 — sensor cameras + distortion render plugin ([plan](./plans/phase-8-threejs-camera.md), **not approved**).

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
| **8 — Sensor cameras & render plugin** | [plans/phase-8-threejs-camera.md](./plans/phase-8-threejs-camera.md) | 📝 Placeholder (not approved) |

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

**Phase 8 — Sensor cameras & distortion render plugin**

Architecture: [`SensorCamera`](./sensor-rendering.md) (user API: model + `K` + params) + [`DistortionRenderPlugin`](./sensor-rendering.md) (patches built-in materials; no user geometry/material edits). Forward distortion for overlay on pre-captured sensor images.

Plan (placeholder, not approved): [plans/phase-8-threejs-camera.md](./plans/phase-8-threejs-camera.md) · Rationale: [sensor-rendering.md](./sensor-rendering.md)

---

## Prompts

**Implement Phase 8 (after plan approval):**

> Implement Phase 8 per `docs/plans/phase-8-threejs-camera.md`: `SensorCamera` + `DistortionRenderPlugin` (first-class). Built-in materials only; forward distortion for sensor overlay. See `docs/sensor-rendering.md`.

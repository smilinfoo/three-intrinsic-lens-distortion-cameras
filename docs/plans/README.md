# Phase Plans

Implementation plans for each project phase. **`docs/progress.md`** tracks current status; these files hold the detailed plan and checklist for a phase. **`docs/models/`** holds the equation/API reference for each distortion model once implemented.

## Workflow

1. **Plan** — write or review the phase plan in this directory (do not implement yet).
2. **Implement** — fixtures → JS module → unit tests → golden tests → model doc.
3. **Update** — mark plan ✅ complete; update `docs/progress.md`.

## Index

| Phase | Plan | Model doc | Status |
|-------|------|-----------|--------|
| 1 — Conventions + types | *(see [coordinate-conventions.md](../coordinate-conventions.md))* | — | ✅ Done |
| 2 — Pinhole | [phase-2-pinhole.md](./phase-2-pinhole.md) | — | ✅ Done |
| 3 — Brown-Conrady | [phase-3-brown-conrady.md](./phase-3-brown-conrady.md) | [brown-conrady.md](../models/brown-conrady.md) | ✅ Done |
| 4 — Rational polynomial | [phase-4-rational.md](./phase-4-rational.md) | [rational.md](../models/rational.md) | ✅ Done |
| 5 — OpenCV fisheye | [phase-5-fisheye.md](./phase-5-fisheye.md) | [fisheye.md](../models/fisheye.md) | ✅ Done |
| 6 — Viz (minimal) | [phase-6-viz.md](./phase-6-viz.md) | — | ✅ Done |
| 7 — Inverse distortion & pixel-to-ray | [phase-7-inverse-and-rays.md](./phase-7-inverse-and-rays.md) | *(extend model docs)* | ✅ Done |
| 8 — Sensor cameras & render plugin | [phase-8-threejs-camera.md](./phase-8-threejs-camera.md) | [sensor-rendering.md](../sensor-rendering.md) | 📝 Placeholder (not approved) |

### Phase 7 sub-steps

| Step | Description |
|------|-------------|
| 7A | Inverse distortion on normalized plane |
| 7B | Pixel → distorted normalized (`K⁻¹`) |
| 7C | Pixel → unit camera ray (compose 7B + 7A) |

Implement **7B → 7A → 7C**.

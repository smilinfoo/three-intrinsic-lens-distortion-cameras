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
| 6 — Viz (minimal) | *(to be added)* | — | ⬜ Next |
| 7 — Undistortion / inverse | *(to be added)* | — | ⬜ Not started |
| 8 — Three.js camera / shaders | *(to be added)* | — | ⬜ Not started |

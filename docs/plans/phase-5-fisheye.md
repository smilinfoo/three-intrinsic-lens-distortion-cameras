# Phase 5 Plan — OpenCV Fisheye Distortion

Status: **⬜ not yet planned**

Model reference (when implemented): `docs/models/fisheye.md`

---

## Before implementing

Create this plan first. Paste into chat:

> Plan but do not implement Phase 5 OpenCV fisheye forward distortion.
>
> Read `docs/progress.md`, `docs/coordinate-conventions.md`, and the completed phase plans in `docs/plans/` (especially `phase-4-rational.md`) for patterns to follow.
>
> Fisheye is different from pinhole/Brown-Conrady/rational:
> - Uses `cv2.fisheye.projectPoints` (not `cv2.projectPoints`)
> - Different distortion equations and coefficient layout `[k1, k2, k3, k4]`
> - Separate JS module — do not unify with existing distortion paths
>
> Save the plan to this file and update `docs/progress.md`. Each phase gets its own plan; model reference goes in `docs/models/fisheye.md`.
>
> Cover: goal, math, OpenCV API mapping, files to add/modify, fixtures, tests, definition of done, risks, what not to abstract. No viz, no undistortion.

---

## Known constraints (from project conventions)

| Topic | Note |
|-------|------|
| OpenCV API | `cv2.fisheye.projectPoints` |
| Coefficients | `[k1, k2, k3, k4]` |
| Code location | `packages/core/src/distortion/fisheye.ts` (separate from Brown-Conrady/rational) |
| Fixtures | `reference/fixtures/fisheye/` |
| Golden tests | Compare JS to Python-generated vectors |

*(Detailed plan to be filled in when Phase 5 planning session runs.)*

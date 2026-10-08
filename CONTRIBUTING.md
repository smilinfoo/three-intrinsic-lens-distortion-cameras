# Contributing

Need to add a distrtion model, or see something I missed?  Throw it in. The tests are a little involved but the JS/TS side is kept intentionaly simple. OpenCV is not changing ist fisheye discription any time soon and there are only so many models out there.  In other words it makews sence to be direct as posibile not worry to much about abstracton patterns beyond what three.js does.

**There are a few things on the TODO list if your interested in helping:** [docs/progress.md](./docs/progress.md) · [README](./README.md)

| Need | Where |
|------|--------|
| Bug reports, questions, feature ideas | [GitHub Issues](https://github.com/smilinfoo/three-camera-intrinsics-and-distortion-lab/issues/new/choose) (templates require npm-status acknowledgment) |
| Early integration or npm timeline | Open an issue and say so — or contact [@smilinfoo](https://github.com/smilinfoo) |

## Setup

```bash
git clone https://github.com/smilinfoo/three-camera-intrinsics-and-distortion-lab.git
cd three-camera-intrinsics-and-distortion-lab
npm run setup          # JS deps + Python .venv (fixtures / verify)
npm test               # 112 tests — must pass before PR
npm run dev            # optional: visual sanity check
```

Python is **only required** if you change fixture generation or run `npm run verify:opencv`. Core tests run with Node alone.

## Where to put changes

| Area | Path | Rules |
|------|------|--------|
| **Camera math (source of truth)** | `packages/core/src/` | No Three.js imports. OpenCV frame only unless using `coords/three.ts`. |
| **Golden fixtures** | `reference/fixtures/` | Generated from Python — do not hand-edit expected pixels without regenerating. |
| **Fixture generator** | `reference/src/camera_lab_ref/` | Must match OpenCV APIs documented in [docs/models/](./docs/models/). |
| **Three.js demo + sensor rendering** | `packages/cameras/src/` | Import math from `intrinsic-lens-distortion` only — do not reimplement projection in viz. |
| **GLSL distortion** | `packages/cameras/src/shaders/chunks/` | Must mirror `packages/core/src/distortion/*.ts` (document drift in PR if intentional). |
| **Architecture / conventions** | `docs/` | Update when behavior or frames change. |

### Package boundaries

- **`intrinsic-lens-distortion`** — portable library target (0.x API).
- **`three-intrinsic-lens-distortion-cameras`** — reference integration + demo; not the numerical correctness gate.

## Workflows by change type

### Math or distortion model (`core`)

Follow the established phase pattern ([docs/plans/README.md](./docs/plans/README.md)):

1. Update or add fixtures → `npm run generate:fixtures`
2. Implement in `packages/core/src/`
3. Add unit tests + golden tests under `packages/core/test/`
4. Update the model doc in `docs/models/` if equations or coefficient layout change
5. If forward distortion changed, update matching GLSL in the cameras package

### Sensor rendering (`cameras`)

- Read [docs/sensor-rendering.md](./docs/sensor-rendering.md) and [docs/coordinate-conventions.md](./docs/coordinate-conventions.md) first.
- **`SensorRenderer` module docstring** is the **only** canonical usage example — link to it; do not duplicate snippets elsewhere.
- Built-in Three.js materials only; `ShaderMaterial` / `RawShaderMaterial` are intentionally excluded.
- Add tests under `packages/cameras/test/` for plugin lifecycle, matrix parity, or frame conversion — not OpenCV golden numerics (those stay in `core`).

### Documentation-only

- Keep [docs/progress.md](./docs/progress.md) accurate if status or test counts change.
- README scope bullets must match actual behavior ([Scope & limitations](./README.md#scope--limitations)).

## Running checks locally

```bash
npm test                 # all workspace tests (CI)
npm run build            # library builds (CI)
npm run verify:opencv    # OpenCV smoke test (CI; needs .venv)
npm run generate:fixtures   # after changing reference/generate_fixtures.py
```

CI runs on every push/PR via [.github/workflows/ci.yml](./.github/workflows/ci.yml).

## Conventions

- **Coordinate frames:** OpenCV camera frame in `core`; apply `S = diag(1, -1, -1)` only via `coords/three.ts` or documented cameras-package paths (`opencvFrame` group, shader insertion). No silent axis flips inside distortion math.
- **Behind-camera points:** `Z ≤ 0` in OpenCV frame — excluded from fixtures; document policy if behavior changes.
- **Golden tolerance:** `1e-4` px absolute (see fixtures and [coordinate-conventions.md](./docs/coordinate-conventions.md)).
- **Minimal diffs:** Match existing style; avoid drive-by refactors unrelated to the PR.
- **Commits:** Clear messages focused on *why*; one logical change per PR when possible.

## Pull request checklist

- [ ] `npm test` passes
- [ ] `npm run build` passes (if the cameras package is touched)
- [ ] Fixtures regenerated and committed (if generator or OpenCV pin changed)
- [ ] Golden / unit tests added for new math behavior
- [ ] GLSL updated if forward distortion equations changed
- [ ] Docs updated (`docs/models/`, `coordinate-conventions.md`, or `sensor-rendering.md` as needed)
- [ ] No duplicated `SensorRenderer` usage snippets outside its module docstring
- [ ] PR description states which models/packages are affected

## Out of scope (unless explicitly discussed in an issue first)

- Multi-camera rigs, SLAM, full calibration UIs
- OpenCV extrinsics → Three.js pose (not implemented yet)
- Custom shader / RawShaderMaterial support in the distortion plugin
- Automated full-frame GPU golden tests (the cameras package uses unit tests + manual demo QA)

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).

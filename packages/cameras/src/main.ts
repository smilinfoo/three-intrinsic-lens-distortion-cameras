import type { Vec2, Vec3 } from 'intrinsic-lens-distortion';
import * as THREE from 'three';
import { fitRendererToSensor, SensorCamera, SensorRenderer, type ModelId } from './index';
import { createProjectionDemo } from './demo/createProjectionDemo';
import {
  COEFFICIENT_FIELDS,
  defaultInput,
  MAX_IMAGE_SIZE,
  MIN_IMAGE_SIZE,
  specFromInput,
  type CustomCameraInput,
} from './demo/customCamera';
import { generateGridSegments } from './demo/gridPoints';
import { measureProbes, summarizeProbes, type ProbeSummary } from './demo/measure';
import { MODEL_PRESETS, getModelPreset, IMAGE_HEIGHT, IMAGE_WIDTH } from './demo/modelPresets';
import {
  alternateIntrinsicsSpec,
  cameraFromSpec,
  CUSTOM_PROBE_LAYER,
  presetSpec,
  PRESET_PROBE_LAYER,
  PROBE_POINTS,
  probePointsForSpec,
  projectWithSpec,
  type CameraSpec,
} from './demo/probes';
import {
  BACKGROUND_COLOR,
  buildExampleScene,
  GRID_DIVISIONS,
  GRID_MAX,
  GRID_MIN,
  GRID_Z,
  PROBE_COLOR,
  setCustomProbePoints,
} from './scene/createScene';

const MODELS: readonly ModelId[] = MODEL_PRESETS.map((p) => p.id);
const OVERLAY_COLOR = '#ff2bd6';
/** Max GPU-vs-core probe error (px) reported as a pass. Marker rasterization alone gives ≤ ~0.71. */
const PASS_PX = 1;

const app = document.getElementById('app');
if (!app) {
  throw new Error('Missing #app container');
}

app.innerHTML = `
  <div class="layout">
    <header class="toolbar">
      <h1>Three.js Intrinsic Lens-Distortion Cameras</h1>
      <label class="model-picker">
        Reference model
        <select id="model-select"></select>
      </label>
      <label class="model-picker"><input type="checkbox" id="overlay-toggle" checked /> CPU overlay (core)</label>
      <p id="demo-subtitle" class="subtitle"></p>
    </header>
    <div class="panels">
      <section class="panel projection-panel">
        <h2>Projection (OpenCV pixel space, independent 2D reference)</h2>
        <canvas id="projection-canvas"></canvas>
      </section>
      <section class="panel scene-panel">
        <h2>One Three.js scene, sensor cameras (green probes = scene points; magenta = CPU projection from core)</h2>
        <div class="scene-scroll">
        <div id="tiles" class="tiles"></div>
        <div class="custom-row">
          <div id="custom-tile-slot"></div>
          <form id="custom-form" class="custom-form" autocomplete="off" novalidate>
            <h3>Try your own camera</h3>
            <p class="hint">Enter OpenCV intrinsics and distortion coefficients. The view on the left renders the scene through them; probes are placed from your own K and must match the CPU projection from <code>core</code>.</p>
            <div class="fields">
              <label>Model <select name="model"></select></label>
              <label>Width (px) <input name="imageWidth" type="number" step="1" min="${MIN_IMAGE_SIZE}" max="${MAX_IMAGE_SIZE}" /></label>
              <label>Height (px) <input name="imageHeight" type="number" step="1" min="${MIN_IMAGE_SIZE}" max="${MAX_IMAGE_SIZE}" /></label>
              <label>fx <input name="fx" type="number" step="any" /></label>
              <label>fy <input name="fy" type="number" step="any" /></label>
              <label>cx <input name="cx" type="number" step="any" /></label>
              <label>cy <input name="cy" type="number" step="any" /></label>
            </div>
            <fieldset><legend>Distortion coefficients</legend><div id="coeff-fields" class="fields"></div></fieldset>
            <div class="actions">
              <button type="submit">Apply</button>
              <button type="button" id="custom-reset">Reset to preset</button>
            </div>
            <p id="custom-status" class="status" role="status"></p>
          </form>
        </div>
        </div>
      </section>
    </div>
  </div>
`;

const canvas = document.getElementById('projection-canvas') as HTMLCanvasElement;
const modelSelect = document.getElementById('model-select') as HTMLSelectElement;
const subtitle = document.getElementById('demo-subtitle') as HTMLElement;
const overlayToggle = document.getElementById('overlay-toggle') as HTMLInputElement;
const tilesContainer = document.getElementById('tiles') as HTMLElement;
const customSlot = document.getElementById('custom-tile-slot') as HTMLElement;

const example = buildExampleScene();
const sensor = new SensorRenderer();

interface Tile {
  readonly id: string;
  spec: CameraSpec;
  probes: readonly Vec3[];
  camera: SensorCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly overlay: HTMLCanvasElement;
  readonly view: HTMLElement;
  readonly root: HTMLElement;
  readonly readout: HTMLElement;
}

function createRenderer(): THREE.WebGLRenderer {
  // Drawing buffer = sensor image exactly (pixelRatio 1) so canvas pixels are sensor pixels.
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
  renderer.shadowMap.enabled = true;
  return renderer;
}

function createTile(id: string, label: string, spec: CameraSpec, probes: readonly Vec3[], camera: SensorCamera): Tile {
  const renderer = createRenderer();
  const root = document.createElement('div');
  root.className = 'tile';
  root.dataset.model = id;
  root.innerHTML = `<div class="tile-label"><span>${label}</span><span class="readout"></span></div><div class="tile-view"></div>`;
  const view = root.querySelector('.tile-view') as HTMLElement;
  renderer.domElement.className = 'gl';
  const overlay = document.createElement('canvas');
  overlay.className = 'overlay';
  view.append(renderer.domElement, overlay);

  const tile: Tile = {
    id,
    spec,
    probes,
    camera,
    renderer,
    overlay,
    view,
    root,
    readout: root.querySelector('.readout') as HTMLElement,
  };
  sizeTile(tile);
  return tile;
}

/** Match renderer, overlay and CSS aspect ratio to the tile's sensor image size. */
function sizeTile(tile: Tile): void {
  fitRendererToSensor(tile.renderer, tile.spec);
  tile.overlay.width = tile.spec.imageWidth;
  tile.overlay.height = tile.spec.imageHeight;
  tile.view.style.aspectRatio = `${tile.spec.imageWidth} / ${tile.spec.imageHeight}`;
}

const tiles = new Map<ModelId, Tile>();
for (const model of MODELS) {
  const spec = presetSpec(model);
  const tile = createTile(model, getModelPreset(model).label, spec, PROBE_POINTS, cameraFromSpec(spec));
  tiles.set(model, tile);
  tilesContainer.append(tile.root);
}

/** Scratch renderer for test hooks (multi-camera / stock-camera checks); not shown in the UI. */
const scratch = createRenderer();
fitRendererToSensor(scratch, { imageWidth: IMAGE_WIDTH, imageHeight: IMAGE_HEIGHT });

// ---- Custom camera -------------------------------------------------------------------------

const customSpec0 = presetSpec('brown-conrady');
const customTile = createTile(
  'custom',
  'Your camera',
  customSpec0,
  probePointsForSpec(customSpec0),
  cameraFromSpec(customSpec0, CUSTOM_PROBE_LAYER),
);
customSlot.append(customTile.root);

const form = document.getElementById('custom-form') as HTMLFormElement;
const customStatus = document.getElementById('custom-status') as HTMLElement;
const coeffContainer = document.getElementById('coeff-fields') as HTMLElement;
const formModel = form.elements.namedItem('model') as HTMLSelectElement;
for (const preset of MODEL_PRESETS) {
  formModel.append(new Option(preset.label, preset.id));
}

function buildCoefficientFields(model: ModelId): void {
  coeffContainer.replaceChildren();
  const names = COEFFICIENT_FIELDS[model];
  if (names.length === 0) {
    coeffContainer.textContent = 'Pinhole has no distortion coefficients.';
    return;
  }
  for (const name of names) {
    const label = document.createElement('label');
    label.textContent = `${name} `;
    const input = document.createElement('input');
    input.type = 'number';
    input.step = 'any';
    input.name = `coef-${name}`;
    label.append(input);
    coeffContainer.append(label);
  }
}

function fillForm(input: CustomCameraInput): void {
  formModel.value = input.model;
  buildCoefficientFields(input.model);
  for (const key of ['imageWidth', 'imageHeight', 'fx', 'fy', 'cx', 'cy'] as const) {
    (form.elements.namedItem(key) as HTMLInputElement).value = String(input[key]);
  }
  for (const name of COEFFICIENT_FIELDS[input.model]) {
    (form.elements.namedItem(`coef-${name}`) as HTMLInputElement).value = String(input.coefficients[name] ?? 0);
  }
}

function readForm(): CustomCameraInput {
  const num = (name: string): number => {
    const raw = (form.elements.namedItem(name) as HTMLInputElement | null)?.value.trim() ?? '';
    return raw === '' ? Number.NaN : Number(raw);
  };
  const model = formModel.value as ModelId;
  const coefficients: Record<string, number> = {};
  for (const name of COEFFICIENT_FIELDS[model]) {
    coefficients[name] = num(`coef-${name}`);
  }
  return {
    model,
    imageWidth: num('imageWidth'),
    imageHeight: num('imageHeight'),
    fx: num('fx'),
    fy: num('fy'),
    cx: num('cx'),
    cy: num('cy'),
    coefficients,
  };
}

function setStatus(kind: 'ok' | 'warn' | 'error', text: string): void {
  customStatus.className = `status ${kind}`;
  customStatus.textContent = text;
}

function reportCustom(summary: ProbeSummary): void {
  if (summary.missing === summary.count) {
    setStatus('error', 'No probes found in the render — the camera may not see the scene (check cx, cy, fx, fy and the image size).');
  } else if (summary.missing > 0) {
    setStatus('warn', `${summary.missing} of ${summary.count} probes not found (outside the image or hidden). Found probes: max error ${summary.maxError.toFixed(2)} px.`);
  } else if (summary.maxError <= PASS_PX) {
    setStatus('ok', `✓ GPU render matches core: max error ${summary.maxError.toFixed(2)} px over ${summary.count} probes.`);
  } else {
    setStatus('error', `✗ GPU render differs from core: max error ${summary.maxError.toFixed(2)} px over ${summary.count} probes (limit ${PASS_PX} px).`);
  }
}

type ApplyResult = { ok: true; summary: ProbeSummary } | { ok: false; errors: string[] };

/** Validate, rebuild the custom camera/probes, render, and report whether GPU matches core. */
function applyCustom(input: CustomCameraInput): ApplyResult {
  const result = specFromInput(input);
  if (!result.ok) {
    setStatus('error', result.errors.join('; '));
    return result;
  }

  const probes = probePointsForSpec(result.spec);
  setCustomProbePoints(example.customProbes, probes);
  customTile.spec = result.spec;
  customTile.probes = probes;
  customTile.camera = cameraFromSpec(result.spec, CUSTOM_PROBE_LAYER);
  sizeTile(customTile);
  renderTile(customTile);
  drawOverlay(customTile);
  const summary = summarize(customTile);
  customTile.readout.textContent = readoutText(summary);
  reportCustom(summary);
  return { ok: true, summary };
}

formModel.addEventListener('change', () => fillForm(defaultInput(formModel.value as ModelId)));
form.addEventListener('submit', (event) => {
  event.preventDefault();
  applyCustom(readForm());
});
document.getElementById('custom-reset')?.addEventListener('click', () => {
  fillForm(defaultInput(formModel.value as ModelId));
  applyCustom(readForm());
});

// ---- Rendering, overlay, measurement ---------------------------------------------------------

const gridSegments = generateGridSegments(GRID_Z, GRID_MIN, GRID_MAX, GRID_MIN, GRID_MAX, GRID_DIVISIONS);

function drawOverlay(tile: Tile): void {
  const ctx = tile.overlay.getContext('2d');
  if (!ctx) {
    return;
  }
  const { imageWidth, imageHeight } = tile.spec;
  ctx.clearRect(0, 0, imageWidth, imageHeight);
  if (!overlayToggle.checked) {
    return;
  }

  ctx.strokeStyle = OVERLAY_COLOR;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.9;
  const SAMPLES = 24;
  for (const [a, b] of gridSegments) {
    ctx.beginPath();
    for (let i = 0; i <= SAMPLES; i++) {
      const t = i / SAMPLES;
      const [u, v] = projectWithSpec(tile.spec, [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
      ]);
      if (i === 0) {
        ctx.moveTo(u, v);
      } else {
        ctx.lineTo(u, v);
      }
    }
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  ctx.lineWidth = 1.5;
  for (const point of tile.probes) {
    const [u, v] = projectWithSpec(tile.spec, point);
    ctx.beginPath();
    ctx.moveTo(u - 7, v);
    ctx.lineTo(u + 7, v);
    ctx.moveTo(u, v - 7);
    ctx.lineTo(u, v + 7);
    ctx.stroke();
  }
}

function readPixels(renderer: THREE.WebGLRenderer, width: number, height: number): Uint8Array {
  const gl = renderer.getContext();
  const pixels = new Uint8Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  return pixels;
}

type Summary = ProbeSummary & { readonly errors: number[]; readonly offsets: Array<Vec2 | null> };

function summarizeRender(
  renderer: THREE.WebGLRenderer,
  spec: CameraSpec,
  probes: readonly Vec3[],
): Summary {
  const { imageWidth: w, imageHeight: h } = spec;
  const measurements = measureProbes(
    readPixels(renderer, w, h),
    w,
    h,
    probes.map((p) => projectWithSpec(spec, p)),
    { color: [(PROBE_COLOR >> 16) & 255, (PROBE_COLOR >> 8) & 255, PROBE_COLOR & 255] },
  );
  return {
    ...summarizeProbes(measurements),
    errors: measurements.map((m) => m.error),
    /** Signed (found − expected) per probe, for diagnosing systematic offsets. */
    offsets: measurements.map((m) =>
      m.found ? ([m.found[0] - m.expected[0], m.found[1] - m.expected[1]] as Vec2) : null,
    ),
  };
}

function summarize(tile: Tile): Summary {
  return summarizeRender(tile.renderer, tile.spec, tile.probes);
}

function renderTile(tile: Tile): void {
  sensor.render(tile.renderer, example.scene, tile.camera);
}

function readoutText(s: ProbeSummary): string {
  return s.missing ? `${s.missing}/${s.count} probes missing` : `max err ${s.maxError.toFixed(2)} px`;
}

function renderAll(): void {
  for (const tile of [...tiles.values(), customTile]) {
    renderTile(tile);
    drawOverlay(tile);
    tile.readout.textContent = readoutText(summarize(tile));
  }
}

createProjectionDemo(canvas, modelSelect, subtitle, (modelId) => {
  for (const tile of tiles.values()) {
    tile.root.classList.toggle('selected', tile.id === modelId);
  }
});
overlayToggle.addEventListener('change', () => {
  for (const tile of [...tiles.values(), customTile]) {
    drawOverlay(tile);
  }
});

fillForm(defaultInput('brown-conrady'));
setCustomProbePoints(example.customProbes, customTile.probes);
renderAll();
reportCustom(summarize(customTile));

/** Hooks for the Playwright visual suite (`packages/cameras/test/visual`). */
const hooks = {
  models: MODELS,
  imageSize: { width: IMAGE_WIDTH, height: IMAGE_HEIGHT },
  background: [(BACKGROUND_COLOR >> 16) & 255, (BACKGROUND_COLOR >> 8) & 255, BACKGROUND_COLOR & 255],
  renderAll,

  /** Render the tile for `model` and compare probe centroids with the CPU projection. */
  measureTile(model: ModelId) {
    const tile = tiles.get(model)!;
    renderTile(tile);
    return summarize(tile);
  },

  /** Negative control: render `model`, compare against `againstModel`'s CPU projection. */
  measureTileAgainst(model: ModelId, againstModel: ModelId) {
    const tile = tiles.get(model)!;
    renderTile(tile);
    return summarizeRender(tile.renderer, presetSpec(againstModel), PROBE_POINTS);
  },

  /**
   * Render a live camera once (compiles/patches materials), mutate its coefficients in
   * place, render again, and compare with the CPU projection of the *mutated* spec.
   */
  measureAfterCoefficientChange(model: ModelId) {
    const spec = presetSpec(model);
    const camera = cameraFromSpec(spec);
    const renderer = new SensorRenderer();
    renderer.render(scratch, example.scene, camera);

    const scale = 1.5;
    const mutated: CameraSpec = {
      ...spec,
      ...(spec.brownConrady && { brownConrady: { ...spec.brownConrady, k1: spec.brownConrady.k1 * scale } }),
      ...(spec.rational && { rational: { ...spec.rational, k1: spec.rational.k1 * scale } }),
      ...(spec.fisheye && { fisheye: { ...spec.fisheye, k1: spec.fisheye.k1 * scale } }),
    };
    camera.setCoefficients({
      brownConrady: mutated.brownConrady,
      rational: mutated.rational,
      fisheye: mutated.fisheye,
    });
    renderer.render(scratch, example.scene, camera);
    return summarizeRender(scratch, mutated, PROBE_POINTS);
  },

  /** Render with a separate camera (e.g. same model, different K) and compare to its own spec. */
  measureSpec(spec: CameraSpec) {
    new SensorRenderer().render(scratch, example.scene, cameraFromSpec(spec));
    return summarizeRender(scratch, spec, PROBE_POINTS);
  },

  alternateSpec: alternateIntrinsicsSpec,
  presetSpec,

  /** Apply values to the custom camera exactly as the form would (validation included). */
  applyCustom,

  /** After a sensor render, render through a stock PerspectiveCamera: must be undistorted pinhole. */
  measureStockCameraAfter(model: ModelId) {
    const tile = tiles.get(model)!;
    renderTile(tile);
    const pinhole = presetSpec('pinhole');
    const k = pinhole.intrinsics;
    const stock = new THREE.PerspectiveCamera(
      THREE.MathUtils.radToDeg(2 * Math.atan(IMAGE_HEIGHT / (2 * k.fy))),
      IMAGE_WIDTH / IMAGE_HEIGHT,
      0.1,
      2000,
    );
    stock.layers.enable(PRESET_PROBE_LAYER); // probes live on their own layer
    scratch.render(example.scene, stock);
    return summarizeRender(scratch, pinhole, PROBE_POINTS);
  },

  /** Colour of the pixel at the CPU-projected centre of each gallery sphere. */
  galleryPixels(model: ModelId) {
    const tile = tiles.get(model)!;
    renderTile(tile);
    const pixels = readPixels(tile.renderer, IMAGE_WIDTH, IMAGE_HEIGHT);
    return example.gallery.map((item) => {
      const [u, v] = projectWithSpec(tile.spec, item.centerCv as never);
      const x = Math.round(u - 0.5);
      const y = Math.round(v - 0.5);
      const i = ((IMAGE_HEIGHT - 1 - y) * IMAGE_WIDTH + x) * 4;
      return { name: item.name, rgb: [pixels[i]!, pixels[i + 1]!, pixels[i + 2]!] };
    });
  },
};

(window as unknown as { __sensorLab: typeof hooks }).__sensorLab = hooks;

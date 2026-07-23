import { SensorRenderer } from './sensor/SensorRenderer';
import { createProjectionDemo } from './demo/createProjectionDemo';
import type { ModelId } from './demo/modelPresets';
import { createScene } from './scene/createScene';

const app = document.getElementById('app');
if (!app) {
  throw new Error('Missing #app container');
}

app.innerHTML = `
  <div class="layout">
    <header class="toolbar">
      <h1>Three Camera Lab</h1>
      <label class="model-picker">
        Model
        <select id="model-select"></select>
      </label>
      <p id="demo-subtitle" class="subtitle"></p>
    </header>
    <div class="panels">
      <section class="panel projection-panel">
        <h2>Projection (OpenCV pixel space)</h2>
        <canvas id="projection-canvas"></canvas>
      </section>
      <section class="panel scene-panel">
        <h2>Three.js sensor view</h2>
        <div id="three-container"></div>
      </section>
    </div>
  </div>
`;

const canvas = document.getElementById('projection-canvas') as HTMLCanvasElement | null;
const modelSelect = document.getElementById('model-select') as HTMLSelectElement | null;
const subtitle = document.getElementById('demo-subtitle') as HTMLElement | null;
const threeContainer = document.getElementById('three-container') as HTMLElement | null;

if (!canvas || !modelSelect || !subtitle || !threeContainer) {
  throw new Error('Missing demo DOM elements');
}

const sensor = SensorRenderer.create({ model: 'pinhole' });
const sceneSetup = createScene(threeContainer, sensor.getCamera());

function applySensorModel(modelId: ModelId): void {
  sensor.setModel(modelId, sceneSetup.scene);
  sceneSetup.setCamera(sensor.getCamera());
}

createProjectionDemo(canvas, modelSelect, subtitle, applySensorModel);

function animate(): void {
  requestAnimationFrame(animate);
  sensor.render(sceneSetup.renderer, sceneSetup.scene);
}

animate();

window.addEventListener('resize', () => {
  const width = threeContainer.clientWidth;
  const height = threeContainer.clientHeight;
  if (width === 0 || height === 0) {
    return;
  }
  sceneSetup.renderer.setSize(width, height);
});

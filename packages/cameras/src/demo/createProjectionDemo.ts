import { generateGridSegments } from './gridPoints';
import {
  getModelPreset,
  IMAGE_HEIGHT,
  IMAGE_WIDTH,
  MODEL_PRESETS,
  type ModelId,
} from './modelPresets';
import { renderProjectionCanvas } from './projectionCanvas';

const GRID_Z = 1;
const GRID_DIVISIONS = 12;

export interface ProjectionDemo {
  redraw(modelId: ModelId): void;
}

export function createProjectionDemo(
  canvas: HTMLCanvasElement,
  modelSelect: HTMLSelectElement,
  subtitle: HTMLElement,
  onModelChange?: (modelId: ModelId) => void,
): ProjectionDemo {
  canvas.width = IMAGE_WIDTH;
  canvas.height = IMAGE_HEIGHT;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not get 2D canvas context');
  }
  const ctx: CanvasRenderingContext2D = context;

  const segments = generateGridSegments(GRID_Z, -0.35, 0.35, -0.35, 0.35, GRID_DIVISIONS);

  for (const preset of MODEL_PRESETS) {
    const option = document.createElement('option');
    option.value = preset.id;
    option.textContent = preset.label;
    modelSelect.append(option);
  }

  function redraw(modelId: ModelId): void {
    const preset = getModelPreset(modelId);
    modelSelect.value = modelId;

    subtitle.textContent = preset.showBaseline
      ? `${preset.baselineLabel} vs ${preset.distortedLabel} — ${IMAGE_WIDTH}×${IMAGE_HEIGHT}px`
      : `${preset.distortedLabel} grid — ${IMAGE_WIDTH}×${IMAGE_HEIGHT}px`;

    renderProjectionCanvas(ctx, {
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT,
      segments,
      showBaseline: preset.showBaseline,
      baselineProject: preset.baselineProject,
      baselineLabel: preset.baselineLabel,
      distortedProject: preset.distortedProject,
      distortedLabel: preset.distortedLabel,
    });
  }

  modelSelect.addEventListener('change', () => {
    const modelId = modelSelect.value as ModelId;
    redraw(modelId);
    onModelChange?.(modelId);
  });

  redraw('pinhole');
  onModelChange?.('pinhole');

  return { redraw };
}

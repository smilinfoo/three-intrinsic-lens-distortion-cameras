import * as THREE from 'three';
import { generateGridSegments } from '../demo/gridPoints';
import { IMAGE_HEIGHT, IMAGE_WIDTH } from '../demo/modelPresets';
import type { SensorCamera } from '../cameras/SensorCamera';

const GRID_Z = 1;
const GRID_DIVISIONS = 12;
const GRID_MIN = -0.35;
const GRID_MAX = 0.35;

function linspace(min: number, max: number, count: number): number[] {
  if (count <= 1) {
    return [min];
  }
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, i) => min + i * step);
}

function buildGridLineSegments(): THREE.LineSegments {
  const segments = generateGridSegments(
    GRID_Z,
    GRID_MIN,
    GRID_MAX,
    GRID_MIN,
    GRID_MAX,
    GRID_DIVISIONS,
  );
  const positions: number[] = [];
  for (const [start, end] of segments) {
    positions.push(start[0], start[1], start[2], end[0], end[1], end[2]);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({ color: 0x44ccff });
  return new THREE.LineSegments(geometry, material);
}

function buildGridPoints(): THREE.Points {
  const xs = linspace(GRID_MIN, GRID_MAX, GRID_DIVISIONS);
  const ys = linspace(GRID_MIN, GRID_MAX, GRID_DIVISIONS);
  const positions: number[] = [];
  for (const x of xs) {
    for (const y of ys) {
      positions.push(x, y, GRID_Z);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: 0xffffff, size: 4, sizeAttenuation: false });
  return new THREE.Points(geometry, material);
}

function buildInstancedMarkers(): THREE.InstancedMesh {
  const xs = linspace(GRID_MIN, GRID_MAX, GRID_DIVISIONS);
  const ys = linspace(GRID_MIN, GRID_MAX, GRID_DIVISIONS);
  const count = xs.length * ys.length;
  const geometry = new THREE.BoxGeometry(0.015, 0.015, 0.015);
  const material = new THREE.MeshBasicMaterial({ color: 0x4488ff });
  const mesh = new THREE.InstancedMesh(geometry, material, count);

  const matrix = new THREE.Matrix4();
  let index = 0;
  for (const x of xs) {
    for (const y of ys) {
      matrix.makeTranslation(x, y, GRID_Z);
      mesh.setMatrixAt(index, matrix);
      index++;
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

export interface SceneSetup {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  opencvFrame: THREE.Group;
  getCamera(): SensorCamera;
  setCamera(camera: SensorCamera): void;
  forceMaterialRecompile(): void;
}

export function createScene(container: HTMLElement, initialCamera: SensorCamera): SceneSetup {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0a);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  /** OpenCV camera-frame content: Rx(π) maps (x,y,z)_cv → Three.js positions. */
  const opencvFrame = new THREE.Group();
  opencvFrame.rotation.x = Math.PI;
  opencvFrame.add(buildGridLineSegments());
  opencvFrame.add(buildGridPoints());
  opencvFrame.add(buildInstancedMarkers());
  scene.add(opencvFrame);

  let activeCamera = initialCamera;
  activeCamera.position.set(0, 0, 0);
  activeCamera.lookAt(0, 0, -1);
  scene.add(activeCamera);

  function setCamera(next: SensorCamera): void {
    scene.remove(activeCamera);
    activeCamera = next;
    activeCamera.position.set(0, 0, 0);
    activeCamera.lookAt(0, 0, -1);
    scene.add(activeCamera);
  }

  function forceMaterialRecompile(): void {
    opencvFrame.traverse((object) => {
      if (
        object instanceof THREE.Mesh ||
        object instanceof THREE.LineSegments ||
        object instanceof THREE.Points
      ) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          material.needsUpdate = true;
        }
      }
    });
  }

  return {
    scene,
    renderer,
    opencvFrame,
    getCamera: () => activeCamera,
    setCamera,
    forceMaterialRecompile,
  };
}

export { IMAGE_WIDTH, IMAGE_HEIGHT };

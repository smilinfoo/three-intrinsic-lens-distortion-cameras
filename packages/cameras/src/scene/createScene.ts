import * as THREE from 'three';
import { generateGridSegments } from '../demo/gridPoints';
import { CUSTOM_PROBE_LAYER, PRESET_PROBE_LAYER, PROBE_POINTS } from '../demo/probes';

/** Calibration grid plane (OpenCV frame, metres). */
export const GRID_Z = 1;
export const GRID_DIVISIONS = 12;
export const GRID_MIN = -0.35;
export const GRID_MAX = 0.35;

/** Pure green is reserved for probe points so pixel readback can find them unambiguously. */
export const PROBE_COLOR = 0x00ff00;
export const BACKGROUND_COLOR = 0x0a0a0a;

export interface GalleryItem {
  readonly name: string;
  readonly object: THREE.Mesh;
  /** Object centre in the OpenCV camera frame (camera at origin, +Z forward, +Y down). */
  readonly centerCv: readonly [number, number, number];
}

export interface ExampleScene {
  readonly scene: THREE.Scene;
  /** Content authored in the OpenCV camera frame (calibration grid, probes). */
  readonly opencvFrame: THREE.Group;
  readonly probes: THREE.Points;
  /** Probes for the user-defined camera; empty until {@link setCustomProbePoints} is called. */
  readonly customProbes: THREE.Points;
  readonly gallery: readonly GalleryItem[];
}

function linspace(min: number, max: number, count: number): number[] {
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, i) => min + i * step);
}

function checkerTexture(cells: number, repeat: number): THREE.DataTexture {
  const size = cells * 2;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const light = (Math.floor(x / (size / cells)) + Math.floor(y / (size / cells))) % 2 === 0;
      const v = light ? 235 : 70;
      data.set([v, v, v, 255], (y * size + x) * 4);
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function buildGridLineSegments(): THREE.LineSegments {
  const positions: number[] = [];
  for (const [start, end] of generateGridSegments(
    GRID_Z,
    GRID_MIN,
    GRID_MAX,
    GRID_MIN,
    GRID_MAX,
    GRID_DIVISIONS,
  )) {
    positions.push(...start, ...end);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0x44ccff }));
}

function buildGridPoints(): THREE.Points {
  const positions: number[] = [];
  for (const x of linspace(GRID_MIN, GRID_MAX, GRID_DIVISIONS)) {
    for (const y of linspace(GRID_MIN, GRID_MAX, GRID_DIVISIONS)) {
      positions.push(x, y, GRID_Z);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color: 0xffffff, size: 4, sizeAttenuation: false }),
  );
}

function buildInstancedMarkers(): THREE.InstancedMesh {
  const xs = linspace(GRID_MIN, GRID_MAX, GRID_DIVISIONS);
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.006, 0.006, 0.006),
    new THREE.MeshBasicMaterial({ color: 0x4488ff }),
    xs.length * xs.length,
  );
  const matrix = new THREE.Matrix4();
  let index = 0;
  for (const x of xs) {
    for (const y of xs) {
      mesh.setMatrixAt(index++, matrix.makeTranslation(x, y, GRID_Z));
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

function buildProbes(points: readonly (readonly number[])[], layer: number, name: string): THREE.Points {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
  const probes = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: PROBE_COLOR,
      size: 7,
      sizeAttenuation: false,
      depthTest: false, // always fully visible: scene geometry must not nibble marker pixels
      depthWrite: false,
    }),
  );
  probes.renderOrder = 1000;
  probes.name = name;
  probes.frustumCulled = false;
  probes.layers.set(layer); // only cameras that enable this layer see these markers
  return probes;
}

/** Replace the custom camera's probe positions (OpenCV camera frame). */
export function setCustomProbePoints(
  customProbes: THREE.Points,
  points: readonly (readonly number[])[],
): void {
  customProbes.geometry.dispose();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
  customProbes.geometry = geometry;
}

const GALLERY_MATERIALS: ReadonlyArray<readonly [string, () => THREE.Material]> = [
  ['basic', () => new THREE.MeshBasicMaterial({ color: 0xff8844 })],
  ['lambert', () => new THREE.MeshLambertMaterial({ color: 0xff8844 })],
  ['phong', () => new THREE.MeshPhongMaterial({ color: 0xff8844, shininess: 60 })],
  ['standard', () => new THREE.MeshStandardMaterial({ color: 0xff8844, roughness: 0.4 })],
  ['physical', () => new THREE.MeshPhysicalMaterial({ color: 0xff8844, clearcoat: 1 })],
  ['toon', () => new THREE.MeshToonMaterial({ color: 0xff8844 })],
  ['normal', () => new THREE.MeshNormalMaterial()],
  ['matcap', () => new THREE.MeshMatcapMaterial({ color: 0xff8844 })],
];

/**
 * A plain, consumer-style Three.js scene: camera at the origin looking down −Z.
 * Contents exercise every patch path — lit/textured meshes (tessellated, so distortion is
 * visible between vertices), one sphere per built-in mesh material, lines, points,
 * instanced meshes and shadows.
 */
export function buildExampleScene(): ExampleScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKGROUND_COLOR);

  scene.add(new THREE.AmbientLight(0xffffff, 0.45));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(-3, 6, 2);
  sun.target.position.set(0, 0, -8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 0.5, far: 30 });
  scene.add(sun, sun.target);

  // Ground and back wall: highly tessellated so per-vertex distortion bends the checker lines.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 18, 128, 144),
    new THREE.MeshStandardMaterial({ map: checkerTexture(8, 8), roughness: 0.9 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.9, -11);
  ground.receiveShadow = true;
  ground.name = 'ground';

  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 6, 128, 48),
    new THREE.MeshStandardMaterial({ map: checkerTexture(8, 4), roughness: 0.9 }),
  );
  wall.position.set(0, 2, -14);
  wall.receiveShadow = true;
  wall.name = 'wall';
  scene.add(ground, wall);

  // Straight-edged tessellated box: its edges visibly bend under distortion.
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1, 16, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0x6688cc, roughness: 0.6 }),
  );
  box.position.set(1.4, -0.4, -8);
  box.rotation.y = 0.5;
  box.castShadow = true;
  box.receiveShadow = true;
  box.name = 'box';
  scene.add(box);

  // Material gallery: one sphere per built-in mesh material.
  const gallery: GalleryItem[] = GALLERY_MATERIALS.map(([name, make], i) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 24), make());
    const x = -1.75 + i * 0.5;
    mesh.position.set(x, 0.35, -5);
    mesh.castShadow = true;
    mesh.name = `gallery-${name}`;
    scene.add(mesh);
    return { name, object: mesh, centerCv: [x, -0.35, 5] as const };
  });

  const opencvFrame = new THREE.Group();
  opencvFrame.name = 'opencv-frame';
  opencvFrame.rotation.x = Math.PI; // (x, y, z)_cv → (x, −y, −z)_three
  const probes = buildProbes(PROBE_POINTS, PRESET_PROBE_LAYER, 'probes');
  const customProbes = buildProbes([], CUSTOM_PROBE_LAYER, 'custom-probes');
  opencvFrame.add(
    buildGridLineSegments(),
    buildGridPoints(),
    buildInstancedMarkers(),
    probes,
    customProbes,
  );
  scene.add(opencvFrame);

  return { scene, opencvFrame, probes, customProbes, gallery };
}

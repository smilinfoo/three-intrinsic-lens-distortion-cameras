#!/usr/bin/env bash
# Install the packed tarballs into a throwaway project and prove a consumer can type-check,
# bundle and (in Node) import them. Does NOT publish anything.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"

npm run build >/dev/null
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

for pkg in core cameras; do
  (cd "packages/$pkg" && npm pack --silent --pack-destination "$TMP" >/dev/null 2>&1)
done

cd "$TMP"
cat > package.json <<'JSON'
{ "name": "consumer-smoke", "private": true, "type": "module" }
JSON
npm install --silent ./*.tgz three@0.178.0 @types/three@0.178.1 typescript vite >/dev/null

cat > main.ts <<'TS'
import * as THREE from 'three';
import {
  brownConradyFromArray,
  cameraMatrixFromArray,
  fisheyeFromArray,
  rationalFromArray,
} from 'intrinsic-lens-distortion';
import {
  SensorCamera,
  SensorRenderer,
  fitRendererToSensor,
  pixelToThreeRayFromCamera,
  type ModelId,
} from 'three-intrinsic-lens-distortion-cameras';

const K = cameraMatrixFromArray([[800, 0, 320], [0, 800, 240], [0, 0, 1]]);
const base = { intrinsics: K, imageWidth: 640, imageHeight: 480 };
const cameras: SensorCamera[] = [
  new SensorCamera({ ...base, model: 'pinhole' }),
  new SensorCamera({ ...base, model: 'brown-conrady', brownConrady: brownConradyFromArray([-0.2, 0.05, 0, 0, 0]) }),
  new SensorCamera({ ...base, model: 'rational', rational: rationalFromArray([-0.2, 0, 0, 0, 0, 0, 0, 0]) }),
  new SensorCamera({ ...base, model: 'fisheye', fisheye: fisheyeFromArray([-0.08, 0, 0, 0]) }),
];
const ids: ModelId[] = cameras.map((c) => c.model);
const sensor = new SensorRenderer();
export function draw(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
  for (const camera of cameras) {
    fitRendererToSensor(renderer, camera);
    sensor.render(renderer, scene, camera);
  }
}
console.log(ids, pixelToThreeRayFromCamera([320, 240], cameras[1]!));
TS
cat > tsconfig.json <<'JSON'
{ "compilerOptions": { "target": "ES2022", "module": "ESNext", "moduleResolution": "bundler",
  "strict": true, "noEmit": true, "skipLibCheck": false, "lib": ["ES2022", "DOM"] }, "files": ["main.ts"] }
JSON

echo "-- tsc (consumer, skipLibCheck=false)"
npx tsc -p tsconfig.json
echo "-- vite build (consumer bundle)"
cat > vite.config.js <<'JS'
export default { build: { lib: { entry: 'main.ts', formats: ['es'], fileName: 'main' }, outDir: 'out', minify: false } };
JS
npx vite build --logLevel error
test -s out/main.js
grep -q "opencvProjectDistorted" out/main.js  # shader patch made it into the consumer bundle
echo "-- node ESM import"
node --input-type=module -e "
const core = await import('intrinsic-lens-distortion');
const cameras = await import('three-intrinsic-lens-distortion-cameras');
for (const k of ['SensorCamera','SensorRenderer','fitRendererToSensor']) if (!(k in cameras)) throw new Error('missing '+k);
if (!('projectBrownConrady' in core)) throw new Error('core missing projectBrownConrady');
console.log('imports ok');
"
echo "consumer smoke OK"

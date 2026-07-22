import * as THREE from 'three';
import { PACKAGE_NAME } from '@three-camera-lab/core';
import { createScene } from './scene/createScene';

const container = document.getElementById('app');

if (!container) {
  throw new Error('Missing #app container');
}

const { scene, camera, renderer } = createScene(container);

console.info(`[three-camera-lab] loaded ${PACKAGE_NAME}`);

function animate(): void {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

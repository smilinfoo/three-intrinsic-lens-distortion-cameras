/** Public API of the sensor-camera library. Nothing from `demo/` or `main.ts` is exported. */

export { SensorCamera } from './cameras/SensorCamera';
export type { SensorCameraOptions, SensorCameraCoefficients } from './cameras/SensorCamera';
export type { ModelId, DistortionModelId } from './cameras/types';
export {
  buildSensorProjectionMatrix,
  SENSOR_CAMERA_NEAR,
  SENSOR_CAMERA_FAR,
} from './cameras/buildSensorProjectionMatrix';
export { pixelToThreeRay, pixelToThreeRayFromCamera } from './cameras/pixelToRay';
export {
  DistortionRenderPlugin,
  SENSOR_DISTORTION_USER_DATA_KEY,
} from './render/DistortionRenderPlugin';
export type { DistortionRenderPluginOptions } from './render/DistortionRenderPlugin';
export { SensorRenderer } from './sensor/SensorRenderer';
export type { SensorRendererOptions } from './sensor/SensorRenderer';
export { fitRendererToSensor, computeSensorViewport } from './sensor/fitRendererToSensor';
export type { FitRendererOptions, SensorViewport } from './sensor/fitRendererToSensor';

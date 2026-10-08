/** Camera models supported by {@link SensorCamera}. */
export type ModelId = 'pinhole' | 'brown-conrady' | 'rational' | 'fisheye';

/** Alias kept for readability at call sites that talk about distortion specifically. */
export type DistortionModelId = ModelId;

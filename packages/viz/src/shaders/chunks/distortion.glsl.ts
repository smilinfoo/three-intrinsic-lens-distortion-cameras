/**
 * GLSL mirrors of packages/core/src/distortion/brown-conrady.ts
 * Must stay in sync with forward Brown-Conrady equations.
 */
export const BROWN_CONRADY_GLSL = /* glsl */ `
vec2 distortBrownConrady(vec2 normalized) {
  float x = normalized.x;
  float y = normalized.y;
  float r2 = x * x + y * y;
  float r4 = r2 * r2;
  float r6 = r4 * r2;
  float radial = 1.0 + uBrownK1 * r2 + uBrownK2 * r4 + uBrownK3 * r6;
  float xDist = x * radial + 2.0 * uBrownP1 * x * y + uBrownP2 * (r2 + 2.0 * x * x);
  float yDist = y * radial + uBrownP1 * (r2 + 2.0 * y * y) + 2.0 * uBrownP2 * x * y;
  return vec2(xDist, yDist);
}
`;

export const RATIONAL_GLSL = /* glsl */ `
vec2 distortRational(vec2 normalized) {
  float x = normalized.x;
  float y = normalized.y;
  float r2 = x * x + y * y;
  float r4 = r2 * r2;
  float r6 = r4 * r2;
  float numerator = 1.0 + uRatK1 * r2 + uRatK2 * r4 + uRatK3 * r6;
  float denominator = 1.0 + uRatK4 * r2 + uRatK5 * r4 + uRatK6 * r6;
  float radial = numerator / denominator;
  float xDist = x * radial + 2.0 * uRatP1 * x * y + uRatP2 * (r2 + 2.0 * x * x);
  float yDist = y * radial + uRatP1 * (r2 + 2.0 * y * y) + 2.0 * uRatP2 * x * y;
  return vec2(xDist, yDist);
}
`;

export const FISHEYE_GLSL = /* glsl */ `
vec2 distortFisheye(vec2 normalized) {
  float a = normalized.x;
  float b = normalized.y;
  float r2 = a * a + b * b;
  if (r2 <= 1e-24) {
    return vec2(0.0, 0.0);
  }
  float r = sqrt(r2);
  float theta = atan(r);
  float theta2 = theta * theta;
  float theta4 = theta2 * theta2;
  float theta6 = theta4 * theta2;
  float theta8 = theta4 * theta4;
  float thetaD = theta * (1.0 + uFishK1 * theta2 + uFishK2 * theta4 + uFishK3 * theta6 + uFishK4 * theta8);
  float scale = thetaD / r;
  return vec2(scale * a, scale * b);
}
`;

export const OPENCV_PROJECT_GLSL = /* glsl */ `
vec4 opencvProjectDistorted(vec4 mvPosition) {
  float X_cv = mvPosition.x;
  float Y_cv = -mvPosition.y;
  float Z_cv = -mvPosition.z;

  if (Z_cv <= 0.0) {
    return vec4(0.0, 0.0, 2.0, 1.0);
  }

  vec2 normalized = vec2(X_cv / Z_cv, Y_cv / Z_cv);
  vec2 distorted = normalized;

  if (uDistortionModel == 1) {
    distorted = distortBrownConrady(normalized);
  } else if (uDistortionModel == 2) {
    distorted = distortRational(normalized);
  } else if (uDistortionModel == 3) {
    distorted = distortFisheye(normalized);
  }

  float u = uFx * distorted.x + uCx;
  float v = uFy * distorted.y + uCy;
  float ndc_x = 2.0 * u / uImageWidth - 1.0;
  float ndc_y = 1.0 - 2.0 * v / uImageHeight;
  float w = -mvPosition.z;
  vec4 depthClip = projectionMatrix * mvPosition;
  return vec4(ndc_x * w, ndc_y * w, depthClip.z, w);
}
`;

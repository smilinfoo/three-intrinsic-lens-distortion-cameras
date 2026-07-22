# Coordinate Conventions

> Placeholder — to be completed before implementing camera mathematics.

This document will define the coordinate-system contracts used across:

- OpenCV / Python reference code (`reference/`)
- Pure JavaScript camera math (`packages/core/`)
- Three.js visualization (`packages/viz/`)

## Sections to document

### 1. OpenCV camera frame

- +X right, +Y down, +Z forward (into the scene)
- Distortion applied on the normalized image plane before applying intrinsics

### 2. Normalized vs pixel coordinates

- Relationship between `(x, y)` on the normalized plane and pixel `(u, v)`
- Principal point and focal length conventions

### 3. Three.js camera frame

- +X right, +Y up, +Z backward (out of the screen)
- Explicit transform matrix between OpenCV and Three.js frames

### 4. Distortion coefficient layouts

- Brown-Conrady (plumb bob)
- Rational polynomial
- OpenCV fisheye

### 5. Edge cases

- Points behind the camera (`Z ≤ 0`)
- Pixel center convention (0.5 offset)
- Units (radians vs degrees)

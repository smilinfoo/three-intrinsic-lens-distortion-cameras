"""Verify that OpenCV and NumPy are available for reference testing."""

from __future__ import annotations

import sys

import cv2
import numpy as np


def main() -> int:
    """Print versions and run a minimal cv2.projectPoints smoke test."""
    print("three-camera-lab OpenCV verification")
    print(f"  Python:  {sys.version.split()[0]}")
    print(f"  NumPy:   {np.__version__}")
    print(f"  OpenCV:  {cv2.__version__}")

    object_points = np.array(
        [[[0.0, 0.0, 1.0], [0.1, 0.0, 1.0], [0.0, 0.1, 1.0]]],
        dtype=np.float64,
    )
    rvec = np.zeros((1, 3), dtype=np.float64)
    tvec = np.zeros((1, 3), dtype=np.float64)
    camera_matrix = np.array(
        [[800.0, 0.0, 320.0], [0.0, 800.0, 240.0], [0.0, 0.0, 1.0]],
        dtype=np.float64,
    )
    dist_coeffs = np.zeros((5, 1), dtype=np.float64)

    image_points, _ = cv2.projectPoints(
        object_points, rvec, tvec, camera_matrix, dist_coeffs
    )

    expected_center = np.array([320.0, 240.0])
    actual_center = image_points[0, 0]
    error = np.linalg.norm(actual_center - expected_center)

    print(f"  projectPoints center: ({actual_center[0]:.1f}, {actual_center[1]:.1f})")
    print(f"  reprojection error:   {error:.6f} px")

    if error > 1e-6:
        print("FAIL: unexpected reprojection error")
        return 1

    print("OK: OpenCV reference environment is ready")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

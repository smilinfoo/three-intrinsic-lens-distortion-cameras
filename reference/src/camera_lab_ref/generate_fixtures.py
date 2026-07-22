"""Generate golden test fixtures using OpenCV."""

from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np

FIXTURES_DIR = Path(__file__).resolve().parents[2] / "fixtures"


def project_pinhole(
    points_3d: list[list[float]],
    camera_matrix: np.ndarray,
    dist_coeffs: list[float] | None = None,
) -> list[list[float]]:
    """Project 3D points in the OpenCV camera frame with identity extrinsics."""
    object_points = np.array([points_3d], dtype=np.float64)
    rvec = np.zeros((1, 3), dtype=np.float64)
    tvec = np.zeros((1, 3), dtype=np.float64)
    dist = np.zeros((5, 1), dtype=np.float64)
    if dist_coeffs is not None:
        dist[: len(dist_coeffs), 0] = dist_coeffs

    image_points, _ = cv2.projectPoints(
        object_points, rvec, tvec, camera_matrix, dist
    )
    return image_points.reshape(-1, 2).tolist()


def pinhole_basic_fixture() -> dict:
    """Zero-distortion pinhole fixture with identity extrinsics."""
    camera_matrix = np.array(
        [[800.0, 0.0, 320.0], [0.0, 800.0, 240.0], [0.0, 0.0, 1.0]],
        dtype=np.float64,
    )
    points_3d = [
        [0.0, 0.0, 1.0],
        [0.1, 0.0, 1.0],
        [0.0, 0.1, 1.0],
        [-0.1, 0.0, 2.0],
        [0.05, -0.05, 0.5],
        [0.2, 0.15, 3.0],
    ]
    expected_pixels = project_pinhole(points_3d, camera_matrix)

    return {
        "model": "pinhole",
        "opencv_version": cv2.__version__,
        "camera_matrix": camera_matrix.tolist(),
        "dist_coeffs": [0.0, 0.0, 0.0, 0.0, 0.0],
        "points_3d": points_3d,
        "expected_pixels": expected_pixels,
        "tolerance": {"abs": 1e-4, "rel": 1e-6},
    }


def write_pinhole_fixtures() -> None:
    out_dir = FIXTURES_DIR / "pinhole"
    out_dir.mkdir(parents=True, exist_ok=True)

    fixture = pinhole_basic_fixture()
    out_path = out_dir / "basic.json"
    out_path.write_text(json.dumps(fixture, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out_path}")


def main() -> int:
    write_pinhole_fixtures()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

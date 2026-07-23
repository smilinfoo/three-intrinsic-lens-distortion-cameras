"""Generate golden test fixtures using OpenCV."""

from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np

FIXTURES_DIR = Path(__file__).resolve().parents[2] / "fixtures"

STANDARD_CAMERA_MATRIX = np.array(
    [[800.0, 0.0, 320.0], [0.0, 800.0, 240.0], [0.0, 0.0, 1.0]],
    dtype=np.float64,
)

STANDARD_POINTS_3D = [
    [0.0, 0.0, 1.0],
    [0.1, 0.0, 1.0],
    [0.0, 0.1, 1.0],
    [-0.1, 0.0, 2.0],
    [0.05, -0.05, 0.5],
    [0.2, 0.15, 3.0],
]

ZERO_DIST_5 = [0.0, 0.0, 0.0, 0.0, 0.0]
ZERO_DIST_8 = [0.0] * 8
DEFAULT_TOLERANCE = {"abs": 1e-4, "rel": 1e-6}
NORMALIZED_TOLERANCE = {"abs": 1e-5, "rel": 1e-6}

BROWN_CONRADY_BASIC = [-0.2, 0.05, 0.001, -0.001, 0.001]


def project_points(
    points_3d: list[list[float]],
    camera_matrix: np.ndarray,
    dist_coeffs: list[float],
) -> list[list[float]]:
    """Project 3D points in the OpenCV camera frame with identity extrinsics."""
    object_points = np.array([points_3d], dtype=np.float64)
    rvec = np.zeros((1, 3), dtype=np.float64)
    tvec = np.zeros((1, 3), dtype=np.float64)
    dist = np.zeros((max(8, len(dist_coeffs)), 1), dtype=np.float64)
    dist[: len(dist_coeffs), 0] = dist_coeffs

    image_points, _ = cv2.projectPoints(
        object_points, rvec, tvec, camera_matrix, dist
    )
    return image_points.reshape(-1, 2).tolist()


def _fixture(
    model: str,
    dist_coeffs: list[float],
    points_3d: list[list[float]] | None = None,
    camera_matrix: np.ndarray | None = None,
) -> dict:
    k = camera_matrix if camera_matrix is not None else STANDARD_CAMERA_MATRIX
    points = points_3d if points_3d is not None else STANDARD_POINTS_3D
    return {
        "model": model,
        "opencv_version": cv2.__version__,
        "camera_matrix": k.tolist(),
        "dist_coeffs": dist_coeffs,
        "points_3d": points,
        "expected_pixels": project_points(points, k, dist_coeffs),
        "tolerance": DEFAULT_TOLERANCE,
    }


def pinhole_basic_fixture() -> dict:
    return _fixture("pinhole", ZERO_DIST_5)


def brown_conrady_basic_fixture() -> dict:
    return _fixture("brown-conrady", BROWN_CONRADY_BASIC)


def brown_conrady_radial_only_fixture() -> dict:
    return _fixture("brown-conrady", [-0.15, 0.03, 0.0, 0.0, 0.002])


def brown_conrady_tangential_only_fixture() -> dict:
    return _fixture("brown-conrady", [0.0, 0.0, 0.002, -0.001, 0.0])


def brown_conrady_zero_distortion_fixture() -> dict:
    return _fixture("brown-conrady", ZERO_DIST_5)


def rational_basic_fixture() -> dict:
    return _fixture(
        "rational",
        [-0.2, 0.05, 0.001, -0.001, 0.001, 0.01, -0.003, 0.001],
    )


def rational_radial_only_fixture() -> dict:
    return _fixture(
        "rational",
        [-0.15, 0.03, 0.0, 0.0, 0.002, 0.008, -0.002, 0.0005],
    )


def rational_brown_conrady_equiv_fixture() -> dict:
    return _fixture("rational", [*BROWN_CONRADY_BASIC, 0.0, 0.0, 0.0])


def rational_zero_distortion_fixture() -> dict:
    return _fixture("rational", ZERO_DIST_8)


def _write_fixture(path: Path, fixture: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(fixture, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {path}")


def write_pinhole_fixtures() -> None:
    _write_fixture(FIXTURES_DIR / "pinhole" / "basic.json", pinhole_basic_fixture())


def write_brown_conrady_fixtures() -> None:
    out_dir = FIXTURES_DIR / "brown-conrady"
    _write_fixture(out_dir / "basic.json", brown_conrady_basic_fixture())
    _write_fixture(out_dir / "radial-only.json", brown_conrady_radial_only_fixture())
    _write_fixture(
        out_dir / "tangential-only.json", brown_conrady_tangential_only_fixture()
    )
    _write_fixture(
        out_dir / "zero-distortion.json", brown_conrady_zero_distortion_fixture()
    )


def project_fisheye_points(
    points_3d: list[list[float]],
    camera_matrix: np.ndarray,
    dist_coeffs: list[float],
) -> list[list[float]]:
    """Project 3D points using cv2.fisheye.projectPoints (identity extrinsics)."""
    object_points = np.array([points_3d], dtype=np.float64)
    rvec = np.zeros((3, 1), dtype=np.float64)
    tvec = np.zeros((3, 1), dtype=np.float64)
    d = np.array(dist_coeffs, dtype=np.float64).reshape(4, 1)

    image_points, _ = cv2.fisheye.projectPoints(
        object_points, rvec, tvec, camera_matrix, d
    )
    return image_points.reshape(-1, 2).tolist()


def _fisheye_fixture(
    dist_coeffs: list[float],
    points_3d: list[list[float]] | None = None,
    camera_matrix: np.ndarray | None = None,
) -> dict:
    k = camera_matrix if camera_matrix is not None else STANDARD_CAMERA_MATRIX
    points = points_3d if points_3d is not None else STANDARD_POINTS_3D
    return {
        "model": "fisheye",
        "opencv_version": cv2.__version__,
        "camera_matrix": k.tolist(),
        "dist_coeffs": dist_coeffs,
        "points_3d": points,
        "expected_pixels": project_fisheye_points(points, k, dist_coeffs),
        "tolerance": DEFAULT_TOLERANCE,
    }


def fisheye_basic_fixture() -> dict:
    return _fisheye_fixture([-0.08, 0.01, -0.002, 0.0005])


def fisheye_mild_fixture() -> dict:
    return _fisheye_fixture([-0.03, 0.001, 0.0, 0.0])


def fisheye_zero_coeff_fixture() -> dict:
    return _fisheye_fixture([0.0, 0.0, 0.0, 0.0])


def fisheye_wide_angle_fixture() -> dict:
    return _fisheye_fixture([-0.15, 0.02, -0.004, 0.001])


def write_rational_fixtures() -> None:
    out_dir = FIXTURES_DIR / "rational"
    _write_fixture(out_dir / "basic.json", rational_basic_fixture())
    _write_fixture(out_dir / "radial-only.json", rational_radial_only_fixture())
    _write_fixture(
        out_dir / "brown-conrady-equiv.json", rational_brown_conrady_equiv_fixture()
    )
    _write_fixture(
        out_dir / "zero-distortion.json", rational_zero_distortion_fixture()
    )


def write_fisheye_fixtures() -> None:
    out_dir = FIXTURES_DIR / "fisheye"
    _write_fixture(out_dir / "basic.json", fisheye_basic_fixture())
    _write_fixture(out_dir / "mild.json", fisheye_mild_fixture())
    _write_fixture(out_dir / "zero-coeff.json", fisheye_zero_coeff_fixture())
    _write_fixture(out_dir / "wide-angle.json", fisheye_wide_angle_fixture())


def undistort_points(
    pixels: list[list[float]],
    camera_matrix: np.ndarray,
    dist_coeffs: list[float],
) -> list[list[float]]:
    """Undistort pixel coordinates to normalized plane via cv2.undistortPoints."""
    image_points = np.array(pixels, dtype=np.float64).reshape(-1, 1, 2)
    dist = np.zeros((max(8, len(dist_coeffs)), 1), dtype=np.float64)
    dist[: len(dist_coeffs), 0] = dist_coeffs
    normalized = cv2.undistortPoints(image_points, camera_matrix, dist, P=None)
    return normalized.reshape(-1, 2).tolist()


def undistort_fisheye_points(
    pixels: list[list[float]],
    camera_matrix: np.ndarray,
    dist_coeffs: list[float],
) -> list[list[float]]:
    """Undistort pixel coordinates via cv2.fisheye.undistortPoints."""
    image_points = np.array(pixels, dtype=np.float64).reshape(-1, 1, 2)
    d = np.array(dist_coeffs, dtype=np.float64).reshape(4, 1)
    normalized = cv2.fisheye.undistortPoints(
        image_points, camera_matrix, d, P=None
    )
    return normalized.reshape(-1, 2).tolist()


def _undistort_fixture(
    model: str,
    dist_coeffs: list[float],
    points_3d: list[list[float]] | None = None,
    camera_matrix: np.ndarray | None = None,
    *,
    use_fisheye: bool = False,
) -> dict:
    k = camera_matrix if camera_matrix is not None else STANDARD_CAMERA_MATRIX
    points = points_3d if points_3d is not None else STANDARD_POINTS_3D
    if use_fisheye:
        pixels = project_fisheye_points(points, k, dist_coeffs)
        expected = undistort_fisheye_points(pixels, k, dist_coeffs)
    else:
        pixels = project_points(points, k, dist_coeffs)
        expected = undistort_points(pixels, k, dist_coeffs)
    return {
        "model": model,
        "direction": "inverse-normalized",
        "opencv_version": cv2.__version__,
        "camera_matrix": k.tolist(),
        "dist_coeffs": dist_coeffs,
        "pixels": pixels,
        "expected_normalized": expected,
        "tolerance": NORMALIZED_TOLERANCE,
    }


def write_undistort_fixtures() -> None:
    out = FIXTURES_DIR / "undistort"
    _write_fixture(out / "pinhole" / "basic.json", _undistort_fixture("pinhole", ZERO_DIST_5))
    _write_fixture(
        out / "brown-conrady" / "basic.json",
        _undistort_fixture("brown-conrady", BROWN_CONRADY_BASIC),
    )
    _write_fixture(
        out / "brown-conrady" / "radial-only.json",
        _undistort_fixture("brown-conrady", [-0.15, 0.03, 0.0, 0.0, 0.002]),
    )
    _write_fixture(
        out / "rational" / "basic.json",
        _undistort_fixture(
            "rational",
            [-0.2, 0.05, 0.001, -0.001, 0.001, 0.01, -0.003, 0.001],
        ),
    )
    _write_fixture(
        out / "fisheye" / "basic.json",
        _undistort_fixture("fisheye", [-0.08, 0.01, -0.002, 0.0005], use_fisheye=True),
    )
    _write_fixture(
        out / "fisheye" / "mild.json",
        _undistort_fixture("fisheye", [-0.03, 0.001, 0.0, 0.0], use_fisheye=True),
    )


def main() -> int:
    write_pinhole_fixtures()
    write_brown_conrady_fixtures()
    write_rational_fixtures()
    write_fisheye_fixtures()
    write_undistort_fixtures()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

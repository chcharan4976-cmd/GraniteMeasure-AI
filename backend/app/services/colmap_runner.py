"""Optional COLMAP Structure-from-Motion runner.

COLMAP is invoked only when a working binary is discovered. Absence is a
documented limitation, not a simulated success.
"""

from __future__ import annotations

import logging
import os
import shutil
import subprocess
from pathlib import Path
from typing import Optional

from app.services.pipeline_config import COLMAP_BIN, JOB_TIMEOUT_SEC

logger = logging.getLogger(__name__)


def discover_colmap() -> Optional[str]:
    if COLMAP_BIN and Path(COLMAP_BIN).exists():
        return COLMAP_BIN
    found = shutil.which("colmap")
    if found:
        return found
    candidates = [
        Path(r"C:\Program Files\COLMAP\bin\colmap.exe"),
        Path(r"C:\COLMAP\bin\colmap.exe"),
        Path.home() / "COLMAP" / "bin" / "colmap.exe",
    ]
    for path in candidates:
        if path.is_file():
            return str(path)
    return None


def colmap_status() -> dict:
    binary = discover_colmap()
    return {
        "available": binary is not None,
        "binary": binary,
        "pycolmap": _pycolmap_available(),
        "note": (
            "COLMAP sparse/dense reconstruction is used when the binary is present. "
            "This host had no COLMAP install at Phase 2 audit; OpenCV stereo is the fallback."
            if binary is None
            else "COLMAP binary discovered and will be preferred for multi-view reconstruction."
        ),
    }


def _pycolmap_available() -> bool:
    try:
        import pycolmap  # noqa: F401

        return True
    except Exception:
        return False


def _run(cmd: list[str], timeout: int) -> subprocess.CompletedProcess:
    logger.info("COLMAP: %s", " ".join(cmd))
    return subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )


def prepare_workspace(workspace: Path, image_paths: list[str], max_edge: int) -> Path:
    """Copy/downscale images into a COLMAP-friendly JPEG folder."""
    import cv2

    image_dir = workspace / "images"
    image_dir.mkdir(parents=True, exist_ok=True)
    written = []
    for i, src in enumerate(image_paths):
        img = cv2.imread(src)
        if img is None:
            data = Path(src).read_bytes()
            arr = __import__("numpy").frombuffer(data, dtype="uint8")
            img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            continue
        h, w = img.shape[:2]
        scale = min(1.0, max_edge / float(max(h, w)))
        if scale < 1.0:
            img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
        dest = image_dir / f"{i:04d}.jpg"
        cv2.imwrite(str(dest), img)
        written.append(dest)
    return image_dir


def run_sparse_reconstruction(workspace: Path, image_paths: list[str], max_edge: int) -> dict:
    binary = discover_colmap()
    if not binary:
        return {
            "ok": False,
            "engine": "COLMAP",
            "reason": "COLMAP_UNAVAILABLE",
            "registered_cameras": 0,
            "num_points": 0,
            "is_dense": False,
        }

    workspace.mkdir(parents=True, exist_ok=True)
    image_dir = prepare_workspace(workspace, image_paths, max_edge)
    database = workspace / "database.db"
    sparse = workspace / "sparse"
    sparse.mkdir(exist_ok=True)
    timeout = max(30, JOB_TIMEOUT_SEC - 20)

    steps = [
        [
            binary,
            "feature_extractor",
            "--database_path",
            str(database),
            "--image_path",
            str(image_dir),
            "--ImageReader.single_camera",
            "1",
        ],
        [
            binary,
            "exhaustive_matcher",
            "--database_path",
            str(database),
        ],
        [
            binary,
            "mapper",
            "--database_path",
            str(database),
            "--image_path",
            str(image_dir),
            "--output_path",
            str(sparse),
        ],
    ]
    logs = []
    for cmd in steps:
        try:
            proc = _run(cmd, timeout=timeout)
        except subprocess.TimeoutExpired:
            return {
                "ok": False,
                "engine": "COLMAP",
                "reason": "COLMAP_TIMEOUT",
                "logs": logs,
                "registered_cameras": 0,
                "num_points": 0,
                "is_dense": False,
            }
        logs.append(
            {
                "cmd": cmd[1],
                "returncode": proc.returncode,
                "stdout_tail": (proc.stdout or "")[-2000:],
                "stderr_tail": (proc.stderr or "")[-2000:],
            }
        )
        if proc.returncode != 0:
            return {
                "ok": False,
                "engine": "COLMAP",
                "reason": f"COLMAP_STEP_FAILED:{cmd[1]}",
                "logs": logs,
                "registered_cameras": 0,
                "num_points": 0,
                "is_dense": False,
            }

    model_dir = _first_model_dir(sparse)
    parsed = parse_text_model(model_dir) if model_dir else None
    if not parsed or parsed.get("num_points", 0) < 10:
        return {
            "ok": False,
            "engine": "COLMAP",
            "reason": "COLMAP_SPARSE_INSUFFICIENT",
            "logs": logs,
            "model_dir": str(model_dir) if model_dir else None,
            "registered_cameras": parsed.get("registered_cameras", 0) if parsed else 0,
            "num_points": parsed.get("num_points", 0) if parsed else 0,
            "is_dense": False,
        }
    parsed.update(
        {
            "ok": True,
            "engine": "COLMAP",
            "reason": None,
            "logs": logs,
            "model_dir": str(model_dir),
            "is_dense": False,
            "dense_reason": "Dense MVS was not run (no GPU / not requested for this job).",
        }
    )
    return parsed


def _first_model_dir(sparse: Path) -> Optional[Path]:
    if (sparse / "points3D.txt").exists() or (sparse / "points3D.bin").exists():
        return sparse
    numbered = sorted([p for p in sparse.iterdir() if p.is_dir()], key=lambda p: p.name)
    return numbered[0] if numbered else None


def parse_text_model(model_dir: Path) -> Optional[dict]:
    """Parse COLMAP TXT model if present; otherwise try converting BIN → TXT."""
    points_txt = model_dir / "points3D.txt"
    images_txt = model_dir / "images.txt"
    cameras_txt = model_dir / "cameras.txt"
    if not points_txt.exists():
        binary = discover_colmap()
        if binary:
            try:
                _run(
                    [
                        binary,
                        "model_converter",
                        "--input_path",
                        str(model_dir),
                        "--output_path",
                        str(model_dir),
                        "--output_type",
                        "TXT",
                    ],
                    timeout=30,
                )
            except Exception as exc:
                logger.warning("COLMAP model_converter failed: %s", exc)
    if not points_txt.exists():
        return None

    points = []
    with points_txt.open("r", encoding="utf-8", errors="ignore") as fh:
        for line in fh:
            if not line.strip() or line.startswith("#"):
                continue
            parts = line.split()
            if len(parts) < 4:
                continue
            points.append([float(parts[1]), float(parts[2]), float(parts[3])])

    cameras = []
    if images_txt.exists():
        with images_txt.open("r", encoding="utf-8", errors="ignore") as fh:
            lines = [ln for ln in fh if ln.strip() and not ln.startswith("#")]
        # COLMAP images.txt: every image is two lines (pose+name, then tracks)
        i = 0
        while i < len(lines):
            parts = lines[i].split()
            if len(parts) >= 10:
                qw, qx, qy, qz = map(float, parts[1:5])
                tx, ty, tz = map(float, parts[5:8])
                name = parts[9]
                cameras.append(
                    {
                        "image_name": name,
                        "qw": qw,
                        "qx": qx,
                        "qy": qy,
                        "qz": qz,
                        "t": [tx, ty, tz],
                    }
                )
            i += 2

    return {
        "points": points,
        "cameras": cameras,
        "registered_cameras": len(cameras),
        "num_points": len(points),
    }

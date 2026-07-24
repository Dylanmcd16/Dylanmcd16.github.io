"""Convert the provided Sentinel-2 Greenfield before/after imagery into aligned
web assets for the before/after comparison slider.

Source imagery (Copernicus Browser exports, provided in public/*.zip):
    before: 2024-05-18  (Greenfield, IA tornado struck 2024-05-21)
    after:  2024-05-23

The two natural-color scenes share the same bounding box, so alignment is a
matter of resampling both to one common pixel grid and identical crop. Output:

    public/data/iowa-severe-weather/greenfield/before.webp
    public/data/iowa-severe-weather/greenfield/after.webp

Run:
    python weather-geospatial/examples/iowa-severe-weather-explorer/scripts/process_greenfield.py
"""

from __future__ import annotations

import io
import zipfile
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parents[4]
PUBLIC = REPO_ROOT / "public"
OUT_DIR = PUBLIC / "data" / "iowa-severe-weather" / "greenfield"

BEFORE = (
    "Browser_images.zip",
    "2024-05-18-00_00_2024-05-18-23_59_Sentinel-2_L2A_Highlight_Optimized_Natural_Color_.tiff",
)
AFTER = (
    "Browser_images (1).zip",
    "2024-05-23-00_00_2024-05-23-23_59_Sentinel-2_L2A_Highlight_Optimized_Natural_Color_.jpg",
)

# Common output grid. 16:9 to match the slider viewport aspect.
TARGET_W, TARGET_H = 1280, 720


def read_zip_bytes(zip_name: str, member: str) -> bytes:
    with zipfile.ZipFile(PUBLIC / zip_name) as zf:
        return zf.read(member)


def load_tiff_rgb(data: bytes) -> Image.Image:
    with rasterio.MemoryFile(data) as mem:
        with mem.open() as src:
            count = src.count
            bands = [src.read(i + 1) for i in range(min(count, 3))]
    arr = np.stack(bands, axis=-1)
    if arr.dtype != np.uint8:
        # Normalize to 0-255 for display.
        arr = arr.astype(np.float32)
        hi = np.percentile(arr, 99) or 1.0
        arr = np.clip(arr / hi * 255.0, 0, 255).astype(np.uint8)
    if arr.shape[-1] == 1:
        arr = np.repeat(arr, 3, axis=-1)
    return Image.fromarray(arr, "RGB")


def load_jpg_rgb(data: bytes) -> Image.Image:
    return Image.open(io.BytesIO(data)).convert("RGB")


def center_crop_to_aspect(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    target_ratio = target_w / target_h
    w, h = img.size
    ratio = w / h
    if ratio > target_ratio:
        new_w = int(h * target_ratio)
        left = (w - new_w) // 2
        img = img.crop((left, 0, left + new_w, h))
    else:
        new_h = int(w / target_ratio)
        top = (h - new_h) // 2
        img = img.crop((0, top, w, top + new_h))
    return img.resize((target_w, target_h), Image.LANCZOS)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    before = load_tiff_rgb(read_zip_bytes(*BEFORE))
    after = load_jpg_rgb(read_zip_bytes(*AFTER))

    before = center_crop_to_aspect(before, TARGET_W, TARGET_H)
    after = center_crop_to_aspect(after, TARGET_W, TARGET_H)

    before.save(OUT_DIR / "before.webp", "WEBP", quality=88)
    after.save(OUT_DIR / "after.webp", "WEBP", quality=88)
    print(f"Wrote {OUT_DIR / 'before.webp'} and after.webp ({TARGET_W}x{TARGET_H})")


if __name__ == "__main__":
    main()

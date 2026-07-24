"""Iowa state boundary: load the polygon and mask rasters to the state.

"The domain is the state of Iowa" — raster fields are clipped to the Iowa
boundary so only the state is shown, and the front-end draws the outline.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

import numpy as np
import requests
from rasterio.features import rasterize
from shapely.geometry import shape
from shapely.ops import unary_union

from .config import Config, Domain
from .grid import domain_transform

IOWA_URL = "https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json"


def iowa_geojson_path(config: Config) -> Path:
    return config.output_root / "iowa.geojson"


@lru_cache(maxsize=1)
def _load_polygon(path_str: str):
    path = Path(path_str)
    if not path.exists():
        # Fetch and cache the Iowa polygon on first use.
        resp = requests.get(IOWA_URL, timeout=60)
        resp.raise_for_status()
        iowa = next(f for f in resp.json()["features"] if f["properties"].get("name") == "Iowa")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps(
                {"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {"name": "Iowa"}, "geometry": iowa["geometry"]}]}
            ),
            encoding="utf-8",
        )
    fc = json.loads(path.read_text(encoding="utf-8"))
    return unary_union([shape(f["geometry"]) for f in fc["features"]])


def iowa_polygon(config: Config):
    return _load_polygon(str(iowa_geojson_path(config)))


def iowa_mask(config: Config, domain: Domain, width: int, height: int) -> np.ndarray:
    """Boolean mask (True inside Iowa) on the given lon/lat grid."""
    geom = iowa_polygon(config)
    transform = domain_transform(domain, width, height)
    mask = rasterize(
        [(geom, 1)],
        out_shape=(height, width),
        transform=transform,
        fill=0,
        dtype="uint8",
        all_touched=True,
    )
    return mask.astype(bool)


def apply_mask(rgba: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """Zero the alpha channel outside the mask."""
    out = rgba.copy()
    out[~mask, 3] = 0
    return out

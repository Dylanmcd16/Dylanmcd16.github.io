"""Base radial velocity from single-site NEXRAD Level II (KDMX by default).

Velocity is radar-relative, so a single central radar is the correct
representation (a "velocity composite" is not physically meaningful). Level II
comes from the Google Cloud public NEXRAD mirror as hourly tar archives; one
download serves every frame in that hour. The lowest Doppler sweep is gridded
onto the Iowa display grid with a range cap so coverage stops where the radar's.
"""

from __future__ import annotations

import io
import re
import tarfile
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import requests
from metpy.io import Level2File
from pyproj import Geod
from scipy.spatial import cKDTree

from .config import Config
from .grid import GRID_H, GRID_W, colorize, save_rgba_webp

GCS = "https://storage.googleapis.com/gcp-public-data-nexrad-l2/{y}/{m:02d}/{d:02d}/{site}/NWS_NEXRAD_NXL2DPBL_{site}_{y}{m:02d}{d:02d}{hh}0000_{y}{m:02d}{d:02d}{hh}5959.tar"

GEOD = Geod(ellps="WGS84")

# Diverging velocity colormap (m/s): inbound green, near-zero gray, outbound red.
VELOCITY = [
    (-40, (0, 255, 0)),
    (-25, (0, 175, 0)),
    (-8, (25, 80, 30)),
    (0, (135, 135, 135)),
    (8, (95, 25, 25)),
    (25, (200, 0, 0)),
    (40, (255, 90, 90)),
]


@dataclass
class RasterRef:
    url: str
    valid_time: datetime
    source_time: datetime
    available: bool


def _hour_tar(site: str, when: datetime) -> list[tuple[datetime, bytes]]:
    url = GCS.format(site=site, y=when.year, m=when.month, d=when.day, hh=when.hour)
    resp = requests.get(url, timeout=180)
    if resp.status_code != 200:
        return []
    volumes: list[tuple[datetime, bytes]] = []
    with tarfile.open(fileobj=io.BytesIO(resp.content)) as tf:
        for member in tf.getmembers():
            if not member.isfile():
                continue
            # e.g. KDMX20200810_170448_V06.ar2v  ->  20200810_170448
            match = re.search(r"(\d{8})_(\d{6})", member.name)
            if not match:
                continue
            dt = datetime.strptime(match.group(1) + match.group(2), "%Y%m%d%H%M%S").replace(
                tzinfo=timezone.utc
            )
            volumes.append((dt, tf.extractfile(member).read()))
    return volumes


def _lowest_velocity_sweep(f: Level2File):
    for sweep in f.sweeps:
        if b"VEL" in sweep[0][4]:
            rays = [r for r in sweep if b"VEL" in r[4]]
            az = np.array([r[0].az_angle for r in rays])
            hdr = rays[0][4][b"VEL"][0]
            rng_km = np.arange(hdr.num_gates) * hdr.gate_width + hdr.first_gate
            vel = np.ma.masked_invalid(np.array([r[4][b"VEL"][1] for r in rays])).filled(np.nan)
            return az, rng_km * 1000.0, vel
    return None


def _grid_volume(config, raw: bytes) -> np.ndarray | None:
    try:
        f = Level2File(io.BytesIO(raw))
    except Exception:
        return None
    if not f.sweeps:
        return None
    site_lat = f.sweeps[0][0][1].lat
    site_lon = f.sweeps[0][0][1].lon
    extracted = _lowest_velocity_sweep(f)
    if extracted is None:
        return None
    az, rng_m, vel = extracted

    az2d, rng2d = np.meshgrid(az, rng_m, indexing="ij")
    n = az2d.size
    lon, lat, _ = GEOD.fwd(
        np.full(n, site_lon), np.full(n, site_lat), az2d.ravel(), rng2d.ravel()
    )
    v = vel.ravel()
    ok = np.isfinite(v)
    pts = np.column_stack([lon[ok], lat[ok]])
    vals = v[ok]
    if pts.shape[0] < 10:
        return None

    d = config.domain
    gx = np.linspace(d.lon_min, d.lon_max, GRID_W, endpoint=False) + (d.lon_max - d.lon_min) / GRID_W / 2
    gy = np.linspace(d.lat_max, d.lat_min, GRID_H, endpoint=False) - (d.lat_max - d.lat_min) / GRID_H / 2
    gxx, gyy = np.meshgrid(gx, gy)

    tree = cKDTree(pts)
    dist, idx = tree.query(np.column_stack([gxx.ravel(), gyy.ravel()]), k=1, distance_upper_bound=0.03)
    grid = np.full(GRID_H * GRID_W, np.nan, dtype=np.float32)
    hit = np.isfinite(dist)
    grid[hit] = vals[idx[hit]]
    return grid.reshape(GRID_H, GRID_W)


def process(config: Config, output_dir: Path, rel_prefix: str) -> list[RasterRef | None]:
    site = config.get("radar", "velocity_site", default="KDMX")
    tol = timedelta(minutes=int(config.get("radar", "velocity_tolerance_minutes", default=6)))
    frames = config.frame_times

    # Load every hour tar the window touches (± tolerance), index all volumes.
    hours = sorted({(ft.replace(minute=0, second=0, microsecond=0) + timedelta(hours=h)) for ft in frames for h in (-1, 0, 1)})
    volumes: list[tuple[datetime, bytes]] = []
    seen_hours: set[datetime] = set()
    for hour in hours:
        if hour in seen_hours:
            continue
        seen_hours.add(hour)
        volumes.extend(_hour_tar(site, hour))
    volumes.sort(key=lambda x: x[0])

    grid_cache: dict[datetime, np.ndarray | None] = {}
    refs: list[RasterRef | None] = []
    for index, frame_time in enumerate(frames):
        # Candidates within tolerance, nearest first; use the first that grids.
        candidates = sorted(
            ((dt, raw) for dt, raw in volumes if abs(dt - frame_time) <= tol),
            key=lambda item: abs(item[0] - frame_time),
        )
        chosen = None
        for dt, raw in candidates:
            if dt not in grid_cache:
                grid_cache[dt] = _grid_volume(config, raw)
            if grid_cache[dt] is not None:
                chosen = (dt, grid_cache[dt])
                break
        if chosen is None:
            refs.append(None)
            continue

        dt, grid = chosen
        rgba = colorize(grid, VELOCITY, alpha=225, floor=-45)
        rel_url = f"{rel_prefix}/velocity-{index:02d}.webp"
        save_rgba_webp(rgba, output_dir / f"velocity-{index:02d}.webp")
        refs.append(RasterRef(url=rel_url, valid_time=frame_time, source_time=dt, available=True))
    return refs

"""Load the event configuration and derive the canonical timeline."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path

import yaml

# Repo root is four levels up from this file:
# .../weather-geospatial/examples/iowa-severe-weather-explorer/src/iowa_severe_weather/config.py
REPO_ROOT = Path(__file__).resolve().parents[5]
EXAMPLE_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG = EXAMPLE_ROOT / "config" / "derecho-2020.yml"


def parse_utc(value: str) -> datetime:
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def central_label(dt: datetime) -> str:
    # CDT = UTC - 5 for this August event (no portable %-I on Windows).
    central = dt - timedelta(hours=5)
    hour12 = central.hour % 12 or 12
    meridiem = "AM" if central.hour < 12 else "PM"
    return f"{hour12}:{central.minute:02d} {meridiem} CDT"


@dataclass(frozen=True)
class Domain:
    lon_min: float
    lon_max: float
    lat_min: float
    lat_max: float

    @property
    def corners(self) -> list[list[float]]:
        # MapLibre image-source order: top-left, top-right, bottom-right, bottom-left.
        return [
            [self.lon_min, self.lat_max],
            [self.lon_max, self.lat_max],
            [self.lon_max, self.lat_min],
            [self.lon_min, self.lat_min],
        ]


@dataclass
class Config:
    raw: dict
    path: Path

    @property
    def output_root(self) -> Path:
        return REPO_ROOT / self.raw["output_root"]

    @property
    def domain(self) -> Domain:
        d = self.raw["domain"]
        return Domain(d["lon_min"], d["lon_max"], d["lat_min"], d["lat_max"])

    @property
    def frame_times(self) -> list[datetime]:
        t = self.raw["timeline"]
        start = parse_utc(t["start"])
        end = parse_utc(t["end"])
        step = timedelta(minutes=int(t["step_minutes"]))
        frames: list[datetime] = []
        current = start
        while current <= end:
            frames.append(current)
            current += step
        return frames

    def get(self, *keys, default=None):
        node = self.raw
        for key in keys:
            if not isinstance(node, dict) or key not in node:
                return default
            node = node[key]
        return node


def load_config(path: Path | None = None) -> Config:
    config_path = path or DEFAULT_CONFIG
    raw = yaml.safe_load(config_path.read_text(encoding="utf-8"))
    return Config(raw=raw, path=config_path)


def iso_z(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

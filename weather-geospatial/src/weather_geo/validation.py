"""Schema, timestamp, and physical-range quality control.

These checks are the part of a geospatial pipeline that separates an engineer
from someone following a mapping tutorial: they catch reversed lon/lat,
out-of-range values, and malformed timestamps *before* the data is joined,
reprojected, and published.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import pandas as pd

# Physically plausible bounds. Values outside are flagged, not silently kept.
PHYSICAL_RANGES: dict[str, tuple[float, float]] = {
    "temperature_c": (-90.0, 60.0),
    "dewpoint_c": (-90.0, 40.0),
    "wind_speed_mps": (0.0, 120.0),
    "wind_direction_deg": (0.0, 360.0),
    "pressure_hpa": (850.0, 1090.0),
    "precip_mm": (0.0, 2000.0),
    "longitude": (-180.0, 180.0),
    "latitude": (-90.0, 90.0),
}


@dataclass
class ValidationReport:
    """Result of validating a DataFrame. Never raises on data problems;
    problems are recorded so the caller can decide what to drop or keep."""

    n_input: int
    missing_columns: list[str] = field(default_factory=list)
    out_of_range: dict[str, int] = field(default_factory=dict)
    n_bad_timestamps: int = 0
    n_missing_coords: int = 0

    @property
    def ok(self) -> bool:
        return not self.missing_columns

    def as_dict(self) -> dict:
        return {
            "n_input": self.n_input,
            "missing_columns": self.missing_columns,
            "out_of_range": self.out_of_range,
            "n_bad_timestamps": self.n_bad_timestamps,
            "n_missing_coords": self.n_missing_coords,
            "ok": self.ok,
        }


def check_required_columns(df: pd.DataFrame, required: list[str]) -> list[str]:
    """Return the required columns that are absent from ``df``."""
    return [c for c in required if c not in df.columns]


def flag_out_of_range(df: pd.DataFrame) -> dict[str, int]:
    """Count values outside :data:`PHYSICAL_RANGES` for each known column.

    NaN values are treated as missing, not out of range.
    """
    counts: dict[str, int] = {}
    for col, (lo, hi) in PHYSICAL_RANGES.items():
        if col not in df.columns:
            continue
        series = pd.to_numeric(df[col], errors="coerce")
        bad = ((series < lo) | (series > hi)).sum()
        if bad:
            counts[col] = int(bad)
    return counts


def parse_timestamps(df: pd.DataFrame, column: str, utc: bool = True) -> pd.Series:
    """Parse a timestamp column, coercing unparseable values to NaT.

    Returns a tz-aware (UTC) datetime Series. The caller can count NaT to know
    how many rows had bad timestamps.
    """
    return pd.to_datetime(df[column], errors="coerce", utc=utc)


def validate_observations(
    df: pd.DataFrame,
    required: list[str],
    timestamp_col: str | None = "timestamp",
) -> ValidationReport:
    """Run the standard observation quality-control suite and report findings."""
    report = ValidationReport(n_input=len(df))
    report.missing_columns = check_required_columns(df, required)
    if not report.missing_columns:
        report.out_of_range = flag_out_of_range(df)
        if {"longitude", "latitude"} <= set(df.columns):
            lon = pd.to_numeric(df["longitude"], errors="coerce")
            lat = pd.to_numeric(df["latitude"], errors="coerce")
            report.n_missing_coords = int((lon.isna() | lat.isna()).sum())
        if timestamp_col and timestamp_col in df.columns:
            ts = parse_timestamps(df, timestamp_col)
            report.n_bad_timestamps = int(ts.isna().sum())
    return report


def looks_like_swapped_lonlat(df: pd.DataFrame) -> bool:
    """Heuristic: warn when longitude/latitude appear reversed.

    Latitude must be within [-90, 90]; if the ``latitude`` column contains
    values beyond that but the ``longitude`` column does not, the columns were
    very likely swapped upstream.
    """
    if not {"longitude", "latitude"} <= set(df.columns):
        return False
    lat = pd.to_numeric(df["latitude"], errors="coerce")
    lon = pd.to_numeric(df["longitude"], errors="coerce")
    lat_impossible = (lat.abs() > 90).any()
    lon_fits_lat = lon.abs().max() <= 90 if lon.notna().any() else False
    return bool(lat_impossible and lon_fits_lat)

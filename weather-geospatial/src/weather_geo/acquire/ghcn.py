"""Live GHCN-Daily climate data (NOAA NCEI).

Source: https://www.ncei.noaa.gov/data/global-historical-climatology-network-daily/access/{ID}.csv

Per-station daily files carry TMAX/TMIN in tenths of degrees Celsius and PRCP in
tenths of millimetres. This module aggregates them to per-station, per-year
monthly means (TAVG = mean of daily (TMAX+TMIN)/2) and monthly precipitation
totals, in the schema consumed by the climate-anomaly workflow:
``station_id, longitude, latitude, year, month, tavg_c, precip_mm``.
"""

from __future__ import annotations

import io

import pandas as pd

from .http import get_text

BASE = "https://www.ncei.noaa.gov/data/global-historical-climatology-network-daily/access"

# Iowa first-order (USW) stations with long records, spanning the demo AOI.
IOWA_GHCN = [
    "USW00014933",  # Des Moines Intl
    "USW00094910",  # Waterloo Muni
    "USW00014943",  # Sioux City
    "USW00014940",  # Mason City
    "USW00094908",  # Dubuque
    "USW00014931",  # Burlington
]

_COLS = ["STATION", "DATE", "LATITUDE", "LONGITUDE", "TMAX", "TMIN", "PRCP"]


def fetch_station_monthly(station_id: str, month: int, use_cache: bool = True) -> pd.DataFrame:
    """Fetch one GHCN station and reduce to per-year monthly values for ``month``."""
    text = get_text(f"{BASE}/{station_id}.csv", use_cache=use_cache)
    df = pd.read_csv(io.StringIO(text), usecols=_COLS, low_memory=False)
    df["DATE"] = pd.to_datetime(df["DATE"], errors="coerce")
    df = df[df["DATE"].dt.month == month].copy()
    if df.empty:
        return pd.DataFrame()
    df["year"] = df["DATE"].dt.year
    for c in ("TMAX", "TMIN", "PRCP"):
        df[c] = pd.to_numeric(df[c], errors="coerce")
    df["tavg_c_daily"] = (df["TMAX"] + df["TMIN"]) / 2.0 / 10.0  # tenths degC -> degC
    df["precip_mm_daily"] = df["PRCP"] / 10.0  # tenths mm -> mm

    grouped = (
        df.groupby("year")
        .agg(
            tavg_c=("tavg_c_daily", "mean"),
            precip_mm=("precip_mm_daily", "sum"),
            n_days=("tavg_c_daily", "count"),
            longitude=("LONGITUDE", "first"),
            latitude=("LATITUDE", "first"),
        )
        .reset_index()
    )
    # Require reasonably complete months so a partial month is not a "normal".
    grouped = grouped[grouped["n_days"] >= 20]
    grouped["station_id"] = station_id
    grouped["month"] = month
    grouped["tavg_c"] = grouped["tavg_c"].round(2)
    grouped["precip_mm"] = grouped["precip_mm"].round(1)
    return grouped[["station_id", "longitude", "latitude", "year", "month", "tavg_c", "precip_mm"]]


def fetch_monthly(
    month: int,
    stations: list[str] | None = None,
    use_cache: bool = True,
) -> pd.DataFrame:
    """Fetch monthly values for several stations; stations that fail are skipped."""
    stations = stations or IOWA_GHCN
    frames = []
    for sid in stations:
        try:
            part = fetch_station_monthly(sid, month, use_cache=use_cache)
            if not part.empty:
                frames.append(part)
        except Exception:  # noqa: BLE001 - one bad station should not sink the run
            continue
    if not frames:
        return pd.DataFrame(
            columns=["station_id", "longitude", "latitude", "year", "month", "tavg_c", "precip_mm"]
        )
    return pd.concat(frames, ignore_index=True)

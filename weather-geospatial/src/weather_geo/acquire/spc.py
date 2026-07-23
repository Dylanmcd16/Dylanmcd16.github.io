"""Live SPC storm reports (NOAA Storm Prediction Center).

Source: https://www.spc.noaa.gov/climo/reports/{yymmdd}_rpts_{torn,hail,wind}.csv

SPC daily report files use the *convective day* convention: the filename date is
the period starting 12Z that day and running to 12Z the next day. Report times
are UTC HHMM, so 1200-2359 belong to the filename date and 0000-1159 to the next
calendar day. This module reconstructs full UTC timestamps accordingly.

Returns a DataFrame in the schema consumed by the severe-weather workflows:
``report_id, event_type, timestamp, longitude, latitude, magnitude, units, office``.
"""

from __future__ import annotations

import io
import re
from datetime import date, datetime, timedelta, timezone

import pandas as pd

from .http import get_text

BASE = "https://www.spc.noaa.gov/climo/reports"
_OFFICE_RE = re.compile(r"\(([A-Z]{3})\)\s*$")


def _timestamp(convective_day: date, hhmm: str) -> datetime | None:
    hhmm = str(hhmm).strip().zfill(4)
    if not hhmm.isdigit() or len(hhmm) != 4:
        return None
    hh, mm = int(hhmm[:2]), int(hhmm[2:])
    if not (0 <= hh <= 23 and 0 <= mm <= 59):
        return None
    day = convective_day if hh >= 12 else convective_day + timedelta(days=1)
    return datetime(day.year, day.month, day.day, hh, mm, tzinfo=timezone.utc)


def _office(comment: str) -> str | None:
    m = _OFFICE_RE.search(str(comment or ""))
    return m.group(1) if m else None


def fetch_storm_reports(day: date, use_cache: bool = True) -> pd.DataFrame:
    """Fetch and normalize SPC tornado/hail/wind reports for one convective day."""
    yymmdd = day.strftime("%y%m%d")
    frames = []
    for kind, mag_col in (("torn", "F_Scale"), ("hail", "Size"), ("wind", "Speed")):
        url = f"{BASE}/{yymmdd}_rpts_{kind}.csv"
        text = get_text(url, use_cache=use_cache)
        raw = pd.read_csv(io.StringIO(text))
        # Skip any repeated header rows SPC occasionally embeds.
        raw = raw[raw["Lat"] != "Lat"].copy()
        if raw.empty:
            continue
        out = pd.DataFrame(
            {
                "event_type": {"torn": "tornado", "hail": "hail", "wind": "wind"}[kind],
                "timestamp": [_timestamp(day, t) for t in raw["Time"]],
                "latitude": pd.to_numeric(raw["Lat"], errors="coerce"),
                "longitude": pd.to_numeric(raw["Lon"], errors="coerce"),
                "office": [_office(c) for c in raw["Comments"]],
            }
        )
        mag = raw[mag_col]
        if kind == "hail":  # hundredths of an inch -> inches
            out["magnitude"] = pd.to_numeric(mag, errors="coerce") / 100.0
            out["units"] = "inches"
        elif kind == "wind":  # knots ("UNK" -> NaN)
            out["magnitude"] = pd.to_numeric(mag, errors="coerce")
            out["units"] = "kt"
        else:  # tornado EF/F rating kept as text
            out["magnitude"] = float("nan")
            out["units"] = "EF"
            out["rating"] = mag.astype(str)
        frames.append(out)

    if not frames:
        return pd.DataFrame(
            columns=[
                "report_id",
                "event_type",
                "timestamp",
                "longitude",
                "latitude",
                "magnitude",
                "units",
                "office",
            ]
        )
    df = pd.concat(frames, ignore_index=True)
    df.insert(0, "report_id", range(1, len(df) + 1))
    return df


def fetch_latest(days_back: int = 2, use_cache: bool = True) -> tuple[date, pd.DataFrame]:
    """Fetch the most recent convective day (default: 2 days ago) with reports."""
    day = datetime.now(timezone.utc).date() - timedelta(days=days_back)
    return day, fetch_storm_reports(day, use_cache=use_cache)

"""Live surface observations from the Iowa Environmental Mesonet (IEM) ASOS API.

Source: https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py

Returns a DataFrame in the schema consumed by the surface-observation workflows:
``station_id, timestamp, longitude, latitude, temperature_f, dewpoint_f,
wind_speed_kt, wind_direction_deg, pressure_hpa, precip_in``.

For each station the observation nearest the requested valid time that has a
temperature is selected (ASOS 5-minute rows are sparse; the routine METAR near
:53 carries the full payload).
"""

from __future__ import annotations

import io
from datetime import datetime, timedelta, timezone

import pandas as pd

from .http import SESSION, cache_path

ENDPOINT = "https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py"

# Iowa ASOS stations spanning the demo AOI (IEM 3-letter identifiers).
IOWA_STATIONS = ["DSM", "CID", "ALO", "MCW", "SUX", "DBQ", "OTM", "EST", "BRL", "FOD"]


def _altimeter_to_hpa(alti_inhg: pd.Series) -> pd.Series:
    return pd.to_numeric(alti_inhg, errors="coerce") * 33.8639


def fetch_surface_obs(
    valid: datetime,
    stations: list[str] | None = None,
    window_min: int = 45,
    use_cache: bool = True,
) -> pd.DataFrame:
    """Fetch ASOS observations near ``valid`` (UTC) for the given stations."""
    stations = stations or IOWA_STATIONS
    if valid.tzinfo is None:
        valid = valid.replace(tzinfo=timezone.utc)
    start = valid - timedelta(minutes=window_min)
    end = valid + timedelta(minutes=window_min)

    params = [("station", s) for s in stations]
    params += [("data", d) for d in ("tmpf", "dwpf", "drct", "sknt", "mslp", "alti", "p01i")]
    params += [
        ("year1", start.year),
        ("month1", start.month),
        ("day1", start.day),
        ("hour1", start.hour),
        ("minute1", start.minute),
        ("year2", end.year),
        ("month2", end.month),
        ("day2", end.day),
        ("hour2", end.hour),
        ("minute2", end.minute),
        ("tz", "Etc/UTC"),
        ("format", "onlycomma"),
        ("latlon", "yes"),
        ("missing", "empty"),
        ("trace", "empty"),
    ]

    url_key = ENDPOINT + "?" + "&".join(f"{k}={v}" for k, v in params)
    cp = cache_path(url_key, ".csv")
    if use_cache and cp.exists():
        text = cp.read_text(encoding="utf-8")
    else:
        resp = SESSION.get(ENDPOINT, params=params, timeout=90)
        resp.raise_for_status()
        text = resp.text
        cp.write_text(text, encoding="utf-8")

    raw = pd.read_csv(io.StringIO(text))
    if raw.empty:
        return _empty()
    raw["valid"] = pd.to_datetime(raw["valid"], utc=True, errors="coerce")
    raw["tmpf"] = pd.to_numeric(raw["tmpf"], errors="coerce")

    target = pd.Timestamp(valid)
    rows = []
    for sid, grp in raw.groupby("station"):
        with_temp = grp[grp["tmpf"].notna()]
        pick_from = with_temp if not with_temp.empty else grp
        pick = pick_from.iloc[(pick_from["valid"] - target).abs().argmin()]
        mslp = pd.to_numeric(pd.Series([pick.get("mslp")]), errors="coerce").iloc[0]
        if pd.isna(mslp):
            mslp = _altimeter_to_hpa(pd.Series([pick.get("alti")])).iloc[0]
        rows.append(
            {
                "station_id": sid,
                "timestamp": pick["valid"],
                "longitude": pd.to_numeric(pd.Series([pick["lon"]]), errors="coerce").iloc[0],
                "latitude": pd.to_numeric(pd.Series([pick["lat"]]), errors="coerce").iloc[0],
                "temperature_f": pick["tmpf"],
                "dewpoint_f": pd.to_numeric(pd.Series([pick.get("dwpf")]), errors="coerce").iloc[0],
                "wind_speed_kt": pd.to_numeric(pd.Series([pick.get("sknt")]), errors="coerce").iloc[
                    0
                ],
                "wind_direction_deg": pd.to_numeric(
                    pd.Series([pick.get("drct")]), errors="coerce"
                ).iloc[0],
                "pressure_hpa": round(float(mslp), 1) if pd.notna(mslp) else pd.NA,
                "precip_in": pd.to_numeric(pd.Series([pick.get("p01i")]), errors="coerce").iloc[0],
            }
        )
    return pd.DataFrame(rows)


def fetch_timeseries(
    start: datetime,
    end: datetime,
    value_col: str = "sknt",
    stations: list[str] | None = None,
    use_cache: bool = True,
) -> pd.DataFrame:
    """All ASOS obs in a time window as candidate observations for matching.

    Returns long-form ``station_id, timestamp, longitude, latitude, value`` where
    ``value`` is the requested raw ASOS field (default wind speed in knots). Used
    by the report-to-station matching workflow so reports across a convective day
    can be matched to observations across that same day.
    """
    stations = stations or IOWA_STATIONS
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    if end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)
    params = [("station", s) for s in stations]
    params += [("data", value_col)]
    params += [
        ("year1", start.year),
        ("month1", start.month),
        ("day1", start.day),
        ("hour1", start.hour),
        ("minute1", start.minute),
        ("year2", end.year),
        ("month2", end.month),
        ("day2", end.day),
        ("hour2", end.hour),
        ("minute2", end.minute),
        ("tz", "Etc/UTC"),
        ("format", "onlycomma"),
        ("latlon", "yes"),
        ("missing", "empty"),
        ("trace", "empty"),
    ]
    url_key = ENDPOINT + "?ts&" + "&".join(f"{k}={v}" for k, v in params)
    cp = cache_path(url_key, ".csv")
    if use_cache and cp.exists():
        text = cp.read_text(encoding="utf-8")
    else:
        resp = SESSION.get(ENDPOINT, params=params, timeout=120)
        resp.raise_for_status()
        text = resp.text
        cp.write_text(text, encoding="utf-8")

    raw = pd.read_csv(io.StringIO(text))
    if raw.empty:
        return pd.DataFrame(columns=["station_id", "timestamp", "longitude", "latitude", "value"])
    out = pd.DataFrame(
        {
            "station_id": raw["station"],
            "timestamp": pd.to_datetime(raw["valid"], utc=True, errors="coerce"),
            "longitude": pd.to_numeric(raw["lon"], errors="coerce"),
            "latitude": pd.to_numeric(raw["lat"], errors="coerce"),
            "value": pd.to_numeric(raw[value_col], errors="coerce"),
        }
    )
    return out.dropna(subset=["timestamp", "value"]).reset_index(drop=True)


def _empty() -> pd.DataFrame:
    return pd.DataFrame(
        columns=[
            "station_id",
            "timestamp",
            "longitude",
            "latitude",
            "temperature_f",
            "dewpoint_f",
            "wind_speed_kt",
            "wind_direction_deg",
            "pressure_hpa",
            "precip_in",
        ]
    )


def fetch_recent(hours_back: int = 3, **kw) -> tuple[datetime, pd.DataFrame]:
    """Convenience: fetch observations from a few hours ago (data settling lag)."""
    valid = datetime.now(timezone.utc).replace(minute=53, second=0, microsecond=0) - timedelta(
        hours=hours_back
    )
    return valid, fetch_surface_obs(valid, **kw)

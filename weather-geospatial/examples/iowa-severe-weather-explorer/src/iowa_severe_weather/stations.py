"""Surface observations from the IEM ASOS/AWOS archive, matched to frames.

Produces two artifacts:
  - stations.geojson : one feature per station per timeline frame (nearest obs).
  - stations-series.json : full event time series per station, for popup charts.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

import pandas as pd
import requests

from .config import Config, parse_utc

NETWORK_GEOJSON = "https://mesonet.agron.iastate.edu/geojson/network/{network}.geojson"
ASOS_URL = "https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py"

KTS_TO_MPH = 1.15078


@dataclass
class Station:
    sid: str
    name: str
    lon: float
    lat: float


def _stations_in_domain(config: Config) -> list[Station]:
    d = config.domain
    buffer = 0.4  # include a thin ring of border stations
    stations: dict[str, Station] = {}
    for network in config.get("stations", "networks", default=["IA_ASOS"]):
        try:
            resp = requests.get(NETWORK_GEOJSON.format(network=network), timeout=60)
            resp.raise_for_status()
        except requests.RequestException:
            continue
        for feature in resp.json().get("features", []):
            lon, lat = feature["geometry"]["coordinates"][:2]
            if not (d.lon_min - buffer <= lon <= d.lon_max + buffer):
                continue
            if not (d.lat_min - buffer <= lat <= d.lat_max + buffer):
                continue
            sid = feature["id"]
            stations[sid] = Station(sid, feature["properties"].get("sname", sid), lon, lat)
    return list(stations.values())


def _download_observations(config: Config, stations: list[Station]) -> pd.DataFrame:
    frames = config.frame_times
    sts, ets = frames[0], frames[-1] + timedelta(minutes=15)
    params = [
        ("data", "tmpf"),
        ("data", "dwpf"),
        ("data", "drct"),
        ("data", "sknt"),
        ("data", "gust"),
        ("tz", "UTC"),
        ("format", "onlycomma"),
        ("latlon", "yes"),
        ("missing", "empty"),
        ("sts", sts.strftime("%Y-%m-%dT%H:%MZ")),
        ("ets", ets.strftime("%Y-%m-%dT%H:%MZ")),
    ]
    params += [("station", s.sid) for s in stations]

    resp = requests.get(ASOS_URL, params=params, timeout=180)
    resp.raise_for_status()
    from io import StringIO

    df = pd.read_csv(StringIO(resp.text))
    if df.empty:
        return df
    df["valid"] = pd.to_datetime(df["valid"], utc=True, errors="coerce")
    for col in ["tmpf", "dwpf", "drct", "sknt", "gust"]:
        df[col] = pd.to_numeric(df.get(col), errors="coerce")
    df["wind_mph"] = df["sknt"] * KTS_TO_MPH
    df["gust_mph"] = df["gust"] * KTS_TO_MPH
    return df.dropna(subset=["valid"])


def _round_or_none(value) -> int | None:
    return None if pd.isna(value) else int(round(value))


def build(config: Config) -> tuple[dict, dict]:
    stations = _stations_in_domain(config)
    frames = config.frame_times
    by_id = {s.sid: s for s in stations}

    df = _download_observations(config, stations)

    max_tol = timedelta(minutes=int(config.get("stations", "max_tolerance_minutes", default=7)))
    stale_after = timedelta(minutes=int(config.get("stations", "stale_after_minutes", default=10)))

    features: list[dict] = []
    if not df.empty:
        for frame_index, frame_time in enumerate(frames):
            ts = pd.Timestamp(frame_time)
            window = df[(df["valid"] - ts).abs() <= max_tol].copy()
            if window.empty:
                continue
            window["delta"] = (window["valid"] - ts).abs()
            nearest = window.sort_values(["station", "delta"]).drop_duplicates("station", keep="first")

            for _, row in nearest.iterrows():
                station = by_id.get(row["station"])
                if station is None:
                    continue
                obs_time: datetime = row["valid"].to_pydatetime()
                age_min = round(row["delta"].total_seconds() / 60, 1)
                temp = _round_or_none(row["tmpf"])
                dew = _round_or_none(row["dwpf"])
                wind = _round_or_none(row["wind_mph"])
                gust = _round_or_none(row["gust_mph"])
                wind_from = _round_or_none(row["drct"])
                features.append(
                    {
                        "type": "Feature",
                        "geometry": {"type": "Point", "coordinates": [station.lon, station.lat]},
                        "properties": {
                            "observation_id": f"{station.sid}-{frame_index}",
                            "station_id": station.sid,
                            "station_name": station.name,
                            "frame_index": frame_index,
                            "observation_time_ms": int(obs_time.timestamp() * 1000),
                            "observation_time_utc": obs_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                            "age_minutes": age_min,
                            "stale": (ts.to_pydatetime() - obs_time) > stale_after,
                            "temperature_f": temp,
                            "dewpoint_f": dew,
                            "wind_speed_mph": wind,
                            "wind_gust_mph": gust,
                            "wind_from_degrees": wind_from,
                            "wind_to_degrees": None if wind_from is None else (wind_from + 180) % 360,
                            "temp_label": "" if temp is None else f"{temp}°",
                            "dewpoint_label": "" if dew is None else f"{dew}°",
                            "wind_label": "" if wind is None else f"{wind}",
                            "gust_label": "" if not gust else f"G{gust}",
                        },
                    }
                )

    series = _build_series(df, by_id)
    return {"type": "FeatureCollection", "features": features}, series


def _build_series(df: pd.DataFrame, by_id: dict[str, Station]) -> dict:
    series: dict[str, dict] = {}
    if df.empty:
        return series
    for sid, group in df.sort_values("valid").groupby("station"):
        station = by_id.get(sid)
        if station is None:
            continue
        series[sid] = {
            "name": station.name,
            "times": [t.strftime("%Y-%m-%dT%H:%M:%SZ") for t in group["valid"]],
            "temperature_f": [None if pd.isna(v) else round(float(v), 1) for v in group["tmpf"]],
            "dewpoint_f": [None if pd.isna(v) else round(float(v), 1) for v in group["dwpf"]],
            "wind_mph": [None if pd.isna(v) else round(float(v), 1) for v in group["wind_mph"]],
            "gust_mph": [None if pd.isna(v) else round(float(v), 1) for v in group["gust_mph"]],
        }
    return series

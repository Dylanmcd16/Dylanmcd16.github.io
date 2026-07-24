"""Storm reports from the IEM Local Storm Report (LSR) archive."""

from __future__ import annotations

from datetime import datetime

import requests

from .config import Config, parse_utc

LSR_URL = "https://mesonet.agron.iastate.edu/geojson/lsr.geojson"

# IEM LSR single-letter type -> our front-end event_type.
_TYPE_MAP = {
    "T": "tornado",
    "H": "hail",
    "D": "wind_damage",
    "G": "wind",  # gust; refined to measured/estimated below
    "F": "wind_damage",  # flash flood downbursts occasionally coded; treat as damage-adjacent
}


def _event_type(code: str, qualifier: str | None) -> str:
    if code == "G":
        return "measured_wind" if qualifier == "M" else "estimated_wind"
    return _TYPE_MAP.get(code, "other")


def _to_float(value) -> float | None:
    try:
        if value in (None, ""):
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def fetch(config: Config) -> dict:
    frames = config.frame_times
    sts = frames[0]
    ets = frames[-1]
    states = config.get("reports", "states", default=["IA"])

    params = {
        "sts": sts.strftime("%Y-%m-%dT%H:%MZ"),
        "ets": ets.strftime("%Y-%m-%dT%H:%MZ"),
        "states": ",".join(states),
    }
    response = requests.get(LSR_URL, params=params, timeout=60)
    response.raise_for_status()
    raw = response.json()

    features: list[dict] = []
    for index, feature in enumerate(raw.get("features", [])):
        props = feature.get("properties", {})
        geom = feature.get("geometry")
        if not geom or geom.get("type") != "Point":
            continue

        valid: datetime = parse_utc(props["valid"])
        code = props.get("type", "")
        qualifier = props.get("qualifier")
        event_type = _event_type(code, qualifier)
        magnitude = _to_float(props.get("magnitude"))
        unit = (props.get("unit") or "").lower() or (
            "mph" if code == "G" else "in" if code == "H" else None
        )
        remark = props.get("remark") or ""
        city = props.get("city") or ""
        county = props.get("county") or ""
        state = props.get("st") or props.get("state") or ""

        features.append(
            {
                "type": "Feature",
                "geometry": geom,
                "properties": {
                    "report_id": f"lsr-{index:04d}",
                    "event_time_ms": int(valid.timestamp() * 1000),
                    "event_time_utc": valid.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "event_type": event_type,
                    "magnitude": magnitude,
                    "magnitude_units": unit if magnitude is not None else None,
                    "measured": qualifier == "M",
                    "source": (props.get("source") or "").title() or "Unknown",
                    "location": ", ".join(part for part in [city, f"{county} Co", state] if part),
                    "remarks": remark,
                    "delayed_report": "ESTIMATED" in remark.upper() and "TIME" in remark.upper(),
                },
            }
        )

    return {"type": "FeatureCollection", "features": features}

"""Post-event damage assessments from the NWS Damage Assessment Toolkit (DAT).

Real surveyed products from NOAA/NWS damage surveys: damage points, tornado /
damage track lines, and damage polygons, queried from the public DAT ArcGIS
FeatureServer for the event date and domain. These were produced after the
event and must never be shown as real-time information.
"""

from __future__ import annotations

import re
from datetime import timedelta

import requests

from .config import Config

# Representative wind speeds (mph) for EF ratings, used only when the survey
# text itself doesn't state a speed.
EF_WIND_MPH = {"EF0": 75, "EF1": 95, "EF2": 120, "EF3": 150, "EF4": 180, "EF5": 210}


def estimate_wind_mph(windspeed, comments: str, rating: str) -> int | None:
    """Best available wind estimate: explicit field, then numbers in the survey
    comments (max of e.g. '60-70mph', '100+'), then the EF-scale midpoint."""
    try:
        if windspeed not in (None, ""):
            return int(round(float(windspeed)))
    except (TypeError, ValueError):
        pass
    numbers = [int(n) for n in re.findall(r"\b(\d{2,3})\s*(?:-|to|\+|mph|MPH)?", comments or "")]
    plausible = [n for n in numbers if 40 <= n <= 250]
    if plausible:
        return max(plausible)
    return EF_WIND_MPH.get((rating or "").upper())

DAT_BASE = (
    "https://services.dat.noaa.gov/arcgis/rest/services/"
    "nws_damageassessmenttoolkit/DamageViewer/FeatureServer"
)

# DAT layer ids -> our assessment kind.
LAYERS = {
    0: "damage_point",
    1: "damage_track",
    2: "damage_polygon",
}

KEEP_FIELDS = [
    "stormdate",
    "surveydate",
    "efscale",
    "damage_txt",
    "dod_txt",
    "windspeed",
    "office",
    "comments",
]


def _query_layer(layer_id: int, where: str, bbox: str) -> list[dict]:
    params = {
        "f": "geojson",
        "where": where,
        "geometry": bbox,
        "geometryType": "esriGeometryEnvelope",
        "inSR": "4326",
        "spatialRel": "esriSpatialRelIntersects",
        # Not every DAT layer carries every field; ask for all and pick later.
        "outFields": "*",
        "outSR": "4326",
    }
    resp = requests.get(f"{DAT_BASE}/{layer_id}/query", params=params, timeout=120)
    resp.raise_for_status()
    payload = resp.json()
    if "features" not in payload:
        raise RuntimeError(f"DAT layer {layer_id} query failed: {payload}")
    return payload["features"]


def build(config: Config) -> dict:
    frames = config.frame_times
    day_start = frames[0].replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = day_start + timedelta(days=1)
    where = (
        f"stormdate >= TIMESTAMP '{day_start:%Y-%m-%d %H:%M:%S}' "
        f"AND stormdate < TIMESTAMP '{day_end:%Y-%m-%d %H:%M:%S}'"
    )
    d = config.domain
    bbox = f"{d.lon_min},{d.lat_min},{d.lon_max},{d.lat_max}"

    features: list[dict] = []
    for layer_id, kind in LAYERS.items():
        for i, feature in enumerate(_query_layer(layer_id, where, bbox)):
            props = feature.get("properties", {})
            rating = props.get("efscale") or "Unrated"
            wind = estimate_wind_mph(
                props.get("windspeed"), props.get("comments") or "", rating
            )
            features.append(
                {
                    "type": "Feature",
                    "geometry": feature["geometry"],
                    "properties": {
                        "assessment_id": f"dat-{layer_id}-{i:03d}",
                        "kind": kind,
                        "rating": rating,
                        "windspeed_mph": wind,
                        "office": props.get("office"),
                        "damage": props.get("damage_txt") or props.get("dod_txt"),
                        "survey": f"NWS {props.get('office') or ''} damage survey (DAT)".strip(),
                        "comments": props.get("comments") or "",
                        "note": "Post-event analysis. Not available during the live event.",
                    },
                }
            )

    return {"type": "FeatureCollection", "features": features}

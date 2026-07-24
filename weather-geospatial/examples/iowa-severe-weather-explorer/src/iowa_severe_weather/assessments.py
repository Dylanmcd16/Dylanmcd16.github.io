"""Post-event damage assessment layer.

These features are derived from the complete storm-report set *after* the event
and must never be shown as real-time information. Here we build an estimated
severe-wind impact swath (the footprint of severe wind reports) plus the tornado
report locations, both explicitly labeled as post-event analysis.
"""

from __future__ import annotations

from shapely.geometry import MultiPoint, mapping, shape

from .config import Config
from . import reports as reports_mod

SEVERE_WIND_MPH = 58.0


def build(config: Config) -> dict:
    collection = reports_mod.fetch(config)
    features = collection["features"]

    wind_points = []
    tornado_features = []
    for feature in features:
        props = feature["properties"]
        etype = props["event_type"]
        coords = feature["geometry"]["coordinates"]
        if etype == "tornado":
            tornado_features.append(
                {
                    "type": "Feature",
                    "geometry": feature["geometry"],
                    "properties": {
                        "assessment_id": f"tor-{props['report_id']}",
                        "kind": "tornado_report",
                        "rating": "surveyed track",
                        "survey": "Derived from tornado storm reports",
                        "note": "Post-event analysis. Not available during the live event.",
                    },
                }
            )
        elif etype in ("measured_wind", "estimated_wind", "wind_damage"):
            magnitude = props.get("magnitude")
            if etype == "wind_damage" or (magnitude is not None and magnitude >= SEVERE_WIND_MPH):
                wind_points.append((coords[0], coords[1]))

    out_features: list[dict] = []
    if len(wind_points) >= 3:
        hull = MultiPoint(wind_points).convex_hull.buffer(0.15)
        out_features.append(
            {
                "type": "Feature",
                "geometry": mapping(shape(hull)),
                "properties": {
                    "assessment_id": "estimated-wind-swath",
                    "kind": "estimated_wind_swath",
                    "rating": f"{len(wind_points)} severe wind reports",
                    "survey": "Estimated wind-impact area derived from the full storm-report set",
                    "note": "Post-event analysis. Not available during the live event.",
                },
            }
        )
    out_features.extend(tornado_features)

    return {"type": "FeatureCollection", "features": out_features}

"""NWS storm-based warning polygons from the IEM archive (VTEC / SBW)."""

from __future__ import annotations

import tempfile
from datetime import datetime, timezone
from pathlib import Path

import geopandas as gpd
import requests

from .config import Config

WATCHWARN_URL = "https://mesonet.agron.iastate.edu/cgi-bin/request/gis/watchwarn.py"

_PHENOMENA = {"SV", "TO"}
_HEADLINE = {"SV": "Severe Thunderstorm Warning", "TO": "Tornado Warning"}


def _parse_iem_time(value: str) -> datetime:
    # IEM wwa times look like "202008101615" (UTC, minute precision).
    text = str(value).strip()
    return datetime.strptime(text[:12], "%Y%m%d%H%M").replace(tzinfo=timezone.utc)


def fetch(config: Config) -> dict:
    frames = config.frame_times
    params = {
        "sts": frames[0].strftime("%Y-%m-%dT%H:%MZ"),
        "ets": frames[-1].strftime("%Y-%m-%dT%H:%MZ"),
    }
    response = requests.get(WATCHWARN_URL, params=params, timeout=120)
    response.raise_for_status()

    with tempfile.TemporaryDirectory() as tmp:
        zip_path = Path(tmp) / "wwa.zip"
        zip_path.write_bytes(response.content)
        gdf = gpd.read_file(f"zip://{zip_path}")

        gdf = gdf.to_crs(4326)
        # Storm-based (polygon) severe-thunderstorm and tornado warnings only.
        if "GTYPE" in gdf.columns:
            gdf = gdf[gdf["GTYPE"] == "P"]
        gdf = gdf[gdf["PHENOM"].isin(_PHENOMENA)]

        features: list[dict] = []
        for _, row in gdf.iterrows():
            issued = _parse_iem_time(row["ISSUED"])
            expired = _parse_iem_time(row["EXPIRED"])
            phenom = row["PHENOM"]
            etn = row.get("ETN", "")
            wfo = row.get("WFO", "")
            features.append(
                {
                    "type": "Feature",
                    "geometry": row["geometry"].__geo_interface__,
                    "properties": {
                        "warning_id": f"{phenom}-{wfo}-{etn}-{issued:%H%M}",
                        "issued_time_ms": int(issued.timestamp() * 1000),
                        "expires_time_ms": int(expired.timestamp() * 1000),
                        "phenomena": phenom,
                        "significance": row.get("SIG", "W"),
                        "office": f"K{wfo}" if wfo and not str(wfo).startswith("K") else str(wfo),
                        "headline": _HEADLINE.get(phenom, "Warning"),
                    },
                }
            )

    return {"type": "FeatureCollection", "features": features}

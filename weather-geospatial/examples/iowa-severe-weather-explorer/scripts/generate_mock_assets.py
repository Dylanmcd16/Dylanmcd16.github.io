"""Generate mocked Phase 1 web assets for the Iowa Severe Weather Data Explorer.

Phase 1 of the implementation brief requires a fully working frontend shell that
runs on *mocked* local data before any historical weather archives are touched.
This script produces that mock dataset deterministically so the timeline,
GeoJSON timestamps, and radar frames all agree.

It writes into:

    public/data/iowa-severe-weather/

Real NEXRAD / IEM / HRRR / GOES processing is introduced in later phases and is
intentionally NOT part of this script.

Run:
    python weather-geospatial/examples/iowa-severe-weather-explorer/scripts/generate_mock_assets.py
"""

from __future__ import annotations

import json
import math
from datetime import datetime, timedelta, timezone
from pathlib import Path

from PIL import Image

# --------------------------------------------------------------------------
# Paths
# --------------------------------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parents[4]
OUTPUT_ROOT = REPO_ROOT / "public" / "data" / "iowa-severe-weather"
RADAR_DIR = OUTPUT_ROOT / "radar"

# --------------------------------------------------------------------------
# Event definition (mock). Six five-minute frames of the Aug 10, 2020 derecho.
# CDT = UTC - 5.
# --------------------------------------------------------------------------

FRAME_COUNT = 6
FRAME_STEP = timedelta(minutes=5)
EVENT_START_UTC = datetime(2020, 8, 10, 17, 0, tzinfo=timezone.utc)

# Radar image geographic footprint (top-left, top-right, bottom-right, bottom-left).
RADAR_TL = (-97.0, 44.0)
RADAR_TR = (-89.0, 44.0)
RADAR_BR = (-89.0, 40.0)
RADAR_BL = (-97.0, 40.0)
RADAR_COORDINATES = [list(RADAR_TL), list(RADAR_TR), list(RADAR_BR), list(RADAR_BL)]

IMG_W, IMG_H = 512, 256
LNG_MIN, LNG_MAX = -97.0, -89.0
LAT_MIN, LAT_MAX = 40.0, 44.0


def ms(dt: datetime) -> int:
    return int(dt.timestamp() * 1000)


def frame_time(index: int) -> datetime:
    return EVENT_START_UTC + index * FRAME_STEP


def central_label(dt: datetime) -> str:
    # CDT = UTC - 5. %-I is not portable to Windows, so build the 12-hour label by hand.
    central = dt - timedelta(hours=5)
    hour12 = central.hour % 12 or 12
    meridiem = "AM" if central.hour < 12 else "PM"
    return f"{hour12}:{central.minute:02d} {meridiem} CDT"


# --------------------------------------------------------------------------
# Reflectivity colormap (dBZ -> RGBA), NWS-like.
# --------------------------------------------------------------------------

_DBZ_STOPS = [
    (5, (4, 233, 231)),
    (20, (1, 159, 244)),
    (30, (3, 0, 244)),
    (35, (2, 253, 2)),
    (40, (1, 197, 1)),
    (45, (0, 142, 0)),
    (50, (253, 248, 2)),
    (55, (229, 188, 0)),
    (60, (253, 149, 0)),
    (65, (253, 0, 0)),
    (70, (212, 0, 0)),
    (75, (188, 0, 0)),
    (80, (248, 0, 253)),
]


def dbz_to_rgba(dbz: float) -> tuple[int, int, int, int]:
    if dbz < 5:
        return (0, 0, 0, 0)
    stops = _DBZ_STOPS
    if dbz <= stops[0][0]:
        r, g, b = stops[0][1]
        return (r, g, b, 200)
    for (lo_v, lo_c), (hi_v, hi_c) in zip(stops, stops[1:]):
        if lo_v <= dbz <= hi_v:
            t = (dbz - lo_v) / (hi_v - lo_v)
            r = round(lo_c[0] + t * (hi_c[0] - lo_c[0]))
            g = round(lo_c[1] + t * (hi_c[1] - lo_c[1]))
            b = round(lo_c[2] + t * (hi_c[2] - lo_c[2]))
            return (r, g, b, 220)
    r, g, b = stops[-1][1]
    return (r, g, b, 235)


def render_radar_frame(index: int, path: Path) -> None:
    """A gaussian reflectivity blob (the derecho line) sweeping west to east."""
    # Storm line center longitude moves eastward frame by frame.
    center_lng = -95.6 + index * 1.05
    center_lat = 42.15
    img = Image.new("RGBA", (IMG_W, IMG_H), (0, 0, 0, 0))
    px = img.load()
    for j in range(IMG_H):
        lat = LAT_MAX - (j / (IMG_H - 1)) * (LAT_MAX - LAT_MIN)
        for i in range(IMG_W):
            lng = LNG_MIN + (i / (IMG_W - 1)) * (LNG_MAX - LNG_MIN)
            # Bowing squall line: elongated N-S, narrow E-W, with a leading bow.
            dx = (lng - center_lng) + 0.28 * math.cos((lat - center_lat) * 1.1)
            dy = (lat - center_lat) * 0.55
            dist = math.sqrt(dx * dx + dy * dy)
            core = math.exp(-((dist / 0.55) ** 2))
            dbz = 68.0 * core
            # Trailing stratiform region behind the line (to the west).
            if dx < 0:
                dbz += 22.0 * math.exp(-((dx / 1.4) ** 2)) * math.exp(-((dy / 1.6) ** 2))
            px[i, j] = dbz_to_rgba(dbz)
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "WEBP", lossless=False, quality=90)


def write_transparent_png(path: Path) -> None:
    Image.new("RGBA", (1, 1), (0, 0, 0, 0)).save(path, "PNG")


# --------------------------------------------------------------------------
# JSON documents
# --------------------------------------------------------------------------


def build_manifest() -> dict:
    return {
        "event": {
            "id": "20200810-iowa-derecho",
            "title": "August 10, 2020 Iowa Derecho",
            "startTimeUtc": EVENT_START_UTC.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "endTimeUtc": frame_time(FRAME_COUNT - 1).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "timezone": "America/Chicago",
        },
        "map": {
            "viewBounds": [[-96.9, 40.2], [-89.9, 43.75]],
            "maxBounds": [[-97.4, 39.8], [-89.4, 44.1]],
            "maximumZoom": 11,
        },
        "files": {
            "timeline": "data/iowa-severe-weather/timeline.json",
            "reports": "data/iowa-severe-weather/reports.geojson",
            "warnings": "data/iowa-severe-weather/warnings.geojson",
            "stations": "data/iowa-severe-weather/stations.geojson",
            "assessments": "data/iowa-severe-weather/assessments.geojson",
        },
    }


def build_timeline() -> list[dict]:
    frames = []
    for index in range(FRAME_COUNT):
        valid = frame_time(index)
        # Mock radar scan time a few seconds off the exact frame time (honest offset).
        scan = valid - timedelta(seconds=19)
        frames.append(
            {
                "index": index,
                "validTimeUtc": valid.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "displayTimeCentral": central_label(valid),
                "radar": {
                    "url": f"data/iowa-severe-weather/radar/frame-{index:02d}.webp",
                    "validTimeUtc": valid.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "sourceTimeUtc": scan.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "coordinates": RADAR_COORDINATES,
                    "available": True,
                },
                "satellite": None,
                "hrrr": None,
            }
        )
    return frames


def _report(rid, frame_idx, lng, lat, etype, magnitude, units, measured, source, location, remarks, delayed=False):
    t = frame_time(frame_idx)
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [lng, lat]},
        "properties": {
            "report_id": rid,
            "event_time_ms": ms(t),
            "event_time_utc": t.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "event_type": etype,
            "magnitude": magnitude,
            "magnitude_units": units,
            "measured": measured,
            "source": source,
            "location": location,
            "remarks": remarks,
            "delayed_report": delayed,
        },
    }


def build_reports() -> dict:
    # Reports accumulate west -> east as the line advances.
    features = [
        _report("r-001", 0, -95.9, 42.5, "measured_wind", 71, "mph", True, "asos", "Sac City, IA", "ASOS measured gust as line passed."),
        _report("r-002", 0, -95.7, 41.9, "wind_damage", None, None, False, "trained_spotter", "Carroll County, IA", "Numerous trees down along US-71."),
        _report("r-003", 1, -95.0, 42.6, "measured_wind", 84, "mph", True, "mesonet", "Fort Dodge, IA", "Mesonet station measured gust."),
        _report("r-004", 1, -94.7, 41.6, "wind_damage", None, None, False, "public", "Guthrie County, IA", "Roof damage to outbuildings."),
        _report("r-005", 2, -94.1, 42.1, "measured_wind", 99, "mph", True, "awos", "Ames, IA", "AWOS measured gust; power outages."),
        _report("r-006", 2, -93.9, 41.5, "hail", 1.0, "in", True, "trained_spotter", "Dallas County, IA", "Quarter-size hail reported."),
        _report("r-007", 3, -93.5, 41.6, "wind_damage", None, None, False, "emergency_mgr", "Polk County, IA", "Widespread tree and power-line damage.", delayed=True),
        _report("r-008", 3, -93.2, 42.0, "measured_wind", 91, "mph", True, "asos", "Marshalltown, IA", "ASOS measured gust."),
        _report("r-009", 4, -92.4, 42.5, "wind_damage", None, None, False, "trained_spotter", "Tama County, IA", "Grain bins destroyed."),
        _report("r-010", 4, -92.0, 41.7, "tornado", None, None, False, "storm_chaser", "Iowa County, IA", "Brief tornado reported within the line."),
        _report("r-011", 5, -91.6, 42.0, "measured_wind", 78, "mph", True, "asos", "Cedar Rapids, IA", "ASOS measured gust as line arrived."),
        _report("r-012", 5, -91.3, 41.4, "wind_damage", None, None, False, "public", "Johnson County, IA", "Trees down across roadways."),
    ]
    return {"type": "FeatureCollection", "features": features}


def _box(lng0, lat0, lng1, lat1):
    return [[[lng0, lat0], [lng1, lat0], [lng1, lat1], [lng0, lat1], [lng0, lat0]]]


def build_warnings() -> dict:
    features = [
        {
            "type": "Feature",
            "geometry": {"type": "Polygon", "coordinates": _box(-96.2, 41.4, -94.6, 42.9)},
            "properties": {
                "warning_id": "SVW-KDMX-0001",
                "issued_time_ms": ms(frame_time(0) - timedelta(minutes=4)),
                "expires_time_ms": ms(frame_time(3)),
                "phenomena": "SV",
                "significance": "W",
                "office": "KDMX",
                "headline": "Severe Thunderstorm Warning",
            },
        },
        {
            "type": "Feature",
            "geometry": {"type": "Polygon", "coordinates": _box(-94.6, 41.3, -92.9, 42.8)},
            "properties": {
                "warning_id": "SVW-KDMX-0002",
                "issued_time_ms": ms(frame_time(1)),
                "expires_time_ms": ms(frame_time(4)),
                "phenomena": "SV",
                "significance": "W",
                "office": "KDMX",
                "headline": "Severe Thunderstorm Warning",
            },
        },
        {
            "type": "Feature",
            "geometry": {"type": "Polygon", "coordinates": _box(-92.6, 41.4, -90.9, 42.7)},
            "properties": {
                "warning_id": "TOW-KDVN-0003",
                "issued_time_ms": ms(frame_time(3)),
                "expires_time_ms": ms(frame_time(5) + timedelta(minutes=5)),
                "phenomena": "TO",
                "significance": "W",
                "office": "KDVN",
                "headline": "Tornado Warning",
            },
        },
    ]
    return {"type": "FeatureCollection", "features": features}


# Iowa ASOS/AWOS mock stations. Values evolve as the line passes each site.
_STATIONS = [
    # id,   name,          lng,     lat,   pass_frame
    ("KFOD", "Fort Dodge", -94.19, 42.55, 1),
    ("KAMW", "Ames",       -93.62, 41.99, 2),
    ("KDSM", "Des Moines", -93.65, 41.53, 3),
    ("KMCW", "Mason City", -93.33, 43.16, 2),
    ("KCID", "Cedar Rapids", -91.71, 41.88, 5),
    ("KOTM", "Ottumwa",    -92.45, 41.11, 4),
]


def _station_obs(index: int) -> list[dict]:
    features = []
    valid = frame_time(index)
    for sid, name, lng, lat, pass_frame in _STATIONS:
        # Pre-frontal warm/humid; sharp gust + temp drop as the line passes.
        delta = index - pass_frame
        base_temp = 88
        if delta < 0:
            temp = base_temp
            dew = 74
            wind = 12 + index * 2
            gust = 18 + index * 3
        elif delta == 0:
            temp = base_temp - 6
            dew = 73
            wind = 34
            gust = 82
        else:
            temp = base_temp - 6 - min(delta * 3, 12)
            dew = 72
            wind = 20 - min(delta * 3, 12)
            gust = max(30 - delta * 6, 0)
        wind_from = 200 + index * 6
        obs_time = valid - timedelta(minutes=1, seconds=index * 7)
        age = round((valid - obs_time).total_seconds() / 60, 1)
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [lng, lat]},
                "properties": {
                    "observation_id": f"{sid}-{index}",
                    "station_id": sid,
                    "station_name": name,
                    "frame_index": index,
                    "observation_time_ms": ms(obs_time),
                    "observation_time_utc": obs_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "age_minutes": age,
                    "stale": age > 5,
                    "temperature_f": temp,
                    "dewpoint_f": dew,
                    "wind_speed_mph": wind,
                    "wind_gust_mph": gust,
                    "wind_from_degrees": wind_from,
                    "wind_to_degrees": (wind_from + 180) % 360,
                    "temp_label": f"{temp}°",
                    "dewpoint_label": f"{dew}°",
                    "wind_label": f"{wind}",
                    "gust_label": f"G{gust}" if gust else "",
                },
            }
        )
    return features


def build_stations() -> dict:
    features: list[dict] = []
    for index in range(FRAME_COUNT):
        features.extend(_station_obs(index))
    return {"type": "FeatureCollection", "features": features}


def build_assessments() -> dict:
    # Post-event survey product; off by default in the UI.
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {"type": "Polygon", "coordinates": _box(-92.3, 41.8, -91.5, 42.2)},
                "properties": {
                    "assessment_id": "post-tor-track-001",
                    "kind": "tornado_track",
                    "rating": "EF1",
                    "survey": "NWS Quad Cities post-event survey",
                    "note": "Post-event analysis. Not available during the live event.",
                },
            }
        ],
    }


def write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def main() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    write_transparent_png(OUTPUT_ROOT / "transparent.png")
    for index in range(FRAME_COUNT):
        render_radar_frame(index, RADAR_DIR / f"frame-{index:02d}.webp")
    write_json(OUTPUT_ROOT / "event-manifest.json", build_manifest())
    write_json(OUTPUT_ROOT / "timeline.json", build_timeline())
    write_json(OUTPUT_ROOT / "reports.geojson", build_reports())
    write_json(OUTPUT_ROOT / "warnings.geojson", build_warnings())
    write_json(OUTPUT_ROOT / "stations.geojson", build_stations())
    write_json(OUTPUT_ROOT / "assessments.geojson", build_assessments())
    print(f"Mock assets written to {OUTPUT_ROOT}")


if __name__ == "__main__":
    main()

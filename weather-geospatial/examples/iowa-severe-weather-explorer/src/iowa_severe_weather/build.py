"""Orchestrate the full pipeline: process every source, assemble the manifest
and timeline, and validate the output before it is served to the front-end."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from . import assessments, goes, hrrr, radar, reports, stations, warnings
from .config import Config, central_label, iso_z, load_config


def _write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def _raster_ref(ref, coordinates) -> dict | None:
    if ref is None or not getattr(ref, "available", False):
        return None
    out = {
        "url": ref.url,
        "validTimeUtc": iso_z(ref.valid_time),
        "sourceTimeUtc": iso_z(ref.source_time) if ref.source_time else None,
        "coordinates": coordinates,
        "available": True,
    }
    products = getattr(ref, "products", None)
    if products:
        out["products"] = products
    return out


def _latest_hrrr(hours, frame_time):
    valid = [h for h in hours if h.valid_time <= frame_time]
    return max(valid, key=lambda h: h.valid_time) if valid else None


def run(config: Config, sources: set[str] | None = None) -> None:
    sources = sources or {"reports", "warnings", "stations", "assessments", "radar", "hrrr", "goes"}
    out = config.output_root
    coordinates = config.domain.corners
    frames = config.frame_times

    print(f"Output: {out}")
    print(f"Frames: {len(frames)}  ({iso_z(frames[0])} -> {iso_z(frames[-1])})")

    # --- Vector layers ------------------------------------------------------
    if "reports" in sources:
        fc = reports.fetch(config)
        _write_json(out / "reports.geojson", fc)
        print(f"reports: {len(fc['features'])}")
    if "warnings" in sources:
        fc = warnings.fetch(config)
        _write_json(out / "warnings.geojson", fc)
        print(f"warnings: {len(fc['features'])}")
    if "stations" in sources:
        fc, series = stations.build(config)
        _write_json(out / "stations.geojson", fc)
        _write_json(out / "stations-series.json", series)
        print(f"stations: {len(fc['features'])} obs across {len(series)} stations")
    if "assessments" in sources:
        fc = assessments.build(config)
        _write_json(out / "assessments.geojson", fc)
        print(f"assessments: {len(fc['features'])}")

    # --- Raster layers ------------------------------------------------------
    radar_refs = radar.process(config, out / "radar", "data/iowa-severe-weather/radar") if "radar" in sources else [None] * len(frames)
    goes_refs = goes.process(config, out / "satellite", "data/iowa-severe-weather/satellite") if "goes" in sources else [None] * len(frames)
    hrrr_hours = hrrr.process(config, out / "hrrr", "data/iowa-severe-weather/hrrr") if "hrrr" in sources else []
    print(f"radar frames: {sum(r is not None for r in radar_refs)} | satellite frames: {sum(r is not None for r in goes_refs)} | hrrr hours: {len(hrrr_hours)}")

    # --- Timeline -----------------------------------------------------------
    cycle = config.get("hrrr", "cycle")
    timeline = []
    for index, frame_time in enumerate(frames):
        hour = _latest_hrrr(hrrr_hours, frame_time)
        hrrr_block = None
        if hour is not None and hour.variables:
            hrrr_block = {
                "cycleTimeUtc": cycle,
                "forecastHour": hour.forecast_hour,
                "variables": {
                    name: _raster_ref(ref, coordinates) for name, ref in hour.variables.items()
                },
            }
        timeline.append(
            {
                "index": index,
                "validTimeUtc": iso_z(frame_time),
                "displayTimeCentral": central_label(frame_time),
                "radar": _raster_ref(radar_refs[index], coordinates),
                "satellite": _raster_ref(goes_refs[index], coordinates),
                "hrrr": hrrr_block,
            }
        )
    _write_json(out / "timeline.json", timeline)

    # --- Manifest -----------------------------------------------------------
    d = config.domain
    manifest = {
        "event": {
            "id": config.get("event", "id"),
            "title": config.get("event", "title"),
            "startTimeUtc": iso_z(frames[0]),
            "endTimeUtc": iso_z(frames[-1]),
            "timezone": "America/Chicago",
        },
        "map": {
            "viewBounds": [[d.lon_min + 0.1, d.lat_min + 0.25], [d.lon_max - 0.1, d.lat_max - 0.25]],
            "maxBounds": [[d.lon_min - 0.4, d.lat_min - 0.2], [d.lon_max + 0.4, d.lat_max + 0.1]],
            "maximumZoom": 11,
        },
        "files": {
            "timeline": "data/iowa-severe-weather/timeline.json",
            "reports": "data/iowa-severe-weather/reports.geojson",
            "warnings": "data/iowa-severe-weather/warnings.geojson",
            "stations": "data/iowa-severe-weather/stations.geojson",
            "stationsSeries": "data/iowa-severe-weather/stations-series.json",
            "assessments": "data/iowa-severe-weather/assessments.geojson",
        },
    }
    _write_json(out / "event-manifest.json", manifest)
    validate(out)
    print("build complete + validated")


def validate(out: Path) -> None:
    timeline = json.loads((out / "timeline.json").read_text(encoding="utf-8"))
    if not timeline:
        raise ValueError("timeline is empty")

    indices = [f["index"] for f in timeline]
    if indices != list(range(len(timeline))):
        raise ValueError("timeline indices are not sequential")

    valid_times = [f["validTimeUtc"] for f in timeline]
    if valid_times != sorted(valid_times):
        raise ValueError("timeline valid times are not chronological")

    for frame in timeline:
        for layer in ("radar", "satellite"):
            ref = frame.get(layer)
            if not ref or not ref.get("available"):
                continue
            if len(ref["coordinates"]) != 4:
                raise ValueError(f"{layer} raster missing 4 corners at frame {frame['index']}")
            asset = _resolve(out, ref["url"])
            if not asset.exists():
                raise FileNotFoundError(f"missing {layer} asset: {asset}")

    # GeoJSON sanity
    warns = json.loads((out / "warnings.geojson").read_text(encoding="utf-8"))
    for f in warns["features"]:
        p = f["properties"]
        if p["issued_time_ms"] >= p["expires_time_ms"]:
            raise ValueError(f"warning {p['warning_id']} issued >= expires")

    frame_count = len(timeline)
    st = json.loads((out / "stations.geojson").read_text(encoding="utf-8"))
    for f in st["features"]:
        fi = f["properties"]["frame_index"]
        if not (0 <= fi < frame_count):
            raise ValueError(f"station frame_index {fi} out of range")

    reps = json.loads((out / "reports.geojson").read_text(encoding="utf-8"))
    ids = [f["properties"]["report_id"] for f in reps["features"]]
    if len(ids) != len(set(ids)):
        raise ValueError("duplicate report_id values")


def _resolve(out: Path, rel_url: str) -> Path:
    # rel_url is "data/iowa-severe-weather/<...>"; out is <repo>/public/data/iowa-severe-weather.
    public_root = out.parent.parent  # <repo>/public
    return public_root / rel_url


def main(argv: list[str] | None = None) -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Build Iowa Severe Weather Explorer assets")
    parser.add_argument("--config", type=Path, default=None)
    parser.add_argument("--only", nargs="*", help="Subset of sources to run")
    args = parser.parse_args(argv)

    config = load_config(args.config)
    run(config, set(args.only) if args.only else None)


if __name__ == "__main__":
    main()

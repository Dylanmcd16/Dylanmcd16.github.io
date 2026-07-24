"""Orchestrate the full pipeline: process every source, assemble the manifest
and timeline, and validate the output before it is served to the front-end."""

from __future__ import annotations

import json
from pathlib import Path

from . import assessments, goes, hrrr, radar, reports, stations, velocity, warnings
from .config import Config, central_label, iso_z, load_config
from .domain import iowa_polygon


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


def _preserved_reflectivity(previous_radar: dict | None) -> dict | None:
    """The reflectivity portion of a previously-written radar frame, if any.

    A radar block's top-level url/time/coordinates fields describe reflectivity
    unless the frame only ever had velocity (in which case "products" omits
    "reflectivity" entirely) — see the merge logic below for how these are set.
    """
    if not previous_radar:
        return None
    products = previous_radar.get("products")
    if products and "reflectivity" not in products:
        return None
    return {k: v for k, v in previous_radar.items() if k not in ("products", "velocitySourceTimeUtc")}


def _preserved_velocity(previous_radar: dict | None) -> tuple[str, str | None] | None:
    """The (url, sourceTimeUtc) of a previously-written velocity product, if any."""
    if not previous_radar:
        return None
    url = (previous_radar.get("products") or {}).get("velocity")
    if not url:
        return None
    return url, previous_radar.get("velocitySourceTimeUtc")


def run(config: Config, sources: set[str] | None = None) -> None:
    sources = sources or {
        "reports", "warnings", "stations", "assessments", "radar", "velocity", "hrrr", "goes",
    }
    out = config.output_root
    coordinates = config.domain.corners
    frames = config.frame_times

    print(f"Output: {out}")
    print(f"Frames: {len(frames)}  ({iso_z(frames[0])} -> {iso_z(frames[-1])})")

    # Ensure the Iowa boundary polygon exists in the output (front-end draws it).
    iowa_polygon(config)

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

    raster_sources = {"radar", "velocity", "goes", "hrrr"}
    selected_rasters = raster_sources & sources
    if not selected_rasters:
        print("vector-only run: leaving timeline.json and event-manifest.json untouched")
        return

    # A partial raster run (e.g. --only radar hrrr) recomputes only the
    # requested raster sources. Sources left out are carried forward from the
    # existing timeline.json rather than being blanked out.
    timeline_path = out / "timeline.json"
    previous_frames: dict[int, dict] = {}
    if timeline_path.exists():
        try:
            previous_frames = {f["index"]: f for f in json.loads(timeline_path.read_text(encoding="utf-8"))}
        except (json.JSONDecodeError, KeyError, TypeError):
            previous_frames = {}

    skipped = raster_sources - selected_rasters
    if skipped:
        state = "existing timeline.json" if previous_frames else "nothing (no prior timeline.json)"
        print(f"partial raster run: recomputing {sorted(selected_rasters)}; {sorted(skipped)} preserved from {state}")

    # --- Raster layers ------------------------------------------------------
    radar_refs = radar.process(config, out / "radar", "data/iowa-severe-weather/radar") if "radar" in sources else None
    velocity_refs = velocity.process(config, out / "radar", "data/iowa-severe-weather/radar") if "velocity" in sources else None
    goes_refs = goes.process(config, out / "satellite", "data/iowa-severe-weather/satellite") if "goes" in sources else None
    hrrr_hours = hrrr.process(config, out / "hrrr", "data/iowa-severe-weather/hrrr") if "hrrr" in sources else None
    print(
        f"radar frames: {sum(r is not None for r in radar_refs) if radar_refs is not None else 'unchanged'} | "
        f"velocity frames: {sum(r is not None for r in velocity_refs) if velocity_refs is not None else 'unchanged'} | "
        f"satellite frames: {sum(r is not None for r in goes_refs) if goes_refs is not None else 'unchanged'} | "
        f"hrrr hours: {len(hrrr_hours) if hrrr_hours is not None else 'unchanged'}"
    )

    # --- Timeline -----------------------------------------------------------
    cycle = config.get("hrrr", "cycle")
    timeline = []
    for index, frame_time in enumerate(frames):
        previous_frame = previous_frames.get(index)
        previous_radar = (previous_frame or {}).get("radar")

        # Reflectivity: fresh if requested, else whatever was there before.
        radar_ref = _raster_ref(radar_refs[index], coordinates) if radar_refs is not None else _preserved_reflectivity(previous_radar)

        # Velocity: fresh if requested, else whatever was there before. Merged
        # into the same "radar" block the front-end expects.
        if velocity_refs is not None:
            vel = velocity_refs[index]
            vel_url = vel.url if (vel is not None and vel.available) else None
            vel_source_time = iso_z(vel.source_time) if (vel is not None and vel.available) else None
        else:
            preserved_vel = _preserved_velocity(previous_radar)
            vel_url, vel_source_time = preserved_vel if preserved_vel else (None, None)

        if vel_url:
            if radar_ref is None:
                radar_ref = {
                    "url": vel_url,
                    "validTimeUtc": iso_z(frame_time),
                    "sourceTimeUtc": vel_source_time,
                    "coordinates": coordinates,
                    "available": True,
                    "products": {"velocity": vel_url},
                }
            else:
                products = dict(radar_ref.get("products") or {})
                products.setdefault("reflectivity", radar_ref["url"])
                products["velocity"] = vel_url
                radar_ref["products"] = products
                if vel_source_time:
                    radar_ref["velocitySourceTimeUtc"] = vel_source_time

        satellite_ref = _raster_ref(goes_refs[index], coordinates) if goes_refs is not None else (previous_frame or {}).get("satellite")

        if hrrr_hours is not None:
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
        else:
            hrrr_block = (previous_frame or {}).get("hrrr")

        timeline.append(
            {
                "index": index,
                "validTimeUtc": iso_z(frame_time),
                "displayTimeCentral": central_label(frame_time),
                "radar": radar_ref,
                "satellite": satellite_ref,
                "hrrr": hrrr_block,
            }
        )
    _write_json(timeline_path, timeline)

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
            "iowa": "data/iowa-severe-weather/iowa.geojson",
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

    # GeoJSON sanity — these files may not exist yet on a raster-only run
    # against a fresh checkout (e.g. --only radar hrrr before any vector run).
    warnings_path = out / "warnings.geojson"
    if warnings_path.exists():
        warns = json.loads(warnings_path.read_text(encoding="utf-8"))
        for f in warns["features"]:
            p = f["properties"]
            if p["issued_time_ms"] >= p["expires_time_ms"]:
                raise ValueError(f"warning {p['warning_id']} issued >= expires")

    stations_path = out / "stations.geojson"
    if stations_path.exists():
        frame_count = len(timeline)
        st = json.loads(stations_path.read_text(encoding="utf-8"))
        for f in st["features"]:
            fi = f["properties"]["frame_index"]
            if not (0 <= fi < frame_count):
                raise ValueError(f"station frame_index {fi} out of range")

    reports_path = out / "reports.geojson"
    if reports_path.exists():
        reps = json.loads(reports_path.read_text(encoding="utf-8"))
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

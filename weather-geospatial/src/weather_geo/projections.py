"""CRS helpers and geodesic distance.

Map-projected (planar) distance is wrong for anything continental in scale.
Nearest-station and distance calculations use geodesic distance on the WGS84
ellipsoid instead of naive coordinate math.
"""

from __future__ import annotations

import math

WGS84 = "EPSG:4326"
# US National Atlas Equal Area — a reasonable default for CONUS-scale rasters.
US_EQUAL_AREA = "EPSG:5070"

_EARTH_RADIUS_KM = 6371.0088


def haversine_km(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    """Great-circle distance in kilometres between two lon/lat points.

    Spherical approximation; accurate to within ~0.5% of the true geodesic
    distance, which is sufficient for nearest-station matching.
    """
    rlat1, rlat2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlon / 2) ** 2
    return 2 * _EARTH_RADIUS_KM * math.asin(math.sqrt(a))


def nearest_point(
    lon: float, lat: float, candidates: list[tuple[str, float, float]]
) -> tuple[str, float]:
    """Return the ``(id, distance_km)`` of the nearest candidate.

    ``candidates`` is a list of ``(id, longitude, latitude)`` tuples. Raises
    ``ValueError`` on an empty candidate list so callers handle "no station"
    explicitly rather than silently producing a null match.
    """
    if not candidates:
        raise ValueError("no candidate points supplied")
    best_id, best_dist = None, math.inf
    for cid, clon, clat in candidates:
        d = haversine_km(lon, lat, clon, clat)
        if d < best_dist:
            best_id, best_dist = cid, d
    return best_id, best_dist

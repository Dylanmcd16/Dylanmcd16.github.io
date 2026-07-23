"""Meteorological unit conversions.

Silent unit errors are one of the most common ways a weather pipeline
produces confident, wrong answers, so conversions live in one tested place.
"""

from __future__ import annotations


def fahrenheit_to_celsius(f: float) -> float:
    return (f - 32.0) * 5.0 / 9.0


def celsius_to_fahrenheit(c: float) -> float:
    return c * 9.0 / 5.0 + 32.0


def knots_to_mps(kt: float) -> float:
    return kt * 0.514444


def mps_to_knots(mps: float) -> float:
    return mps / 0.514444


def inches_to_mm(inches: float) -> float:
    return inches * 25.4


def mm_to_inches(mm: float) -> float:
    return mm / 25.4


def wind_speed_from_components(u: float, v: float) -> float:
    """Scalar wind speed from U (eastward) and V (northward) components."""
    return (u * u + v * v) ** 0.5

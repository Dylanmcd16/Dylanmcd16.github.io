"""Climate normals and anomaly (departure-from-normal) calculations.

Anomalies are only meaningful relative to a clearly stated baseline period and a
consistent set of stations. These helpers compute a per-station monthly normal
over a baseline window and the departure of a target period from that normal —
pure pandas, no heavy dependency.
"""

from __future__ import annotations

import pandas as pd


def monthly_normals(
    df: pd.DataFrame,
    baseline: tuple[int, int],
    value_col: str,
    group_cols: tuple[str, ...] = ("station_id", "month"),
) -> pd.DataFrame:
    """Per-station, per-month mean over the baseline year range (inclusive).

    ``df`` needs a ``year`` column plus ``group_cols`` and ``value_col``. Returns
    one row per group with the normal in ``{value_col}_normal`` and the number of
    years that contributed, so thin baselines are visible rather than hidden.
    """
    lo, hi = baseline
    base = df[(df["year"] >= lo) & (df["year"] <= hi)]
    agg = (
        base.groupby(list(group_cols))[value_col]
        .agg(["mean", "count"])
        .rename(columns={"mean": f"{value_col}_normal", "count": "n_baseline_years"})
        .reset_index()
    )
    return agg


def period_anomaly(
    df: pd.DataFrame,
    baseline: tuple[int, int],
    period: tuple[int, int],
    value_col: str,
    group_cols: tuple[str, ...] = ("station_id", "month"),
) -> pd.DataFrame:
    """Departure of a target ``period`` mean from the baseline normal.

    Returns per-group columns: the period mean, the baseline normal, the
    ``anomaly`` (period − normal), and baseline-year coverage. Groups missing
    from either the period or the baseline are kept with NaN so gaps are
    explicit, not silently dropped.
    """
    normals = monthly_normals(df, baseline, value_col, group_cols)
    lo, hi = period
    per = df[(df["year"] >= lo) & (df["year"] <= hi)]
    per_mean = (
        per.groupby(list(group_cols))[value_col].mean().rename(f"{value_col}_period").reset_index()
    )
    merged = normals.merge(per_mean, on=list(group_cols), how="outer")
    merged["anomaly"] = merged[f"{value_col}_period"] - merged[f"{value_col}_normal"]
    return merged


def attach_station_coords(anomalies: pd.DataFrame, stations: pd.DataFrame) -> pd.DataFrame:
    """Join per-station lon/lat back onto an anomaly table for mapping."""
    coords = stations[["station_id", "longitude", "latitude"]].drop_duplicates("station_id")
    return anomalies.merge(coords, on="station_id", how="left")

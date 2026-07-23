"""Static map helpers (optional dependency: matplotlib, the ``viz`` extra)."""

from __future__ import annotations

from pathlib import Path


def scatter_map(
    df,
    lon_col: str,
    lat_col: str,
    color_col: str | None,
    title: str,
    out_path: str | Path,
    boundaries=None,
) -> Path:
    """Point map with an optional boundary overlay and colour scale."""
    import matplotlib.pyplot as plt

    fig, ax = plt.subplots(figsize=(9, 7))
    if boundaries is not None:
        boundaries.boundary.plot(ax=ax, color="#888", linewidth=0.6)
    kw = {}
    if color_col and color_col in df.columns:
        kw = {"c": df[color_col], "cmap": "viridis"}
    sc = ax.scatter(df[lon_col], df[lat_col], s=18, edgecolor="k", linewidth=0.2, **kw)
    if kw:
        fig.colorbar(sc, ax=ax, label=color_col)
    ax.set_title(title)
    ax.set_xlabel("longitude")
    ax.set_ylabel("latitude")
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fig.tight_layout()
    fig.savefig(out_path, dpi=130)
    plt.close(fig)
    return out_path


def raster_map(da, title: str, out_path: str | Path, boundaries=None) -> Path:
    """Quick-look map of a raster with an optional boundary overlay."""
    import matplotlib.pyplot as plt

    fig, ax = plt.subplots(figsize=(9, 7))
    da.plot(ax=ax, cmap="turbo", cbar_kwargs={"label": da.attrs.get("units", "")})
    if boundaries is not None:
        boundaries.to_crs(str(da.rio.crs)).boundary.plot(ax=ax, color="k", linewidth=0.5)
    ax.set_title(title)
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fig.tight_layout()
    fig.savefig(out_path, dpi=130)
    plt.close(fig)
    return out_path

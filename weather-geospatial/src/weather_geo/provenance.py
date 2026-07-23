"""Structured run metadata for reproducible outputs.

Every published product should be traceable to its source. A ``processing.json``
that records where data came from, when it was retrieved, and how it was
transformed is the difference between a demo and evidence.
"""

from __future__ import annotations

import json
import platform
import sys
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from . import __version__


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class RunMetadata:
    """Provenance record written alongside each workflow's outputs."""

    workflow: str
    started_at: str = field(default_factory=_now_iso)
    finished_at: str | None = None
    sources: list[dict] = field(default_factory=list)
    parameters: dict = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)
    software: dict = field(
        default_factory=lambda: {
            "weather_geo": __version__,
            "python": sys.version.split()[0],
            "platform": platform.platform(),
        }
    )

    def add_source(self, name: str, uri: str, retrieved_at: str | None = None, **extra) -> None:
        self.sources.append(
            {"name": name, "uri": uri, "retrieved_at": retrieved_at or _now_iso(), **extra}
        )

    def warn(self, message: str) -> None:
        self.warnings.append(message)

    def finish(self) -> None:
        self.finished_at = _now_iso()

    def write(self, path: str | Path) -> Path:
        if self.finished_at is None:
            self.finish()
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(asdict(self), indent=2), encoding="utf-8")
        return path

"""Lightweight orchestration with partial-failure handling.

A multi-source product should not fail entirely because one optional input is
missing. ``Stage`` runs a named step, and on failure records a structured
warning and returns a fallback instead of aborting the whole package — so a run
missing (say) the radar layer still produces every other layer plus an honest
``warnings.json`` explaining what was skipped.
"""

from __future__ import annotations

import traceback
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any


@dataclass
class StageResult:
    name: str
    ok: bool
    value: Any = None
    error: str | None = None


@dataclass
class Orchestrator:
    """Runs named stages, collecting per-stage success/failure.

    Required stages re-raise on failure (the product is meaningless without
    them); optional stages degrade to a fallback and log a warning.
    """

    results: list[StageResult] = field(default_factory=list)

    def run(
        self,
        name: str,
        fn: Callable[[], Any],
        required: bool = False,
        fallback: Any = None,
    ) -> Any:
        try:
            value = fn()
            self.results.append(StageResult(name, ok=True, value=value))
            return value
        except Exception as exc:  # noqa: BLE001 - orchestration boundary
            detail = f"{type(exc).__name__}: {exc}"
            self.results.append(StageResult(name, ok=False, error=detail))
            if required:
                raise
            return fallback

    @property
    def warnings(self) -> list[str]:
        return [f"stage '{r.name}' skipped: {r.error}" for r in self.results if not r.ok]

    def summary(self) -> dict:
        return {
            "stages": [
                {"name": r.name, "ok": r.ok, **({"error": r.error} if r.error else {})}
                for r in self.results
            ],
            "n_ok": sum(r.ok for r in self.results),
            "n_failed": sum(not r.ok for r in self.results),
        }

    def format_exc(self) -> str:  # pragma: no cover - debugging helper
        return traceback.format_exc()

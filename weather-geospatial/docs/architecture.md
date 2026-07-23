# Architecture

## Principle

Every workflow implements one pipeline:

```
acquire → validate → normalize → analyze → publish
```

`weather_geo` provides the reusable stage implementations; each `examples/*`
directory is a thin orchestration script that wires those stages together for a
specific product and writes self-describing outputs.

```
┌─────────────┐   ┌──────────────┐   ┌──────────────┐   ┌───────────┐   ┌──────────┐
│  acquire    │──▶│  validate    │──▶│  normalize   │──▶│  analyze  │──▶│ publish  │
│ downloads / │   │ validation.py│   │ units.py     │   │ vector.py │   │ plotting │
│ sample-data │   │ (QC report)  │   │ projections  │   │ raster.py │   │ + geojson│
└─────────────┘   └──────────────┘   └──────────────┘   └───────────┘   │ + COG    │
                                                                          │ + JSON   │
                                                                          └────┬─────┘
                                                                     provenance.py
                                                                  (processing.json)
```

## Design choices

- **`src/` layout** prevents accidental imports from the working tree and makes
  the package installable and testable like real software.
- **Optional dependencies.** Pure-Python QC/normalization (and its tests) need
  only pandas/numpy; vector (`geo`) and raster (`raster`) stacks are extras.
  Workflows degrade gracefully and record skipped steps in provenance.
- **Offline-first.** Bundled synthetic sample data makes every example
  reproducible without network access or credentials; `--input` swaps in real
  public data.
- **Record-preserving joins.** Spatial and (future) temporal joins keep
  unmatched records with null attributes rather than silently dropping them.
- **Provenance everywhere.** No output is produced without a `processing.json`
  describing its lineage.

## Testing strategy

Tests target failure modes that produce *silently wrong* geospatial results,
not just crashes: CRS mismatch, lon/lat reversal, out-of-range values,
midnight-crossing temporal windows, duplicate reconciliation, and empty inputs.

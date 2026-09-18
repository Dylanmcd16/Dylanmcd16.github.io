import { describe, expect, it } from 'vitest'
import {
  CUMULATIVE_STOPS,
  NDVI_STOPS,
  buildNdviLookup,
  buildRainfallRaster,
  buildRainfallTotals,
  featureBounds,
  sampleStops,
  shortDate,
} from './season'
import type { FieldProperties, SeasonData, SeasonManifest } from '../../types/soybean-season'

/** Six days, rainfall counted from the third. Small enough to check by hand. */
function fixture(): SeasonData {
  const manifest: SeasonManifest = {
    title: 'test',
    studyArea: 'test',
    season: 2025,
    start: '2025-04-01',
    end: '2025-04-06',
    bounds: [-93.8, 41.9, -93.5, 42.1],
    nFields: 2,
    nDays: 6,
    nPasses: 2,
    nObservations: 3,
    nPossibleObservations: 2,
    nSamplePoints: 4,
    days: [
      '2025-04-01',
      '2025-04-02',
      '2025-04-03',
      '2025-04-04',
      '2025-04-05',
      '2025-04-06',
    ],
    ndviDays: [1, 4],
    rainZeroDate: '2025-04-03',
    minSoybeanFraction: 0.8,
    inwardBufferM: 20,
    sampleSpacingDeg: [0.01, 0.0121],
    files: { fields: 'f', ndvi: 'n', precipGrid: 'g', precipDaily: 'p' },
    sources: {},
    notes: {},
  }

  // A 2 x 2 lattice of cells, centres one step apart in each direction.
  const cell = (lat: number, lon: number): GeoJSON.Feature<GeoJSON.Polygon, { id: string }> => ({
    type: 'Feature',
    properties: { id: `${lat.toFixed(5)}_${lon.toFixed(5)}` },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [lon - 0.00605, lat - 0.005],
          [lon + 0.00605, lat - 0.005],
          [lon + 0.00605, lat + 0.005],
          [lon - 0.00605, lat + 0.005],
          [lon - 0.00605, lat - 0.005],
        ],
      ],
    },
  })

  return {
    manifest,
    fields: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 1,
          properties: {
            id: 1,
            ha: 10,
            acres: 25,
            soil: 'Nicollet',
            cell: '42.00000_-93.60000',
            lon: -93.6,
            lat: 42,
            n: 2,
          },
          geometry: {
            type: 'MultiPolygon',
            coordinates: [
              [
                [
                  [-93.61, 41.99],
                  [-93.59, 41.99],
                  [-93.59, 42.01],
                  [-93.61, 42.01],
                  [-93.61, 41.99],
                ],
              ],
            ],
          },
        },
      ],
    },
    grid: {
      type: 'FeatureCollection',
      features: [
        cell(42, -93.6),
        cell(42, -93.5879),
        cell(42.01, -93.6),
        cell(42.01, -93.5879),
      ],
    },
    ndvi: {
      '1': { d: [1, 4], v: [0.2, null] },
    },
    precipDaily: {
      '42.00000_-93.60000': [25.4, 25.4, 25.4, 0, 50.8, 0],
      '42.00000_-93.58790': [0, 0, 0, 0, 0, 0],
      '42.01000_-93.60000': [0, 0, 0, 0, 0, 0],
      '42.01000_-93.58790': [0, 0, 0, 0, 0, 0],
    },
  } as SeasonData
}

describe('buildNdviLookup', () => {
  it('indexes values by day and drops nulls so a gap stays a gap', () => {
    const lookup = buildNdviLookup(fixture())
    expect(lookup.get(1)?.get(1)).toBe(0.2)
    // Day 4 was exported as null (cloud) and must not become a number.
    expect(lookup.get(1)?.has(4)).toBe(false)
    expect(lookup.get(1)?.get(99)).toBeUndefined()
  })
})

describe('buildRainfallTotals', () => {
  const totals = buildRainfallTotals(fixture())
  const cell = '42.00000_-93.60000'

  it('converts millimetres to inches', () => {
    expect(totals.daily.get(cell)?.[0]).toBeCloseTo(1, 5)
  })

  it('counts cumulative rain only from the reference date', () => {
    const cumulative = totals.cumulative.get(cell)!
    // The first two days fall before 3 April and are excluded.
    expect(cumulative[0]).toBeCloseTo(0, 5)
    expect(cumulative[1]).toBeCloseTo(0, 5)
    expect(cumulative[2]).toBeCloseTo(1, 5)
    expect(cumulative[5]).toBeCloseTo(3, 5)
  })

  it('sums the trailing window over calendar days, reference date or not', () => {
    const trailing = totals.trailing14.get(cell)!
    // Everything here is inside a 14-day window, so the trailing total keeps
    // the two days the cumulative total ignores.
    expect(trailing[5]).toBeCloseTo(5, 5)
  })
})

describe('buildRainfallRaster', () => {
  const raster = buildRainfallRaster(fixture())

  it('recovers the lattice shape from the sample-point centres', () => {
    expect(raster.width).toBe(2)
    expect(raster.height).toBe(2)
    expect(raster.cellIds).toHaveLength(4)
  })

  it('puts the northern row first, matching image row order', () => {
    expect(raster.cellIds[0]).toBe('42.01000_-93.60000')
    expect(raster.cellIds[2]).toBe('42.00000_-93.60000')
  })

  it('spans the outer sample edges rather than their centres', () => {
    const [[west, north], , , [, south]] = raster.coordinates
    expect(west).toBeCloseTo(-93.60605, 5)
    expect(north).toBeCloseTo(42.015, 5)
    expect(south).toBeCloseTo(41.995, 5)
  })
})

describe('sampleStops', () => {
  it('clamps below the first stop and above the last', () => {
    expect(sampleStops(NDVI_STOPS, -5)).toEqual(sampleStops(NDVI_STOPS, 0.1))
    expect(sampleStops(NDVI_STOPS, 99)).toEqual(sampleStops(NDVI_STOPS, 0.95))
  })

  it('interpolates halfway between two stops', () => {
    // #f7fcff -> #dceaf7 across 0 to 6 inches; 3 inches is the midpoint.
    expect(sampleStops(CUMULATIVE_STOPS, 3)).toEqual([0xea, 0xf3, 0xfb])
  })

  it('treats a non-finite value as the bottom of the scale', () => {
    expect(sampleStops(NDVI_STOPS, Number.NaN)).toEqual(sampleStops(NDVI_STOPS, 0))
  })
})

describe('shortDate', () => {
  it('formats without a date library or a timezone shift', () => {
    expect(shortDate('2025-07-09')).toBe('9 Jul')
    expect(shortDate('2025-01-01')).toBe('1 Jan')
  })
})

describe('featureBounds', () => {
  it('returns the south-west and north-east corners', () => {
    const feature = fixture().fields.features[0] as GeoJSON.Feature<
      GeoJSON.MultiPolygon,
      FieldProperties
    >
    expect(featureBounds(feature)).toEqual([
      [-93.61, 41.99],
      [-93.59, 42.01],
    ])
  })
})

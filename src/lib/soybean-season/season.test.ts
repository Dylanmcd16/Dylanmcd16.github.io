import { describe, expect, it } from 'vitest'
import {
  CUMULATIVE_STOPS,
  NDVI_STOPS,
  TRAILING_STOPS,
  buildFieldRainfall,
  buildLevelPalette,
  buildNdviLookup,
  featureBounds,
  peakGreennessStep,
  rainCoordinates,
  rainPlane,
  rainStepMm,
  sampleStops,
  shortDate,
} from './season'
import type { FieldProperties, SeasonData, SeasonManifest } from '../../types/soybean-season'

const MM_PER_INCH = 25.4

/** A six-day season on a 2 x 3 rainfall grid, small enough to check by hand.
 *
 * Rainfall counts from day 2 (1 May stands in for it), and the per-field
 * record starts one day before the season, which is what the real export does
 * so the earliest trailing window is complete.
 */
function fixture(): SeasonData {
  const nRows = 2
  const nCols = 3
  const ndviDays = [1, 4]

  const manifest: SeasonManifest = {
    title: 'test',
    studyArea: 'test',
    season: 2025,
    start: '2025-04-01',
    end: '2025-04-06',
    bounds: [-93.8, 41.9, -93.5, 42.1],
    nFields: 1,
    nDays: 6,
    nPasses: 2,
    nObservations: 1,
    nPossibleObservations: 2,
    days: [
      '2025-04-01',
      '2025-04-02',
      '2025-04-03',
      '2025-04-04',
      '2025-04-05',
      '2025-04-06',
    ],
    ndviDays,
    rainZeroDate: '2025-04-03',
    minSoybeanFraction: 0.8,
    inwardBufferM: 20,
    files: { fields: 'f', ndvi: 'n' },
    sources: {},
    notes: {},
    rain: {
      source: 'MRMS',
      product: 'MultiSensor_QPE_01H_Pass2',
      grid: 'native',
      temporalResolution: 'hourly to local days',
      timezone: 'America/Chicago',
      units: 'mm',
      nRows,
      nCols,
      bounds: [-93.9, 41.8, -93.4, 42.2],
      cumulativeStepMm: 2,
      trailingStepMm: 1,
      cumulativeMaxMm: 508,
      trailingMaxMm: 254,
      noDataValue: 255,
      missingHourPct: 0,
      gridFile: 'rain-grids.bin',
      fieldFile: 'rain-fields.json',
      planeOrder: ['cumulative', 'trailing14'],
      note: '',
    },
  }

  // Two planes x two dates x six cells. Distinct values so an indexing slip
  // shows up as the wrong number rather than as a plausible one.
  const cells = nRows * nCols
  const grids = new Uint8Array(cells * ndviDays.length * 2)
  const fill = (plane: number, step: number, values: number[]) => {
    values.forEach((v, i) => {
      grids[(plane * ndviDays.length + step) * cells + i] = v
    })
  }
  fill(0, 0, [10, 11, 12, 13, 14, 255]) // cumulative, first date, one no-data
  fill(0, 1, [20, 21, 22, 23, 24, 255])
  fill(1, 0, [1, 2, 3, 4, 5, 255]) // trailing
  fill(1, 1, [6, 7, 8, 9, 10, 255])

  return {
    manifest,
    fields: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 1,
          properties: { id: 1, ha: 10, acres: 25, soil: 'Nicollet', lon: -93.6, lat: 42, n: 2 },
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
    ndvi: { '1': { d: [1, 4], v: [0.2, null] } },
    rainGrids: grids,
    rainFields: {
      // One day before the season, then the season's six days.
      days: [
        '2025-03-31',
        '2025-04-01',
        '2025-04-02',
        '2025-04-03',
        '2025-04-04',
        '2025-04-05',
        '2025-04-06',
      ],
      rainZeroIndex: 3, // 3 April
      seasonStartIndex: 1, // 1 April
      mm: { '1': [25.4, 25.4, 25.4, 25.4, null, 50.8, 0] },
    },
  } as SeasonData
}

describe('buildNdviLookup', () => {
  it('indexes values by day and drops nulls so a gap stays a gap', () => {
    const lookup = buildNdviLookup(fixture())
    expect(lookup.get(1)?.get(1)).toBe(0.2)
    expect(lookup.get(1)?.has(4)).toBe(false)
  })
})

describe('rainPlane', () => {
  it('reads the cumulative plane for the requested date', () => {
    const data = fixture()
    expect(Array.from(rainPlane(data, 'cumulative', 0))).toEqual([10, 11, 12, 13, 14, 255])
    expect(Array.from(rainPlane(data, 'cumulative', 1))).toEqual([20, 21, 22, 23, 24, 255])
  })

  it('reads the trailing plane from the second half of the binary', () => {
    const data = fixture()
    expect(Array.from(rainPlane(data, 'trailing14', 0))).toEqual([1, 2, 3, 4, 5, 255])
    expect(Array.from(rainPlane(data, 'trailing14', 1))).toEqual([6, 7, 8, 9, 10, 255])
  })

  it('is a view, not a copy, so playback does not allocate per frame', () => {
    const data = fixture()
    expect(rainPlane(data, 'cumulative', 0).buffer).toBe(data.rainGrids.buffer)
  })
})

describe('rain geolocation', () => {
  it('returns image corners clockwise from the north-west', () => {
    const corners = rainCoordinates(fixture().manifest)
    expect(corners).toEqual([
      [-93.9, 42.2],
      [-93.4, 42.2],
      [-93.4, 41.8],
      [-93.9, 41.8],
    ])
  })

  it('keeps each window on its own quantisation step', () => {
    const { manifest } = fixture()
    expect(rainStepMm(manifest, 'cumulative')).toBe(2)
    expect(rainStepMm(manifest, 'trailing14')).toBe(1)
  })
})

describe('buildLevelPalette', () => {
  it('decodes a level back through millimetres into the colour ramp', () => {
    // Step 2 mm, so level 127 is 254 mm, which is 10 inches.
    const palette = buildLevelPalette(CUMULATIVE_STOPS, 2)
    const expected = sampleStops(CUMULATIVE_STOPS, 10)
    expect(Array.from(palette.slice(127 * 4, 127 * 4 + 4))).toEqual(expected)
  })

  it('covers every possible byte, with alpha', () => {
    expect(buildLevelPalette(CUMULATIVE_STOPS, 2)).toHaveLength(1024)
  })

  it('leaves the dry end fully transparent so nothing is drawn where nothing fell', () => {
    const palette = buildLevelPalette(CUMULATIVE_STOPS, 2)
    expect(palette[3]).toBe(0)
  })
})

describe('buildFieldRainfall', () => {
  const rain = buildFieldRainfall(fixture()).get(1)!

  it('converts millimetres to inches', () => {
    // Season day 0 is 1 April, which is source index 1: 25.4 mm.
    expect(rain.daily[0]).toBeCloseTo(1, 5)
  })

  it('counts cumulative rain only from the reference day', () => {
    // 1 May stands in for source index 3 (3 April), so the first two season
    // days are before it and must not accumulate.
    expect(rain.cumulative[0]).toBeCloseTo(0, 5)
    expect(rain.cumulative[1]).toBeCloseTo(0, 5)
    expect(rain.cumulative[2]).toBeCloseTo(1, 5)
    expect(rain.cumulative[4]).toBeCloseTo(3, 5)
  })

  it('treats a null MRMS day as unknown, contributing nothing', () => {
    // Source index 4 is null. Season day 3 maps to it and must stay flat
    // rather than counting as rain.
    expect(rain.daily[3]).toBeCloseTo(0, 5)
    expect(rain.cumulative[3]).toBeCloseTo(rain.cumulative[2], 5)
  })

  it('sums the trailing window across days before the season started', () => {
    // Season day 0 reaches back past the season into the run-up, which is why
    // the export ships those extra days.
    expect(rain.trailing14[0]).toBeCloseTo(2, 5)
  })

  it('includes the selected day in the trailing window', () => {
    const withoutToday = rain.trailing14[5] - rain.daily[5]
    expect(rain.trailing14[5]).toBeGreaterThanOrEqual(withoutToday)
    expect(rain.trailing14[4]).toBeCloseTo(
      (25.4 + 25.4 + 25.4 + 25.4 + 50.8) / MM_PER_INCH,
      5,
    )
  })

  it('produces one entry per season day, not per source day', () => {
    expect(rain.daily).toHaveLength(6)
    expect(rain.cumulative).toHaveLength(6)
    expect(rain.trailing14).toHaveLength(6)
  })
})

describe('sampleStops', () => {
  it('clamps below the first stop and above the last', () => {
    expect(sampleStops(NDVI_STOPS, -5)).toEqual(sampleStops(NDVI_STOPS, 0.1))
    expect(sampleStops(NDVI_STOPS, 99)).toEqual(sampleStops(NDVI_STOPS, 0.95))
  })

  it('treats a stop with no alpha as fully opaque', () => {
    expect(sampleStops(NDVI_STOPS, 0.5)[3]).toBe(255)
  })

  it('interpolates colour and alpha together halfway between two stops', () => {
    // #eef6fd at alpha 0 -> #c3ddf2 at alpha 0.3, across 0 to 6 inches.
    const [r, g, b, a] = sampleStops(CUMULATIVE_STOPS, 3)
    expect([r, g, b]).toEqual([217, 234, 248])
    // Each stop's alpha becomes a byte first and the bytes are then blended,
    // so this is round(round(0.3 * 255) / 2), not round(0.15 * 255).
    expect(a).toBe(39)
  })

  it('ramps alpha with depth, so a soaking reads darker than a shower', () => {
    const light = sampleStops(TRAILING_STOPS, 0.5)[3]
    const heavy = sampleStops(TRAILING_STOPS, 6)[3]
    expect(heavy).toBeGreaterThan(light)
    expect(sampleStops(TRAILING_STOPS, 0)[3]).toBe(0)
  })

  it('treats a non-finite value as the bottom of the scale', () => {
    expect(sampleStops(NDVI_STOPS, Number.NaN)).toEqual(sampleStops(NDVI_STOPS, 0))
  })
})

describe('peakGreennessStep', () => {
  it('opens on the greenest date rather than on bare soil', () => {
    const data = fixture()
    // Only day 1 has a value, and one field is the whole population.
    expect(peakGreennessStep(data, buildNdviLookup(data))).toBe(0)
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

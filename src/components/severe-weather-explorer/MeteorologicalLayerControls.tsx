import type {
  HrrrVariable,
  PrimaryWeatherLayer,
  SatelliteProduct,
} from '../../lib/severe-weather/mapTypes'

interface MeteorologicalLayerControlsProps {
  primaryLayer: PrimaryWeatherLayer
  satelliteUnderRadar: boolean
  satelliteProduct: SatelliteProduct
  hrrrVariable: HrrrVariable
  onPrimaryLayer: (layer: PrimaryWeatherLayer) => void
  onSatelliteUnderRadar: (value: boolean) => void
  onSatelliteProduct: (product: SatelliteProduct) => void
  onHrrrVariable: (variable: HrrrVariable) => void
}

const SATELLITE_PRODUCTS: { value: SatelliteProduct; label: string }[] = [
  { value: 'sandwich', label: 'Sandwich' },
  { value: 'visible', label: 'Visible' },
  { value: 'infrared', label: 'Infrared' },
]

const PRIMARY_LAYERS: { value: PrimaryWeatherLayer; label: string }[] = [
  { value: 'radar', label: 'Radar' },
  { value: 'satellite', label: 'Satellite' },
  { value: 'hrrr', label: 'HRRR' },
]

const HRRR_VARIABLES: { value: HrrrVariable; label: string }[] = [
  { value: 'composite_reflectivity', label: 'Composite reflectivity' },
  { value: 'wind_gust', label: 'Surface wind gust' },
  { value: 'wind_speed_10m', label: '10 m wind speed' },
  { value: 'temperature_2m', label: '2 m temperature' },
  { value: 'dewpoint_2m', label: '2 m dew point' },
  { value: 'mucape', label: 'MUCAPE' },
]

export function MeteorologicalLayerControls({
  primaryLayer,
  satelliteUnderRadar,
  satelliteProduct,
  hrrrVariable,
  onPrimaryLayer,
  onSatelliteUnderRadar,
  onSatelliteProduct,
  onHrrrVariable,
}: MeteorologicalLayerControlsProps) {
  const satelliteActive = primaryLayer === 'satellite' || (primaryLayer === 'radar' && satelliteUnderRadar)
  return (
    <div className="swx-control">
      <h3 className="swx-control__title">Primary field</h3>
      <div className="swx-segmented" role="group" aria-label="Primary meteorological field">
        {PRIMARY_LAYERS.map((layer) => (
          <button
            key={layer.value}
            type="button"
            className={`swx-segmented__button ${primaryLayer === layer.value ? 'is-active' : ''}`}
            aria-pressed={primaryLayer === layer.value}
            onClick={() => onPrimaryLayer(layer.value)}
          >
            {layer.label}
          </button>
        ))}
      </div>

      {primaryLayer === 'radar' && (
        <label className="swx-checkbox">
          <input
            type="checkbox"
            checked={satelliteUnderRadar}
            onChange={(event) => onSatelliteUnderRadar(event.target.checked)}
          />
          Satellite background beneath radar
        </label>
      )}

      {satelliteActive && (
        <label className="swx-field">
          <span>Satellite product</span>
          <div className="swx-segmented" role="group" aria-label="Satellite product">
            {SATELLITE_PRODUCTS.map((product) => (
              <button
                key={product.value}
                type="button"
                className={`swx-segmented__button ${
                  satelliteProduct === product.value ? 'is-active' : ''
                }`}
                aria-pressed={satelliteProduct === product.value}
                onClick={() => onSatelliteProduct(product.value)}
              >
                {product.label}
              </button>
            ))}
          </div>
        </label>
      )}

      {primaryLayer === 'hrrr' && (
        <label className="swx-field">
          <span>HRRR variable</span>
          <select
            value={hrrrVariable}
            onChange={(event) => onHrrrVariable(event.target.value as HrrrVariable)}
          >
            {HRRR_VARIABLES.map((variable) => (
              <option key={variable.value} value={variable.value}>
                {variable.label}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  )
}

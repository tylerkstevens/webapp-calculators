import { useState } from 'react'
import { MapPin, Search, Loader2, AlertCircle } from 'lucide-react'
import { geocodeAddress } from '../api/weather'

interface LocationPickerProps {
  latitude: number | null
  longitude: number | null
  address: string
  onLocationChange: (lat: number, lon: number, address: string) => void
  disabled?: boolean
}

export function LocationPicker({
  latitude,
  longitude,
  address,
  onLocationChange,
  disabled = false,
}: LocationPickerProps) {
  const [inputAddress, setInputAddress] = useState(address)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showManual, setShowManual] = useState(false)
  const [manualLat, setManualLat] = useState('')
  const [manualLon, setManualLon] = useState('')

  const handleGeocode = async () => {
    if (!inputAddress.trim()) {
      setError('Please enter an address')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await geocodeAddress(inputAddress)
      if (result) {
        onLocationChange(result.latitude, result.longitude, result.displayName)
        setInputAddress(result.displayName)
      } else {
        setError('Address not found. Try a different format or use manual coordinates.')
      }
    } catch (err) {
      setError('Failed to geocode address. Please try again or use manual coordinates.')
    } finally {
      setLoading(false)
    }
  }

  const handleManualSubmit = () => {
    const lat = parseFloat(manualLat)
    const lon = parseFloat(manualLon)

    if (isNaN(lat) || isNaN(lon)) {
      setError('Please enter valid coordinates')
      return
    }

    if (lat < -90 || lat > 90) {
      setError('Latitude must be between -90 and 90')
      return
    }

    if (lon < -180 || lon > 180) {
      setError('Longitude must be between -180 and 180')
      return
    }

    setError(null)
    onLocationChange(lat, lon, `${lat.toFixed(4)}, ${lon.toFixed(4)}`)
    setShowManual(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleGeocode()
    }
  }

  return (
    <div className="space-y-3">
      {/* Address Input */}
      <div>
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
          Location
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 dark:text-surface-500" />
            <input
              type="text"
              value={inputAddress}
              onChange={(e) => setInputAddress(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter address, city, or ZIP code"
              disabled={disabled || loading}
              className="w-full pl-10 pr-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder-surface-400 dark:placeholder-surface-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-surface-100 dark:disabled:bg-surface-700 disabled:text-surface-500"
            />
          </div>
          <button
            type="button"
            onClick={handleGeocode}
            disabled={disabled || loading}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-surface-300 dark:disabled:bg-surface-600 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Search</span>
          </button>
        </div>
        <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
          Enter an address to automatically fetch climate data
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Location Display */}
      {latitude !== null && longitude !== null && (
        <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span>
            Location set: {latitude.toFixed(4)}°N, {longitude.toFixed(4)}°W
          </span>
        </div>
      )}

      {/* Manual Entry Toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowManual(!showManual)}
          className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 underline"
        >
          {showManual ? 'Hide manual entry' : 'Enter coordinates manually'}
        </button>
      </div>

      {/* Manual Coordinate Entry */}
      {showManual && (
        <div className="p-3 bg-surface-50 dark:bg-surface-800 rounded-lg space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">
                Latitude
              </label>
              <input
                type="number"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                placeholder="e.g., 40.7128"
                step="0.0001"
                className="w-full px-3 py-2 text-sm border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">
                Longitude
              </label>
              <input
                type="number"
                value={manualLon}
                onChange={(e) => setManualLon(e.target.value)}
                placeholder="e.g., -74.0060"
                step="0.0001"
                className="w-full px-3 py-2 text-sm border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleManualSubmit}
            className="w-full px-3 py-2 text-sm bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300 rounded-lg hover:bg-surface-300 dark:hover:bg-surface-600"
          >
            Set Coordinates
          </button>
        </div>
      )}
    </div>
  )
}

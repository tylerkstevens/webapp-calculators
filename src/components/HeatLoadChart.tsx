import { MONTH_ABBREV } from '../types/audit'

interface HeatLoadChartProps {
  monthlyHeatLoad: number[]
  title?: string
  className?: string
}

export function HeatLoadChart({
  monthlyHeatLoad,
  title = 'Monthly Heat Load Profile',
  className = '',
}: HeatLoadChartProps) {
  const maxLoad = Math.max(...monthlyHeatLoad, 1)
  const annualTotal = monthlyHeatLoad.reduce((sum, load) => sum + load, 0)

  return (
    <div className={`bg-white rounded-lg border border-surface-200 p-4 ${className}`}>
      <h3 className="text-sm font-semibold text-surface-700 mb-3">{title}</h3>

      {/* Bar Chart */}
      <div className="flex items-end justify-between gap-1 h-32 mb-2">
        {monthlyHeatLoad.map((load, index) => {
          const heightPct = (load / maxLoad) * 100
          const isHeatingMonth = load > 0

          return (
            <div
              key={index}
              className="flex-1 flex flex-col items-center"
            >
              <div
                className={`w-full rounded-t transition-all ${
                  isHeatingMonth ? 'bg-primary-500' : 'bg-surface-200'
                }`}
                style={{ height: `${Math.max(heightPct, 2)}%` }}
                title={`${MONTH_ABBREV[index]}: ${load.toFixed(0)} kWh`}
              />
            </div>
          )
        })}
      </div>

      {/* Month Labels */}
      <div className="flex justify-between text-[10px] text-surface-500 mb-3">
        {MONTH_ABBREV.map((month, index) => (
          <div key={index} className="flex-1 text-center">
            {month}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-surface-200 text-sm">
        <div>
          <span className="text-surface-500">Annual Total:</span>
          <span className="ml-1 font-semibold text-surface-700">
            {annualTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh
          </span>
        </div>
        <div>
          <span className="text-surface-500">Peak Month:</span>
          <span className="ml-1 font-semibold text-surface-700">
            {maxLoad.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh
          </span>
        </div>
      </div>
    </div>
  )
}

interface DutyCycleChartProps {
  monthlyDutyCycles: number[]
  className?: string
}

export function DutyCycleChart({
  monthlyDutyCycles,
  className = '',
}: DutyCycleChartProps) {
  const avgDutyCycle = monthlyDutyCycles.reduce((sum, dc) => sum + dc, 0) / 12
  const peakDutyCycle = Math.max(...monthlyDutyCycles)

  return (
    <div className={`bg-white rounded-lg border border-surface-200 p-4 ${className}`}>
      <h3 className="text-sm font-semibold text-surface-700 mb-3">Monthly Duty Cycle</h3>

      {/* Bar Chart */}
      <div className="flex items-end justify-between gap-1 h-24 mb-2">
        {monthlyDutyCycles.map((dc, index) => {
          const heightPct = dc * 100
          const isOverCapacity = dc >= 1.0

          return (
            <div
              key={index}
              className="flex-1 flex flex-col items-center"
            >
              <div
                className={`w-full rounded-t transition-all ${
                  isOverCapacity
                    ? 'bg-amber-500'
                    : dc > 0.8
                    ? 'bg-green-500'
                    : dc > 0
                    ? 'bg-primary-400'
                    : 'bg-surface-200'
                }`}
                style={{ height: `${Math.max(heightPct, 2)}%` }}
                title={`${MONTH_ABBREV[index]}: ${(dc * 100).toFixed(0)}%`}
              />
            </div>
          )
        })}
      </div>

      {/* Month Labels */}
      <div className="flex justify-between text-[10px] text-surface-500 mb-3">
        {MONTH_ABBREV.map((month, index) => (
          <div key={index} className="flex-1 text-center">
            {month}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-surface-600 mb-3">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>High (&gt;80%)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-amber-500" />
          <span>Over capacity</span>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-surface-200 text-sm">
        <div>
          <span className="text-surface-500">Avg Duty:</span>
          <span className="ml-1 font-semibold text-surface-700">
            {(avgDutyCycle * 100).toFixed(0)}%
          </span>
        </div>
        <div>
          <span className="text-surface-500">Peak Duty:</span>
          <span className={`ml-1 font-semibold ${
            peakDutyCycle >= 1.0 ? 'text-amber-600' : 'text-surface-700'
          }`}>
            {(peakDutyCycle * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  )
}

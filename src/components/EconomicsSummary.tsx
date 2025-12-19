import { FreezeFrameResult } from '../types/audit'
import ResultCard from './ResultCard'
import { DollarSign, Zap, TrendingUp, Clock, Percent } from 'lucide-react'

interface EconomicsSummaryProps {
  result: FreezeFrameResult
  className?: string
}

export function EconomicsSummary({ result, className = '' }: EconomicsSummaryProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)

  const formatCurrencyPrecise = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <h3 className="text-lg font-semibold text-surface-800 dark:text-surface-200">Economic Analysis</h3>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <ResultCard
          label="Annual Net Profit"
          value={formatCurrency(result.annualNetProfitUsd)}
          variant={result.annualNetProfitUsd > 0 ? 'success' : 'warning'}
          icon={<TrendingUp className="w-5 h-5" />}
        />

        <ResultCard
          label="Simple Payback"
          value={
            result.simplePaybackYears !== null
              ? `${result.simplePaybackYears.toFixed(1)} years`
              : 'N/A'
          }
          variant={
            result.simplePaybackYears !== null && result.simplePaybackYears < 5
              ? 'success'
              : 'default'
          }
          icon={<Clock className="w-5 h-5" />}
        />

        <ResultCard
          label="BTC Revenue"
          value={formatCurrency(result.annualBtcRevenueUsd)}
          subValue={`${result.revenueSplitBtcPct.toFixed(0)}% of revenue`}
          icon={<DollarSign className="w-5 h-5" />}
        />

        <ResultCard
          label="Heating Value"
          value={formatCurrency(result.annualHeatingValueUsd)}
          subValue={`${result.revenueSplitHeatPct.toFixed(0)}% of revenue`}
          icon={<Zap className="w-5 h-5" />}
        />
      </div>

      {/* Detailed Breakdown */}
      <div className="bg-surface-50 dark:bg-surface-800 rounded-lg p-4 space-y-3">
        <h4 className="text-sm font-semibold text-surface-700 dark:text-surface-300">Annual Breakdown</h4>

        <div className="space-y-2 text-sm">
          {/* Revenue */}
          <div className="flex justify-between">
            <span className="text-surface-600 dark:text-surface-400">Bitcoin Mining Revenue</span>
            <span className="font-medium text-green-600 dark:text-green-400">
              +{formatCurrency(result.annualBtcRevenueUsd)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-surface-600 dark:text-surface-400">Heating Value (fuel avoided)</span>
            <span className="font-medium text-green-600 dark:text-green-400">
              +{formatCurrency(result.annualHeatingValueUsd)}
            </span>
          </div>
          <div className="flex justify-between border-t border-surface-200 dark:border-surface-700 pt-2">
            <span className="text-surface-700 dark:text-surface-300 font-medium">Total Revenue</span>
            <span className="font-semibold text-green-700 dark:text-green-400">
              {formatCurrency(result.annualTotalRevenueUsd)}
            </span>
          </div>

          {/* Costs */}
          <div className="flex justify-between pt-2">
            <span className="text-surface-600 dark:text-surface-400">Electricity Cost</span>
            <span className="font-medium text-red-600 dark:text-red-400">
              -{formatCurrency(result.annualElectricityCostUsd)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-surface-600 dark:text-surface-400">Pool Fees</span>
            <span className="font-medium text-red-600 dark:text-red-400">
              -{formatCurrency(result.annualPoolFeeUsd)}
            </span>
          </div>
          <div className="flex justify-between border-t border-surface-200 dark:border-surface-700 pt-2">
            <span className="text-surface-700 dark:text-surface-300 font-medium">Total Costs</span>
            <span className="font-semibold text-red-700 dark:text-red-400">
              -{formatCurrency(result.annualTotalCostUsd)}
            </span>
          </div>

          {/* Net */}
          <div className="flex justify-between border-t-2 border-surface-300 dark:border-surface-600 pt-2">
            <span className="text-surface-800 dark:text-surface-200 font-semibold">Net Annual Profit</span>
            <span
              className={`font-bold ${
                result.annualNetProfitUsd > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
              }`}
            >
              {formatCurrency(result.annualNetProfitUsd)}
            </span>
          </div>
        </div>
      </div>

      {/* Effective Heating Cost */}
      <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Percent className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          <h4 className="text-sm font-semibold text-primary-800 dark:text-primary-300">
            Effective Heating Cost
          </h4>
        </div>
        <p className="text-2xl font-bold text-primary-700 dark:text-primary-300">
          {formatCurrencyPrecise(result.effectiveHeatingCostPerKwh)}/kWh
        </p>
        <p className="text-xs text-primary-600 dark:text-primary-400 mt-1">
          {result.effectiveHeatingCostPerKwh < 0
            ? 'You are being paid to heat your home!'
            : 'Net cost of heating after BTC mining revenue'}
        </p>
      </div>

      {/* Revenue Split Visualization */}
      <div className="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 p-4">
        <h4 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-3">Revenue Split</h4>
        <div className="h-4 rounded-full overflow-hidden flex bg-surface-200 dark:bg-surface-700">
          <div
            className="bg-primary-500 transition-all"
            style={{ width: `${result.revenueSplitBtcPct}%` }}
          />
          <div
            className="bg-amber-500 transition-all"
            style={{ width: `${result.revenueSplitHeatPct}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-primary-500" />
            <span className="text-surface-600 dark:text-surface-400">
              BTC: {result.revenueSplitBtcPct.toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-amber-500" />
            <span className="text-surface-600 dark:text-surface-400">
              Heating: {result.revenueSplitHeatPct.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

import { MonthlyBillInput, MONTH_ABBREV, FuelType } from '../types/audit'
import { FUEL_TYPE_UNITS } from '../calculations/conversions'

interface MonthlyBillsTableProps {
  bills: MonthlyBillInput[]
  fuelType: FuelType
  onChange: (bills: MonthlyBillInput[]) => void
  hddData?: number[]
  disabled?: boolean
}

export function MonthlyBillsTable({
  bills,
  fuelType,
  onChange,
  hddData,
  disabled = false,
}: MonthlyBillsTableProps) {
  const handleChange = (month: number, field: 'fuelQuantity' | 'totalCost', value: string) => {
    const newBills = bills.map(bill =>
      bill.month === month ? { ...bill, [field]: value } : bill
    )
    onChange(newBills)
  }

  const fuelUnit = FUEL_TYPE_UNITS[fuelType]

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-200 dark:border-surface-700">
            <th className="px-2 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Month</th>
            <th className="px-2 py-2 text-left font-medium text-surface-600 dark:text-surface-400">
              Usage ({fuelUnit})
            </th>
            <th className="px-2 py-2 text-left font-medium text-surface-600 dark:text-surface-400">Cost ($)</th>
            {hddData && (
              <th className="px-2 py-2 text-left font-medium text-surface-600 dark:text-surface-400">HDD</th>
            )}
          </tr>
        </thead>
        <tbody>
          {bills.map((bill, index) => (
            <tr
              key={bill.month}
              className={index % 2 === 0 ? 'bg-surface-50 dark:bg-surface-800' : 'bg-white dark:bg-surface-900'}
            >
              <td className="px-2 py-1.5 font-medium text-surface-700 dark:text-surface-300">
                {MONTH_ABBREV[bill.month - 1]}
              </td>
              <td className="px-2 py-1.5">
                <input
                  type="number"
                  value={bill.fuelQuantity}
                  onChange={(e) => handleChange(bill.month, 'fuelQuantity', e.target.value)}
                  disabled={disabled}
                  min="0"
                  step="0.1"
                  placeholder="0"
                  className="w-full px-2 py-1 text-sm border border-surface-300 dark:border-surface-600 rounded bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:bg-surface-100 dark:disabled:bg-surface-800"
                />
              </td>
              <td className="px-2 py-1.5">
                <input
                  type="number"
                  value={bill.totalCost}
                  onChange={(e) => handleChange(bill.month, 'totalCost', e.target.value)}
                  disabled={disabled}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-2 py-1 text-sm border border-surface-300 dark:border-surface-600 rounded bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:bg-surface-100 dark:disabled:bg-surface-800"
                />
              </td>
              {hddData && (
                <td className="px-2 py-1.5 text-surface-500 dark:text-surface-400">
                  {hddData[index]?.toFixed(0) || '—'}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-surface-500 dark:text-surface-400">
        Enter your heating fuel usage and cost for each month. Leave summer months empty or zero.
      </p>
    </div>
  )
}

/**
 * Create initial empty bill data for form.
 */
export function createEmptyBillInputs(): MonthlyBillInput[] {
  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    fuelQuantity: '',
    totalCost: '',
  }))
}

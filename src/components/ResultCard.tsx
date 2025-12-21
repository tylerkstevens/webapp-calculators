import { ReactNode } from 'react'

interface ResultCardProps {
  label: string
  value: string | number
  subValue?: string
  icon?: ReactNode
  variant?: 'default' | 'highlight' | 'success' | 'warning'
}

export default function ResultCard({
  label,
  value,
  subValue,
  icon,
  variant = 'default',
}: ResultCardProps) {
  const variantStyles = {
    default: 'bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700',
    highlight: 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800',
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
  }

  const valueStyles = {
    default: 'text-surface-900 dark:text-surface-100',
    highlight: 'text-primary-700 dark:text-primary-300',
    success: 'text-green-700 dark:text-green-300',
    warning: 'text-amber-700 dark:text-amber-300',
  }

  return (
    <div className={`rounded-xl border p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 ${variantStyles[variant]}`}>
      <div className="flex items-start gap-3">
        {icon && (
          <div className={`mt-1 ${valueStyles[variant]}`}>
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-surface-600 dark:text-surface-400 mb-1">{label}</p>
          <p className={`text-2xl font-bold ${valueStyles[variant]}`}>
            {value}
          </p>
          {subValue && (
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">{subValue}</p>
          )}
        </div>
      </div>
    </div>
  )
}

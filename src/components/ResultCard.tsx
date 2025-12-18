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
    default: 'bg-white border-surface-200',
    highlight: 'bg-primary-50 border-primary-200',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-amber-50 border-amber-200',
  }

  const valueStyles = {
    default: 'text-surface-900',
    highlight: 'text-primary-700',
    success: 'text-green-700',
    warning: 'text-amber-700',
  }

  return (
    <div className={`rounded-xl border p-4 ${variantStyles[variant]}`}>
      <div className="flex items-start gap-3">
        {icon && (
          <div className={`mt-1 ${valueStyles[variant]}`}>
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-surface-600 mb-1">{label}</p>
          <p className={`text-2xl font-bold ${valueStyles[variant]}`}>
            {value}
          </p>
          {subValue && (
            <p className="text-sm text-surface-500 mt-1">{subValue}</p>
          )}
        </div>
      </div>
    </div>
  )
}

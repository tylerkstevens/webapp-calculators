import { ReactNode } from 'react'
import { HelpCircle } from 'lucide-react'

interface InputFieldProps {
  label: string
  value: number | string
  onChange: (value: string) => void
  type?: 'number' | 'text'
  prefix?: string
  suffix?: string
  min?: number
  max?: number
  step?: number
  placeholder?: string
  helpText?: string
  icon?: ReactNode
  tooltip?: string
}

export default function InputField({
  label,
  value,
  onChange,
  type = 'number',
  prefix,
  suffix,
  min,
  max,
  step,
  placeholder,
  helpText,
  icon,
  tooltip,
}: InputFieldProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">
          {label}
        </label>
        {tooltip && (
          <div className="group/tip relative inline-flex items-center">
            <HelpCircle className="w-3.5 h-3.5 text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-300 cursor-help" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-800 dark:bg-surface-700 text-white text-xs rounded-lg scale-95 opacity-0 pointer-events-none group-hover/tip:scale-100 group-hover/tip:opacity-100 group-hover/tip:pointer-events-auto transition-all duration-150 w-64 z-[100] whitespace-normal shadow-lg">
              {tooltip}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-surface-800 dark:border-t-surface-700" />
            </div>
          </div>
        )}
      </div>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-500">
            {icon}
          </div>
        )}
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500 dark:text-surface-400">
            {prefix}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          className={`
            w-full px-4 py-2.5 rounded-lg border border-surface-300 dark:border-surface-600
            bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder-surface-400 dark:placeholder-surface-500
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
            transition-shadow duration-200
            ${icon ? 'pl-10' : ''}
            ${prefix ? 'pl-8' : ''}
            ${suffix ? 'pr-12' : ''}
          `}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 dark:text-surface-400 text-sm">
            {suffix}
          </span>
        )}
      </div>
      {helpText && (
        <p className="text-xs text-surface-500 dark:text-surface-400">{helpText}</p>
      )}
    </div>
  )
}

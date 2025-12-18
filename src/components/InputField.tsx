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
        <label className="block text-sm font-medium text-surface-700">
          {label}
        </label>
        {tooltip && (
          <div className="group relative inline-block">
            <HelpCircle className="w-3.5 h-3.5 text-surface-400 hover:text-surface-600 cursor-help" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 w-64 z-50 whitespace-normal">
              {tooltip}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-surface-800" />
            </div>
          </div>
        )}
      </div>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400">
            {icon}
          </div>
        )}
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500">
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
            w-full px-4 py-2.5 rounded-lg border border-surface-300
            bg-white text-surface-900 placeholder-surface-400
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
            transition-shadow duration-200
            ${icon ? 'pl-10' : ''}
            ${prefix ? 'pl-8' : ''}
            ${suffix ? 'pr-12' : ''}
          `}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 text-sm">
            {suffix}
          </span>
        )}
      </div>
      {helpText && (
        <p className="text-xs text-surface-500">{helpText}</p>
      )}
    </div>
  )
}

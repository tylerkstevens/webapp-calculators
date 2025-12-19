import { Building2, HardHat } from 'lucide-react'

type BuildingType = 'existing' | 'new'

interface BuildingTypeToggleProps {
  value: BuildingType
  onChange: (value: BuildingType) => void
}

export function BuildingTypeToggle({ value, onChange }: BuildingTypeToggleProps) {
  return (
    <div className="flex rounded-lg bg-surface-100 dark:bg-surface-800 p-1">
      <button
        type="button"
        onClick={() => onChange('existing')}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
          value === 'existing'
            ? 'bg-white dark:bg-surface-700 text-primary-600 dark:text-primary-400 shadow-sm'
            : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-200'
        }`}
      >
        <Building2 className="w-4 h-4" />
        <span>Existing Building</span>
      </button>
      <button
        type="button"
        onClick={() => onChange('new')}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
          value === 'new'
            ? 'bg-white dark:bg-surface-700 text-primary-600 dark:text-primary-400 shadow-sm'
            : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-200'
        }`}
      >
        <HardHat className="w-4 h-4" />
        <span>New Construction</span>
      </button>
    </div>
  )
}

import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark')
    } else if (theme === 'dark') {
      setTheme('auto')
    } else {
      setTheme('light')
    }
  }

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="w-4 h-4 sm:w-5 sm:h-5" />
      case 'dark':
        return <Moon className="w-4 h-4 sm:w-5 sm:h-5" />
      case 'auto':
        return <Monitor className="w-4 h-4 sm:w-5 sm:h-5" />
    }
  }

  const getLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light'
      case 'dark':
        return 'Dark'
      case 'auto':
        return 'Auto'
    }
  }

  return (
    <button
      onClick={cycleTheme}
      className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
      title={`Theme: ${getLabel()} (click to change)`}
    >
      {getIcon()}
      <span className="text-xs sm:text-sm font-medium hidden xs:inline">{getLabel()}</span>
    </button>
  )
}

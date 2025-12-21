import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()

  const toggleTheme = () => {
    if (theme === 'auto') {
      setTheme('light')
    } else if (theme === 'light') {
      setTheme('dark')
    } else {
      setTheme('auto')
    }
  }

  // Combined sun/moon icon for system/auto theme
  const SystemIcon = () => (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Sun rays */}
      <path
        d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      <circle
        cx="12"
        cy="12"
        r="5"
        fill="currentColor"
        opacity="0.3"
        clipPath="url(#leftHalf)"
      />
      {/* Moon shape */}
      <path
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
        fill="currentColor"
        opacity="0.7"
        clipPath="url(#rightHalf)"
      />
      <defs>
        <clipPath id="leftHalf">
          <rect x="0" y="0" width="12" height="24" />
        </clipPath>
        <clipPath id="rightHalf">
          <rect x="12" y="0" width="12" height="24" />
        </clipPath>
      </defs>
    </svg>
  )

  const getIcon = () => {
    if (theme === 'auto') {
      return <SystemIcon />
    } else if (resolvedTheme === 'dark') {
      return <Moon className="h-5 w-5" />
    } else {
      return <Sun className="h-5 w-5" />
    }
  }

  const getTooltip = () => {
    if (theme === 'auto') {
      return `System (${resolvedTheme})`
    } else if (theme === 'dark') {
      return 'Dark mode'
    } else {
      return 'Light mode'
    }
  }

  return (
    <button
      onClick={toggleTheme}
      className="w-10 h-10 flex items-center justify-center bg-surface-100 dark:bg-surface-800 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
      aria-label={`Toggle theme - ${getTooltip()}`}
      title={getTooltip()}
    >
      {getIcon()}
    </button>
  )
}

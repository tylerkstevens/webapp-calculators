import { Outlet, Link, useLocation } from 'react-router-dom'
import { Flame, Sun, Zap, ClipboardList, Home, Calculator } from 'lucide-react'

const navItems = [
  { path: '/', label: 'Home', shortLabel: 'Home', icon: Home },
  { path: '/hashrate', label: 'Hashrate Heating', shortLabel: 'Heating', icon: Flame },
  { path: '/solar', label: 'Solar Mining', shortLabel: 'Solar', icon: Sun },
  { path: '/combined', label: 'Heat + Solar', shortLabel: 'Combined', icon: Zap },
  { path: '/audit', label: 'Exergy Audit', shortLabel: 'Audit', icon: ClipboardList },
]

export default function Layout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-surface-50 pb-16 md:pb-0">
      {/* Header */}
      <header className="bg-white border-b border-surface-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-base sm:text-lg text-surface-900">
                Exergy Calculators
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                      transition-colors duration-200
                      ${isActive
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-surface-200 z-50 safe-area-bottom">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex flex-col items-center justify-center gap-0.5 px-2 py-2 min-w-[60px] rounded-lg
                  transition-colors duration-200
                  ${isActive
                    ? 'text-primary-600'
                    : 'text-surface-500'
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary-600' : 'text-surface-400'}`} />
                <span className="text-[10px] font-medium">{item.shortLabel}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-surface-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-surface-500">
            Powered by{' '}
            <a
              href="https://exergyheat.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Exergy
            </a>
            {' '}— Hashrate Heating Solutions
          </p>
        </div>
      </footer>
    </div>
  )
}

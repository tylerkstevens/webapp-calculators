import { Outlet, Link, useLocation } from 'react-router-dom'
import { Flame, Sun, Zap, ClipboardList, Home, Calculator } from 'lucide-react'

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/hashrate', label: 'Hashrate Heating', icon: Flame },
  { path: '/solar', label: 'Solar Mining', icon: Sun },
  { path: '/combined', label: 'Heat + Solar', icon: Zap },
  { path: '/audit', label: 'Exergy Audit', icon: ClipboardList },
]

export default function Layout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <header className="bg-white border-b border-surface-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-lg text-surface-900">
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

        {/* Mobile Navigation */}
        <nav className="md:hidden border-t border-surface-200 px-4 py-2 flex gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap
                  transition-colors duration-200
                  ${isActive
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-surface-600 hover:bg-surface-100'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </header>

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

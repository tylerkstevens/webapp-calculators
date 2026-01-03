import { Outlet, Link, useLocation } from 'react-router-dom'
import { Flame, Home, Calculator, Github, Mail, MapPin, Sun } from 'lucide-react'
import MainNavbar from './MainNavbar'

const navItems = [
  { path: '/', label: 'Home', shortLabel: 'Home', icon: Home },
  { path: '/hashrate', label: 'Hashrate Heating', shortLabel: 'Heating', icon: Flame },
  { path: '/solar', label: 'Solar Monetization', shortLabel: 'Solar', icon: Sun },
]

export default function Layout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900 pb-16 md:pb-0 transition-colors">
      {/* Main Navbar - matches main website */}
      <MainNavbar />

      {/* Calculator Sub-Navigation */}
      <header className="bg-white dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-700 sticky top-0 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary-500 rounded flex items-center justify-center">
                <Calculator className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium text-sm text-surface-700 dark:text-surface-200">
                Calculators
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
                      flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
                      transition-colors duration-200
                      ${isActive
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                        : 'text-surface-600 dark:text-surface-300 hover:text-primary-500 dark:hover:text-primary-400'
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-surface-800 border-t border-surface-200 dark:border-surface-700 z-50 safe-area-bottom transition-colors">
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
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-surface-500 dark:text-surface-400'
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-surface-400 dark:text-surface-500'}`} />
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

      {/* Footer - matches main website */}
      <footer className="bg-surface-900 text-surface-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div>
              <a href="https://exergyheat.com" className="flex items-center hover:opacity-80 transition-opacity">
                <img
                  src="https://exergyheat.com/Logo1_black_horizontal.png"
                  alt="EXERGY"
                  className="h-8 w-auto filter brightness-0 invert"
                />
              </a>
              <p className="mt-4 font-body text-surface-400">
                Heat That Pays
              </p>
            </div>

            {/* Home Links */}
            <div>
              <a href="https://exergyheat.com" className="text-lg font-subheading mb-4 text-surface-100 hover:text-surface-200 transition-colors">Home</a>
              <ul className="space-y-2 mt-4">
                <li>
                  <a href="https://exergyheat.com/products" className="font-body text-surface-400 hover:text-surface-200 transition-colors">Products</a>
                </li>
                <li>
                  <a href="https://exergyheat.com/services" className="font-body text-surface-400 hover:text-surface-200 transition-colors">Services</a>
                </li>
                <li>
                  <a href="https://exergyheat.com/about" className="font-body text-surface-400 hover:text-surface-200 transition-colors">About</a>
                </li>
                <li>
                  <a href="https://exergyheat.com/portfolio" className="font-body text-surface-400 hover:text-surface-200 transition-colors">Portfolio</a>
                </li>
              </ul>
            </div>

            {/* Learn Links */}
            <div>
              <a href="https://exergyheat.com/learn" className="text-lg font-subheading mb-4 text-surface-100 hover:text-surface-200 transition-colors">Learn</a>
              <ul className="space-y-2 mt-4">
                <li>
                  <Link to="/" className="font-body text-surface-400 hover:text-surface-200 transition-colors">Calculators</Link>
                </li>
                <li>
                  <a href="https://docs.exergyheat.com" target="_blank" rel="noopener noreferrer" className="font-body text-surface-400 hover:text-surface-200 transition-colors">Docs</a>
                </li>
                <li>
                  <a href="https://support.exergyheat.com" target="_blank" rel="noopener noreferrer" className="font-body text-surface-400 hover:text-surface-200 transition-colors">Support</a>
                </li>
                <li>
                  <a href="https://exergyheat.com/faq" className="font-body text-surface-400 hover:text-surface-200 transition-colors">FAQ</a>
                </li>
                <li>
                  <a href="https://exergyheat.com/blog" className="font-body text-surface-400 hover:text-surface-200 transition-colors">Blog</a>
                </li>
              </ul>
            </div>

            {/* Connect With Us */}
            <div>
              <h3 className="text-lg font-subheading mb-4">Connect With Us</h3>
              <div className="space-y-3 mb-6">
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-primary-500" />
                  <a href="mailto:contact@exergyheat.com" className="ml-2 font-body text-surface-400 hover:text-surface-200 transition-colors">
                    contact@exergyheat.com
                  </a>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-primary-500" />
                  <a
                    href="https://maps.app.goo.gl/bp9d8a3GEpfzv3Kg7"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 font-body text-surface-400 hover:text-surface-200 transition-colors"
                  >
                    3700 N Franklin St. Denver, CO 80205
                  </a>
                </div>
              </div>
              <div className="flex space-x-4">
                <a
                  href="https://x.com/exergy_llc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-surface-400 hover:text-surface-200 transition-colors"
                >
                  <svg
                    className="h-6 w-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a
                  href="https://github.com/exergyheat"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-surface-400 hover:text-surface-200 transition-colors"
                >
                  <Github className="h-6 w-6" />
                </a>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-surface-800 text-center font-body text-surface-400">
            <p>&copy; {new Date().getFullYear()} EXERGY. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

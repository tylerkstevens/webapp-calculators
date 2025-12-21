import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import ThemeToggle from './ThemeToggle'

export default function MainNavbar() {
  const [isOpen, setIsOpen] = useState(false)

  const navLinks = [
    { href: 'https://exergyheat.com/products', label: 'Products' },
    { href: 'https://exergyheat.com/services', label: 'Services' },
    { href: 'https://exergyheat.com/about', label: 'About' },
    { href: 'https://exergyheat.com/learn', label: 'Learn' },
    { href: 'https://exergyheat.com/contact', label: 'Contact' },
  ]

  return (
    <nav className="bg-surface-50 dark:bg-surface-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <a href="https://exergyheat.com" className="flex items-center hover:opacity-80 transition-opacity">
              <img
                src="https://exergyheat.com/Logo1_black_horizontal.png"
                alt="EXERGY"
                className="h-10 w-auto dark:filter dark:brightness-0 dark:invert"
              />
            </a>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="font-subheading text-surface-600 dark:text-surface-300 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
              >
                {link.label}
              </a>
            ))}
            <ThemeToggle />
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-4">
            <ThemeToggle />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-surface-600 dark:text-surface-300 hover:text-primary-500 dark:hover:text-primary-400 focus:outline-none transition-colors"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="block px-3 py-2 font-subheading text-surface-600 dark:text-surface-300 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

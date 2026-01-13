import { LucideIcon } from 'lucide-react'
import { Flame, Sun, MessageCircle, BookOpen, Github } from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export interface Calculator {
  path: string
  title: string
  description: string
  icon: LucideIcon
  color: string
}

export interface ExternalLink {
  href: string
  icon: LucideIcon
  label: string
}

// ============================================================================
// Data
// ============================================================================

export const calculators: Calculator[] = [
  {
    path: '/hashrate',
    title: 'Hashrate Heating Calculator',
    description: 'The quickest way to compare hashrate heating against traditional fuels. Enter your electricity rate, current heating setup, and preferred hashrate heater to see your estimated savings percentage.',
    icon: Flame,
    color: 'bg-orange-500',
  },
  {
    path: '/solar',
    title: 'Solar Monetization Calculator',
    description: 'Estimate bitcoin mining revenue from your solar PV system. Enter your system size or actual production data to see annual BTC earnings, monthly breakdowns, and compare mining revenue to net metering credits.',
    icon: Sun,
    color: 'bg-yellow-500',
  },
]

export const externalLinks: ExternalLink[] = [
  {
    href: 'https://support.exergyheat.com',
    icon: MessageCircle,
    label: 'Community & Support Forum',
  },
  {
    href: 'https://docs.exergyheat.com',
    icon: BookOpen,
    label: 'Calculator Documentation',
  },
  {
    href: 'https://github.com/exergyheat',
    icon: Github,
    label: 'Github Repository',
  },
]

// ============================================================================
// Shared Styles
// ============================================================================

export const externalLinkClass = 'flex flex-col items-center gap-3 p-6 sm:p-8 rounded-xl bg-white dark:bg-surface-800 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 text-center'

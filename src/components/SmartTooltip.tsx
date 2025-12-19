import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { HelpCircle } from 'lucide-react'

interface SmartTooltipProps {
  content: string
}

type Placement = 'top' | 'bottom'
type Alignment = 'left' | 'center' | 'right'

export default function SmartTooltip({ content }: SmartTooltipProps) {
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [placement, setPlacement] = useState<Placement>('top')
  const [alignment, setAlignment] = useState<Alignment>('center')

  // Use layoutEffect to calculate position before paint
  useLayoutEffect(() => {
    if (!isVisible || !triggerRef.current || !tooltipRef.current) return

    const trigger = triggerRef.current.getBoundingClientRect()
    const tooltip = tooltipRef.current.getBoundingClientRect()
    const padding = 12 // viewport edge padding
    const arrowHeight = 8

    // Calculate horizontal alignment
    const tooltipWidth = tooltip.width
    let align: Alignment = 'center'
    let x = trigger.left + trigger.width / 2 - tooltipWidth / 2

    if (x < padding) {
      // Not enough space on left - align tooltip's left edge to trigger's left
      align = 'left'
      x = Math.max(padding, trigger.left)
    } else if (x + tooltipWidth > window.innerWidth - padding) {
      // Not enough space on right - align tooltip's right edge to trigger's right
      align = 'right'
      x = Math.min(window.innerWidth - padding - tooltipWidth, trigger.right - tooltipWidth)
    }

    // Calculate vertical placement
    const spaceAbove = trigger.top
    const spaceBelow = window.innerHeight - trigger.bottom
    const tooltipHeight = tooltip.height + arrowHeight

    let place: Placement = 'top'
    let y = trigger.top - tooltipHeight

    if (spaceAbove < tooltipHeight + padding && spaceBelow > spaceAbove) {
      // Not enough space above, flip to bottom
      place = 'bottom'
      y = trigger.bottom + arrowHeight
    }

    // Ensure y doesn't go negative
    if (y < padding) {
      y = padding
    }

    setPosition({ x, y })
    setPlacement(place)
    setAlignment(align)
  }, [isVisible])

  // Recalculate on scroll/resize while visible
  useEffect(() => {
    if (!isVisible) return

    const handleReposition = () => {
      // Trigger recalculation
      setIsVisible(false)
      setTimeout(() => setIsVisible(true), 0)
    }

    window.addEventListener('scroll', handleReposition, true)
    window.addEventListener('resize', handleReposition)

    return () => {
      window.removeEventListener('scroll', handleReposition, true)
      window.removeEventListener('resize', handleReposition)
    }
  }, [isVisible])

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <HelpCircle className="w-4 h-4 text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-300 cursor-help" />
      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-[100] px-3 py-2 bg-surface-800 dark:bg-surface-700 text-white text-xs rounded-lg shadow-lg max-w-[calc(100vw-24px)] w-56 sm:w-64"
          style={{ left: position.x, top: position.y }}
        >
          {content}
          {/* Arrow - positioned based on alignment and placement */}
          <div
            className={`absolute border-4 border-transparent ${
              placement === 'top'
                ? 'top-full border-t-surface-800 dark:border-t-surface-700'
                : 'bottom-full border-b-surface-800 dark:border-b-surface-700'
            } ${
              alignment === 'left'
                ? 'left-4'
                : alignment === 'right'
                  ? 'right-4'
                  : 'left-1/2 -translate-x-1/2'
            }`}
          />
        </div>
      )}
    </div>
  )
}

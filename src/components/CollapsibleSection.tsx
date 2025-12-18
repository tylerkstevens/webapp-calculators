import React, { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface CollapsibleSectionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
  className?: string
}

export function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
  className = '',
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={`border border-surface-200 rounded-lg overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between bg-surface-50 hover:bg-surface-100 transition-colors"
      >
        <span className="font-medium text-surface-700">{title}</span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-surface-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-surface-500" />
        )}
      </button>
      {isOpen && (
        <div className="p-4 border-t border-surface-200 bg-white">
          {children}
        </div>
      )}
    </div>
  )
}

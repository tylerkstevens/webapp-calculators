import { useState, useCallback } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import type { InputSummaryItem } from '../types/pdfExport'

export interface UsePdfExportOptions {
  filename?: string
  quality?: number
  scale?: number
  format?: 'a4' | 'letter'
  margins?: {
    top: number
    right: number
    bottom: number
    left: number
  }
  title?: string
  inputSummary?: InputSummaryItem[]
}

// Force light mode on cloned element for print-friendly output
function forceLightMode(element: HTMLElement): void {
  const allElements = element.querySelectorAll('*')
  const elementsToProcess = [element, ...Array.from(allElements)] as HTMLElement[]

  elementsToProcess.forEach(el => {
    // Remove dark: prefixed classes
    const classes = Array.from(el.classList)
    classes.forEach(cls => {
      if (cls.startsWith('dark:')) {
        el.classList.remove(cls)
      }
    })

    // Swap dark surface backgrounds to light
    if (el.classList.contains('bg-surface-800')) {
      el.classList.remove('bg-surface-800')
      el.classList.add('bg-white')
    }
    if (el.classList.contains('bg-surface-900')) {
      el.classList.remove('bg-surface-900')
      el.classList.add('bg-gray-50')
    }
    if (el.classList.contains('bg-surface-700')) {
      el.classList.remove('bg-surface-700')
      el.classList.add('bg-gray-100')
    }

    // Force dark text on light text classes
    if (el.classList.contains('text-surface-100')) {
      el.classList.remove('text-surface-100')
      el.classList.add('text-gray-900')
    }
    if (el.classList.contains('text-surface-200')) {
      el.classList.remove('text-surface-200')
      el.classList.add('text-gray-800')
    }
    if (el.classList.contains('text-surface-300')) {
      el.classList.remove('text-surface-300')
      el.classList.add('text-gray-700')
    }
    if (el.classList.contains('text-surface-400')) {
      el.classList.remove('text-surface-400')
      el.classList.add('text-gray-600')
    }
  })
}

// Render input summary as HTML string
function renderInputSummaryHtml(title: string, inputs: InputSummaryItem[]): string {
  // Group inputs by category
  const grouped = inputs.reduce((acc, input) => {
    const category = input.category || 'General'
    if (!acc[category]) acc[category] = []
    acc[category].push(input)
    return acc
  }, {} as Record<string, InputSummaryItem[]>)

  const categoryHtml = Object.entries(grouped).map(([category, items]) => `
    <div style="margin-bottom: 12px;">
      <div style="font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
        ${category}
      </div>
      ${items.map(item => `
        <div style="display: flex; justify-content: space-between; font-size: 12px; padding: 2px 0;">
          <span style="color: #6b7280;">${item.label}:</span>
          <span style="color: #111827; font-weight: 500;">${item.value}</span>
        </div>
      `).join('')}
    </div>
  `).join('')

  return `
    <div style="padding: 16px 20px; border-bottom: 2px solid #e5e7eb; margin-bottom: 16px;">
      <div style="font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 12px;">
        ${title}
      </div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
        ${categoryHtml}
      </div>
    </div>
  `
}

export function usePdfExport(options: UsePdfExportOptions = {}) {
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    filename = 'export.pdf',
    quality = 0.95,
    scale = 2,
    format = 'a4',
    margins = { top: 15, right: 15, bottom: 15, left: 15 },
    title,
    inputSummary
  } = options

  const exportToPdf = useCallback(async (elementId: string) => {
    setIsExporting(true)
    setError(null)

    let printContainer: HTMLDivElement | null = null

    try {
      const element = document.getElementById(elementId)
      if (!element) {
        throw new Error(`Element #${elementId} not found`)
      }

      // Page dimensions in mm
      const pageDimensions = {
        a4: { width: 210, height: 297 },
        letter: { width: 215.9, height: 279.4 }
      }
      const { width: pageWidth, height: pageHeight } = pageDimensions[format]

      // Content area after margins
      const contentWidth = pageWidth - margins.left - margins.right

      // Convert mm to pixels (96 dpi = 3.78 px/mm)
      const pxPerMm = 3.78
      const containerWidthPx = contentWidth * pxPerMm * scale

      // Create temporary off-screen container for print-ready content
      printContainer = document.createElement('div')
      printContainer.id = 'pdf-print-container'
      printContainer.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: ${containerWidthPx}px;
        background: white;
        color: #1a1a1a;
        font-family: 'Futura PT', 'Futura', 'Avenir', 'Helvetica Neue', sans-serif;
        padding: 0;
      `

      // Add input summary if provided
      if (inputSummary && inputSummary.length > 0 && title) {
        const summaryDiv = document.createElement('div')
        summaryDiv.innerHTML = renderInputSummaryHtml(title, inputSummary)
        printContainer.appendChild(summaryDiv)
      }

      // Clone results content and force light mode
      const clonedResults = element.cloneNode(true) as HTMLElement
      clonedResults.removeAttribute('id') // Avoid duplicate IDs
      forceLightMode(clonedResults)

      // Add some padding to the cloned results
      clonedResults.style.padding = '0 20px 20px 20px'
      printContainer.appendChild(clonedResults)

      document.body.appendChild(printContainer)

      // Check for canvas size limits
      if (printContainer.scrollHeight > 32767) {
        throw new Error('Content too large to export')
      }

      // Capture canvas with high quality settings
      const canvas = await html2canvas(printContainer, {
        scale,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: printContainer.scrollWidth,
        windowHeight: printContainer.scrollHeight,
      })

      // Calculate image dimensions to fit content width with margins
      const imgWidth = contentWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      // Content height per page (accounting for margins)
      const contentHeightPerPage = pageHeight - margins.top - margins.bottom

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format,
      })

      const imgData = canvas.toDataURL('image/png', quality)

      // Handle multi-page if content is taller than one page
      let position = 0
      let pageCount = 0

      while (position < imgHeight) {
        if (pageCount > 0) {
          pdf.addPage()
        }
        // Add image with margins, offset by current position
        pdf.addImage(
          imgData,
          'PNG',
          margins.left,
          margins.top - position,
          imgWidth,
          imgHeight
        )
        position += contentHeightPerPage
        pageCount++
      }

      // Add timestamp footer on last page
      const now = new Date()
      const timestamp = now.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      pdf.setFontSize(8)
      pdf.setTextColor(128, 128, 128)
      pdf.text(`Generated: ${timestamp}`, margins.left, pageHeight - 5)

      // Download
      pdf.save(filename)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed'
      setError(message)
      console.error('PDF export error:', err)
    } finally {
      // Clean up temporary container
      if (printContainer && printContainer.parentNode) {
        printContainer.parentNode.removeChild(printContainer)
      }
      setIsExporting(false)
    }
  }, [filename, quality, scale, format, margins, title, inputSummary])

  return { exportToPdf, isExporting, error }
}

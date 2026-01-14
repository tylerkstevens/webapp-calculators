import { useState, useCallback } from 'react'
import type { HashrateHeatingReportData, SolarMiningReportData } from '../pdf/types'

interface UsePdfReportOptions {
  filename?: string
}

export function usePdfReport(options: UsePdfReportOptions = {}) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { filename = 'report.pdf' } = options

  const downloadBlob = useCallback((blob: Blob, downloadFilename: string) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = downloadFilename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [])

  // Generic report generator - handles state, imports, and error handling
  const generateReport = useCallback(
    async <T,>(
      data: T,
      importReport: () => Promise<{ default: React.ComponentType<{ data: T }> }>
    ) => {
      setIsGenerating(true)
      setError(null)

      try {
        const [{ pdf }, { default: Report }] = await Promise.all([
          import('@react-pdf/renderer'),
          importReport()
        ])

        const doc = <Report data={data} />
        const blob = await pdf(doc).toBlob()
        downloadBlob(blob, filename)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate PDF'
        setError(message)
        console.error('PDF generation error:', err)
      } finally {
        setIsGenerating(false)
      }
    },
    [filename, downloadBlob]
  )

  // Type-safe wrappers for specific report types
  const generateHashrateReport = useCallback(
    (data: HashrateHeatingReportData) =>
      generateReport(data, () => import('../pdf/reports/HashrateHeatingReport')),
    [generateReport]
  )

  const generateSolarReport = useCallback(
    (data: SolarMiningReportData) =>
      generateReport(data, () => import('../pdf/reports/SolarMiningReport')),
    [generateReport]
  )

  return {
    generateHashrateReport,
    generateSolarReport,
    isGenerating,
    error,
  }
}

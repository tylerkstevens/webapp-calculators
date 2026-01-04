import { useState, useCallback } from 'react'
import { pdf } from '@react-pdf/renderer'
import HashrateHeatingReport from '../pdf/reports/HashrateHeatingReport'
import SolarMiningReport from '../pdf/reports/SolarMiningReport'
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

  const generateHashrateReport = useCallback(
    async (data: HashrateHeatingReportData) => {
      setIsGenerating(true)
      setError(null)

      try {
        const doc = <HashrateHeatingReport data={data} />
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

  const generateSolarReport = useCallback(
    async (data: SolarMiningReportData) => {
      setIsGenerating(true)
      setError(null)

      try {
        const doc = <SolarMiningReport data={data} />
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

  return {
    generateHashrateReport,
    generateSolarReport,
    isGenerating,
    error,
  }
}

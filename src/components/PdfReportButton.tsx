import { FileText, Loader2 } from 'lucide-react'
import { usePdfReport } from '../hooks/usePdfReport'
import type { HashrateHeatingReportData, SolarMiningReportData } from '../pdf/types'

type PdfReportButtonProps =
  | {
      reportType: 'hashrate'
      reportData: HashrateHeatingReportData | null
      filename: string
      label?: string
      className?: string
    }
  | {
      reportType: 'solar'
      reportData: SolarMiningReportData | null
      filename: string
      label?: string
      className?: string
    }

export default function PdfReportButton(props: PdfReportButtonProps) {
  const { reportType, reportData, filename, label = 'Download Report', className = '' } = props
  const { generateHashrateReport, generateSolarReport, isGenerating, error } = usePdfReport({
    filename,
  })

  const handleClick = () => {
    if (!reportData) return

    if (reportType === 'hashrate') {
      generateHashrateReport(reportData as HashrateHeatingReportData)
    } else {
      generateSolarReport(reportData as SolarMiningReportData)
    }
  }

  const isDisabled = isGenerating || !reportData

  return (
    <div className="flex flex-col items-end">
      <button
        onClick={handleClick}
        disabled={isDisabled}
        aria-label={isGenerating ? 'Generating PDF...' : label}
        aria-busy={isGenerating}
        className={`
          inline-flex items-center gap-2 px-3 py-1.5
          bg-blue-500 hover:bg-blue-600 active:bg-blue-700
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          text-white font-medium text-sm rounded-lg
          shadow-md hover:shadow-lg
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200
          ${className}
        `}
      >
        {isGenerating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileText className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">{isGenerating ? 'Generating...' : label}</span>
      </button>

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}

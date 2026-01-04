import { Download, Loader2 } from 'lucide-react'
import { usePdfExport } from '../hooks/usePdfExport'
import type { InputSummaryItem } from '../types/pdfExport'

interface PdfExportButtonProps {
  targetId: string
  filename: string
  label?: string
  className?: string
  title?: string
  inputSummary?: InputSummaryItem[]
}

export default function PdfExportButton({
  targetId,
  filename,
  label = 'Export PDF',
  className = '',
  title,
  inputSummary,
}: PdfExportButtonProps) {
  const { exportToPdf, isExporting, error } = usePdfExport({ filename, title, inputSummary })

  return (
    <div className="flex flex-col items-end">
      <button
        onClick={() => exportToPdf(targetId)}
        disabled={isExporting}
        aria-label={isExporting ? 'Exporting PDF...' : label}
        aria-busy={isExporting}
        className={`
          inline-flex items-center gap-2 px-3 py-1.5
          bg-green-500 hover:bg-green-600 active:bg-green-700
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500
          text-white font-medium text-sm rounded-lg
          shadow-md hover:shadow-lg
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200
          ${className}
        `}
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">
          {isExporting ? 'Exporting...' : label}
        </span>
      </button>

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}

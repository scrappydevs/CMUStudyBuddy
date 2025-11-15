'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface PDFViewerProps {
  filename: string
  courseId?: string
  onClose: () => void
}

export default function PDFViewer({ filename, courseId, onClose }: PDFViewerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // URL encode the filename to handle special characters
  const encodedFilename = encodeURIComponent(filename)
  const pdfUrl = `/api/pdfs/${encodedFilename}`

  useEffect(() => {
    console.log('PDFViewer mounted:', { filename, pdfUrl })
    setIsLoading(true)
    setError(null)
  }, [filename, pdfUrl])

  const handleIframeLoad = () => {
    console.log('PDF iframe loaded successfully:', pdfUrl)
    setIsLoading(false)
    setError(null)
  }

  const handleIframeError = () => {
    console.error('PDF iframe error for:', pdfUrl)
    setIsLoading(false)
    setError(`Failed to load PDF: ${filename}`)
  }

  // Fallback: try opening in new tab if iframe fails
  const handleOpenInNewTab = () => {
    window.open(pdfUrl, '_blank')
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full h-full max-w-6xl max-h-[90vh] flex flex-col shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
            <h3 className="text-sm font-light text-neutral-950">{filename}</h3>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-600 transition-colors p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* PDF Content */}
          <div className="flex-1 overflow-hidden relative">
            {isLoading && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-50 z-10">
                <div className="flex flex-col items-center gap-2">
                  <svg className="w-8 h-8 animate-spin text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <p className="text-xs font-light text-neutral-500">Loading PDF...</p>
                </div>
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-50 z-10">
                <div className="flex flex-col items-center gap-2 text-center px-4">
                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm font-light text-red-600">{error}</p>
                  <button
                    onClick={handleOpenInNewTab}
                    className="text-xs text-blue-600 hover:text-blue-800 underline mt-2"
                  >
                    Open PDF in new tab
                  </button>
                  <p className="text-xs text-neutral-500 mt-1">URL: {pdfUrl}</p>
                </div>
              </div>
            )}
            {!error && (
              <iframe
                key={pdfUrl}
                src={pdfUrl}
                className="w-full h-full border-0"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                title={filename}
                style={{ display: isLoading ? 'none' : 'block' }}
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}


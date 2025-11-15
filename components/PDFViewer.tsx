'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface PDFViewerProps {
  filename: string
  courseId?: string
  onClose: () => void
}

export default function PDFViewer({ filename, courseId, onClose }: PDFViewerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const pdfUrl = `/api/pdfs/${filename}`

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
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-50">
                <div className="flex flex-col items-center gap-2">
                  <svg className="w-8 h-8 animate-spin text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <p className="text-xs font-light text-neutral-500">Loading PDF...</p>
                </div>
              </div>
            )}
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              onLoad={() => setIsLoading(false)}
              title={filename}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}


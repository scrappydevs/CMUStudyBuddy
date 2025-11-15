'use client'

import { useState, useRef } from 'react'
import { uploadDocument } from '@/lib/api'

interface DocumentUploadProps {
  courseId: string
  category: 'recitations' | 'class_notes' | 'homeworks'
  onUploadSuccess: () => void
}

export default function DocumentUpload({ courseId, category, onUploadSuccess }: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setError(null)

    try {
      await uploadDocument(courseId, category, file)
      onUploadSuccess()
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document')
    } finally {
      setIsUploading(false)
    }
  }

  const categoryLabels = {
    recitations: 'Recitations',
    class_notes: 'Class Notes',
    homeworks: 'Homeworks'
  }

  return (
    <div className="mb-2">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        disabled={isUploading}
        className="hidden"
        id={`upload-${category}-${courseId}`}
        accept=".pdf,.doc,.docx,.txt,.md"
      />
      <label
        htmlFor={`upload-${category}-${courseId}`}
        className={`
          inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-light border transition-colors cursor-pointer
          ${isUploading 
            ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed' 
            : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
          }
        `}
      >
        {isUploading ? (
          <>
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Uploading...
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload {categoryLabels[category]}
          </>
        )}
      </label>
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}


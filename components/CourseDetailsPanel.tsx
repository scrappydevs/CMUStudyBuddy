'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { getCourseDocuments, downloadDocument, deleteDocument, getCourse, uploadPDF } from '@/lib/api'
import DocumentUpload from './DocumentUpload'
import PDFViewer from './PDFViewer'

interface CourseDetailsPanelProps {
  courseId: string
  onClose: () => void
}

// PDF Upload Button Component
function PDFUploadButton({ courseId, onUploadSuccess }: { courseId: string, onUploadSuccess: () => void }) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are allowed')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      await uploadPDF(courseId, file)
      onUploadSuccess()
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload PDF')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        disabled={isUploading}
        className="hidden"
        id={`upload-pdf-${courseId}`}
        accept=".pdf"
      />
      <label
        htmlFor={`upload-pdf-${courseId}`}
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
            Upload PDF
          </>
        )}
      </label>
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}

// Mock course data
const mockCourses = [
  {
    id: '213',
    name: 'Introduction to Computer Systems',
    code: '15-213',
    color: '#6366F1',
    topics: ['Cache', 'Memory', 'Assembly', 'C Programming']
  },
  {
    id: '122',
    name: 'Principles of Imperative Computation',
    code: '15-122',
    color: '#06B6D4',
    topics: ['C0', 'Data Structures', 'Algorithms']
  },
  {
    id: '251',
    name: 'Great Theoretical Ideas in Computer Science',
    code: '15-251',
    color: '#10B981',
    topics: ['Graph Theory', 'Probability', 'Complexity']
  },
  {
    id: '210',
    name: 'Principles of Programming',
    code: '15-210',
    color: '#F59E0B',
    topics: ['Parallel Algorithms', 'Functional Programming']
  },
  {
    id: '150',
    name: 'Algorithms',
    code: '15-150',
    color: '#EF4444',
    topics: ['Dynamic Programming', 'Graph Algorithms']
  },
  {
    id: '451',
    name: 'Database Systems',
    code: '15-451',
    color: '#EC4899',
    topics: ['SQL', 'Query Optimization', 'Transactions']
  },
]

// Material types organized by clear sections
const courseMaterials = {
  '213': {
    notes: [
      { id: 'cache-notes', label: 'Cache Chapter' },
      { id: 'memory-notes', label: 'Memory Management' },
      { id: 'assembly-notes', label: 'Assembly Language' },
    ],
    recitations: [
      { id: 'recitation-1', label: 'Pointers & Memory' },
      { id: 'recitation-2', label: 'Cache Optimization' },
    ],
    textbook: [
      { id: 'textbook-ch3', label: 'Ch 3: Machine-Level' },
      { id: 'textbook-ch6', label: 'Ch 6: Memory Hierarchy' },
    ],
    labs: [
      { id: 'cache-lab', label: 'Cache Lab' },
      { id: 'malloc-lab', label: 'Malloc Lab' },
    ],
    exams: [
      { id: 'midterm', label: 'Midterm' },
      { id: 'final', label: 'Final' },
    ],
  },
  '122': {
    notes: [
      { id: 'c0-notes', label: 'C0 Language' },
      { id: 'data-structures-notes', label: 'Data Structures' },
    ],
    recitations: [
      { id: 'recitation-1', label: 'Linked Lists' },
    ],
    textbook: [
      { id: 'textbook-ch1', label: 'Ch 1: Introduction' },
    ],
    assignments: [
      { id: 'hw1', label: 'HW1: Linked Lists' },
    ],
    exams: [
      { id: 'exam1', label: 'Exam 1' },
    ],
  },
  '251': {
    notes: [
      { id: 'graph-notes', label: 'Graph Theory' },
      { id: 'probability-notes', label: 'Probability' },
    ],
    textbook: [
      { id: 'textbook-ch5', label: 'Ch 5: Graph Algorithms' },
    ],
    assignments: [
      { id: 'hw2', label: 'HW2: Probability' },
    ],
  },
  '210': {
    notes: [
      { id: 'parallel-notes', label: 'Parallel Programming' },
    ],
    labs: [
      { id: 'lab1', label: 'Fork-Join Lab' },
    ],
  },
  '150': {
    notes: [
      { id: 'dp-notes', label: 'Dynamic Programming' },
    ],
  },
  '451': {
    notes: [
      { id: 'sql-notes', label: 'SQL Basics' },
    ],
    textbook: [
      { id: 'textbook-ch12', label: 'Ch 12: Query Processing' },
    ],
  },
}

// Section colors
const sectionColors = {
  notes: '#6366F1',
  recitations: '#10B981',
  textbook: '#F59E0B',
  labs: '#06B6D4',
  assignments: '#EC4899',
  exams: '#EF4444',
}

interface UploadedDocument {
  id: string
  filename: string
  category: string
  uploaded_at: string
  size: number
}

export default function CourseDetailsPanel({ courseId, onClose }: CourseDetailsPanelProps) {
  const courseData = useMemo(() => {
    return mockCourses.find(c => c.id === courseId)
  }, [courseId])

  const [uploadedDocs, setUploadedDocs] = useState<{
    recitations?: UploadedDocument[]
    class_notes?: UploadedDocument[]
    homeworks?: UploadedDocument[]
  }>({})
  const [isLoadingDocs, setIsLoadingDocs] = useState(true)
  const [courseDataFromAPI, setCourseDataFromAPI] = useState<any>(null)
  const [viewingPDF, setViewingPDF] = useState<string | null>(null)
  const [showMaterialPDFs, setShowMaterialPDFs] = useState<string | null>(null)

  // Map material IDs to PDFs for 15-213
  const getMaterialPDFs = (materialId: string, courseId: string): string[] => {
    if (courseId !== '213') return []
    
    const pdfMap: Record<string, string[]> = {
      'recitation-1': ['rec01_slides.pdf'],
      'recitation-2': ['rec02_slides.pdf'],
      'cache-notes': ['rec02_slides.pdf'], // Cache optimization recitation
      'memory-notes': ['rec01_slides.pdf'], // Pointers & Memory recitation
      'assembly-notes': ['rec01_slides.pdf', 'rec03_slides.pdf'],
      'cache-lab': ['rec02_slides.pdf'], // Cache lab uses cache concepts
      'malloc-lab': ['rec01_slides.pdf'], // Malloc lab uses pointers/memory
      'textbook-ch3': [], // Would be textbook PDF if available
      'textbook-ch6': [], // Would be textbook PDF if available
    }
    
    return pdfMap[materialId] || []
  }

  // Get all available PDFs for a material (searches course PDFs)
  const findMatchingPDFs = (materialId: string): string[] => {
    const pdfs = getMaterialPDFs(materialId, courseId)
    const allPDFs = courseDataFromAPI?.pdfs || []
    
    // Convert allPDFs to array of filenames
    const allPDFFilenames = allPDFs.map((p: any) => {
      if (typeof p === 'string') return p
      return p.filename || p.title || ''
    }).filter(Boolean)
    
    if (pdfs.length === 0) {
      // If no specific mapping, return all PDFs for the course
      return allPDFFilenames
    }
    
    // Find matching PDFs by exact filename match
    const matchingPDFs: string[] = []
    pdfs.forEach(pdfName => {
      // Try exact match first
      const exactMatch = allPDFFilenames.find((filename: string) => 
        filename.toLowerCase() === pdfName.toLowerCase()
      )
      if (exactMatch) {
        matchingPDFs.push(exactMatch)
      } else {
        // Try partial match (filename contains the search term)
        const partialMatch = allPDFFilenames.find((filename: string) => {
          const searchTerm = pdfName.toLowerCase().replace('.pdf', '')
          return filename.toLowerCase().includes(searchTerm)
        })
        if (partialMatch && !matchingPDFs.includes(partialMatch)) {
          matchingPDFs.push(partialMatch)
        }
      }
    })
    
    return matchingPDFs.length > 0 ? matchingPDFs : allPDFFilenames
  }

  const handleMaterialClick = (materialId: string, materialLabel: string) => {
    const allPDFs = courseDataFromAPI?.pdfs || []
    
    // Convert to array of filenames
    const allPDFFilenames = allPDFs.map((p: any) => {
      if (typeof p === 'string') return p
      return p.filename || p.title || ''
    }).filter(Boolean)
    
    console.log(`Material clicked: ${materialId} (${materialLabel})`)
    console.log(`All available PDFs:`, allPDFFilenames)
    
    // Get expected PDFs for this material
    const expectedPDFs = getMaterialPDFs(materialId, courseId)
    console.log(`Expected PDFs for ${materialId}:`, expectedPDFs)
    
    // Find matching PDFs
    let pdfToShow: string | null = null
    
    if (expectedPDFs.length > 0) {
      // Try to find exact matches first
      for (const expectedPDF of expectedPDFs) {
        const match = allPDFFilenames.find((filename: string) => 
          filename.toLowerCase() === expectedPDF.toLowerCase()
        )
        if (match) {
          pdfToShow = match
          break
        }
      }
      
      // If no exact match, try partial match
      if (!pdfToShow) {
        for (const expectedPDF of expectedPDFs) {
          const searchTerm = expectedPDF.toLowerCase().replace('.pdf', '')
          const match = allPDFFilenames.find((filename: string) => 
            filename.toLowerCase().includes(searchTerm)
          )
          if (match) {
            pdfToShow = match
            break
          }
        }
      }
    }
    
    // Fallback: show first available PDF
    if (!pdfToShow && allPDFFilenames.length > 0) {
      pdfToShow = allPDFFilenames[0]
    }
    
    if (pdfToShow) {
      console.log(`Opening PDF: ${pdfToShow}`)
      setViewingPDF(pdfToShow)
      setShowMaterialPDFs(materialId)
    } else {
      console.warn(`No PDFs available for ${materialId}`)
    }
  }

  useEffect(() => {
    loadDocuments()
    loadCourseData()
  }, [courseId])

  const loadCourseData = async () => {
    try {
      const data = await getCourse(courseId)
      console.log('Course data loaded:', data)
      console.log('PDFs for course:', data?.pdfs)
      setCourseDataFromAPI(data)
    } catch (error) {
      console.error('Error loading course data:', error)
    }
  }

  const loadDocuments = async () => {
    try {
      setIsLoadingDocs(true)
      const response = await getCourseDocuments(courseId)
      setUploadedDocs(response.documents || {})
    } catch (error) {
      console.error('Error loading documents:', error)
    } finally {
      setIsLoadingDocs(false)
    }
  }

  const handleDownload = async (fileId: string, filename: string) => {
    try {
      const blob = await downloadDocument(fileId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading document:', error)
      alert('Failed to download document')
    }
  }

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return
    
    try {
      await deleteDocument(fileId)
      loadDocuments()
    } catch (error) {
      console.error('Error deleting document:', error)
      alert('Failed to delete document')
    }
  }

  if (!courseData) return null

  return (
    <>
    <motion.div
      initial={{ opacity: 0, x: -400 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -400 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="w-96 h-full bg-white border-r border-neutral-200 overflow-y-auto flex-shrink-0 scrollbar-hide"
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-5 pb-5 border-b border-neutral-200">
          <div>
            <h2 
              className="text-xl font-light mb-1 tracking-tight"
              style={{ color: courseData.color }}
            >
              {courseData.code}
            </h2>
            <p className="text-sm font-light text-neutral-600 leading-relaxed">
              {courseData.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors p-1 hover:bg-neutral-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Topics */}
        {courseData.topics && courseData.topics.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-normal text-neutral-500 uppercase tracking-wider mb-3">
              Topics Covered
            </p>
            <div className="flex flex-wrap gap-2">
              {courseData.topics.map(topic => (
                <span
                  key={topic}
                  className="px-2.5 py-1 text-xs font-light text-neutral-700 bg-neutral-50 border border-neutral-200"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* PDFs/Textbooks */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-normal text-neutral-500 uppercase tracking-wider">
              Textbooks & PDFs
            </p>
            <PDFUploadButton courseId={courseId} onUploadSuccess={loadCourseData} />
          </div>
          {courseDataFromAPI?.pdfs && courseDataFromAPI.pdfs.length > 0 ? (
            <div className="space-y-1.5">
              {courseDataFromAPI.pdfs.map((pdf: any, idx: number) => {
                // Handle both string and object formats
                const pdfFilename = typeof pdf === 'string' ? pdf : pdf.filename || pdf.title || pdf
                const pdfTitle = typeof pdf === 'string' ? pdf : pdf.title || pdf.filename || pdf
                const pdfPages = typeof pdf === 'object' && pdf.pages ? ` (${pdf.pages} pages)` : ''
                
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      console.log('PDF clicked:', pdfFilename)
                      setViewingPDF(pdfFilename)
                    }}
                    className="w-full text-left px-3 py-2 text-sm font-light text-neutral-700 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="flex-1">{pdfTitle}{pdfPages}</span>
                    <span className="text-xs text-neutral-400">View</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="text-xs font-light text-neutral-400">No PDFs available. Upload one above.</p>
          )}
        </div>

        {/* Course Materials */}
        <div>
          <p className="text-xs font-normal text-neutral-500 uppercase tracking-wider mb-4">
            Course Materials
          </p>
          <div className="space-y-4">
            {/* Uploaded Documents Sections */}
            {(['recitations', 'class_notes', 'homeworks'] as const).map((category) => {
              const categoryKey = category === 'class_notes' ? 'class_notes' : category
              const sectionColor = sectionColors[category === 'class_notes' ? 'notes' : category as keyof typeof sectionColors]
              const categoryLabel = category === 'class_notes' ? 'Class Notes' : category.charAt(0).toUpperCase() + category.slice(1)
              const docs = uploadedDocs[categoryKey as keyof typeof uploadedDocs] || []
              const courseMaterial = courseMaterials[courseId as keyof typeof courseMaterials]
              const mockItems = courseMaterial && (category === 'class_notes' 
                ? ('notes' in courseMaterial ? courseMaterial.notes : [])
                : (category in courseMaterial ? (courseMaterial as any)[category] : [])
              ) || []
              
              return (
                <div key={category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: sectionColor }}
                      />
                      <h3 className="text-sm font-light text-neutral-950 tracking-tight">
                        {categoryLabel}
                      </h3>
                    </div>
                    <DocumentUpload 
                      courseId={courseId} 
                      category={category}
                      onUploadSuccess={loadDocuments}
                    />
                  </div>
                  
                  {/* Mock items */}
                  {Array.isArray(mockItems) && mockItems.length > 0 && (
                    <div className="space-y-1.5">
                      {mockItems.map((material) => {
                        const pdfs = getMaterialPDFs(material.id, courseId)
                        const hasPDFs = pdfs.length > 0 || (courseDataFromAPI?.pdfs && courseDataFromAPI.pdfs.length > 0)
                        
                        return (
                          <button
                            key={material.id}
                            className="w-full text-left px-3 py-2 text-sm font-light text-neutral-700 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 transition-colors flex items-center gap-2"
                            onClick={() => handleMaterialClick(material.id, material.label)}
                          >
                            <svg className="w-4 h-4 text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span className="flex-1">{material.label}</span>
                            {hasPDFs && (
                              <span className="text-xs text-neutral-400">View PDF</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                  
                  {/* Uploaded documents */}
                  {docs.length > 0 && (
                    <div className="space-y-1.5">
                      {docs.map((doc) => (
                        <div
                          key={doc.id}
                          className="w-full px-3 py-2 text-sm font-light text-neutral-700 bg-neutral-50 border border-neutral-200 flex items-center gap-2 group"
                        >
                          <svg className="w-4 h-4 text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <button
                            onClick={() => handleDownload(doc.id, doc.filename)}
                            className="flex-1 text-left hover:text-neutral-950 transition-colors"
                          >
                            {doc.filename}
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 text-red-600"
                            title="Delete"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {isLoadingDocs && docs.length === 0 && mockItems.length === 0 && (
                    <p className="text-xs font-light text-neutral-400">Loading...</p>
                  )}
                </div>
              )
            })}
            
            {/* Other sections (textbook, labs, exams, assignments) */}
            {courseMaterials[courseId as keyof typeof courseMaterials] && Object.entries(courseMaterials[courseId as keyof typeof courseMaterials])
              .filter(([section]) => !['recitations', 'notes'].includes(section))
              .map(([section, items]) => {
                const sectionColor = sectionColors[section as keyof typeof sectionColors]
                return (
                  <div key={section} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: sectionColor }}
                      />
                      <h3 className="text-sm font-light text-neutral-950 capitalize tracking-tight">
                        {section}
                      </h3>
                    </div>
                    {Array.isArray(items) && items.length > 0 && (
                      <div className="space-y-1.5">
                        {items.map((material) => {
                          const pdfs = getMaterialPDFs(material.id, courseId)
                          const hasPDFs = pdfs.length > 0 || (courseDataFromAPI?.pdfs && courseDataFromAPI.pdfs.length > 0)
                          
                          return (
                            <button
                              key={material.id}
                              className="w-full text-left px-3 py-2 text-sm font-light text-neutral-700 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 transition-colors flex items-center gap-2"
                              onClick={() => handleMaterialClick(material.id, material.label)}
                            >
                              <svg className="w-4 h-4 text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              <span className="flex-1">{material.label}</span>
                              {hasPDFs && (
                                <span className="text-xs text-neutral-400">View PDF</span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        </div>
      </div>

    </motion.div>
    
    {/* PDF Viewer Modal - rendered outside panel to avoid overflow issues */}
    {viewingPDF && (
      <PDFViewer
        filename={viewingPDF}
        courseId={courseId}
        onClose={() => {
          console.log('Closing PDF viewer')
          setViewingPDF(null)
        }}
      />
    )}
    </>
  )
}


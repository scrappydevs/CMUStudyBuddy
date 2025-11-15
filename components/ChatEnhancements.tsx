'use client'

import { motion } from 'framer-motion'

interface ToolDetail {
  tool: string
  status: string
  message: string
}

interface ToolUseIndicatorProps {
  toolDetails?: ToolDetail[]
  toolCount?: number
}

export function ToolUseIndicator({ toolDetails, toolCount }: ToolUseIndicatorProps) {
  if (!toolDetails || toolDetails.length === 0) {
    if (toolCount && toolCount > 0) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="flex justify-start mb-2"
        >
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-light">
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
            <span>Searching course materials ({toolCount} {toolCount === 1 ? 'query' : 'queries'})</span>
          </div>
        </motion.div>
      )
    }
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex flex-col gap-1.5 mb-2"
    >
      {toolDetails.map((detail, idx) => (
        <div
          key={idx}
          className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-light"
        >
          <svg className="w-4 h-4 animate-spin flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
          <span className="flex-1">{detail.message}</span>
        </div>
      ))}
    </motion.div>
  )
}

interface ThinkingIndicatorProps {
  show: boolean
}

export function ThinkingIndicator({ show }: ThinkingIndicatorProps) {
  if (!show) return null
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex justify-start"
    >
          <div className="bg-neutral-100 px-4 py-3 text-sm font-light text-neutral-600">
        <div className="flex gap-1">
          <span className="animate-bounce">●</span>
          <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>●</span>
          <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>●</span>
        </div>
      </div>
    </motion.div>
  )
}


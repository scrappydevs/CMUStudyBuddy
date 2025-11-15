'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { chatWithAI, generateSummary } from '@/lib/api'
import { ToolUseIndicator, ThinkingIndicator } from './ChatEnhancements'

interface Message {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
  toolCalls?: number
  courseId?: string | null
}

interface AIChatProps {
  selectedCourse: string | null
  onCourseQuery: (courseId: string) => void
}

export default function AIChat({ selectedCourse, onCourseQuery }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [toolCallCount, setToolCallCount] = useState(0)
  const [showToolIndicator, setShowToolIndicator] = useState(false)
  const [toolDetails, setToolDetails] = useState<Array<{tool: string, status: string, message: string}>>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingText])

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const streamText = async (text: string, courseId?: string | null) => {
    // Show response immediately without artificial streaming delays
    setIsStreaming(false)
    setStreamingText('')
    
    setMessages(prev => {
      const updated = [...prev]
      // Update or add assistant message
      const lastMsg = updated[updated.length - 1]
      if (lastMsg && lastMsg.role === 'assistant' && lastMsg.isStreaming) {
        // Update existing streaming message
        updated[updated.length - 1] = {
          role: 'assistant',
          content: text,
          isStreaming: false,
          courseId: courseId || null
        }
      } else {
        // Add new assistant message
        updated.push({
          role: 'assistant',
          content: text,
          isStreaming: false,
          courseId: courseId || null
        })
      }
      return updated
    })
  }

  const handleSendMessage = async () => {
    if (input.trim() === '' || isLoading || isStreaming) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    const currentInput = input
    setInput('')
    setIsLoading(true)

    try {
      const response = await chatWithAI(currentInput, sessionId || undefined)
      
      if (response.session_id && !sessionId) {
        setSessionId(response.session_id)
      }
      
      // Track tool calls with detailed information
      if (response.tool_calls && response.tool_calls > 0) {
        setToolCallCount(response.tool_calls)
        if (response.tool_details && response.tool_details.length > 0) {
          setToolDetails(response.tool_details)
        }
        setShowToolIndicator(true)
        // Show tool indicator with details
        await new Promise(resolve => setTimeout(resolve, 800))
        setShowToolIndicator(false)
        setToolDetails([])
      }
      
      setIsLoading(false)
      
      const responseText = response.response || response.message || 'Sorry, I encountered an error.'
      
      // Show response immediately (no fake streaming delay)
      await streamText(responseText, response.course_id || null)
      
      // Reset tool call count after response
      setToolCallCount(0)
      
      // Check if AI wants to navigate to a course
      if (response.course_id) {
        onCourseQuery(response.course_id)
      }
      
    } catch (error) {
      console.error('Error sending message:', error)
      setIsLoading(false)
      setToolCallCount(0)
      await streamText('Sorry, I\'m having trouble connecting. Please try again.')
    }
  }


  const handleDownloadSummary = async (courseId?: string | null, content?: string, format: 'markdown' | 'pdf' = 'markdown') => {
    try {
      setIsLoading(true)
      const result = await generateSummary(courseId || undefined, undefined, content, format)
      
      if (result.error) {
        alert(result.error)
        setIsLoading(false)
        return
      }
      
      if (format === 'pdf' && result.blob) {
        // Handle PDF download
        const url = URL.createObjectURL(result.blob)
        const a = document.createElement('a')
        a.href = url
        a.download = courseId ? `course-${courseId}-summary.pdf` : 'course-summary.pdf'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else {
        // Handle markdown download
        const blob = new Blob([result.content], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = courseId ? `course-${courseId}-summary.md` : 'course-summary.md'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
      
      setIsLoading(false)
    } catch (error) {
      console.error('Error downloading summary:', error)
      setIsLoading(false)
      alert('Failed to generate summary. Please try again.')
    }
  }

  return (
    <div className="h-full flex flex-col bg-white border-l border-neutral-200">
      {/* Header */}
      <div className="h-16 px-4 py-2 border-b border-neutral-200 flex items-center justify-between">
        <h2 className="text-sm font-light text-neutral-950 tracking-tight">Course Assistant</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-4">
              {messages.length === 0 ? (
                <div>
                  <p className="text-sm font-light text-neutral-600 mb-4">
                    Ask me about CMU CS courses. Try: "Tell me about 15-213's cache chapter"
                  </p>
                  <div className="space-y-2">
                    {['Tell me about 15-213', 'Show me courses related to systems', 'What is 15-122 about?'].map((prompt, i) => (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.2 + (i * 0.08) }}
                        onClick={() => {
                          setInput(prompt)
                          setTimeout(() => handleSendMessage(), 100)
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm font-light text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-200 transition-all"
                      >
                        {prompt}
                      </motion.button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => {
                    const prevMsg = idx > 0 ? messages[idx - 1] : null
                    const isRoleChange = prevMsg && prevMsg.role !== msg.role
                    const spacingClass = isRoleChange ? 'mt-5' : 'mt-0'
                    
                    return (
                      <motion.div 
                        key={idx} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} ${spacingClass}`}
                      >
                        <div
                          className={`max-w-[85%] px-3 py-2 text-sm font-light leading-relaxed ${
                            msg.role === 'user'
                              ? 'bg-neutral-950 text-white text-left'
                              : 'bg-neutral-50 text-neutral-950'
                          }`}
                          style={{ 
                            borderRadius: msg.role === 'user' ? '4px 4px 2px 4px' : '4px 4px 4px 2px',
                          }}
                        >
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed whitespace-pre-wrap">{children}</p>,
                              code: ({ children }) => <code className="bg-yellow-100 text-neutral-950 px-1.5 py-0.5 rounded text-xs font-medium">{children}</code>,
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                        {msg.isStreaming && (
                          <span className="inline-block w-1.5 h-3.5 bg-primary-700 ml-0.5 animate-pulse" />
                        )}
                        {msg.role === 'assistant' && !msg.isStreaming && (
                          <div className="mt-3 pt-3 border-t border-neutral-200 flex gap-2">
                            <button
                              onClick={() => handleDownloadSummary(msg.courseId, msg.content, 'markdown')}
                              disabled={isLoading}
                              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-light text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Download as Markdown"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              MD
                            </button>
                            <button
                              onClick={() => handleDownloadSummary(msg.courseId, msg.content, 'pdf')}
                              disabled={isLoading}
                              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-light text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Download as PDF"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              PDF
                            </button>
                            <button
                              onClick={async () => {
                                await navigator.clipboard.writeText(msg.content)
                              }}
                              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-light text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-200 transition-colors"
                              title="Copy to clipboard"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              Copy
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                    )
                  })}
                  
                      {/* Tool Use Indicator */}
                      {showToolIndicator && (
                        <ToolUseIndicator 
                          toolDetails={toolDetails.length > 0 ? toolDetails : undefined}
                          toolCount={toolCallCount}
                        />
                      )}
                  
                  {/* Thinking indicator */}
                  <ThinkingIndicator show={isLoading && !isStreaming && !showToolIndicator} />
                  
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

      {/* Input Area */}
      <div className="px-4 border-t border-neutral-200">
        <div className="border border-neutral-200 px-3 bg-white mb-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="pt-2"
          >
            <textarea
              ref={inputRef}
              value={input}
              disabled={isLoading || isStreaming}
              onChange={(e) => {
                setInput(e.target.value)
                const el = e.target
                el.style.height = 'auto'
                el.style.height = `${el.scrollHeight}px`
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !isLoading && !isStreaming) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              placeholder={isLoading ? "Thinking..." : isStreaming ? "Responding..." : "Ask about CMU courses..."}
              rows={3}
              className="w-full pb-3 py-1 focus:outline-none resize-none max-h-48 overflow-y-auto text-sm font-light text-neutral-950 placeholder:text-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </form>
        </div>
      </div>
    </div>
  )
}


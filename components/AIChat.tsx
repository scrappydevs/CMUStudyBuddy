'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { chatWithAI, generateSummary } from '@/lib/api'
import ThinkingAnimation from './ThinkingAnimation'

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
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [toolCallCount, setToolCallCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingText])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'h') {
        e.preventDefault()
        setIsOpen(prev => !prev)
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault()
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const streamText = async (text: string, courseId?: string | null) => {
    setIsStreaming(true)
    setStreamingText('')
    
    const placeholderMsg: Message = { 
      role: 'assistant', 
      content: '',
      isStreaming: true,
      courseId: courseId || null
    }
    setMessages(prev => [...prev, placeholderMsg])
    
    const words = text.split(' ')
    let currentText = ''
    
    for (let i = 0; i < words.length; i++) {
      currentText += (i > 0 ? ' ' : '') + words[i]
      setStreamingText(currentText)
      
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: currentText,
          isStreaming: true,
          courseId: courseId || null
        }
        return updated
      })
      
      await new Promise(resolve => setTimeout(resolve, 30))
    }
    
    setMessages(prev => {
      const updated = [...prev]
      updated[updated.length - 1] = {
        role: 'assistant',
        content: text,
        isStreaming: false,
        courseId: courseId || null
      }
      return updated
    })
    
    setIsStreaming(false)
    setStreamingText('')
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
      
      // Track tool calls
      if (response.tool_calls) {
        setToolCallCount(response.tool_calls)
      }
      
      setIsLoading(false)
      
      const responseText = response.response || response.message || 'Sorry, I encountered an error.'
      
      // Store course_id with the message for download functionality
      const assistantMessage: Message = {
        role: 'assistant',
        content: responseText,
        courseId: response.course_id || null
      }
      
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleDownloadSummary = async (courseId?: string | null, content?: string) => {
    try {
      setIsLoading(true)
      const summary = await generateSummary(courseId || undefined, undefined, content)
      
      if (summary.error) {
        alert(summary.error)
        setIsLoading(false)
        return
      }
      
      // Create downloadable markdown file
      const blob = new Blob([summary.content], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = courseId ? `course-${courseId}-summary.md` : 'course-summary.md'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      setIsLoading(false)
    } catch (error) {
      console.error('Error downloading summary:', error)
      setIsLoading(false)
      alert('Failed to generate summary. Please try again.')
    }
  }

  return (
    <>
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ scale: 0.95, opacity: 0, originX: 1, originY: 1 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-6 right-6 z-50 bg-white border border-gray-200 shadow-xl flex flex-col"
            style={{ 
              width: '550px',
              height: '650px',
              borderRadius: '12px',
              transformOrigin: 'bottom right',
            }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">CMU Course Assistant</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-md hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    Ask me about CMU CS courses. Try: "Tell me about 15-213's cache chapter"
                  </p>
                  <div className="space-y-1.5">
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
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 transition-all rounded-lg"
                      >
                        {prompt}
                      </motion.button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => (
                    <motion.div 
                      key={idx} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] px-4 py-3 text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-50 text-gray-900'
                        }`}
                        style={{ 
                          borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
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
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <button
                              onClick={() => handleDownloadSummary(msg.courseId, msg.content)}
                              disabled={isLoading}
                              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Download Summary
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  
                      {isLoading && !isStreaming && (
                        <div className="flex flex-col gap-3 w-full">
                          {toolCallCount > 0 && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="flex justify-start"
                            >
                              <div className="px-4 py-2.5 bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg flex items-center gap-2">
                                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                </svg>
                                <span>Searching course materials ({toolCallCount} {toolCallCount === 1 ? 'query' : 'queries'})</span>
                              </div>
                            </motion.div>
                          )}
                          <div className="flex justify-start w-full">
                            <div className="w-full max-w-md">
                              <ThinkingAnimation />
                            </div>
                          </div>
                        </div>
                      )}
                  
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            <div className="border-t border-gray-200 p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isLoading ? "Thinking..." : isStreaming ? "Responding..." : "Ask about CMU courses..."}
                  disabled={isLoading || isStreaming}
                  className="flex-1 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all disabled:opacity-50 disabled:bg-gray-50 rounded-lg"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || isStreaming || input.trim() === ''}
                  className="px-4 py-2.5 bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gray-900 hover:bg-gray-800 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center rounded-full"
            title="Open AI Chat (Cmd+Shift+H)"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  )
}


'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import CourseMap3D from '@/components/CourseMap3D'
import AIChat from '@/components/AIChat'
import AppHeader from '@/components/AppHeader'
import CourseDetailsPanel from '@/components/CourseDetailsPanel'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/Resizable'
import type { ImperativePanelGroupHandle, ImperativePanelHandle } from 'react-resizable-panels'

const STORAGE_KEYS = { CHAT_PANEL_SIZE: 'chat-panel-size' } as const

const PANEL_CONFIG = {
  chat: {
    defaultSize: 25,
    minSize: 15,
    maxSize: 70,
  },
} as const

export default function Home() {
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null)
  const [chatPanelSize, setChatPanelSize] = useState<number>(PANEL_CONFIG.chat.defaultSize)
  const panelGroupRef = useRef<ImperativePanelGroupHandle>(null)
  const chatPanelRef = useRef<ImperativePanelHandle | null>(null)

  useEffect(() => {
    const savedChatSize = localStorage.getItem(STORAGE_KEYS.CHAT_PANEL_SIZE)
    if (savedChatSize) {
      setChatPanelSize(parseFloat(savedChatSize))
    }
  }, [])

  return (
    <div className="w-full h-screen flex flex-col bg-neutral-50">
      <AppHeader />
      <main className="flex-1 flex overflow-hidden">
        {/* Course Details Sidebar - LEFT */}
        <AnimatePresence>
          {selectedCourse && (
            <CourseDetailsPanel
              courseId={selectedCourse}
              onClose={() => setSelectedCourse(null)}
            />
          )}
        </AnimatePresence>
        
        {/* Main content and chat in resizable panels */}
        <ResizablePanelGroup
          ref={panelGroupRef}
          direction="horizontal"
          className="flex-1 min-w-0"
          id="main-panel-group"
          onLayout={(sizes: number[]) => {
            if (sizes[1] > 0) {
              setChatPanelSize(sizes[1])
              localStorage.setItem(STORAGE_KEYS.CHAT_PANEL_SIZE, String(sizes[1]))
            }
          }}
        >
          {/* Main graph area */}
          <ResizablePanel
            id="main-panel"
            defaultSize={100 - chatPanelSize}
            minSize={30}
            maxSize={100}
            className="transition-all duration-300 ease-in-out"
          >
            <div className="flex flex-col h-full">
              <div className="flex-1 relative min-w-0">
                <CourseMap3D 
                  selectedCourse={selectedCourse}
                  onCourseSelect={setSelectedCourse}
                />
              </div>
            </div>
          </ResizablePanel>
          
          {/* Resizable handle */}
          <ResizableHandle
            id="chat-handle"
            className="w-0 relative after:absolute after:inset-y-0 after:-left-2.5 after:right-[-10px] after:bg-transparent after:cursor-col-resize"
          />
          
          {/* AI Chat Sidebar - RIGHT */}
          <ResizablePanel
            ref={chatPanelRef}
            id="chat-panel"
            defaultSize={chatPanelSize}
            minSize={PANEL_CONFIG.chat.minSize}
            maxSize={PANEL_CONFIG.chat.maxSize}
            collapsible={false}
            className="transition-all duration-300 ease-in-out"
          >
            <AIChat 
              selectedCourse={selectedCourse}
              onCourseQuery={(courseId) => setSelectedCourse(courseId)}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  )
}


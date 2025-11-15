'use client'

import { useState } from 'react'
import CourseMap3D from '@/components/CourseMap3D'
import AIChat from '@/components/AIChat'
import AppHeader from '@/components/AppHeader'

export default function Home() {
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null)

  return (
    <div className="w-full h-screen flex flex-col bg-white">
      <AppHeader />
      <main className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0">
          <CourseMap3D 
            selectedCourse={selectedCourse}
            onCourseSelect={setSelectedCourse}
          />
        </div>
        <AIChat 
          selectedCourse={selectedCourse}
          onCourseQuery={(courseId) => setSelectedCourse(courseId)}
        />
      </main>
    </div>
  )
}


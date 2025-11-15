'use client'

export default function AppHeader() {
  return (
    <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-gray-900">CMU CS Course Map</h1>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">Interactive Course Visualization</span>
      </div>
    </header>
  )
}


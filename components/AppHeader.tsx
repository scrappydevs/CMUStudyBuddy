'use client'

export default function AppHeader() {
  return (
    <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-neutral-200 z-20">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-light text-neutral-950 tracking-tight">CMU Study Buddy</h1>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs font-light text-neutral-500 uppercase tracking-wider">Interactive Course Visualization</span>
      </div>
    </header>
  )
}


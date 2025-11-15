'use client'

export default function ThinkingAnimation() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-50 rounded-lg">
      <div className="flex gap-1.5">
        <div className="thinking-dot w-2 h-2 bg-gray-400 rounded-full" />
        <div className="thinking-dot w-2 h-2 bg-gray-400 rounded-full" />
        <div className="thinking-dot w-2 h-2 bg-gray-400 rounded-full" />
      </div>
    </div>
  )
}


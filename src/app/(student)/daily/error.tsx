'use client'

export default function DailyError({ reset }: { reset: () => void }) {
  return (
    <div className="p-6 max-w-3xl mx-auto flex flex-col items-center justify-center py-24 gap-3">
      <p className="text-gray-500 text-sm">Failed to load daily tasks.</p>
      <button onClick={reset} className="text-xs underline text-gray-400 hover:text-gray-600">
        Try again
      </button>
    </div>
  )
}

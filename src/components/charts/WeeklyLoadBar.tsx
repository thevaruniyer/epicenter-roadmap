'use client'

import { Progress } from '@/components/ui/progress'
import { minutesToDisplay } from '@/lib/utils/timeUtils'

interface WeeklyLoadBarProps {
  totalMinutes: number
  cap: number
}

export function WeeklyLoadBar({ totalMinutes, cap }: WeeklyLoadBarProps) {
  const pct = Math.min((totalMinutes / cap) * 100, 100)
  const isWarning = pct >= 80
  const isCritical = pct >= 100

  const barColor = isCritical
    ? '[&>div]:bg-red-500'
    : isWarning
      ? '[&>div]:bg-amber-500'
      : '[&>div]:bg-blue-500'

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Weekly Load</span>
        <span className={`font-medium ${isCritical ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-gray-700'}`}>
          {minutesToDisplay(totalMinutes)} / {minutesToDisplay(cap)}
          <span className="ml-1 text-xs text-muted-foreground">({Math.round(pct)}%)</span>
        </span>
      </div>
      <Progress value={pct} className={`h-2 ${barColor}`} />
    </div>
  )
}

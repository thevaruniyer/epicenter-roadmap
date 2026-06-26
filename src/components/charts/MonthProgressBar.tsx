import { Progress } from '@/components/ui/progress'

interface MonthProgressBarProps {
  completed: number
  total: number
  label?: string
}

export function MonthProgressBar({ completed, total, label }: MonthProgressBarProps) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100)

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label ?? 'Month Progress'}</span>
        <span className="font-medium text-gray-700">
          {completed}/{total} tasks
          <span className="ml-1 text-xs text-muted-foreground">({pct}%)</span>
        </span>
      </div>
      <Progress value={pct} className="h-2 [&>div]:bg-green-500" />
    </div>
  )
}

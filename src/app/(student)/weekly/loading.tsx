import { Skeleton } from '@/components/ui/skeleton'

export default function WeeklyLoading() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[1, 2, 3, 4, 5, 6, 7].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
      </div>
    </div>
  )
}

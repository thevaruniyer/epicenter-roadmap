import { Badge } from '@/components/ui/badge'
import type { TaskCategory } from '@/lib/types/app.types'

interface CategoryTagProps {
  category: TaskCategory
  className?: string
}

const categoryConfig: Record<TaskCategory, { className: string }> = {
  EC: { className: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100' },
  'SAT Prep': { className: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100' },
  Essays: { className: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100' },
  Academic: { className: 'bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-100' },
  Admin: { className: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100' },
  Personal: { className: 'bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-100' },
}

export function CategoryTag({ category, className }: CategoryTagProps) {
  const config = categoryConfig[category]
  return (
    <Badge variant="outline" className={`text-xs font-medium ${config.className} ${className ?? ''}`}>
      {category}
    </Badge>
  )
}

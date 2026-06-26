'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createTask } from '@/app/actions/tasks'
import type { TaskCategory, TaskViewLevel } from '@/lib/types/app.types'

const CATEGORIES: TaskCategory[] = ['EC', 'SAT Prep', 'Essays', 'Academic', 'Admin', 'Personal']

interface TaskFormProps {
  studentId: string
  assignedById?: string
  viewLevel: TaskViewLevel
  month?: number
  year?: number
  weekStart?: string
  dayDate?: string
  isAdminAssigned?: boolean
  onSuccess?: () => void
  onCancel?: () => void
}

export function TaskForm({
  studentId,
  assignedById,
  viewLevel,
  month,
  year,
  weekStart,
  dayDate,
  isAdminAssigned = false,
  onSuccess,
  onCancel,
}: TaskFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<TaskCategory>('Academic')
  const [isLocked, setIsLocked] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const data = new FormData(form)

    startTransition(async () => {
      const result = await createTask({
        studentId,
        assignedBy: assignedById,
        title: data.get('title') as string,
        description: (data.get('description') as string) || undefined,
        category,
        viewLevel,
        estimatedMinutes: parseInt(data.get('estimatedMinutes') as string) || 30,
        month,
        year,
        weekStart,
        dayDate,
        isAdminAssigned,
        isLocked: isAdminAssigned ? isLocked : false,
        notes: (data.get('notes') as string) || undefined,
      })

      if (result?.error) {
        setError(result.error)
      } else {
        form.reset()
        onSuccess?.()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Input
          name="title"
          placeholder="What needs to be done?"
          required
          className="text-sm"
          disabled={isPending}
        />
      </div>

      <div>
        <Textarea
          name="description"
          placeholder="Description (optional)"
          rows={2}
          className="text-sm resize-none"
          disabled={isPending}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Select value={category} onValueChange={(v) => setCategory(v as TaskCategory)}>
          <SelectTrigger className="text-sm">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} className="text-sm">
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative">
          <Input
            name="estimatedMinutes"
            type="number"
            placeholder="30"
            min={5}
            step={5}
            defaultValue={30}
            className="text-sm pr-10"
            disabled={isPending}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">min</span>
        </div>
      </div>

      <div>
        <Textarea
          name="notes"
          placeholder="Notes (optional)"
          rows={2}
          className="text-sm resize-none"
          disabled={isPending}
        />
      </div>

      {isAdminAssigned && (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={isLocked}
            onChange={(e) => setIsLocked(e.target.checked)}
            className="rounded border-gray-300"
          />
          Lock task (students cannot edit)
        </label>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={isPending} className="flex-1">
          {isPending ? 'Adding...' : 'Add task'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}

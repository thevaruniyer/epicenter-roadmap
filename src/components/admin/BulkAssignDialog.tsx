'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { bulkAssignTask } from '@/app/actions/tasks'
import { getAcademicYearMonths, getWeekStart } from '@/lib/utils/timeUtils'
import { format } from 'date-fns'
import type { TaskCategory, TaskViewLevel } from '@/lib/types/app.types'

const CATEGORIES: TaskCategory[] = ['EC', 'SAT Prep', 'Essays', 'Academic', 'Admin', 'Personal']

interface BulkAssignDialogProps {
  selectedStudentIds: string[]
  adminId: string
  onSuccess: () => void
}

export function BulkAssignDialog({ selectedStudentIds, adminId, onSuccess }: BulkAssignDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const months = getAcademicYearMonths()
  const today = new Date()
  const defaultMonth = months.find(m => m.value === today.getMonth() + 1 && m.year === today.getFullYear()) ?? months[0]
  const weekStart = format(getWeekStart(today), 'yyyy-MM-dd')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<TaskCategory>('Academic')
  const [viewLevel, setViewLevel] = useState<TaskViewLevel>('monthly')
  const [estimatedMinutes, setEstimatedMinutes] = useState('60')
  const [isLocked, setIsLocked] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await bulkAssignTask(selectedStudentIds, {
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        viewLevel,
        estimatedMinutes: parseInt(estimatedMinutes) || 60,
        month: viewLevel === 'monthly' ? selectedMonth.value : undefined,
        year: viewLevel === 'monthly' ? selectedMonth.year : undefined,
        weekStart: viewLevel === 'weekly' ? weekStart : undefined,
        isLocked,
        assignedBy: adminId,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setTimeout(() => {
          setOpen(false)
          setSuccess(false)
          setTitle('')
          setDescription('')
          onSuccess()
        }, 1200)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            disabled={selectedStudentIds.length === 0}
            className="gap-1"
          />
        }
      >
        Assign to {selectedStudentIds.length} selected
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign task to {selectedStudentIds.length} students</DialogTitle>
        </DialogHeader>

        {success ? (
          <p className="text-sm text-green-600 py-4 text-center">
            Task assigned to {selectedStudentIds.length} students!
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Title *</label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Task title"
                required
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={2}
                className="mt-1 text-sm resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Category</label>
                <Select value={category} onValueChange={v => setCategory(v as TaskCategory)}>
                  <SelectTrigger className="mt-1 text-xs">
                    <span>{category}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">View</label>
                <Select value={viewLevel} onValueChange={v => setViewLevel(v as TaskViewLevel)}>
                  <SelectTrigger className="mt-1 text-xs">
                    <span className="capitalize">{viewLevel}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly" className="text-xs">Monthly</SelectItem>
                    <SelectItem value="weekly" className="text-xs">Weekly</SelectItem>
                    <SelectItem value="daily" className="text-xs">Daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {viewLevel === 'monthly' && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Month</label>
                <Select
                  value={`${selectedMonth.value}-${selectedMonth.year}`}
                  onValueChange={v => {
                    const found = months.find(m => `${m.value}-${m.year}` === v)
                    if (found) setSelectedMonth(found)
                  }}
                >
                  <SelectTrigger className="mt-1 text-xs">
                    <span>{selectedMonth.label} {selectedMonth.year}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {months.map(m => (
                      <SelectItem key={`${m.value}-${m.year}`} value={`${m.value}-${m.year}`} className="text-xs">
                        {m.label} {m.year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground">Estimated minutes</label>
              <Input
                type="number"
                value={estimatedMinutes}
                onChange={e => setEstimatedMinutes(e.target.value)}
                min={1}
                className="mt-1 w-24"
              />
            </div>

            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={isLocked}
                onChange={e => setIsLocked(e.target.checked)}
                className="rounded"
              />
              Lock task (students cannot edit)
            </label>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button type="submit" size="sm" className="flex-1" disabled={isPending}>
                {isPending ? 'Assigning...' : `Assign to ${selectedStudentIds.length} students`}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

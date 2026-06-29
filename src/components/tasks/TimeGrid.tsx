'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { TaskCard } from './TaskCard'
import { updateTask } from '@/app/actions/tasks'
import { Clock, X } from 'lucide-react'
import type { Task, Profile, FilterState, TaskCategory } from '@/lib/types/app.types'

// 7am to 10pm in 30-min slots
const SLOTS: { label: string; value: string }[] = []
for (let h = 7; h <= 22; h++) {
  for (const m of [0, 30]) {
    if (h === 22 && m === 30) break
    const hh = String(h).padStart(2, '0')
    const mm = String(m).padStart(2, '0')
    SLOTS.push({ label: `${h > 12 ? h - 12 : h}:${mm} ${h >= 12 ? 'pm' : 'am'}`, value: `${hh}:${mm}:00` })
  }
}

interface TimeGridProps {
  tasks: Task[]
  profiles: Record<string, Profile>
  filters: FilterState
  onRefresh: () => void
}

function taskMatchesFilter(task: Task, filters: FilterState): boolean {
  if (filters.categories.length > 0 && !filters.categories.includes(task.category as TaskCategory)) return false
  if (filters.statuses.length > 0 && !filters.statuses.includes(task.status)) return false
  if (filters.assignedBy === 'admin' && !task.is_admin_assigned) return false
  if (filters.assignedBy === 'self' && task.is_admin_assigned) return false
  return true
}

export function TimeGrid({ tasks, profiles, filters, onRefresh }: TimeGridProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  const filteredTasks = tasks.filter(t => taskMatchesFilter(t, filters))
  const scheduledTasks = filteredTasks.filter(t => t.scheduled_time)
  const unscheduledTasks = filteredTasks.filter(t => !t.scheduled_time)

  const getTaskForSlot = (slotValue: string) =>
    scheduledTasks.filter(t => t.scheduled_time?.startsWith(slotValue.slice(0, 5)))

  async function assignToSlot(taskId: string, slotValue: string) {
    await updateTask(taskId, { scheduledTime: slotValue })
    setSelectedTaskId(null)
    onRefresh()
  }

  async function clearSchedule(taskId: string) {
    await updateTask(taskId, { scheduledTime: null })
    onRefresh()
  }

  return (
    <div className="space-y-4">
      {selectedTaskId && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700 flex items-center justify-between">
          <span>Click a time slot to schedule this task</span>
          <button onClick={() => setSelectedTaskId(null)} className="hover:text-blue-900">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Unscheduled tasks */}
      {unscheduledTasks.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Unscheduled</h3>
          <div className="space-y-2">
            {unscheduledTasks.map(task => (
              <div
                key={task.id}
                className={`rounded-lg ${selectedTaskId === task.id ? 'ring-2 ring-blue-400' : ''}`}
              >
                <TaskCard
                  task={task}
                  assignedByProfile={task.assigned_by ? profiles[task.assigned_by] : null}
                  onRefresh={onRefresh}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs mt-1 text-blue-600 hover:text-blue-700"
                  onClick={() => setSelectedTaskId(selectedTaskId === task.id ? null : task.id)}
                >
                  <Clock className="h-3 w-3 mr-1" />
                  {selectedTaskId === task.id ? 'Cancel' : 'Assign time slot'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time grid */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Time Grid</h3>
        <div className="space-y-0.5">
          {SLOTS.map(slot => {
            const slotTasks = getTaskForSlot(slot.value)
            const isClickable = !!selectedTaskId
            return (
              <div
                key={slot.value}
                className={`flex gap-2 group min-h-[2.5rem] ${isClickable ? 'cursor-pointer hover:bg-blue-50' : ''}`}
                onClick={() => {
                  if (selectedTaskId && slotTasks.length === 0) {
                    assignToSlot(selectedTaskId, slot.value)
                  }
                }}
              >
                <div className="w-16 shrink-0 text-[10px] text-gray-400 text-right pt-1 pr-2 border-r border-gray-100">
                  {slot.label}
                </div>
                <div className="flex-1 py-0.5">
                  {slotTasks.length > 0 ? (
                    slotTasks.map(task => (
                      <div key={task.id} className="relative">
                        <TaskCard
                          task={task}
                          assignedByProfile={task.assigned_by ? profiles[task.assigned_by] : null}
                          onRefresh={onRefresh}
                        />
                        <button
                          className="absolute top-1 right-7 text-[10px] text-gray-400 hover:text-red-500"
                          onClick={(e) => { e.stopPropagation(); clearSchedule(task.id) }}
                          title="Remove from time slot"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className={`h-8 rounded border-dashed border ${isClickable ? 'border-blue-200 bg-blue-50/50' : 'border-transparent group-hover:border-gray-100'}`}>
                      {isClickable && (
                        <span className="text-[10px] text-blue-400 flex items-center h-full pl-2">
                          Click to schedule here
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">No tasks to schedule.</div>
      )}
    </div>
  )
}

'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, X } from 'lucide-react'
import type { FilterState, TaskCategory, TaskStatus } from '@/lib/types/app.types'

const ALL_CATEGORIES: TaskCategory[] = ['EC', 'SAT Prep', 'Essays', 'Academic', 'Admin', 'Personal']
const ALL_STATUSES: TaskStatus[] = ['not_started', 'in_progress', 'done', 'blocked']

const statusLabels: Record<TaskStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  done: 'Done',
  blocked: 'Blocked',
}

interface FilterBarProps {
  filters: FilterState
  onChange: (filters: FilterState) => void
  showAssignedBy?: boolean
}

export function FilterBar({ filters, onChange, showAssignedBy = true }: FilterBarProps) {
  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.statuses.length > 0 ||
    filters.assignedBy !== 'all'

  function toggleCategory(cat: TaskCategory) {
    const next = filters.categories.includes(cat)
      ? filters.categories.filter((c) => c !== cat)
      : [...filters.categories, cat]
    onChange({ ...filters, categories: next })
  }

  function toggleStatus(status: TaskStatus) {
    const next = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status]
    onChange({ ...filters, statuses: next })
  }

  function clearAll() {
    onChange({ categories: [], statuses: [], assignedBy: 'all' })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" />
          }
        >
          Category
          {filters.categories.length > 0 && (
            <span className="ml-1 rounded-full bg-blue-100 text-blue-700 px-1.5 py-0.5 text-xs font-medium">
              {filters.categories.length}
            </span>
          )}
          <ChevronDown className="h-3 w-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {ALL_CATEGORIES.map((cat) => (
              <DropdownMenuCheckboxItem
                key={cat}
                checked={filters.categories.includes(cat)}
                onCheckedChange={() => toggleCategory(cat)}
              >
                {cat}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" />
          }
        >
          Status
          {filters.statuses.length > 0 && (
            <span className="ml-1 rounded-full bg-blue-100 text-blue-700 px-1.5 py-0.5 text-xs font-medium">
              {filters.statuses.length}
            </span>
          )}
          <ChevronDown className="h-3 w-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {ALL_STATUSES.map((status) => (
              <DropdownMenuCheckboxItem
                key={status}
                checked={filters.statuses.includes(status)}
                onCheckedChange={() => toggleStatus(status)}
              >
                {statusLabels[status]}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {showAssignedBy && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1" />
            }
          >
            Assigned by
            {filters.assignedBy !== 'all' && (
              <span className="ml-1 rounded-full bg-blue-100 text-blue-700 px-1.5 py-0.5 text-xs font-medium">
                1
              </span>
            )}
            <ChevronDown className="h-3 w-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Filter by Source</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(['all', 'admin', 'self'] as const).map((val) => (
                <DropdownMenuCheckboxItem
                  key={val}
                  checked={filters.assignedBy === val}
                  onCheckedChange={() => onChange({ ...filters, assignedBy: val })}
                >
                  {val === 'all' ? 'All' : val === 'admin' ? 'Admin-assigned' : 'Self-assigned'}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-muted-foreground gap-1"
          onClick={clearAll}
        >
          <X className="h-3 w-3" />
          Clear filters
        </Button>
      )}
    </div>
  )
}

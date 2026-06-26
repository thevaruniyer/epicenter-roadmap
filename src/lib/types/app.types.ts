import type { Database } from './database.types'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type WeeklyReflection = Database['public']['Tables']['weekly_reflections']['Row']

export type TaskStatus = 'not_started' | 'in_progress' | 'done' | 'blocked'
export type TaskCategory = 'EC' | 'SAT Prep' | 'Essays' | 'Academic' | 'Admin' | 'Personal'
export type TaskViewLevel = 'monthly' | 'weekly' | 'daily'
export type UserRole = 'admin' | 'student'
export type Mood = 'great' | 'good' | 'okay' | 'tough'

export interface TaskWithMeta extends Task {
  assigned_by_profile?: Profile | null
  student_profile?: Profile | null
}

export interface WeeklyLoad {
  totalMinutes: number
  cap: number
  percentage: number
  status: 'normal' | 'warning' | 'critical'
}

export interface StudentCardData {
  profile: Profile
  monthCompletionPercent: number
  tasksThisWeekCount: number
  blockedTasksCount: number
}

export interface FilterState {
  categories: TaskCategory[]
  statuses: TaskStatus[]
  assignedBy: 'all' | 'admin' | 'self'
}

export interface DayLoad {
  day: string
  date: string
  minutes: number
}

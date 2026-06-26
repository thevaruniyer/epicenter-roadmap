'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { subWeeks, format } from 'date-fns'
import type {
  TaskCategory,
  TaskStatus,
  TaskViewLevel,
  Task,
  Profile,
  WeeklyReflection,
} from '@/lib/types/app.types'

// ── Fetch helpers (admin client bypasses recursive RLS) ──────────────────────

export async function fetchMonthlyTasks(
  studentId: string,
  month: number,
  year: number
): Promise<Task[]> {
  const db = createAdminClient()
  const { data } = await db
    .from('tasks')
    .select('*')
    .eq('student_id', studentId)
    .eq('view_level', 'monthly')
    .eq('month', month)
    .eq('year', year)
    .order('created_at', { ascending: true })
  return (data ?? []) as Task[]
}

export async function fetchWeeklyTasks(
  studentId: string,
  weekStart: string
): Promise<Task[]> {
  const db = createAdminClient()
  const { data } = await db
    .from('tasks')
    .select('*')
    .eq('student_id', studentId)
    .eq('view_level', 'weekly')
    .eq('week_start', weekStart)
    .order('created_at', { ascending: true })
  return (data ?? []) as Task[]
}

export async function fetchDailyTasks(
  studentId: string,
  date: string
): Promise<Task[]> {
  const db = createAdminClient()
  const { data } = await db
    .from('tasks')
    .select('*')
    .eq('student_id', studentId)
    .eq('view_level', 'daily')
    .eq('day_date', date)
    .order('created_at', { ascending: true })
  return (data ?? []) as Task[]
}

export async function fetchProfilesByIds(ids: string[]): Promise<Profile[]> {
  if (ids.length === 0) return []
  const db = createAdminClient()
  const { data } = await db.from('profiles').select('*').in('id', ids)
  return (data ?? []) as Profile[]
}

export async function fetchStudentProfile(userId: string): Promise<Profile | null> {
  const db = createAdminClient()
  const { data } = await db.from('profiles').select('*').eq('id', userId).single()
  return data as Profile | null
}

export async function fetchWeeklyReflection(
  studentId: string,
  weekStart: string
): Promise<WeeklyReflection | null> {
  const db = createAdminClient()
  const { data } = await db
    .from('weekly_reflections')
    .select('*')
    .eq('student_id', studentId)
    .eq('week_start', weekStart)
    .maybeSingle()
  return data as WeeklyReflection | null
}

// ── Carry-forward server action ───────────────────────────────────────────────

export async function performCarryForward(
  studentId: string,
  currentWeekStart: string
): Promise<void> {
  const db = createAdminClient()
  const lastWeekStart = format(
    subWeeks(new Date(currentWeekStart + 'T00:00:00'), 1),
    'yyyy-MM-dd'
  )

  const { data: lastWeekTasks } = await db
    .from('tasks')
    .select('*')
    .eq('student_id', studentId)
    .eq('view_level', 'weekly')
    .eq('week_start', lastWeekStart)
    .neq('status', 'done')

  if (!lastWeekTasks) return

  for (const task of lastWeekTasks) {
    const { data: existing } = await db
      .from('tasks')
      .select('id')
      .eq('student_id', studentId)
      .eq('original_task_id', task.id)
      .eq('week_start', currentWeekStart)
      .eq('is_carried_over', true)
      .maybeSingle()

    if (existing) continue

    await db.from('tasks').insert({
      student_id: task.student_id,
      assigned_by: task.assigned_by,
      title: task.title,
      description: task.description,
      view_level: 'weekly',
      week_start: currentWeekStart,
      status: 'not_started',
      category: task.category,
      estimated_minutes: task.estimated_minutes,
      is_admin_assigned: task.is_admin_assigned,
      is_locked: task.is_locked,
      is_carried_over: true,
      original_task_id: task.id,
      parent_monthly_task_id: task.parent_monthly_task_id,
      carry_forward_count: task.carry_forward_count + 1,
      notes: task.notes,
    })
  }
}

// ── Student mutations (admin client + explicit ownership checks) ──────────────

export async function createTask(data: {
  studentId: string
  title: string
  description?: string
  category: TaskCategory
  viewLevel: TaskViewLevel
  estimatedMinutes: number
  month?: number
  year?: number
  weekStart?: string
  dayDate?: string
  isAdminAssigned: boolean
  isLocked?: boolean
  notes?: string
  assignedBy?: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Students can only create tasks for themselves
  if (!data.isAdminAssigned && data.studentId !== user.id) {
    return { error: 'Not authorized' }
  }

  const db = createAdminClient()
  const { error } = await db.from('tasks').insert({
    student_id: data.studentId,
    assigned_by: data.assignedBy ?? null,
    title: data.title,
    description: data.description ?? null,
    category: data.category,
    view_level: data.viewLevel,
    estimated_minutes: data.estimatedMinutes,
    month: data.month ?? null,
    year: data.year ?? null,
    week_start: data.weekStart ?? null,
    day_date: data.dayDate ?? null,
    is_admin_assigned: data.isAdminAssigned,
    is_locked: data.isLocked ?? false,
    notes: data.notes ?? null,
  })

  if (error) return { error: error.message }

  revalidatePath('/monthly')
  revalidatePath('/weekly')
  revalidatePath('/daily')
  revalidatePath('/dashboard')
  revalidatePath('/admin/dashboard')
  return { success: true }
}

export async function updateTask(
  taskId: string,
  updates: {
    title?: string
    description?: string
    status?: TaskStatus
    category?: TaskCategory
    estimatedMinutes?: number
    isLocked?: boolean
    notes?: string
    dayDate?: string
    weekStart?: string
  }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const db = createAdminClient()

  // Verify ownership and lock status
  const { data: task } = await db
    .from('tasks')
    .select('student_id, is_locked')
    .eq('id', taskId)
    .single()

  if (!task) return { error: 'Task not found' }
  if (task.student_id !== user.id) return { error: 'Not authorized' }
  if (task.is_locked) return { error: 'This task is locked and cannot be edited' }

  const { error } = await db
    .from('tasks')
    .update({
      ...(updates.title !== undefined && { title: updates.title }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.status !== undefined && { status: updates.status }),
      ...(updates.category !== undefined && { category: updates.category }),
      ...(updates.estimatedMinutes !== undefined && { estimated_minutes: updates.estimatedMinutes }),
      ...(updates.isLocked !== undefined && { is_locked: updates.isLocked }),
      ...(updates.notes !== undefined && { notes: updates.notes }),
      ...(updates.dayDate !== undefined && { day_date: updates.dayDate }),
      ...(updates.weekStart !== undefined && { week_start: updates.weekStart }),
    })
    .eq('id', taskId)
    .eq('student_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/monthly')
  revalidatePath('/weekly')
  revalidatePath('/daily')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function adminUpdateTask(
  taskId: string,
  updates: {
    title?: string
    description?: string
    status?: TaskStatus
    category?: TaskCategory
    estimatedMinutes?: number
    isLocked?: boolean
    notes?: string
    dayDate?: string
    weekStart?: string
  },
  studentId: string
) {
  const db = createAdminClient()

  const { error } = await db
    .from('tasks')
    .update({
      ...(updates.title !== undefined && { title: updates.title }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.status !== undefined && { status: updates.status }),
      ...(updates.category !== undefined && { category: updates.category }),
      ...(updates.estimatedMinutes !== undefined && { estimated_minutes: updates.estimatedMinutes }),
      ...(updates.isLocked !== undefined && { is_locked: updates.isLocked }),
      ...(updates.notes !== undefined && { notes: updates.notes }),
      ...(updates.dayDate !== undefined && { day_date: updates.dayDate }),
      ...(updates.weekStart !== undefined && { week_start: updates.weekStart }),
    })
    .eq('id', taskId)

  if (error) return { error: error.message }

  revalidatePath(`/admin/students/${studentId}`)
  revalidatePath('/admin/dashboard')
  return { success: true }
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const db = createAdminClient()

  const { data: task } = await db
    .from('tasks')
    .select('student_id, is_admin_assigned')
    .eq('id', taskId)
    .single()

  if (!task) return { error: 'Task not found' }
  if (task.student_id !== user.id) return { error: 'Not authorized' }
  if (task.is_admin_assigned) return { error: 'Admin-assigned tasks cannot be deleted by students' }

  const { error } = await db
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('student_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/monthly')
  revalidatePath('/weekly')
  revalidatePath('/daily')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function adminDeleteTask(taskId: string, studentId: string) {
  const db = createAdminClient()
  const { error } = await db.from('tasks').delete().eq('id', taskId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/students/${studentId}`)
  revalidatePath('/admin/dashboard')
  return { success: true }
}

export async function pullTaskToWeekly(
  monthlyTaskId: string,
  studentId: string,
  weekStart: string
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.id !== studentId) return { error: 'Not authorized' }

  const db = createAdminClient()

  const { data: monthlyTask, error: fetchError } = await db
    .from('tasks')
    .select('*')
    .eq('id', monthlyTaskId)
    .eq('student_id', studentId)
    .single()

  if (fetchError || !monthlyTask) return { error: 'Task not found' }

  // Prevent duplicate pulls
  const { data: existing } = await db
    .from('tasks')
    .select('id')
    .eq('student_id', studentId)
    .eq('parent_monthly_task_id', monthlyTaskId)
    .eq('view_level', 'weekly')
    .eq('week_start', weekStart)
    .maybeSingle()

  if (existing) return { error: 'Task already added to this week' }

  const { error } = await db.from('tasks').insert({
    student_id: studentId,
    assigned_by: monthlyTask.assigned_by,
    title: monthlyTask.title,
    description: monthlyTask.description,
    view_level: 'weekly',
    week_start: weekStart,
    category: monthlyTask.category,
    estimated_minutes: monthlyTask.estimated_minutes,
    is_admin_assigned: monthlyTask.is_admin_assigned,
    is_locked: monthlyTask.is_locked,
    parent_monthly_task_id: monthlyTaskId,
    notes: monthlyTask.notes,
  })

  if (error) return { error: error.message }

  revalidatePath('/weekly')
  revalidatePath('/monthly')
  return { success: true }
}

export async function pullTaskToDaily(
  weeklyTaskId: string,
  studentId: string,
  dayDate: string
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.id !== studentId) return { error: 'Not authorized' }

  const db = createAdminClient()

  const { data: weeklyTask, error: fetchError } = await db
    .from('tasks')
    .select('*')
    .eq('id', weeklyTaskId)
    .eq('student_id', studentId)
    .single()

  if (fetchError || !weeklyTask) return { error: 'Task not found' }

  const { error } = await db.from('tasks').insert({
    student_id: studentId,
    assigned_by: weeklyTask.assigned_by,
    title: weeklyTask.title,
    description: weeklyTask.description,
    view_level: 'daily',
    day_date: dayDate,
    category: weeklyTask.category,
    estimated_minutes: weeklyTask.estimated_minutes,
    is_admin_assigned: weeklyTask.is_admin_assigned,
    is_locked: weeklyTask.is_locked,
    parent_monthly_task_id: weeklyTask.parent_monthly_task_id,
    notes: weeklyTask.notes,
  })

  if (error) return { error: error.message }

  revalidatePath('/daily')
  revalidatePath('/weekly')
  return { success: true }
}

export async function saveReflection(
  studentId: string,
  weekStart: string,
  content: string,
  mood: string | null
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.id !== studentId) return { error: 'Not authorized' }

  const db = createAdminClient()

  const { error } = await db.from('weekly_reflections').upsert(
    {
      student_id: studentId,
      week_start: weekStart,
      content,
      mood: (mood as 'great' | 'good' | 'okay' | 'tough' | null) ?? null,
    },
    { onConflict: 'student_id,week_start' }
  )

  if (error) return { error: error.message }
  return { success: true }
}

export async function updateProfile(
  userId: string,
  updates: { full_name?: string; weekly_load_cap?: number }
) {
  const db = createAdminClient()
  const { error } = await db.from('profiles').update(updates).eq('id', userId)
  if (error) return { error: error.message }
  revalidatePath('/admin/students')
  revalidatePath(`/admin/students/${userId}`)
  return { success: true }
}

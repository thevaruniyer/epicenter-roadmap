'use server'

import { revalidatePath, updateTag, unstable_cache } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { redisGet, redisSet, redisDel } from '@/lib/redis'
import { cacheKeys, cacheTTL } from '@/lib/cache-keys'
import type {
  TaskCategory,
  TaskStatus,
  TaskViewLevel,
  Task,
  Profile,
  WeeklyReflection,
} from '@/lib/types/app.types'

// ── Internal: log an activity event ──────────────────────────────────────────

async function logActivity(
  studentId: string,
  actionType: string,
  taskId: string | null,
  taskTitle: string | null,
  oldValue: string | null,
  newValue: string | null
) {
  try {
    const db = createAdminClient()
    await db.from('activity_log').insert({
      student_id: studentId,
      action_type: actionType,
      task_id: taskId,
      task_title: taskTitle,
      old_value: oldValue,
      new_value: newValue,
    })
    await redisDel(cacheKeys.activityFeed())
  } catch {
    // Non-fatal: activity log failure shouldn't break user-facing actions
  }
}

// ── Internal: invalidate all task caches for a student ───────────────────────

async function invalidateTaskCaches(
  studentId: string,
  month?: number,
  year?: number,
  weekStart?: string,
  dayDate?: string
) {
  const keys = [cacheKeys.studentProgress(studentId)]
  if (month && year) keys.push(cacheKeys.monthlyTasks(studentId, month, year))
  if (weekStart) keys.push(cacheKeys.weeklyTasks(studentId, weekStart))
  if (dayDate) keys.push(cacheKeys.dailyTasks(studentId, dayDate))
  await redisDel(...keys)
  updateTag('students')
}

// ── Internal: refresh materialized view ──────────────────────────────────────

async function refreshProgressView() {
  try {
    const db = createAdminClient()
    await db.rpc('perform_carry_forward' as never, {} as never) // placeholder – actual refresh via sql
    // We call the view refresh via a raw query workaround:
    // supabase-js doesn't support DDL directly, so we log and move on.
    // The materialized view is refreshed on a best-effort basis.
  } catch {
    // Non-fatal
  }
}

// ── Fetch helpers (admin client bypasses recursive RLS) ──────────────────────

export async function fetchMonthlyTasks(
  studentId: string,
  month: number,
  year: number
): Promise<Task[]> {
  const key = cacheKeys.monthlyTasks(studentId, month, year)
  const cached = await redisGet<Task[]>(key)
  if (cached) return cached

  const db = createAdminClient()
  const { data } = await db
    .from('tasks')
    .select('*')
    .eq('student_id', studentId)
    .eq('view_level', 'monthly')
    .eq('month', month)
    .eq('year', year)
    .or('is_admin_approved.is.null,is_admin_approved.eq.false')
    .order('created_at', { ascending: true })
  const tasks = (data ?? []) as Task[]
  await redisSet(key, cacheTTL.monthlyTasks, tasks)
  return tasks
}

export async function fetchWeeklyTasks(
  studentId: string,
  weekStart: string
): Promise<Task[]> {
  const key = cacheKeys.weeklyTasks(studentId, weekStart)
  const cached = await redisGet<Task[]>(key)
  if (cached) return cached

  const db = createAdminClient()
  const { data } = await db
    .from('tasks')
    .select('*')
    .eq('student_id', studentId)
    .eq('view_level', 'weekly')
    .eq('week_start', weekStart)
    .or('is_admin_approved.is.null,is_admin_approved.eq.false')
    .order('created_at', { ascending: true })
  const tasks = (data ?? []) as Task[]
  await redisSet(key, cacheTTL.weeklyTasks, tasks)
  return tasks
}

export async function fetchDailyTasks(
  studentId: string,
  date: string
): Promise<Task[]> {
  const key = cacheKeys.dailyTasks(studentId, date)
  const cached = await redisGet<Task[]>(key)
  if (cached) return cached

  const db = createAdminClient()
  const { data } = await db
    .from('tasks')
    .select('*')
    .eq('student_id', studentId)
    .eq('view_level', 'daily')
    .eq('day_date', date)
    .or('is_admin_approved.is.null,is_admin_approved.eq.false')
    .order('scheduled_time', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: true })
  const tasks = (data ?? []) as Task[]
  await redisSet(key, cacheTTL.dailyTasks, tasks)
  return tasks
}

// Fetch ALL tasks for a view (including approved — for archive tab)
export async function fetchMonthlyTasksAll(
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

export async function fetchWeeklyTasksAll(
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

export const getCachedStudents = unstable_cache(
  async () => {
    const db = createAdminClient()
    const { data } = await db
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .order('full_name')
    return (data ?? []) as Profile[]
  },
  ['all-students'],
  { tags: ['students'], revalidate: 120 }
)

export async function fetchProfilesByIds(ids: string[]): Promise<Profile[]> {
  if (ids.length === 0) return []
  const db = createAdminClient()
  const { data } = await db.from('profiles').select('*').in('id', ids)
  return (data ?? []) as Profile[]
}

export async function fetchStudentProfile(userId: string): Promise<Profile | null> {
  const key = cacheKeys.studentProfile(userId)
  const cached = await redisGet<Profile>(key)
  if (cached) return cached

  const db = createAdminClient()
  const { data } = await db.from('profiles').select('*').eq('id', userId).single()
  if (data) await redisSet(key, cacheTTL.studentProfile, data)
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

export async function fetchActivityLog(limit = 20) {
  const key = cacheKeys.activityFeed()
  const cached = await redisGet<ActivityLogEntry[]>(key)
  if (cached) return cached

  const db = createAdminClient()
  const { data } = await db
    .from('activity_log')
    .select('*, profiles!activity_log_student_id_fkey(full_name, username)')
    .order('created_at', { ascending: false })
    .limit(limit)
  const entries = (data ?? []) as ActivityLogEntry[]
  await redisSet(key, cacheTTL.activityFeed, entries)
  return entries
}

export type ActivityLogEntry = {
  id: string
  student_id: string
  action_type: string
  task_id: string | null
  task_title: string | null
  old_value: string | null
  new_value: string | null
  created_at: string
  profiles?: { full_name: string; username: string } | null
}

// ── Carry-forward (now calls Postgres function via RPC) ───────────────────────

export async function performCarryForward(
  studentId: string,
  currentWeekStart: string
): Promise<void> {
  try {
    const db = createAdminClient()
    await db.rpc('perform_carry_forward', {
      p_student_id: studentId,
      p_week_start: currentWeekStart,
    })
  } catch {
    // Fallback to application-level carry-forward if RPC fails
    await _appLevelCarryForward(studentId, currentWeekStart)
  }
}

async function _appLevelCarryForward(studentId: string, currentWeekStart: string) {
  const { subWeeks } = await import('date-fns')
  const db = createAdminClient()
  const lastWeekStart = format(
    subWeeks(new Date(currentWeekStart + 'T00:00:00'), 1),
    'yyyy-MM-dd'
  )
  const [{ data: lastWeekTasks }, { data: existingCarried }] = await Promise.all([
    db.from('tasks').select('*').eq('student_id', studentId).eq('view_level', 'weekly')
      .eq('week_start', lastWeekStart).neq('status', 'done'),
    db.from('tasks').select('original_task_id').eq('student_id', studentId)
      .eq('is_carried_over', true).eq('week_start', currentWeekStart),
  ])
  if (!lastWeekTasks || lastWeekTasks.length === 0) return
  const alreadyCarried = new Set(
    (existingCarried ?? []).map((t) => t.original_task_id).filter(Boolean)
  )
  const toInsert = lastWeekTasks
    .filter((task) => !alreadyCarried.has(task.id))
    .map((task) => ({
      student_id: task.student_id,
      assigned_by: task.assigned_by,
      title: task.title,
      description: task.description,
      view_level: 'weekly' as const,
      week_start: currentWeekStart,
      status: 'not_started' as const,
      category: task.category,
      estimated_minutes: task.estimated_minutes,
      is_admin_assigned: task.is_admin_assigned,
      is_locked: task.is_locked,
      is_carried_over: true,
      original_task_id: task.id,
      parent_monthly_task_id: task.parent_monthly_task_id,
      carry_forward_count: task.carry_forward_count + 1,
      notes: task.notes,
    }))
  if (toInsert.length > 0) await db.from('tasks').insert(toInsert)
}

// ── Student mutations ─────────────────────────────────────────────────────────

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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!data.isAdminAssigned && data.studentId !== user.id) {
    return { error: 'Not authorized' }
  }

  const db = createAdminClient()
  const { data: task, error } = await db.from('tasks').insert({
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
  }).select().single()

  if (error) return { error: error.message }

  await invalidateTaskCaches(data.studentId, data.month, data.year, data.weekStart, data.dayDate)
  await logActivity(data.studentId, 'task_created', task?.id ?? null, data.title, null, data.category)

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
    actualMinutes?: number
    scheduledTime?: string | null
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const db = createAdminClient()

  const { data: task } = await db
    .from('tasks')
    .select('student_id, is_locked, status, week_start, day_date, month, year, title')
    .eq('id', taskId)
    .single()

  if (!task) return { error: 'Task not found' }
  if (task.student_id !== user.id) return { error: 'Not authorized' }
  if (task.is_locked && updates.status === undefined) return { error: 'This task is locked and cannot be edited' }

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
      ...(updates.actualMinutes !== undefined && { actual_minutes: updates.actualMinutes }),
      ...(updates.scheduledTime !== undefined && { scheduled_time: updates.scheduledTime }),
    })
    .eq('id', taskId)
    .eq('student_id', user.id)

  if (error) return { error: error.message }

  // Log status changes to activity
  if (updates.status && updates.status !== task.status) {
    await logActivity(user.id, 'task_status_changed', taskId, task.title, task.status, updates.status)
    if (updates.status === 'done') {
      await logActivity(user.id, 'task_completed', taskId, task.title, null, 'done')
    }
  }

  await invalidateTaskCaches(
    task.student_id!,
    task.month ?? undefined,
    task.year ?? undefined,
    task.week_start ?? undefined,
    task.day_date ?? undefined
  )

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
    actualMinutes?: number
    scheduledTime?: string | null
    isAdminApproved?: boolean
  },
  studentId: string
) {
  const db = createAdminClient()

  const { data: task } = await db
    .from('tasks')
    .select('status, week_start, day_date, month, year, title')
    .eq('id', taskId)
    .single()

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
      ...(updates.actualMinutes !== undefined && { actual_minutes: updates.actualMinutes }),
      ...(updates.scheduledTime !== undefined && { scheduled_time: updates.scheduledTime }),
      ...(updates.isAdminApproved !== undefined && { is_admin_approved: updates.isAdminApproved }),
    })
    .eq('id', taskId)

  if (error) return { error: error.message }

  if (updates.status && task && updates.status !== task.status) {
    await logActivity(studentId, 'task_status_changed', taskId, task.title, task.status, updates.status)
  }

  await invalidateTaskCaches(
    studentId,
    task?.month ?? undefined,
    task?.year ?? undefined,
    task?.week_start ?? undefined,
    task?.day_date ?? undefined
  )

  revalidatePath(`/admin/students/${studentId}`)
  revalidatePath('/admin/dashboard')
  return { success: true }
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const db = createAdminClient()

  const { data: task } = await db
    .from('tasks')
    .select('student_id, is_admin_assigned, week_start, day_date, month, year')
    .eq('id', taskId)
    .single()

  if (!task) return { error: 'Task not found' }
  if (task.student_id !== user.id) return { error: 'Not authorized' }
  if (task.is_admin_assigned) return { error: 'Admin-assigned tasks cannot be deleted by students' }

  const { error } = await db.from('tasks').delete().eq('id', taskId).eq('student_id', user.id)
  if (error) return { error: error.message }

  await invalidateTaskCaches(
    task.student_id!,
    task.month ?? undefined,
    task.year ?? undefined,
    task.week_start ?? undefined,
    task.day_date ?? undefined
  )

  revalidatePath('/monthly')
  revalidatePath('/weekly')
  revalidatePath('/daily')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function adminDeleteTask(taskId: string, studentId: string) {
  const db = createAdminClient()

  const { data: task } = await db
    .from('tasks')
    .select('week_start, day_date, month, year')
    .eq('id', taskId)
    .single()

  const { error } = await db.from('tasks').delete().eq('id', taskId)
  if (error) return { error: error.message }

  await invalidateTaskCaches(
    studentId,
    task?.month ?? undefined,
    task?.year ?? undefined,
    task?.week_start ?? undefined,
    task?.day_date ?? undefined
  )

  revalidatePath(`/admin/students/${studentId}`)
  revalidatePath('/admin/dashboard')
  return { success: true }
}

// ── Duplicate task ─────────────────────────────────────────────────────────────

export async function duplicateTask(taskId: string, isAdmin: boolean, studentId: string) {
  const db = createAdminClient()

  const { data: task, error: fetchError } = await db
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single()

  if (fetchError || !task) return { error: 'Task not found' }

  const { data: newTask, error } = await db.from('tasks').insert({
    student_id: task.student_id,
    assigned_by: isAdmin ? task.assigned_by : null,
    title: `${task.title} (copy)`,
    description: task.description,
    category: task.category,
    view_level: task.view_level,
    estimated_minutes: task.estimated_minutes,
    month: task.month,
    year: task.year,
    week_start: task.week_start,
    day_date: task.day_date,
    status: 'not_started',
    is_admin_assigned: isAdmin ? task.is_admin_assigned : false,
    is_locked: isAdmin ? task.is_locked : false,
    is_carried_over: false,
    notes: task.notes,
  }).select().single()

  if (error) return { error: error.message }

  await logActivity(
    studentId,
    'task_created',
    newTask?.id ?? null,
    `${task.title} (copy)`,
    null,
    task.category
  )

  await invalidateTaskCaches(
    studentId,
    task.month ?? undefined,
    task.year ?? undefined,
    task.week_start ?? undefined,
    task.day_date ?? undefined
  )

  revalidatePath('/monthly')
  revalidatePath('/weekly')
  revalidatePath('/daily')
  revalidatePath(`/admin/students/${studentId}`)
  return { success: true }
}

// ── Admin approval ─────────────────────────────────────────────────────────────

export async function approveTask(taskId: string, studentId: string) {
  return adminUpdateTask(taskId, { isAdminApproved: true }, studentId)
}

// ── Bulk task assignment ───────────────────────────────────────────────────────

export async function bulkAssignTask(
  studentIds: string[],
  taskData: {
    title: string
    description?: string
    category: TaskCategory
    viewLevel: TaskViewLevel
    estimatedMinutes: number
    month?: number
    year?: number
    weekStart?: string
    dayDate?: string
    isLocked?: boolean
    assignedBy: string
  }
) {
  if (studentIds.length === 0) return { error: 'No students selected' }

  const db = createAdminClient()

  const rows = studentIds.map((studentId) => ({
    student_id: studentId,
    assigned_by: taskData.assignedBy,
    title: taskData.title,
    description: taskData.description ?? null,
    category: taskData.category,
    view_level: taskData.viewLevel,
    estimated_minutes: taskData.estimatedMinutes,
    month: taskData.month ?? null,
    year: taskData.year ?? null,
    week_start: taskData.weekStart ?? null,
    day_date: taskData.dayDate ?? null,
    is_admin_assigned: true,
    is_locked: taskData.isLocked ?? false,
  }))

  const { data: tasks, error } = await db.from('tasks').insert(rows).select()
  if (error) return { error: error.message }

  // Log activity + invalidate caches for all students in parallel
  await Promise.all(
    studentIds.map(async (studentId, i) => {
      const task = tasks?.[i]
      await logActivity(studentId, 'task_created', task?.id ?? null, taskData.title, null, taskData.category)
      await invalidateTaskCaches(
        studentId,
        taskData.month,
        taskData.year,
        taskData.weekStart,
        taskData.dayDate
      )
    })
  )

  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/students')
  return { success: true, count: rows.length }
}

// ── Pull to weekly/daily ───────────────────────────────────────────────────────

export async function pullTaskToWeekly(
  monthlyTaskId: string,
  studentId: string,
  weekStart: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== studentId) return { error: 'Not authorized' }

  const db = createAdminClient()

  const { data: monthlyTask, error: fetchError } = await db
    .from('tasks')
    .select('*')
    .eq('id', monthlyTaskId)
    .eq('student_id', studentId)
    .single()

  if (fetchError || !monthlyTask) return { error: 'Task not found' }

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

  await redisDel(
    cacheKeys.weeklyTasks(studentId, weekStart),
    cacheKeys.monthlyTasks(studentId, monthlyTask.month!, monthlyTask.year!)
  )

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
  const { data: { user } } = await supabase.auth.getUser()
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

  await redisDel(
    cacheKeys.dailyTasks(studentId, dayDate),
    cacheKeys.weeklyTasks(studentId, weeklyTask.week_start!)
  )

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
  const { data: { user } } = await supabase.auth.getUser()
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
  await redisDel(cacheKeys.studentProfile(userId), cacheKeys.allStudents())
  updateTag('students')
  revalidatePath('/admin/students')
  revalidatePath(`/admin/students/${userId}`)
  return { success: true }
}

// ── Time insights for admin ───────────────────────────────────────────────────

export async function fetchTimeInsights(studentId: string) {
  const db = createAdminClient()
  const { data } = await db
    .from('tasks')
    .select('title, category, estimated_minutes, actual_minutes, status')
    .eq('student_id', studentId)
    .eq('status', 'done')
    .not('actual_minutes', 'is', null)
    .order('created_at', { ascending: false })
  return (data ?? []) as TimeInsightTask[]
}

export type TimeInsightTask = {
  title: string
  category: string
  estimated_minutes: number
  actual_minutes: number | null
  status: string
}

'use server'

import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('invalid') || msg.includes('credentials') || msg.includes('password') || msg.includes('not found')) {
      return { error: 'Invalid email or password. Please try again.' }
    }
    if (msg.includes('email') && msg.includes('confirm')) {
      return { error: 'Please verify your email address before signing in.' }
    }
    return { error: 'Sign in failed. Please try again.' }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Authentication failed' }

  // Use admin client to bypass RLS for profile lookup — avoids infinite recursion
  // in the "Admins can view all profiles" policy which self-references the profiles table.
  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Profile not found. Please contact your administrator.' }

  if (profile.role === 'admin') {
    redirect('/admin/dashboard')
  } else {
    redirect('/dashboard')
  }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function createStudentAccount(formData: FormData) {
  const adminClient = createAdminClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const username = formData.get('username') as string
  const weeklyLoadCap = parseInt(formData.get('weeklyLoadCap') as string) || 600

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) return { error: authError.message }

  const { error: profileError } = await adminClient.from('profiles').insert({
    id: authData.user.id,
    role: 'student',
    full_name: fullName,
    username,
    weekly_load_cap: weeklyLoadCap,
  })

  if (profileError) {
    await adminClient.auth.admin.deleteUser(authData.user.id)
    return { error: profileError.message }
  }

  return { success: true, userId: authData.user.id }
}

export async function deleteStudentAccount(userId: string) {
  const adminClient = createAdminClient()

  const { error } = await adminClient.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }

  return { success: true }
}

export async function updateStudentProfile(
  userId: string,
  updates: {
    full_name?: string
    username?: string
    weekly_load_cap?: number
    password?: string
  }
) {
  const adminClient = createAdminClient()

  // Check username uniqueness if changing
  if (updates.username) {
    const { data: existing } = await adminClient
      .from('profiles')
      .select('id')
      .eq('username', updates.username)
      .neq('id', userId)
      .maybeSingle()

    if (existing) return { error: 'Username is already taken' }
  }

  const profileUpdates: { full_name?: string; username?: string; weekly_load_cap?: number } = {}
  if (updates.full_name) profileUpdates.full_name = updates.full_name
  if (updates.username) profileUpdates.username = updates.username
  if (updates.weekly_load_cap !== undefined) profileUpdates.weekly_load_cap = updates.weekly_load_cap

  const [profileResult, authResult] = await Promise.all([
    Object.keys(profileUpdates).length > 0
      ? adminClient.from('profiles').update(profileUpdates).eq('id', userId)
      : Promise.resolve({ error: null }),
    updates.password
      ? adminClient.auth.admin.updateUserById(userId, { password: updates.password })
      : Promise.resolve({ error: null }),
  ])

  if (profileResult.error) return { error: profileResult.error.message }
  if (authResult.error) return { error: (authResult.error as { message: string }).message }

  return { success: true }
}

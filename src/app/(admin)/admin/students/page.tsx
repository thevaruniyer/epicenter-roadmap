import { createClient, createAdminClient } from '@/lib/supabase/server'
import { StudentsClientPage } from '@/components/admin/StudentsClientPage'
import type { Profile } from '@/lib/types/app.types'

export default async function StudentsPage() {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: students } = await adminClient
    .from('profiles')
    .select('*')
    .eq('role', 'student')
    .order('full_name')

  return (
    <StudentsClientPage
      students={(students ?? []) as Profile[]}
      adminId={user.id}
    />
  )
}

import { notFound } from 'next/navigation'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils/timeUtils'
import { AdminStudentTabs } from '@/components/admin/AdminStudentTabs'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminStudentPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const [{ data: student }, { data: adminProfile }] = await Promise.all([
    adminClient.from('profiles').select('*').eq('id', id).eq('role', 'student').single(),
    adminClient.from('profiles').select('*').eq('id', user.id).single(),
  ])

  if (!student) notFound()

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarFallback className="bg-[#0f0f0f] text-white font-semibold">
            {getInitials(student.full_name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{student.full_name}</h1>
          <p className="text-sm text-gray-500">@{student.username} · {student.weekly_load_cap}m/week cap</p>
        </div>
      </div>

      <AdminStudentTabs student={student} adminProfile={adminProfile} />
    </div>
  )
}

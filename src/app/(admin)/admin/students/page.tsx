import Link from 'next/link'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils/timeUtils'
import { format } from 'date-fns'
import { CreateStudentDialog } from '@/components/admin/CreateStudentDialog'
import { DeleteStudentButton } from '@/components/admin/DeleteStudentButton'
import { EditStudentDialog } from '@/components/admin/EditStudentDialog'
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
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Management</h1>
          <p className="text-sm text-gray-500">{students?.length ?? 0} {(students?.length ?? 0) === 1 ? 'student' : 'students'}</p>
        </div>
        <CreateStudentDialog adminId={user.id} />
      </div>

      {(!students || students.length === 0) ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">No students yet.</p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">All Students</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {students.map((student) => (
                <div key={student.id} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-[#0f0f0f] text-white">
                      {getInitials(student.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{student.full_name}</p>
                    <p className="text-xs text-muted-foreground">@{student.username}</p>
                  </div>
                  <div className="text-xs text-muted-foreground hidden sm:block">
                    {student.weekly_load_cap}m / week cap
                  </div>
                  <div className="text-xs text-muted-foreground hidden md:block">
                    Joined {format(new Date(student.created_at), 'MMM d, yyyy')}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/students/${student.id}`}
                      className="inline-flex items-center justify-center rounded-[min(var(--radius-md),12px)] border border-border bg-background px-2.5 h-7 text-[0.8rem] font-medium hover:bg-muted transition-colors"
                    >
                      View
                    </Link>
                    <EditStudentDialog student={student as Profile} />
                    <DeleteStudentButton studentId={student.id} studentName={student.full_name} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

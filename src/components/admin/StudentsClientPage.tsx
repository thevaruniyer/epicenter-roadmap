'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { getInitials } from '@/lib/utils/timeUtils'
import { format } from 'date-fns'
import { CreateStudentDialog } from '@/components/admin/CreateStudentDialog'
import { DeleteStudentButton } from '@/components/admin/DeleteStudentButton'
import { EditStudentDialog } from '@/components/admin/EditStudentDialog'
import { BulkAssignDialog } from '@/components/admin/BulkAssignDialog'
import type { Profile } from '@/lib/types/app.types'
import { Users } from 'lucide-react'

interface StudentsClientPageProps {
  students: Profile[]
  adminId: string
}

export function StudentsClientPage({ students, adminId }: StudentsClientPageProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)

  function toggleStudent(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selectedIds.size === students.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(students.map(s => s.id)))
    }
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Management</h1>
          <p className="text-sm text-gray-500">
            {students.length} {students.length === 1 ? 'student' : 'students'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAll}
              >
                {selectedIds.size === students.length ? 'Deselect all' : 'Select all'}
              </Button>
              <BulkAssignDialog
                selectedStudentIds={Array.from(selectedIds)}
                adminId={adminId}
                onSuccess={exitSelectMode}
              />
              <Button variant="ghost" size="sm" onClick={exitSelectMode}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => setSelectMode(true)}
              >
                <Users className="h-3.5 w-3.5" />
                Bulk assign
              </Button>
              <CreateStudentDialog adminId={adminId} />
            </>
          )}
        </div>
      </div>

      {/* Floating action bar when students selected */}
      {selectMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-full shadow-lg flex items-center gap-3 text-sm">
          <span className="font-medium">{selectedIds.size} selected</span>
          <BulkAssignDialog
            selectedStudentIds={Array.from(selectedIds)}
            adminId={adminId}
            onSuccess={exitSelectMode}
          />
        </div>
      )}

      {students.length === 0 ? (
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
                <div
                  key={student.id}
                  className={`flex items-center gap-4 px-6 py-3 hover:bg-gray-50 ${
                    selectMode && selectedIds.has(student.id) ? 'bg-blue-50' : ''
                  }`}
                >
                  {selectMode && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(student.id)}
                      onChange={() => toggleStudent(student.id)}
                      className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                    />
                  )}
                  <Avatar className="h-8 w-8 shrink-0">
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
                  {!selectMode && (
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
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

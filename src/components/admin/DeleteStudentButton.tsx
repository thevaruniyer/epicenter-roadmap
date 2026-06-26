'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { deleteStudentAccount } from '@/app/actions/auth'
import { useRouter } from 'next/navigation'

interface DeleteStudentButtonProps {
  studentId: string
  studentName: string
}

export function DeleteStudentButton({ studentId, studentName }: DeleteStudentButtonProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    if (!window.confirm(`Delete ${studentName}'s account? This cannot be undone.`)) return
    startTransition(async () => {
      await deleteStudentAccount(studentId)
      router.refresh()
    })
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
      onClick={handleDelete}
      disabled={isPending}
    >
      {isPending ? '...' : 'Delete'}
    </Button>
  )
}

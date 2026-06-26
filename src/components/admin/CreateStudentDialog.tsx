'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { createStudentAccount } from '@/app/actions/auth'
import { useRouter } from 'next/navigation'

interface CreateStudentDialogProps {
  adminId: string
}

export function CreateStudentDialog({ adminId: _ }: CreateStudentDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createStudentAccount(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" />
        }
      >
        + New Student
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add new student</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-2">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Full Name</label>
            <Input name="fullName" placeholder="Jane Smith" required disabled={isPending} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Username</label>
            <Input name="username" placeholder="janesmith" required disabled={isPending} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
            <Input name="email" type="email" placeholder="jane@example.com" required disabled={isPending} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Password</label>
            <Input name="password" type="password" placeholder="••••••••" required minLength={8} disabled={isPending} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Weekly Load Cap (minutes)</label>
            <Input name="weeklyLoadCap" type="number" defaultValue={600} min={60} step={30} disabled={isPending} />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? 'Creating...' : 'Create student'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

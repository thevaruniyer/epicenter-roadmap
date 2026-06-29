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
import { updateStudentProfile } from '@/app/actions/auth'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import type { Profile } from '@/lib/types/app.types'

interface EditStudentDialogProps {
  student: Profile
}

export function EditStudentDialog({ student }: EditStudentDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    const formData = new FormData(e.currentTarget)

    const fullName = (formData.get('fullName') as string).trim()
    const username = (formData.get('username') as string).trim()
    const weeklyLoadCap = parseInt(formData.get('weeklyLoadCap') as string)
    const password = (formData.get('password') as string).trim()

    if (password && password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    startTransition(async () => {
      const result = await updateStudentProfile(student.id, {
        full_name: fullName || undefined,
        username: username || undefined,
        weekly_load_cap: isNaN(weeklyLoadCap) ? undefined : weeklyLoadCap,
        password: password || undefined,
      })

      if (result?.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        router.refresh()
        setTimeout(() => {
          setOpen(false)
          setSuccess(false)
        }, 1200)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="outline" size="icon-sm" />}
        aria-label="Edit student"
      >
        <Pencil className="h-3.5 w-3.5" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {student.full_name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-2">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Full Name</label>
            <Input
              name="fullName"
              defaultValue={student.full_name}
              placeholder="Jane Smith"
              required
              disabled={isPending}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Username</label>
            <Input
              name="username"
              defaultValue={student.username}
              placeholder="janesmith"
              required
              disabled={isPending}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Weekly Load Cap
              <span className="ml-1 font-normal text-muted-foreground">(minutes — 600 min = 10 hrs/week)</span>
            </label>
            <Input
              name="weeklyLoadCap"
              type="number"
              defaultValue={student.weekly_load_cap}
              min={60}
              step={30}
              required
              disabled={isPending}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              New Password
              <span className="ml-1 font-normal text-muted-foreground">(leave blank to keep current)</span>
            </label>
            <Input
              name="password"
              type="password"
              placeholder="••••••••"
              minLength={8}
              disabled={isPending}
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          {success && <p className="text-xs text-green-600">Saved successfully!</p>}
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? 'Saving...' : 'Save changes'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

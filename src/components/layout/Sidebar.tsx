'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  CalendarClock,
  Users,
  LogOut,
} from 'lucide-react'
import { logout } from '@/app/actions/auth'
import { getInitials } from '@/lib/utils/timeUtils'
import type { Profile } from '@/lib/types/app.types'

interface SidebarProps {
  profile: Profile
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const isAdmin = profile.role === 'admin'

  const studentLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/monthly', label: 'Monthly', icon: Calendar },
    { href: '/weekly', label: 'Weekly', icon: CalendarDays },
    { href: '/daily', label: 'Daily', icon: CalendarClock },
  ]

  const adminLinks = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/students', label: 'Students', icon: Users },
  ]

  const links = isAdmin ? adminLinks : studentLinks

  return (
    <aside className="w-56 shrink-0 flex flex-col bg-[#0f0f0f] text-white min-h-screen">
      <div className="px-5 py-5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-blue-500 flex items-center justify-center">
            <span className="text-xs font-bold text-white">E</span>
          </div>
          <span className="font-semibold text-sm tracking-tight">Epicenter</span>
        </div>
      </div>

      <Separator className="bg-white/10" />

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <Separator className="bg-white/10" />

      <div className="px-3 py-4">
        <div className="flex items-center gap-2.5 px-2 mb-3">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs bg-white/10 text-white">
              {getInitials(profile.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{profile.full_name}</p>
            <p className="text-xs text-white/50 capitalize">{profile.role}</p>
          </div>
        </div>
        <form action={logout}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-white/60 hover:text-white hover:bg-white/5 text-xs h-8"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  )
}

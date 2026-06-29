import { startOfWeek, addDays, format } from 'date-fns'

export function minutesToDisplay(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function getWeeklyLoadStatus(minutes: number, cap: number): 'normal' | 'warning' | 'critical' {
  const pct = (minutes / cap) * 100
  if (pct >= 100) return 'critical'
  if (pct >= 80) return 'warning'
  return 'normal'
}

export function getWeekStart(date: Date = new Date()): Date {
  return startOfWeek(date, { weekStartsOn: 1 })
}

export function formatWeekRange(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6)
  return `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`
}

export function getAcademicYearMonths(): { value: number; label: string; year: number }[] {
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth() + 1

  const academicStartYear = currentMonth >= 8 ? currentYear : currentYear - 1

  const year1Months = [
    { value: 8, label: 'August', year: academicStartYear },
    { value: 9, label: 'September', year: academicStartYear },
    { value: 10, label: 'October', year: academicStartYear },
    { value: 11, label: 'November', year: academicStartYear },
    { value: 12, label: 'December', year: academicStartYear },
    { value: 1, label: 'January', year: academicStartYear + 1 },
    { value: 2, label: 'February', year: academicStartYear + 1 },
    { value: 3, label: 'March', year: academicStartYear + 1 },
    { value: 4, label: 'April', year: academicStartYear + 1 },
    { value: 5, label: 'May', year: academicStartYear + 1 },
    { value: 6, label: 'June', year: academicStartYear + 1 },
    { value: 7, label: 'July', year: academicStartYear + 1 },
  ]

  const year2Months = [
    { value: 8, label: 'August', year: academicStartYear + 1 },
    { value: 9, label: 'September', year: academicStartYear + 1 },
    { value: 10, label: 'October', year: academicStartYear + 1 },
    { value: 11, label: 'November', year: academicStartYear + 1 },
    { value: 12, label: 'December', year: academicStartYear + 1 },
    { value: 1, label: 'January', year: academicStartYear + 2 },
    { value: 2, label: 'February', year: academicStartYear + 2 },
    { value: 3, label: 'March', year: academicStartYear + 2 },
    { value: 4, label: 'April', year: academicStartYear + 2 },
    { value: 5, label: 'May', year: academicStartYear + 2 },
    { value: 6, label: 'June', year: academicStartYear + 2 },
    { value: 7, label: 'July', year: academicStartYear + 2 },
  ]

  return [...year1Months, ...year2Months]
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// All Redis cache key strings are defined here. Never hardcode them elsewhere.

export const cacheKeys = {
  studentProfile: (userId: string) => `profile:${userId}`,
  allStudents: () => `students:all`,
  monthlyTasks: (studentId: string, month: number, year: number) =>
    `tasks:monthly:${studentId}:${year}:${month}`,
  weeklyTasks: (studentId: string, weekStart: string) =>
    `tasks:weekly:${studentId}:${weekStart}`,
  dailyTasks: (studentId: string, dayDate: string) =>
    `tasks:daily:${studentId}:${dayDate}`,
  studentProgress: (studentId: string) => `progress:${studentId}`,
  activityFeed: () => `activity:feed`,
}

// TTLs in seconds
export const cacheTTL = {
  studentProfile: 300,   // 5 min
  allStudents: 120,      // 2 min
  monthlyTasks: 600,     // 10 min
  weeklyTasks: 60,       // 1 min
  dailyTasks: 60,        // 1 min
  studentProgress: 180,  // 3 min
  activityFeed: 30,      // 30 sec
}

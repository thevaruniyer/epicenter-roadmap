import { Redis } from '@upstash/redis'

let _redis: Redis | null = null

export function getRedis(): Redis {
  if (!_redis) {
    _redis = Redis.fromEnv()
  }
  return _redis
}

// Safe wrapper: if Redis is unavailable, fall through to DB
export async function redisGet<T>(key: string): Promise<T | null> {
  try {
    return await getRedis().get<T>(key)
  } catch {
    return null
  }
}

export async function redisSet(key: string, ttlSeconds: number, value: unknown): Promise<void> {
  try {
    await getRedis().setex(key, ttlSeconds, value)
  } catch {
    // Redis failure is non-fatal — data still served from DB
  }
}

export async function redisDel(...keys: string[]): Promise<void> {
  if (keys.length === 0) return
  try {
    await getRedis().del(...keys)
  } catch {
    // Non-fatal
  }
}

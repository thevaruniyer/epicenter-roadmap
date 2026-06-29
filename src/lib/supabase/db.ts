// Direct postgres client using the pooled connection URL.
// Used for server-side DB operations that need raw SQL (migrations, RPC-style queries).
// The supabase-js client in server.ts remains the primary client for auth, realtime, and RPC.
import postgres from 'postgres'

let _db: ReturnType<typeof postgres> | null = null

export function getDb() {
  if (!_db) {
    const connectionString = process.env.SUPABASE_POOLED_URL
    if (!connectionString) {
      throw new Error('SUPABASE_POOLED_URL is not set')
    }
    _db = postgres(connectionString, {
      ssl: { rejectUnauthorized: false },
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
    })
  }
  return _db
}

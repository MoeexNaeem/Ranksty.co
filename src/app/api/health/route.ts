import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db'

/**
 * Liveness / readiness probe for the server (scripts/deploy.sh checks it after
 * every deploy). 200 only when the process is up AND the database answers a ping.
 * Error details stay in the server log, never in the public response.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const started = Date.now()
  try {
    await connectDB()
    await mongoose.connection.db?.admin().ping()
    return NextResponse.json({ ok: true, db: 'up', ms: Date.now() - started })
  } catch (err) {
    console.error('[health] database ping failed:', err)
    return NextResponse.json({ ok: false, db: 'down' }, { status: 503 })
  }
}

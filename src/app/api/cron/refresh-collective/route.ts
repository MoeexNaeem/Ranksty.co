import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { CollectiveKeywordData } from '@/lib/models'
import { buildFullPackage, primeCollectiveMem } from '@/lib/collective-keywords'
import type { ApiResponse } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300   // allow a long run (Vercel Pro caps at 300s)

/**
 * Weekly refresh of the permanent Collective Keyword store.
 *
 * The Collective Keyword Search saves each keyword's package forever (no TTL).
 * This job keeps that data current: it re-fetches every saved keyword LIVE
 * (force=true bypasses all caches) and overwrites its stored `data`, stamping
 * `lastRefreshedAt`. Stalest keywords first, so if the run is cut short by the
 * platform's time limit, the most out-of-date ones are refreshed first and the
 * rest are picked up on the next run.
 *
 * Schedule: Saturdays, in the 11:30pm–12:00am window. On Vercel (vercel.json):
 *   { "path": "/api/cron/refresh-collective", "schedule": "30 18 * * 6" }
 * NOTE: Vercel crons run in UTC. `30 18 * * 6` = Saturday 23:30 Pakistan time
 * (UTC+5). Change the hour if your target timezone differs.
 *
 * Auth: set CRON_SECRET and send `Authorization: Bearer <secret>` (Vercel Cron
 * sends this automatically). Without CRON_SECRET the route refuses to run.
 */
export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { success: false, error: 'CRON_SECRET is not configured — refusing to run unauthenticated.' },
      { status: 503 },
    )
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  try {
    await connectDB()

    // Stalest first so a truncated run still improves the worst rows.
    const rows = await CollectiveKeywordData.find({}).select('keyword geo').sort({ lastRefreshedAt: 1 }).lean()

    let refreshed = 0
    const failed: string[] = []

    // Sequential on purpose: getKeywordCore already goes through the shared Etsy
    // rate gate, and a nightly job shouldn't contend with live user traffic.
    for (const r of rows) {
      try {
        const fresh = await buildFullPackage(r.keyword, r.geo, true)   // force live re-fetch, full package
        await CollectiveKeywordData.updateOne(
          { keyword: r.keyword, geo: r.geo },
          { $set: { data: fresh, lastRefreshedAt: new Date() } },
        )
        primeCollectiveMem(r.keyword, r.geo, fresh)                  // serve the new data immediately
        refreshed++
      } catch (e) {
        console.error(`[Cron] refresh "${r.keyword}" (${r.geo}) failed:`, e)
        failed.push(`${r.keyword}|${r.geo}`)
      }
    }

    return NextResponse.json({
      success: true,
      data: { total: rows.length, refreshed, failed: failed.length, failedKeys: failed, tookMs: Date.now() - startedAt },
    })
  } catch (e) {
    console.error('[Cron] refresh-collective failed:', e)
    return NextResponse.json({ success: false, error: 'Refresh job failed' }, { status: 500 })
  }
}

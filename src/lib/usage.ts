/**
 * API-usage tracking — how many Etsy / Google API calls were made today.
 *
 * Every Etsy request (etsyFetch / etsyAuthedFetch) and every Google Ads request
 * calls recordEtsyCall() / recordGoogleCall(). Those only touch an in-memory
 * buffer; the buffer is flushed to Mongo (one `$inc` per flush) at most once every
 * few seconds, so a burst of hundreds of API calls becomes a single DB write —
 * important because this cluster is slow and a write-per-call would be brutal.
 *
 * `$inc` is atomic, so multiple server instances each flushing their own delta
 * still add up correctly in the shared `apiusages` row for the day.
 */
import { connectDB } from '@/lib/db'
import { ApiUsage } from '@/lib/models'

// Local UTC day key (YYYY-MM-DD). Defined here rather than imported from
// lib/snapshots to avoid an import cycle through lib/etsy.
const dayKey = (d: Date = new Date()) => d.toISOString().slice(0, 10)

const FLUSH_MS = 4000

let buf = { day: dayKey(), etsy: 0, google: 0 }
let timer: ReturnType<typeof setTimeout> | null = null

function rollover() {
  const today = dayKey()
  if (today !== buf.day) {
    void flush()               // persist yesterday's remainder under its own day
    buf = { day: today, etsy: 0, google: 0 }
  }
}

async function flush(): Promise<void> {
  if (timer) { clearTimeout(timer); timer = null }
  const { day, etsy, google } = buf
  if (!etsy && !google) return
  buf = { day: buf.day, etsy: 0, google: 0 }   // reset before the await
  try {
    await connectDB()
    await ApiUsage.updateOne(
      { day },
      { $inc: { etsyCalls: etsy, googleCalls: google } },
      { upsert: true },
    )
  } catch (e) {
    // Don't lose the counts — fold them back in for the next flush.
    buf.etsy += etsy
    buf.google += google
    console.error('[Usage] flush failed:', e)
  }
}

function schedule() {
  if (!timer) timer = setTimeout(() => void flush(), FLUSH_MS)
}

export function recordEtsyCall(n = 1): void { rollover(); buf.etsy += n; schedule() }
export function recordGoogleCall(n = 1): void { rollover(); buf.google += n; schedule() }

/** Today's totals — flushes this instance's buffer first so the number is current. */
export async function getUsageToday(): Promise<{ day: string; etsyCalls: number; googleCalls: number }> {
  await flush()
  const day = dayKey()
  try {
    await connectDB()
    const doc = await ApiUsage.findOne({ day }).lean()
    return { day, etsyCalls: doc?.etsyCalls ?? 0, googleCalls: doc?.googleCalls ?? 0 }
  } catch {
    return { day, etsyCalls: 0, googleCalls: 0 }
  }
}

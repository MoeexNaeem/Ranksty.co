import { NextRequest, NextResponse } from 'next/server'
import { googleKeywordMetrics, isGoogleAdsConfigured, normalizeGeo } from '@/lib/google-ads'
import type { ApiResponse } from '@/types'

export const runtime = 'nodejs'

/**
 * Warm the Google-metrics cache for a whole batch of keywords in ONE Google Ads
 * call. The Collective Keyword Search tool calls this once before fetching its
 * per-keyword cards, so each card's core hits the cache instead of spending its
 * own Google call — turning 25 Google requests into 1 (much faster, and far
 * gentler on the daily quota).
 *
 * `kws` is a pipe-separated list: /api/keywords/google-warm?kws=a|b|c&geo=US
 */
export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<{ warmed: number }>>> {
  const { searchParams } = new URL(req.url)
  const geo = normalizeGeo(searchParams.get('geo'))
  const kws = [...new Set(
    (searchParams.get('kws') || '').split('|').map(k => k.trim().toLowerCase()).filter(k => k.length >= 2),
  )].slice(0, 25)

  if (!kws.length || !isGoogleAdsConfigured()) {
    return NextResponse.json({ success: true, data: { warmed: 0 } })
  }

  try {
    const m = await googleKeywordMetrics(kws, geo)
    return NextResponse.json({ success: true, data: { warmed: m.size } })
  } catch (e) {
    console.error('[Keywords/google-warm] failed:', e)
    // Never fail the batch over a warm miss — the cards still fetch their own.
    return NextResponse.json({ success: true, data: { warmed: 0 } })
  }
}

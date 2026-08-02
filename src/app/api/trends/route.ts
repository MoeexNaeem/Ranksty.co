import { NextRequest, NextResponse } from 'next/server'
import { memCache, cacheKey, CACHE_TTL } from '@/lib/cache'
import { searchEtsyListingsPaged } from '@/lib/etsy'
import { normalizeGeo } from '@/lib/google-ads'
import { guardSearch } from '@/lib/searchGate'
import { buildKeywordTrends } from '@/lib/trends'

export const runtime = 'nodejs'

/**
 * v3 — the fabricated Etsy seasonality curve is gone (see buildTrendData).
 *
 * `trends` now contains ONLY real series: a Google line when Google Ads is
 * configured, and nothing otherwise. `supplyByMonth` is the honest Etsy-only
 * signal — when sellers created the competing listings. Callers must not treat
 * an empty `trends` as an error; it means "Etsy doesn't publish this".
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')?.trim().toLowerCase()
  const geo = normalizeGeo(searchParams.get('geo'))
  if (!query) return NextResponse.json({ success: false, error: 'Missing query' }, { status: 400 })

  const gate = await guardSearch(req)
  if (gate) return gate

  // v4: rate-limit fix (sequential Google calls) — retire v3 docs that cached an
  // empty/partial Google result when the concurrent calls were being throttled.
  const key    = cacheKey('trends', 'v4', geo, query)
  const cached = memCache.get(key)
  if (cached) return NextResponse.json({ success: true, data: cached, cached: true })

  try {
    // 100 listings so the supply-by-month distribution has a real population.
    const { listings } = await searchEtsyListingsPaged(query, 100, 0, { skipImages: true })
    // Shared builder — the SAME payload the Collective package stores, so the live
    // and saved versions never diverge.
    const data = await buildKeywordTrends(query, geo, listings)
    memCache.set(key, data, CACHE_TTL.TRENDING)
    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('[Trends] Etsy API error:', err)
    return NextResponse.json({ success: false, error: 'Failed to fetch trend data.' }, { status: 502 })
  }
}

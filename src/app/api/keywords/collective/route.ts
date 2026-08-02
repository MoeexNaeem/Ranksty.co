import { NextRequest, NextResponse } from 'next/server'
import { normalizeGeo } from '@/lib/google-ads'
import { getCollectiveKeyword } from '@/lib/collective-keywords'
import type { ApiResponse, CollectiveKeywordResult } from '@/types'

export const runtime = 'nodejs'
// A cold keyword now builds its FULL package (core + related probes + reviews),
// which can take a while behind the Etsy rate gate. Allow a long run (Vercel Pro
// caps at 300s; hobby at 60s).
export const maxDuration = 300

/**
 * Collective Keyword Search — one keyword's full package.
 *
 * The tool searches up to 25 keywords at once, but the client fires them with
 * bounded concurrency and renders each card as its data lands, so this endpoint
 * handles a SINGLE keyword: `/api/keywords/collective?q=candle&geo=US`.
 *
 * DB-first (getCollectiveKeyword): a keyword already saved in CollectiveKeywordData
 * returns instantly with `source: 'cache'` and zero API calls; a new one is
 * fetched live, saved as its own package, and returned with `source: 'live'`.
 *
 * No per-keyword search gate here on purpose: a 25-keyword click would otherwise
 * trip the hourly search limit + captcha 25 times over. Throttling is handled by
 * the shared Etsy rate gate in lib/etsy.ts; this is an authenticated dashboard tool.
 */
export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<CollectiveKeywordResult>>> {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')?.trim().toLowerCase()
  const geo = normalizeGeo(searchParams.get('geo'))

  if (!query || query.length < 2) {
    return NextResponse.json({ success: false, error: 'Keyword must be at least 2 characters' }, { status: 400 })
  }

  try {
    const result = await getCollectiveKeyword(query, geo)
    return NextResponse.json({ success: true, data: result, cached: result.source === 'cache' })
  } catch (e) {
    console.error(`[Collective] "${query}" failed:`, e)
    return NextResponse.json({ success: false, error: 'Could not fetch this keyword.' }, { status: 502 })
  }
}

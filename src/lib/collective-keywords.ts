/**
 * Collective Keyword Search — the persistent, package-per-keyword store.
 *
 * The Collective Keyword Search tool searches up to 25 keywords in one click and
 * saves each keyword's FULL data package (the same shape a single Keywords search
 * returns) in the `CollectiveKeywordData` model. The point is reuse: the next
 * time any keyword is searched, we serve the saved package straight from Mongo
 * and skip the ~3 Etsy calls + Google Ads call entirely.
 *
 * Freshness: saved rows are PERMANENT — there is no expiry, so a keyword searched
 * once is served from the DB forever (no repeat API calls). The weekly refresh
 * cron (/api/cron/refresh-collective) re-fetches every saved keyword and updates
 * it, stamping `lastRefreshedAt`, so the stored data stays current over time.
 */
import { connectDB } from '@/lib/db'
import { CollectiveKeywordData } from '@/lib/models'
import { memCache, cacheKey, CACHE_TTL } from '@/lib/cache'
import { getKeywordCore } from '@/lib/keywords'
import { enrichRelatedCompetition, getListingReviewCount, attachImages, getNearMatches } from '@/lib/etsy'
import { googleKeywordMetrics, isGoogleAdsConfigured } from '@/lib/google-ads'
import { buildKeywordTrends } from '@/lib/trends'
import type { CollectiveKeywordResult, KeywordSearchResponse, KeywordData, NearMatch } from '@/types'

/** Light shape check — a saved package must at least carry its stats block. */
function looksComplete(d?: KeywordSearchResponse): boolean {
  return !!d && !!d.stats && d.stats.totalResults != null
}

// In-memory layer IN FRONT of Mongo. The DB read is the slow step (a cached row
// still costs a full findOne round-trip), so once a keyword has been searched in
// this process, serve it from memory and skip Mongo entirely on repeats.
const memKey = (kw: string, geo: string) => cacheKey('collective', 'v1', geo, kw)
interface MemEntry { data: KeywordSearchResponse; savedAt: string }

/**
 * Overwrite the in-memory layer for a keyword with fresh data — used by the
 * weekly refresh cron after it re-fetches, so the new data is served immediately
 * instead of waiting for the old memory entry to expire.
 */
export function primeCollectiveMem(keyword: string, geo: string, data: KeywordSearchResponse): void {
  memCache.set(memKey(keyword.trim().toLowerCase(), geo), { data, savedAt: new Date().toISOString() }, CACHE_TTL.KEYWORD)
}

/** Review count per listing id, cached 24h (shared key with /api/etsy/listing-reviews). */
async function fetchListingReviews(ids: number[]): Promise<Record<number, number | null>> {
  const out: Record<number, number | null> = {}
  const misses: number[] = []
  for (const id of ids) {
    const hit = memCache.get<number>(cacheKey('lreview', 'v1', String(id)))
    if (hit !== null) out[id] = hit
    else misses.push(id)
  }
  await Promise.all(misses.map(async id => {
    const count = await getListingReviewCount(id)
    if (count !== null) memCache.set(cacheKey('lreview', 'v1', String(id)), count, CACHE_TTL.KEYWORD)
    out[id] = count
  }))
  return out
}

/**
 * Build the COMPLETE keyword package that gets saved permanently — everything the
 * card shows, so a saved keyword renders fully with zero extra API calls:
 *   • core stats + top listings + analysis      (getKeywordCore)
 *   • related keywords WITH competition/KD       (enrichRelatedCompetition)
 *   • related keywords WITH Google volume/comp   (googleKeywordMetrics, parallel)
 *   • a real review count on EVERY listing       (fetchListingReviews)
 *
 * This is the expensive stage — it's run once on first search and again by the
 * weekly refresh cron; every read afterwards is served straight from Mongo.
 * `force` re-fetches the core live (bypasses caches) for the weekly refresh.
 */
export async function buildFullPackage(keyword: string, geo = 'US', force = false): Promise<KeywordSearchResponse> {
  const kw = keyword.trim().toLowerCase()
  const core = await getKeywordCore(kw, geo, force)

  // In parallel (all independent): related competition probes, Google metrics for
  // related, near-match variants, and the listing image batch.
  const [enriched, metrics, nearMatches, withImages] = await Promise.all([
    enrichRelatedCompetition(core.related),
    isGoogleAdsConfigured() ? googleKeywordMetrics(core.related.map(r => r.keyword), geo) : Promise.resolve(new Map()),
    getNearMatches(kw).catch(() => [] as NearMatch[]),
    attachImages(core.listings),
  ])
  core.related = metrics.size
    ? enriched.map(r => {
        const g = metrics.get(r.keyword.toLowerCase())
        return g ? {
          ...r,
          googleSearches:         g.searches ?? null,
          googleCompetition:      g.competition as KeywordData['googleCompetition'],
          googleCompetitionIndex: g.competitionIndex,
          googleCpcLow:           g.cpcLow,
          googleCpcHigh:          g.cpcHigh,
        } : r
      })
    : enriched
  core.nearMatches = nearMatches
  core.listings = withImages

  // Reviews (Etsy) + trends (mostly Google) in parallel — both read the listings.
  const [reviews, trends] = await Promise.all([
    fetchListingReviews(core.listings.map(l => l.listing_id)),
    buildKeywordTrends(kw, geo, core.listings).catch(e => { console.error(`[Collective] trends "${kw}":`, e); return undefined }),
  ])
  core.listings = core.listings.map(l => ({ ...l, review_count: reviews[l.listing_id] ?? null }))
  if (trends) core.trends = trends

  return core
}

/**
 * Get one keyword's full package for the collective tool.
 *
 * DB-first: if a fresh `CollectiveKeywordData` row exists, return it as `cache`
 * with zero API calls. Otherwise fetch the live core package (which itself uses
 * the shared keyword cache), persist it as this keyword's package, and return it
 * as `live`.
 */
export async function getCollectiveKeyword(keyword: string, geo = 'US'): Promise<CollectiveKeywordResult> {
  const kw = keyword.trim().toLowerCase()
  const mk = memKey(kw, geo)

  // ── Memory-first — instant, and skips the slow Mongo round-trip on repeats ──
  const mem = memCache.get<MemEntry>(mk)
  if (mem && looksComplete(mem.data)) {
    return { keyword: kw, geo, data: mem.data, source: 'cache', savedAt: mem.savedAt }
  }

  // ── Then Mongo (persists across restarts / other processes) ─────────────────
  try {
    await connectDB()
    const hit = await CollectiveKeywordData.findOne({ keyword: kw, geo }).lean()
    // Permanent store: any complete saved row is served — no expiry check.
    if (hit && looksComplete(hit.data as KeywordSearchResponse)) {
      const data = hit.data as KeywordSearchResponse
      const savedAt = new Date(hit.searchedAt ?? hit.createdAt ?? Date.now()).toISOString()
      memCache.set(mk, { data, savedAt }, CACHE_TTL.KEYWORD)   // warm memory so the next hit is instant
      return { keyword: kw, geo, data, source: 'cache', savedAt }
    }
  } catch (e) {
    console.error(`[Collective] DB lookup "${kw}":`, e)
  }

  // ── Live fetch — the FULL package (core + related enrichment + reviews) so the
  //    saved doc is complete and every later read is instant. ──────────────────
  const data = await buildFullPackage(kw, geo)

  const now = new Date()
  const savedAt = now.toISOString()
  memCache.set(mk, { data, savedAt }, CACHE_TTL.KEYWORD)       // serve repeats from memory, not the slow DB

  // Persist this keyword's package PERMANENTLY (no expiry). Non-blocking: a failed
  // write must not fail the search — the user still gets live data. searchedAt is
  // set once (on first insert); lastRefreshedAt tracks the newest data.
  connectDB()
    .then(() => CollectiveKeywordData.findOneAndUpdate(
      { keyword: kw, geo },
      { $set: { data, lastRefreshedAt: now }, $setOnInsert: { keyword: kw, geo, searchedAt: now } },
      { upsert: true },
    ))
    .catch(e => console.error(`[Collective] DB write "${kw}":`, e))

  return { keyword: kw, geo, data, source: 'live', savedAt }
}

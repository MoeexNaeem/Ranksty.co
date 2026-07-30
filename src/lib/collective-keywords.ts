/**
 * Collective Keyword Search — the persistent, package-per-keyword store.
 *
 * The Collective Keyword Search tool searches up to 25 keywords in one click and
 * saves each keyword's FULL data package (the same shape a single Keywords search
 * returns) in the `CollectiveKeywordData` model. The point is reuse: the next
 * time any keyword is searched, we serve the saved package straight from Mongo
 * and skip the ~3 Etsy calls + Google Ads call entirely.
 *
 * Freshness: a saved row carries `expiresAt` (CACHE_TTL.KEYWORD). Past that it is
 * treated as a miss and refetched — Etsy's commercial-access terms don't allow
 * re-displaying their data as "current" indefinitely, so the DB-first shortcut is
 * bounded to the same window as the main keyword cache. Within that window a
 * repeat search is free.
 */
import { connectDB } from '@/lib/db'
import { CollectiveKeywordData } from '@/lib/models'
import { memCache, cacheKey, CACHE_TTL } from '@/lib/cache'
import { getKeywordCore } from '@/lib/keywords'
import type { CollectiveKeywordResult, KeywordSearchResponse } from '@/types'

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
    if (hit && hit.expiresAt && new Date(hit.expiresAt).getTime() > Date.now() && looksComplete(hit.data as KeywordSearchResponse)) {
      const data = hit.data as KeywordSearchResponse
      const savedAt = new Date(hit.searchedAt ?? hit.updatedAt ?? Date.now()).toISOString()
      memCache.set(mk, { data, savedAt }, CACHE_TTL.KEYWORD)   // warm memory so the next hit is instant
      return { keyword: kw, geo, data, source: 'cache', savedAt }
    }
  } catch (e) {
    console.error(`[Collective] DB lookup "${kw}":`, e)
  }

  // ── Live fetch (reuses the shared keyword pipeline + its own cache) ─────────
  const data = await getKeywordCore(kw, geo)

  const now = new Date()
  const savedAt = now.toISOString()
  memCache.set(mk, { data, savedAt }, CACHE_TTL.KEYWORD)       // serve repeats from memory, not the slow DB

  // Persist this keyword's package. Non-blocking: a failed write must not fail
  // the search — the user still gets live data.
  const expiresAt = new Date(now.getTime() + CACHE_TTL.KEYWORD * 1000)
  connectDB()
    .then(() => CollectiveKeywordData.findOneAndUpdate(
      { keyword: kw, geo },
      { keyword: kw, geo, data, searchedAt: now, expiresAt },
      { upsert: true, new: true },
    ))
    .catch(e => console.error(`[Collective] DB write "${kw}":`, e))

  return { keyword: kw, geo, data, source: 'live', savedAt }
}

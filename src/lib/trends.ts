/**
 * Shared trends builder — used by BOTH /api/trends (live) and buildFullPackage
 * (so the Collective package stores the full Trends + Searchers-by-Country data
 * and Rankkw can serve it from the DB with no API calls).
 *
 * Takes the already-fetched listings so it never re-searches Etsy; only the Google
 * calls (monthly trend line + country breakdown) are made, and only when Google
 * Ads is configured.
 */
import { buildTrendData, buildListingSupplyByMonth, buildListingMarketStats } from '@/lib/etsy'
import { googleKeywordMetrics, countriesForGeo, isGoogleAdsConfigured } from '@/lib/google-ads'
import type { EtsyListing, TrendData, TrendPoint, CountryData, TrendsPayload } from '@/types'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export async function buildKeywordTrends(query: string, geo: string, listings: EtsyListing[]): Promise<TrendsPayload> {
  const trends: TrendData[] = buildTrendData()
  const supplyByMonth = buildListingSupplyByMonth(listings)
  const market = buildListingMarketStats(listings)

  // Searchers by Country, scoped to the selected filter (Global → full breakdown;
  // a specific country → 100% that country).
  const countries: CountryData[] = await countriesForGeo(query, geo)

  let googleAvailable = false
  if (isGoogleAdsConfigured()) {
    const metrics = await googleKeywordMetrics([query], geo)
    const monthly = metrics.get(query)?.monthly ?? []
    if (monthly.length) {
      const nowMonth = new Date().getMonth()
      const last12 = monthly.slice(-12)
      const points: TrendPoint[] = last12.map((value, i) => ({
        month: MONTHS[(nowMonth - last12.length + 1 + i + 24) % 12],
        value,
      }))
      trends.push({ platform: 'google', points })
      googleAvailable = true
    }
  }

  return {
    trends,
    countries,
    supplyByMonth,
    market,
    googleAvailable,
    note: googleAvailable
      ? 'Search-volume seasonality is real Google Ads monthly data. Etsy publishes no search volume.'
      : 'Etsy publishes no search volume or history, so no Etsy demand curve is shown. “Listings created by month” is real, but reflects seller behaviour, not buyer demand.',
  }
}

'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Card, SectionTitle, ErrorBox, EmptyState, primaryBtn, MONO } from '../kit'
import { KeywordTable } from '../KeywordTable'
import { TopListingsTable } from '../keyword/TopListingsTable'
import { C, D } from '@/utils'
import type { CollectiveKeywordResult, KeywordStats, EtsyListing } from '@/types'

const MAX_KEYWORDS = 500
// Each keyword now fetches its COMPLETE package (core + related competition probes
// + a review per listing) before its card appears, so concurrency is kept low: too
// many at once make them contend for the shared 8/sec Etsy gate and risk per-request
// timeouts. Cached keywords still return instantly regardless.
const CONCURRENCY  = 3

// Country filter — Google volume/CPC/competition are geo-specific, and the
// selected country also sets the currency Etsy prices are converted to.
const COUNTRIES = [
  { code: 'US', name: 'United States' }, { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },     { code: 'CA', name: 'Canada' },
  { code: 'FR', name: 'France' },        { code: 'DE', name: 'Germany' },
  { code: 'IN', name: 'India' },         { code: 'GLO', name: 'Global' },
]
// Selected country → the currency listing prices are shown in.
const GEO_CURRENCY: Record<string, string> = { US: 'USD', GB: 'GBP', AU: 'AUD', CA: 'CAD', FR: 'EUR', DE: 'EUR', IN: 'INR', GLO: 'USD' }

// Auto-cycle order: every batch is run against ALL of these countries, back to
// back, so one click saves each keyword's geo-specific package for every market.
// Google volume/CPC/competition are country-specific, so this genuinely produces
// a distinct saved row per country. Order requested: Global → UK → US → the rest.
const CYCLE_ORDER = ['GLO', 'GB', 'US', 'AU', 'CA', 'FR', 'DE', 'IN'] as const
const CODE_NAME: Record<string, string> = Object.fromEntries(COUNTRIES.map(c => [c.code, c.name]))

const CUR: Record<string, string> = { USD: '$', GBP: '£', EUR: '€', CAD: 'C$', AUD: 'A$', PKR: '₨', INR: '₹', JPY: '¥' }
const sym = (c?: string | null) => CUR[(c ?? 'USD').toUpperCase()] ?? (c ? `${c} ` : '$')

// ─── Stat formatting (mirrors Rankkw's Keyword Statistics panel) ──────────────
// Exact, comma-separated integers (1,900,000) — never abbreviated (1.9M / 981.7K).
const exact = (v?: number | null) => (v == null ? '—' : Math.round(v).toLocaleString('en-US'))
// Google advertiser-competition band → title case ("Low"/"Medium"/"High"), "—" otherwise.
const band = (b?: string | null) => (b && b !== 'UNSPECIFIED' ? b.charAt(0) + b.slice(1).toLowerCase() : '—')
// Whole-unit currency amount in the given ISO code (falls back to "123 USD" if unknown).
const money = (v?: number | null, cur?: string | null) => {
  if (v == null) return '—'
  const c = (cur || 'USD').toUpperCase()
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(v) }
  catch { return `${Math.round(v)} ${c}` }
}

function kdColor(label?: string): string {
  return label === 'Easy' ? D.good : label === 'Medium' ? D.mid : label === 'Hard' ? D.hard : C.stone
}

// ─── Live FX (real rates, shared across cards, cached 12h server-side) ────────
// Maps each Etsy listing's own currency to the selected country's currency. A
// missing rate keeps the original figure — never a fabricated conversion.
const rateCache = new Map<string, number | null>()
async function fetchRate(from: string, to: string): Promise<number | null> {
  from = from.toUpperCase(); to = to.toUpperCase()
  if (from === to) return 1
  const k = `${from}>${to}`
  if (rateCache.has(k)) return rateCache.get(k)!
  try {
    const j = await fetch(`/api/fx?from=${from}&to=${to}`).then(r => r.json())
    const rate = j?.data?.rate ?? null
    rateCache.set(k, rate)
    return rate
  } catch { rateCache.set(k, null); return null }
}
// Convert a value in `from` to `to` using an already-loaded rate map. Returns
// null when no rate is known (caller keeps the original currency figure).
function convertVal(v: number | null | undefined, from: string, to: string, rates: Record<string, number | null>): number | null {
  if (v == null) return null
  from = from.toUpperCase(); to = to.toUpperCase()
  if (from === to) return v
  const r = rates[from]
  return r == null ? null : v * r
}

// ─── Per-keyword fetch state ──────────────────────────────────────────────────
type CellStatus = 'loading' | 'done' | 'error'
interface Cell { status: CellStatus; result?: CollectiveKeywordResult; error?: string }

function parseKeywords(raw: string): string[] {
  return [...new Set(
    raw.split(/[\n,]/).map(k => k.trim().toLowerCase()).filter(k => k.length >= 2),
  )].slice(0, MAX_KEYWORDS)
}

// Load the rates needed to show a keyword's prices in `target` currency.
function useRates(data: CollectiveKeywordResult['data'] | undefined, target: string) {
  const [rates, setRates] = useState<Record<string, number | null>>({})
  useEffect(() => {
    if (!data) return
    const curs = new Set<string>()
    if (data.stats?.currency) curs.add(data.stats.currency.toUpperCase())
    data.listings?.forEach(l => l.price?.currency_code && curs.add(l.price.currency_code.toUpperCase()))
    curs.delete(target.toUpperCase())
    if (!curs.size) { setRates({}); return }
    let cancelled = false
    Promise.all([...curs].map(async c => [c, await fetchRate(c, target)] as const))
      .then(pairs => { if (!cancelled) setRates(Object.fromEntries(pairs)) })
    return () => { cancelled = true }
  }, [data, target])
  return rates
}

// ─── Little "i" tooltip marker beside each stat's label (mirrors Rankkw) ──────
function InfoDot({ title }: { title: string }) {
  return (
    <span title={title} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 15, height: 15, borderRadius: '50%', border: `1.4px solid ${C.lightGray}`, color: C.stone, fontSize: 9.5, fontStyle: 'italic', fontWeight: 700, cursor: 'help', flexShrink: 0 }}>i</span>
  )
}

// ─── One stat as a label → value-chip row (mirrors Rankkw's Keyword Statistics) ─
function StatRow({ label, value, color, tip }: { label: string; value: string; color?: string; tip?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <span style={{ fontSize: 14.5, color: C.ink, fontWeight: 500 }}>{label}</span>
      {tip && <InfoDot title={tip} />}
      <span style={{ minWidth: 92, marginLeft: 'auto', textAlign: 'center', padding: '8px 14px', borderRadius: 9, background: color ?? C.ink, color: '#fff', fontSize: 15, fontWeight: 600, fontFamily: MONO, letterSpacing: '-0.01em' }}>{value}</span>
    </div>
  )
}

// Grouped by real source (GOOGLE = search demand, ETSY = listing signals), mirroring
// Rankkw's Keyword Statistics panel — so the origin of every number is explicit and
// nothing is modelled to mimic a competitor.
function StatStrip({ s, target, rates }: { s: KeywordStats; target: string; rates: Record<string, number | null> }) {
  const avgConv = convertVal(s.avgPrice, s.currency, target, rates)
  const avgPrice = avgConv != null ? money(avgConv, target) : money(s.avgPrice, s.currency)
  const gcColor = s.googleCompetition === 'HIGH' ? D.hard
    : s.googleCompetition === 'MEDIUM' ? D.mid
    : s.googleCompetition === 'LOW' ? D.good : C.lightGray

  const groups = [
    {
      source: 'Google', dot: '#4285F4',
      items: [
        { label: 'Search Volume',  tip: 'Real average monthly Google searches for this keyword in the selected country (Google Keyword Planner API) — genuine search demand.', value: s.googleSearches != null ? exact(s.googleSearches) : '—', color: s.googleSearches != null ? D.good : C.lightGray },
        { label: 'Ad Competition', tip: 'How strongly advertisers compete for this keyword on Google Ads — real Google advertiser-competition band.', value: band(s.googleCompetition), color: gcColor },
        { label: 'CPC (top)',      tip: 'Top-of-page CPC bid range (Google Ads account currency).', value: fmtCpc(s.googleCpcLow, s.googleCpcHigh, s.googleCurrency), color: D.neutral },
      ],
    },
    {
      source: 'Etsy', dot: C.orange,
      items: [
        { label: 'Avg. Views',     tip: 'Mean lifetime views of the Etsy listings ranking for this keyword — Etsy’s own `views` field.', value: exact(s.avgViews), color: '#2E6DB4' },
        { label: 'Avg. Favorites', tip: 'Mean favorites across those Etsy listings — Etsy’s own `num_favorers` field.', value: exact(s.avgFavorites), color: '#2E6DB4' },
        { label: 'Favs / View',    tip: 'Favorites ÷ views — a real Etsy engagement ratio (~1–3% is typical), standing in for CTR (Etsy exposes no clicks).', value: s.favPerView != null ? `${s.favPerView}%` : '—', color: s.favPerView >= 4 ? D.good : s.favPerView >= 1.5 ? D.mid : C.stone },
        { label: 'Avg. Price',     tip: 'Average listing price, converted to the selected country’s currency at live rates.', value: avgPrice, color: D.neutral },
        { label: 'Competition',    tip: 'Real total of active Etsy listings competing for this keyword.', value: exact(s.totalResults), color: s.totalResults > 250_000 ? D.hard : s.totalResults > 25_000 ? D.mid : D.good },
        { label: 'Difficulty',     tip: 'Keyword difficulty 0–100 (estimate from real supply + engagement).', value: s.difficulty != null ? `${s.difficulty} · ${s.difficultyLabel}` : '—', color: kdColor(s.difficultyLabel) },
      ],
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {groups.map(g => (
        <div key={g.source}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: g.dot, flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.stone }}>{g.source}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {g.items.map(it => <StatRow key={it.label} label={it.label} tip={it.tip} value={it.value} color={it.color} />)}
          </div>
        </div>
      ))}
    </div>
  )
}

function fmtCpc(low?: number | null, high?: number | null, cur?: string | null): string {
  const s = sym(cur)
  const f = (n: number) => (n >= 100 ? Math.round(n).toLocaleString() : n.toFixed(2))
  if (low != null && high != null) return `${s}${f(low)}–${s}${f(high)}`
  const one = low ?? high
  return one != null ? `${s}${f(one)}` : '—'
}

// Convert a listing's price into `target` currency for display. Falls back to the
// original currency when no live rate is available (keeps figures honest).
function convertListings(listings: EtsyListing[], target: string, rates: Record<string, number | null>): EtsyListing[] {
  return listings.map(l => {
    const from = (l.price?.currency_code ?? 'USD').toUpperCase()
    if (from === target.toUpperCase()) return l
    const r = rates[from]
    if (r == null) return l
    const div = l.price.divisor || 100
    return { ...l, price: { ...l.price, amount: Math.round((l.price.amount / div) * r * div), currency_code: target } }
  })
}

// ─── One keyword card ─────────────────────────────────────────────────────────
function KeywordCard({ keyword, cell, geo }: { keyword: string; cell: Cell; geo: string }) {
  const [open, setOpen] = useState(false)
  const data = cell.result?.data
  const s = data?.stats
  const target = GEO_CURRENCY[geo] ?? 'USD'
  const rates = useRates(data, target)

  // No lazy enrichment: the saved package is already COMPLETE (related keywords
  // carry competition/KD/Google, and every listing carries its review count), so
  // the card renders everything straight from `data`.
  const convertedListings = useMemo(
    () => (data?.listings ? convertListings(data.listings, target, rates) : []),
    [data, target, rates],
  )

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: 19, fontWeight: 600, color: C.ink, letterSpacing: '-0.02em', textTransform: 'capitalize' }}>{keyword}</h3>

        {cell.status === 'done' && cell.result && (
          <span style={{
            fontSize: 10, fontFamily: MONO, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
            padding: '3px 9px', borderRadius: 100,
            background: cell.result.source === 'cache' ? D.goodBg : C.orangeFaint,
            color: cell.result.source === 'cache' ? D.good : C.orange,
          }}>
            {cell.result.source === 'cache' ? '⚡ From database' : '● Live'}
          </span>
        )}
        {cell.status === 'loading' && (
          <span style={{ fontSize: 11.5, fontFamily: MONO, color: C.graphite }}>Measuring…</span>
        )}

        {cell.status === 'done' && s && (
          <button onClick={() => setOpen(o => !o)}
            style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 15px', borderRadius: 100, border: `1px solid ${C.ash}`, background: C.paper, color: C.ink, fontSize: 12.5, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}>
            {open ? 'Hide details' : `Details${data?.related?.length ? ` · ${data.related.length} related` : ''}`}
            <span style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', fontSize: 10 }}>▾</span>
          </button>
        )}
      </div>

      {cell.status === 'error' && <ErrorBox>{cell.error ?? 'Could not fetch this keyword.'}</ErrorBox>}

      {cell.status === 'loading' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ height: 58, background: C.canvas, borderRadius: 10, opacity: 0.6 - i * 0.04 }} />
          ))}
        </div>
      )}

      {cell.status === 'done' && s && (
        <>
          <StatStrip s={s} target={target} rates={rates} />
          {open && data && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 4 }}>
              {data.related?.length > 0 && (
                <div>
                  <SectionTitle>Related keywords</SectionTitle>
                  <KeywordTable rows={data.related} query={keyword} currency={s.googleCurrency ?? null} />
                </div>
              )}
              {data.listings?.length > 0 && (
                <div>
                  <SectionTitle right={<span style={{ fontSize: 11, fontFamily: MONO, color: C.stone }}>prices in {target}, live rates</span>}>
                    Top listings
                  </SectionTitle>
                  <TopListingsTable listings={convertedListings} query={keyword} />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  )
}

// ─── Progress state ───────────────────────────────────────────────────────────
// Per-country tally as the batch cycles through the countries. `total` is the
// keyword count for the run; done/cache/live/fail sum to it once the country is
// finished.
interface GeoProg { done: number; cache: number; live: number; fail: number }
const emptyProg = (): GeoProg => ({ done: 0, cache: 0, live: 0, fail: 0 })

// One completed keyword kept for the live "latest results" feed (full package, so
// the existing KeywordCard renders it). Only the newest few are retained.
interface RecentItem { key: string; keyword: string; geo: string; result: CollectiveKeywordResult }
// Lightweight per-(keyword,country) row kept for the CSV export. Full packages are
// NOT retained for every one — a 500×8 run would be thousands of listing arrays in
// memory — only these small stat rows are.
interface CsvRow { keyword: string; geo: string; source: string; s: KeywordStats | null }

const RECENT_MAX = 6

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 10, borderRadius: 100, background: C.canvas, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, pct))}%`, background: color, borderRadius: 100, transition: 'width 0.25s ease' }} />
    </div>
  )
}

// ─── Tab ──────────────────────────────────────────────────────────────────────
export function CollectiveKeywordsTab() {
  const [input, setInput]         = useState('')
  const [keywords, setKeywords]   = useState<string[]>([])   // the keyword set for the active/last run
  const [running, setRunning]     = useState(false)
  const [geoIndex, setGeoIndex]   = useState(0)              // which country in CYCLE_ORDER is running now
  const [perGeo, setPerGeo]       = useState<Record<string, GeoProg>>({})
  const [overallDone, setOverall] = useState(0)             // keyword×country ops completed across the whole run
  const [recent, setRecent]       = useState<RecentItem[]>([])
  const runId  = useRef(0)
  const csvRef = useRef<CsvRow[]>([])                        // every collected row, for CSV (no re-render churn)

  const pending = useMemo(() => parseKeywords(input), [input])
  // How many the user actually typed, before the 500 cap — so we can warn when capped.
  const rawCount = useMemo(
    () => new Set(input.split(/[\n,]/).map(k => k.trim().toLowerCase()).filter(k => k.length >= 2)).size,
    [input],
  )

  const run = useCallback(async () => {
    const kws = parseKeywords(input)
    if (!kws.length) return

    const myRun = ++runId.current
    csvRef.current = []
    setKeywords(kws)
    setRunning(true)
    setGeoIndex(0)
    setOverall(0)
    setRecent([])
    setPerGeo(Object.fromEntries(CYCLE_ORDER.map(g => [g, emptyProg()])))

    // Countries run one after another (sequential); keywords WITHIN a country run
    // with bounded concurrency. Already-saved keywords return from the DB instantly
    // (source: 'cache'), so re-running a batch — or resuming after a close — mostly
    // skips the API and only fills genuine gaps.
    for (let gi = 0; gi < CYCLE_ORDER.length; gi++) {
      if (runId.current !== myRun) return          // a newer run (or Stop) superseded this
      const geo = CYCLE_ORDER[gi]
      setGeoIndex(gi)

      const queue = [...kws]
      const worker = async () => {
        while (queue.length) {
          if (runId.current !== myRun) return
          const kw = queue.shift()
          if (!kw) return

          let source = 'error'
          let result: CollectiveKeywordResult | null = null
          try {
            const res = await fetch(`/api/keywords/collective?q=${encodeURIComponent(kw)}&geo=${geo}`)
            const json = await res.json()
            if (runId.current !== myRun) return
            if (json.success && json.data) { result = json.data as CollectiveKeywordResult; source = result.source }
          } catch { /* leaves source = 'error' */ }
          if (runId.current !== myRun) return

          csvRef.current.push({ keyword: kw, geo, source, s: result?.data.stats ?? null })
          const ok = !!result
          setPerGeo(prev => {
            const p = prev[geo] ?? emptyProg()
            return { ...prev, [geo]: {
              done:  p.done + 1,
              cache: p.cache + (ok && source === 'cache' ? 1 : 0),
              live:  p.live  + (ok && source === 'live'  ? 1 : 0),
              fail:  p.fail  + (ok ? 0 : 1),
            } }
          })
          setOverall(d => d + 1)
          // Only newly-fetched (live) keywords join the feed. Cache hits return in a
          // burst on re-runs; feeding them would remount the cards thousands of times
          // and jank the tab. The progress bars still reflect cache hits.
          if (result && source === 'live') {
            setRecent(prev => [{ key: `${geo}:${kw}`, keyword: kw, geo, result }, ...prev].slice(0, RECENT_MAX))
          }
        }
      }
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker))
    }

    if (runId.current === myRun) setRunning(false)
  }, [input])

  const stop  = useCallback(() => { runId.current++; setRunning(false) }, [])
  const clear = useCallback(() => {
    runId.current++
    setRunning(false); setInput(''); setKeywords([]); setPerGeo({}); setOverall(0); setRecent([])
    csvRef.current = []
  }, [])

  const totalOps  = keywords.length * CYCLE_ORDER.length
  const overallPct = totalOps ? (overallDone / totalOps) * 100 : 0
  const curGeo     = CYCLE_ORDER[geoIndex]
  const curProg    = perGeo[curGeo] ?? emptyProg()
  const totCache   = Object.values(perGeo).reduce((n, p) => n + p.cache, 0)
  const totLive    = Object.values(perGeo).reduce((n, p) => n + p.live, 0)
  const totFail    = Object.values(perGeo).reduce((n, p) => n + p.fail, 0)
  const started    = keywords.length > 0

  const exportCsv = useCallback(() => {
    const head = ['Keyword', 'Country', 'Currency (geo)', 'Source', 'Google Volume', 'Ad Competition', 'CPC Low', 'CPC High', 'CPC Currency', 'Etsy Competition', 'Difficulty', 'Difficulty Label', 'Avg Views', 'Favs/View %', 'Avg Price', 'Price Currency']
    const rows = csvRef.current.map(({ keyword, geo, source, s }) => (
      s
        ? [keyword, CODE_NAME[geo] ?? geo, GEO_CURRENCY[geo] ?? '', source, s.googleSearches ?? '', s.googleCompetition ?? '', s.googleCpcLow ?? '', s.googleCpcHigh ?? '', s.googleCurrency ?? '', s.totalResults ?? '', s.difficulty ?? '', s.difficultyLabel ?? '', s.avgViews ?? '', s.favPerView ?? '', s.avgPrice ?? '', s.currency ?? '']
        : [keyword, CODE_NAME[geo] ?? geo, GEO_CURRENCY[geo] ?? '', source, '', '', '', '', '', '', '', '', '', '', '', '']
    ))
    const csv = [head, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url; a.download = `collective-keywords-all-countries.csv`; a.click()
    URL.revokeObjectURL(url)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Input */}
      <Card style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <SectionTitle>Search up to {MAX_KEYWORDS} keywords across every country</SectionTitle>
        <p style={{ fontSize: 13, color: C.graphite, lineHeight: 1.5, marginTop: -6 }}>
          Paste one keyword per line (or comma-separated) — up to {MAX_KEYWORDS}. Hit Start and sit back: the batch runs
          against <strong style={{ color: C.ink }}>all {CYCLE_ORDER.length} countries automatically</strong>
          {' '}({CYCLE_ORDER.map(g => CODE_NAME[g]).join(' → ')}), saving each keyword&apos;s full data package per country.
          Already-saved keywords return instantly from the database, so you can safely re-run to fill any gaps.
        </p>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={running}
          placeholder={'personalized necklace\ncustom mug\nboho wall art\n…'}
          rows={7}
          style={{ width: '100%', resize: 'vertical', background: C.snow, border: `1px solid ${C.ash}`, borderRadius: 12, padding: '14px 16px', fontSize: 15, fontFamily: 'inherit', color: C.ink, outline: 'none', lineHeight: 1.6, opacity: running ? 0.7 : 1 }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, fontFamily: MONO, color: rawCount > MAX_KEYWORDS ? D.hard : C.graphite }}>
            {pending.length} / {MAX_KEYWORDS} keyword{pending.length === 1 ? '' : 's'}
            {rawCount > MAX_KEYWORDS ? ` · capped from ${rawCount}` : ''}
          </span>
          <span style={{ fontSize: 12, fontFamily: MONO, color: C.stone }}>
            × {CYCLE_ORDER.length} countries = {(pending.length * CYCLE_ORDER.length).toLocaleString()} lookups
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            {started && !running && (
              <button onClick={clear}
                style={{ height: 44, padding: '0 18px', borderRadius: 12, border: `1px solid ${C.ash}`, background: C.paper, color: C.graphite, fontSize: 14, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}>
                Clear
              </button>
            )}
            {running ? (
              <button onClick={stop}
                style={{ height: 44, padding: '0 22px', borderRadius: 12, border: `1px solid ${D.hard}`, background: C.paper, color: D.hard, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
                Stop
              </button>
            ) : (
              <button onClick={run} disabled={!pending.length}
                style={{ ...primaryBtn, opacity: !pending.length ? 0.6 : 1, cursor: !pending.length ? 'not-allowed' : 'pointer' }}>
                Start {pending.length ? `${pending.length} keyword${pending.length === 1 ? '' : 's'} ` : ''}→
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Progress */}
      {started && (
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Overall */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: C.ink }}>
                {running ? 'Collecting…' : (overallDone >= totalOps ? 'Done' : 'Paused')}
              </span>
              <span style={{ fontSize: 13, fontFamily: MONO, color: C.graphite }}>
                {overallDone.toLocaleString()} / {totalOps.toLocaleString()} lookups · {Math.round(overallPct)}%
              </span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 14 }}>
                <span style={{ fontSize: 12, fontFamily: MONO, color: D.good }}>⚡ {totCache.toLocaleString()} saved</span>
                <span style={{ fontSize: 12, fontFamily: MONO, color: C.orange }}>● {totLive.toLocaleString()} live</span>
                {totFail > 0 && <span style={{ fontSize: 12, fontFamily: MONO, color: D.hard }}>✕ {totFail.toLocaleString()} failed</span>}
              </div>
            </div>
            <Bar pct={overallPct} color={C.orange} />
          </div>

          {/* Current country */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: C.ink }}>
                Country {geoIndex + 1} / {CYCLE_ORDER.length}: {CODE_NAME[curGeo]}
              </span>
              <span style={{ fontSize: 12, fontFamily: MONO, color: C.graphite }}>
                {curProg.done} / {keywords.length}
              </span>
            </div>
            <Bar pct={keywords.length ? (curProg.done / keywords.length) * 100 : 0} color={D.good} />
          </div>

          {/* Per-country chips */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CYCLE_ORDER.map((g, i) => {
              const p = perGeo[g] ?? emptyProg()
              const complete = p.done >= keywords.length && keywords.length > 0
              const active = running && i === geoIndex
              return (
                <span key={g} title={`${CODE_NAME[g]} — ${p.done}/${keywords.length}`}
                  style={{
                    fontSize: 11.5, fontFamily: MONO, fontWeight: 600, padding: '5px 10px', borderRadius: 100,
                    border: `1px solid ${active ? C.orange : complete ? D.good : C.ash}`,
                    background: active ? C.orangeFaint : complete ? D.goodBg : C.paper,
                    color: active ? C.orange : complete ? D.good : C.graphite,
                  }}>
                  {complete ? '✓ ' : active ? '● ' : ''}{CODE_NAME[g]} {p.done}/{keywords.length || 0}
                </span>
              )
            })}
          </div>

          {overallDone > 0 && (
            <div>
              <button onClick={exportCsv}
                style={{ height: 36, padding: '0 15px', borderRadius: 100, border: `1px solid ${C.ash}`, background: C.paper, color: C.ink, fontSize: 12.5, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}>
                Export CSV ({overallDone.toLocaleString()} rows)
              </button>
            </div>
          )}
        </Card>
      )}

      {/* Latest results feed — the newest few, so you can see real data flowing in */}
      {started ? (
        recent.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SectionTitle right={<span style={{ fontSize: 11, fontFamily: MONO, color: C.stone }}>latest {recent.length}</span>}>
              Live results
            </SectionTitle>
            {recent.map(r => (
              <div key={r.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 11, fontFamily: MONO, fontWeight: 600, color: C.stone, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {CODE_NAME[r.geo]} · {GEO_CURRENCY[r.geo]}
                </span>
                <KeywordCard keyword={r.keyword} cell={{ status: 'done', result: r.result }} geo={r.geo} />
              </div>
            ))}
          </div>
        )
      ) : (
        <EmptyState icon="🗂" title="No search yet" sub={`Paste up to ${MAX_KEYWORDS} keywords above and hit Start — the batch runs across all ${CYCLE_ORDER.length} countries automatically and saves every package.`} />
      )}
    </div>
  )
}

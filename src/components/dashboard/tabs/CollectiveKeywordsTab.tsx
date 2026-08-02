'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Card, SectionTitle, ErrorBox, EmptyState, primaryBtn, MONO } from '../kit'
import { KeywordTable } from '../KeywordTable'
import { TopListingsTable } from '../keyword/TopListingsTable'
import { C, D, formatNumber } from '@/utils'
import type { CollectiveKeywordResult, KeywordStats, EtsyListing } from '@/types'

const MAX_KEYWORDS = 25
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

const CUR: Record<string, string> = { USD: '$', GBP: '£', EUR: '€', CAD: 'C$', AUD: 'A$', PKR: '₨', INR: '₹', JPY: '¥' }
const sym = (c?: string | null) => CUR[(c ?? 'USD').toUpperCase()] ?? (c ? `${c} ` : '$')

const GCOMP: Record<string, { fg: string; label: string }> = {
  LOW:    { fg: D.good, label: 'Low' },
  MEDIUM: { fg: D.mid,  label: 'Med' },
  HIGH:   { fg: D.hard, label: 'High' },
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

// ─── One metric chip in the collapsed card ────────────────────────────────────
function Metric({ label, value, color, tip }: { label: string; value: string; color?: string; tip?: string }) {
  return (
    <div title={tip} style={{ padding: '9px 12px', background: C.canvas, borderRadius: 10, minWidth: 0 }}>
      <p style={{ fontSize: 10, fontFamily: MONO, color: C.graphite, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5, whiteSpace: 'nowrap' }}>{label}</p>
      <p style={{ fontSize: 16, fontWeight: 600, color: color ?? C.ink, fontFamily: MONO, letterSpacing: '-0.01em' }}>{value}</p>
    </div>
  )
}

function StatStrip({ s, target, rates }: { s: KeywordStats; target: string; rates: Record<string, number | null> }) {
  const gc = s.googleCompetition && GCOMP[s.googleCompetition] ? GCOMP[s.googleCompetition] : null
  const avgConv = convertVal(s.avgPrice, s.currency, target, rates)
  const avgPrice = avgConv != null ? `${sym(target)}${avgConv.toFixed(2)}` : (s.avgPrice != null ? `${sym(s.currency)}${s.avgPrice.toFixed(2)}` : '—')
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
      <Metric label="Google Vol." tip="Real Google monthly search volume" value={s.googleSearches != null ? formatNumber(s.googleSearches) : '—'} color="#2E6DB4" />
      <Metric label="Ad Competition" tip="Google advertiser competition" value={gc ? `${gc.label}${s.googleCompetitionIndex != null ? ` · ${s.googleCompetitionIndex}` : ''}` : '—'} color={gc?.fg} />
      <Metric label="CPC (top)" tip="Top-of-page CPC bid range (Google Ads account currency)" value={fmtCpc(s.googleCpcLow, s.googleCpcHigh, s.googleCurrency)} />
      <Metric label="Etsy Comp." tip="Real total of live Etsy listings competing" value={s.totalResults != null ? formatNumber(s.totalResults) : '—'} color={s.totalResults > 250_000 ? D.hard : s.totalResults > 25_000 ? D.mid : D.good} />
      <Metric label="Difficulty" tip="Keyword difficulty 0–100 (estimate from real supply + engagement)" value={s.difficulty != null ? `${s.difficulty} · ${s.difficultyLabel}` : '—'} color={kdColor(s.difficultyLabel)} />
      <Metric label="Avg Views" tip="Mean lifetime views of the ranking listings" value={s.avgViews != null ? formatNumber(s.avgViews) : '—'} />
      <Metric label="Favs / View" tip="Favorites ÷ views — a real engagement ratio" value={s.favPerView != null ? `${s.favPerView}%` : '—'} color={s.favPerView >= 4 ? D.good : s.favPerView >= 1.5 ? D.mid : C.stone} />
      <Metric label={`Avg Price (${target})`} tip="Average listing price, converted to the selected country's currency at live rates" value={avgPrice} />
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

// ─── Tab ──────────────────────────────────────────────────────────────────────
export function CollectiveKeywordsTab() {
  const [input, setInput]     = useState('')
  const [geo, setGeo]         = useState('US')
  const [order, setOrder]     = useState<string[]>([])
  const [cells, setCells]     = useState<Record<string, Cell>>({})
  const [running, setRunning] = useState(false)
  const runId = useRef(0)

  const pending = useMemo(() => parseKeywords(input), [input])

  const run = useCallback(async () => {
    const keywords = parseKeywords(input)
    if (!keywords.length) return

    const myRun = ++runId.current
    setRunning(true)
    setOrder(keywords)
    setCells(Object.fromEntries(keywords.map(k => [k, { status: 'loading' as CellStatus }])))

    // NOTE: no Google "warm" pre-call here. Saved keywords serve entirely from the
    // DB (zero API calls on repeat), and for a genuinely new keyword getKeywordCore
    // fetches its own Google metrics in parallel with the Etsy search anyway — so a
    // batch warm would only ever add a redundant Google call on repeat searches.

    // Bounded-concurrency queue — each keyword renders the moment it lands.
    const queue = [...keywords]
    const worker = async () => {
      while (queue.length) {
        if (runId.current !== myRun) return // a newer search superseded this one
        const kw = queue.shift()
        if (!kw) return
        try {
          const res = await fetch(`/api/keywords/collective?q=${encodeURIComponent(kw)}&geo=${geo}`)
          const json = await res.json()
          if (runId.current !== myRun) return
          if (json.success && json.data) {
            setCells(prev => ({ ...prev, [kw]: { status: 'done', result: json.data } }))
          } else {
            setCells(prev => ({ ...prev, [kw]: { status: 'error', error: json.error ?? 'Failed' } }))
          }
        } catch {
          if (runId.current !== myRun) return
          setCells(prev => ({ ...prev, [kw]: { status: 'error', error: 'Network error' } }))
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker))
    if (runId.current === myRun) setRunning(false)
  }, [input, geo])

  const done      = order.filter(k => cells[k]?.status === 'done')
  const fromCache = done.filter(k => cells[k]?.result?.source === 'cache').length
  const live      = done.filter(k => cells[k]?.result?.source === 'live').length

  const exportCsv = useCallback(() => {
    const head = ['Keyword', 'Source', 'Google Volume', 'Ad Competition', 'CPC Low', 'CPC High', 'CPC Currency', 'Etsy Competition', 'Difficulty', 'Difficulty Label', 'Avg Views', 'Favs/View %', 'Avg Price', 'Price Currency']
    const rows = order.map(k => {
      const r = cells[k]?.result
      const s = r?.data.stats
      if (!s) return [k, cells[k]?.status ?? '', '', '', '', '', '', '', '', '', '', '', '', '']
      return [k, r!.source, s.googleSearches ?? '', s.googleCompetition ?? '', s.googleCpcLow ?? '', s.googleCpcHigh ?? '', s.googleCurrency ?? '', s.totalResults ?? '', s.difficulty ?? '', s.difficultyLabel ?? '', s.avgViews ?? '', s.favPerView ?? '', s.avgPrice ?? '', s.currency ?? '']
    })
    const csv = [head, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url; a.download = `collective-keywords-${geo}.csv`; a.click()
    URL.revokeObjectURL(url)
  }, [order, cells, geo])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Input */}
      <Card style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <SectionTitle>Search up to {MAX_KEYWORDS} keywords at once</SectionTitle>
        <p style={{ fontSize: 13, color: C.graphite, lineHeight: 1.5, marginTop: -6 }}>
          Enter one keyword per line (or comma-separated). Every keyword is measured live against the Etsy &amp; Google
          APIs and its full data package is saved — so searching the same keyword again is instant and skips the API call.
        </p>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={'personalized necklace\ncustom mug\nboho wall art\n…'}
          rows={6}
          style={{ width: '100%', resize: 'vertical', background: C.snow, border: `1px solid ${C.ash}`, borderRadius: 12, padding: '14px 16px', fontSize: 15, fontFamily: 'inherit', color: C.ink, outline: 'none', lineHeight: 1.6 }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, fontFamily: MONO, color: pending.length > MAX_KEYWORDS ? D.hard : C.graphite }}>
            {pending.length} / {MAX_KEYWORDS} keyword{pending.length === 1 ? '' : 's'}
          </span>
          <select value={geo} onChange={e => setGeo(e.target.value)}
            title="Country for Google volume/CPC + the currency prices are shown in"
            style={{ height: 40, padding: '0 12px', borderRadius: 10, border: `1px solid ${C.ash}`, background: C.paper, color: C.ink, fontSize: 13.5, fontFamily: 'inherit', cursor: 'pointer' }}>
            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name} · {GEO_CURRENCY[c.code]}</option>)}
          </select>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            {order.length > 0 && (
              <button onClick={() => { setInput(''); setOrder([]); setCells({}) }}
                style={{ height: 44, padding: '0 18px', borderRadius: 12, border: `1px solid ${C.ash}`, background: C.paper, color: C.graphite, fontSize: 14, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}>
                Clear
              </button>
            )}
            <button onClick={run} disabled={running || !pending.length}
              style={{ ...primaryBtn, opacity: (running || !pending.length) ? 0.6 : 1, cursor: (running || !pending.length) ? 'not-allowed' : 'pointer' }}>
              {running ? `Searching… (${done.length}/${order.length})` : `Search ${pending.length || ''} keyword${pending.length === 1 ? '' : 's'} →`}
            </button>
          </div>
        </div>
      </Card>

      {/* Summary */}
      {order.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', padding: '4px 2px' }}>
          <span style={{ fontSize: 13.5, color: C.ink, fontWeight: 500 }}>
            {done.length} of {order.length} done
          </span>
          <span style={{ fontSize: 12.5, fontFamily: MONO, color: D.good }}>⚡ {fromCache} from database</span>
          <span style={{ fontSize: 12.5, fontFamily: MONO, color: C.orange }}>● {live} live</span>
          {done.length > 0 && (
            <button onClick={exportCsv}
              style={{ marginLeft: 'auto', height: 36, padding: '0 15px', borderRadius: 100, border: `1px solid ${C.ash}`, background: C.paper, color: C.ink, fontSize: 12.5, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}>
              Export CSV
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {order.length === 0 ? (
        <EmptyState icon="🗂" title="No search yet" sub="Paste a batch of keywords above and hit Search — each keyword gets its own full data card." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {order.map(k => <KeywordCard key={k} keyword={k} cell={cells[k] ?? { status: 'loading' }} geo={geo} />)}
        </div>
      )}
    </div>
  )
}

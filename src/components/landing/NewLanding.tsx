'use client'
/**
 * Ranktsy landing — a fresh, vibrant SaaS design (orange/purple/green) built to
 * match the reference mockup: split hero with a dashboard preview, colorful tool
 * grid, stats bar, trends/testimonial/pricing band, gradient CTA, trust logos.
 * Nothing shared with the Rankkw landing structure.
 */
import Link from 'next/link'

const O = '#FF5A1F', P = '#8B5CF6', INK = '#111827', GRAY = '#6B7280'
const GREEN = '#10B981', BG = '#F9FAFB', BORDER = '#E5E7EB', CARD = '#FFFFFF'
const FONT = "'DM Sans', sans-serif"

const ic = (d: React.ReactNode, s = 20) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
)

const ICONS = {
  search:  ic(<><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></>),
  box:     ic(<><path d="M21 8V21H3V8" /><path d="M1 3h22v5H1z" /><path d="M10 12h4" /></>),
  store:   ic(<><path d="M3 9l1-5h16l1 5" /><path d="M4 9v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" /><path d="M3 9h18" /></>),
  users:   ic(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /></>),
  audit:   ic(<><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>),
  spark:   ic(<><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2" /><circle cx="12" cy="12" r="3" /></>),
  flame:   ic(<><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></>),
  chart:   ic(<><path d="M3 3v18h18" /><path d="M7 15l3-3 3 3 5-6" /></>),
  shield:  ic(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></>, 18),
  star:    ic(<><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></>, 18),
  check:   ic(<><path d="M20 6 9 17l-5-5" /></>, 18),
  globe:   ic(<><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z" /></>, 18),
  headset: ic(<><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-3v-7h5zM3 19a2 2 0 0 0 2 2h3v-7H3z" /></>, 18),
  db:      ic(<><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14a9 3 0 0 0 18 0V5" /><path d="M3 12a9 3 0 0 0 18 0" /></>, 18),
  play:    ic(<><polygon points="5 3 19 12 5 21 5 3" /></>, 16),
}

function Wordmark({ dark = false }: { dark?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
      <span style={{ width: 32, height: 32, borderRadius: 9, background: O, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18 }}>R</span>
      <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em', color: dark ? '#fff' : INK }}>Ranktsy</span>
    </span>
  )
}

/* ─── Nav ─────────────────────────────────────────────────────────── */
function Nav() {
  const link: React.CSSProperties = { fontSize: 15, fontWeight: 500, color: INK, textDecoration: 'none' }
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)', borderBottom: `1px solid ${BORDER}` }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', height: 72, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none' }}><Wordmark /></Link>
        <nav className="rnav-links" style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
          {['Features', 'Tools', 'Resources', 'Blog'].map(l => <a key={l} href="#" style={link}>{l}</a>)}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/login" style={{ ...link, padding: '9px 16px', borderRadius: 10, border: `1px solid ${BORDER}` }}>Log in</Link>
          <Link href="/register" style={{ fontSize: 15, fontWeight: 600, color: '#fff', background: O, textDecoration: 'none', padding: '10px 18px', borderRadius: 10, boxShadow: '0 4px 12px rgba(255,90,31,0.28)' }}>Get started free →</Link>
        </div>
      </div>
    </header>
  )
}

/* ─── Dashboard preview mockup ─────────────────────────────────────── */
function DashMock() {
  const nav = ['Overview', 'Keyword Research', 'Product Research', 'Shop Analyzer', 'Listing Audit', 'Competitor Research', 'Trend Buzz', 'Rank Tracker', 'AI Listing Generator']
  const stats = [
    { k: 'Keywords', v: '85,320', d: '+12.5%', up: true },
    { k: 'Total Views', v: '3.2M', d: '+18.7%', up: true },
    { k: 'Avg. CTR', v: '6.48%', d: '+8.2%', up: true },
    { k: 'AI Credits', v: '2,450', d: '-20%', up: false },
  ]
  // Simple upward line for the mini chart
  const pts = [8, 22, 15, 30, 24, 40, 34, 52, 46, 64, 74]
  const w = 300, h = 90
  const path = pts.map((p, i) => `${(i / (pts.length - 1)) * w},${h - (p / 80) * h}`).join(' ')
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, boxShadow: '0 30px 70px rgba(17,24,39,0.14)', overflow: 'hidden', display: 'flex', minHeight: 440 }}>
      {/* mini sidebar */}
      <div style={{ width: 132, borderRight: `1px solid ${BORDER}`, padding: '14px 10px', flexShrink: 0, background: '#fff' }}>
        <div style={{ marginBottom: 12, paddingLeft: 4 }}><Wordmark /></div>
        {nav.map((n, i) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 8px', borderRadius: 8, marginBottom: 2, background: i === 0 ? '#FFF1EB' : 'transparent' }}>
            <span style={{ width: 6, height: 6, borderRadius: 2, background: i === 0 ? O : '#D1D5DB' }} />
            <span style={{ fontSize: 9.5, fontWeight: i === 0 ? 600 : 500, color: i === 0 ? O : GRAY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n}</span>
          </div>
        ))}
      </div>
      {/* main */}
      <div style={{ flex: 1, padding: 14, background: BG, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: INK }}>Overview</p>
            <p style={{ fontSize: 9.5, color: GRAY }}>Welcome back, Zafar 👋</p>
          </div>
          <span style={{ fontSize: 8.5, fontWeight: 600, color: GREEN, background: '#ECFDF5', padding: '3px 8px', borderRadius: 100 }}>● Live</span>
        </div>
        {/* stat tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 12 }}>
          {stats.map(s => (
            <div key={s.k} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '8px 8px' }}>
              <p style={{ fontSize: 7.5, color: GRAY, marginBottom: 3 }}>{s.k}</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: INK, letterSpacing: '-0.02em' }}>{s.v}</p>
              <p style={{ fontSize: 7.5, fontWeight: 600, color: s.up ? GREEN : O, marginTop: 2 }}>{s.up ? '↑' : '↓'} {s.d}</p>
            </div>
          ))}
        </div>
        {/* chart + donut */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 8 }}>
          <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: 10 }}>
            <p style={{ fontSize: 9.5, fontWeight: 600, color: INK, marginBottom: 6 }}>Keyword Trend</p>
            <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="72" preserveAspectRatio="none">
              <defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={O} stopOpacity="0.22" /><stop offset="1" stopColor={O} stopOpacity="0" /></linearGradient></defs>
              <polygon points={`0,${h} ${path} ${w},${h}`} fill="url(#g)" />
              <polyline points={path} fill="none" stroke={O} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontSize: 9, fontWeight: 600, color: INK, marginBottom: 6, alignSelf: 'flex-start' }}>Audit Score</p>
            <div style={{ width: 62, height: 62, borderRadius: '50%', background: `conic-gradient(${GREEN} 0% 82%, ${P} 82% 92%, #E5E7EB 92% 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: INK }}>82</div>
            </div>
            <p style={{ fontSize: 8, color: GREEN, fontWeight: 600, marginTop: 6 }}>Great Score! 🎉</p>
          </div>
        </div>
        {/* AI generator strip */}
        <div style={{ marginTop: 8, background: `linear-gradient(120deg, ${P}, #A78BFA)`, borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 9.5, fontWeight: 700, color: '#fff' }}>AI Listing Generator</p>
            <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.85)' }}>SEO titles, tags & descriptions</p>
          </div>
          <span style={{ fontSize: 8.5, fontWeight: 700, color: P, background: '#fff', padding: '5px 10px', borderRadius: 8 }}>Generate</span>
        </div>
      </div>
    </div>
  )
}

/* ─── Hero ────────────────────────────────────────────────────────── */
function Hero() {
  const feat = [
    { icon: ICONS.shield, c: O, t: 'No Credit Card', s: 'Required' },
    { icon: ICONS.star, c: P, t: 'Free in Beta', s: 'Full Access' },
    { icon: ICONS.check, c: GREEN, t: 'Cancel Anytime', s: 'Hassle Free' },
  ]
  const pop = ['wedding invitation', 'resume template', 'digital planner', 'wall art']
  return (
    <section style={{ background: BG, padding: '64px 24px 80px' }}>
      <div className="rsplit" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 56, alignItems: 'center' }}>
        {/* left */}
        <div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: P, background: '#F3EEFE', padding: '6px 13px', borderRadius: 100, marginBottom: 22 }}>
            ✦ AI-Powered Etsy SEO Platform
          </span>
          <h1 style={{ fontSize: 'clamp(40px,5.2vw,62px)', fontWeight: 800, color: INK, letterSpacing: '-0.035em', lineHeight: 1.04, marginBottom: 20 }}>
            Grow Your <span style={{ color: O }}>Etsy</span> Business <span style={{ color: P }}>with Smart SEO</span>
          </h1>
          <p style={{ fontSize: 18, color: GRAY, lineHeight: 1.6, maxWidth: 460, marginBottom: 28 }}>
            Ranktsy gives you the data, tools and AI insights you need to rank higher, get more traffic and increase sales on Etsy.
          </p>
          {/* search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, padding: 6, maxWidth: 440, boxShadow: '0 4px 16px rgba(17,24,39,0.05)' }}>
            <span style={{ paddingLeft: 12, color: GRAY, display: 'flex' }}>{ICONS.search}</span>
            <input placeholder="Search Etsy keyword..." style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, fontFamily: FONT, color: INK, background: 'transparent', minWidth: 0 }} />
            <Link href="/register" style={{ background: O, color: '#fff', textDecoration: 'none', fontSize: 15, fontWeight: 600, padding: '11px 22px', borderRadius: 10 }}>Analyze</Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', margin: '14px 0 26px' }}>
            <span style={{ fontSize: 13, color: GRAY }}>Popular Searches:</span>
            {pop.map(p => <span key={p} style={{ fontSize: 12.5, color: INK, background: '#fff', border: `1px solid ${BORDER}`, padding: '4px 11px', borderRadius: 100 }}>{p}</span>)}
          </div>
          {/* feature chips */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 26 }}>
            {feat.map(f => (
              <div key={f.t} style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '10px 14px' }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: f.c, background: `${f.c}18` }}>{f.icon}</span>
                <span><span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: INK }}>{f.t}</span><span style={{ fontSize: 11.5, color: GRAY }}>{f.s}</span></span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginBottom: 22 }}>
            <Link href="/register" style={{ background: O, color: '#fff', textDecoration: 'none', fontSize: 16, fontWeight: 600, padding: '15px 28px', borderRadius: 12, boxShadow: '0 8px 22px rgba(255,90,31,0.30)' }}>Get started free</Link>
            <button style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: '#fff', border: `1px solid ${BORDER}`, color: INK, fontSize: 16, fontWeight: 600, padding: '15px 24px', borderRadius: 12, cursor: 'pointer', fontFamily: FONT }}>{ICONS.play} Watch Demo</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex' }}>
              {['#FF5A1F', '#8B5CF6', '#3B82F6', '#10B981'].map((c, i) => (
                <span key={c} style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: '2px solid #fff', marginLeft: i ? -10 : 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>{'AJKS'[i]}</span>
              ))}
            </div>
            <div>
              <span style={{ color: '#F59E0B', fontSize: 14 }}>★★★★★</span> <strong style={{ fontSize: 14, color: INK }}>4.8/5</strong>
              <p style={{ fontSize: 12.5, color: GRAY }}>Trusted by 10,000+ Etsy Sellers Worldwide</p>
            </div>
          </div>
        </div>
        {/* right: dashboard preview */}
        <div className="rhide-sm"><DashMock /></div>
      </div>
    </section>
  )
}

/* ─── Tools grid ──────────────────────────────────────────────────── */
function Tools() {
  const tools = [
    { icon: ICONS.search, c: O, t: 'Keyword Research', s: 'Find high-volume, low competition keywords' },
    { icon: ICONS.box, c: P, t: 'Product Research', s: 'Discover winning products before your competitors' },
    { icon: ICONS.store, c: '#3B82F6', t: 'Shop Analyzer', s: 'Analyze any Etsy shop in detail' },
    { icon: ICONS.users, c: GREEN, t: 'Competitor Research', s: 'Spy on top sellers and their best strategies' },
    { icon: ICONS.audit, c: '#EC4899', t: 'Listing Audit', s: 'Get SEO score and actionable improvement tips' },
    { icon: ICONS.spark, c: O, t: 'AI Listing Generator', s: 'Generate titles, tags & descriptions with AI' },
    { icon: ICONS.flame, c: P, t: 'Trend Buzz', s: "See what's trending on Etsy right now" },
    { icon: ICONS.chart, c: '#3B82F6', t: 'Rank Tracker', s: 'Track your ranking for important keywords' },
  ]
  return (
    <section style={{ background: CARD, padding: '80px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h2 style={{ fontSize: 'clamp(28px,3.4vw,38px)', fontWeight: 800, color: INK, textAlign: 'center', letterSpacing: '-0.03em' }}>Powerful Tools to Skyrocket Your Etsy Success</h2>
        <p style={{ fontSize: 17, color: GRAY, textAlign: 'center', marginTop: 10, marginBottom: 44 }}>Everything you need in one platform</p>
        <div className="rgrid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18 }}>
          {tools.map(t => (
            <div key={t.t} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, transition: 'transform 0.15s, box-shadow 0.15s', cursor: 'default' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 36px rgba(17,24,39,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>
              <span style={{ width: 52, height: 52, borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: t.c, background: `${t.c}16`, marginBottom: 16 }}>{t.icon}</span>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: INK, marginBottom: 7 }}>{t.t}</h3>
              <p style={{ fontSize: 14, color: GRAY, lineHeight: 1.5 }}>{t.s}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Stats bar ───────────────────────────────────────────────────── */
function Stats() {
  const stats = [
    { icon: ICONS.users, v: '10,000+', s: 'Active Sellers' },
    { icon: ICONS.db, v: '2M+', s: 'Keywords Database' },
    { icon: ICONS.audit, v: '50,000+', s: 'Listings Analyzed' },
    { icon: ICONS.shield, v: '99.9%', s: 'API Uptime' },
    { icon: ICONS.headset, v: '24/7', s: 'Customer Support' },
    { icon: ICONS.globe, v: '150+', s: 'Countries' },
  ]
  return (
    <section style={{ background: CARD, padding: '0 24px 80px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', background: '#F3EEFE', borderRadius: 24, padding: '34px 28px', display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 20 }}>
        {stats.map(s => (
          <div key={s.s} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 40, height: 40, borderRadius: 11, background: '#fff', color: P, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.icon}</span>
            <span><span style={{ display: 'block', fontSize: 22, fontWeight: 800, color: INK, letterSpacing: '-0.02em' }}>{s.v}</span><span style={{ fontSize: 12.5, color: GRAY }}>{s.s}</span></span>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ─── Trends · Testimonial ────────────────────────────────────────── */
function Band() {
  const trends = [['Wedding Invitation', '+125%'], ['Digital Planner', '+98%'], ['Resume Template', '+87%'], ['Wall Art', '+74%'], ['Teacher Appreciation', '+62%']]
  const cardBase: React.CSSProperties = { background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 20, padding: 24 }
  return (
    <section style={{ background: BG, padding: '80px 24px' }}>
      <div className="rband" style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, alignItems: 'start' }}>
        {/* trends */}
        <div style={cardBase}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: INK }}>Etsy Trends This Week</h3>
            <a href="#" style={{ fontSize: 12, color: O, textDecoration: 'none', fontWeight: 600 }}>See all →</a>
          </div>
          {trends.map(([n, d], i) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 4 ? `1px solid ${BORDER}` : 'none' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: GRAY, width: 12 }}>{i + 1}</span>
              <span style={{ flex: 1, fontSize: 13.5, color: INK }}>{n}</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: GREEN }}>↑ {d}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 16, padding: 14, background: BG, borderRadius: 14 }}>
            <div style={{ width: 66, height: 66, borderRadius: '50%', background: `conic-gradient(${O} 0% 62%, ${P} 62% 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fff' }} />
            </div>
            <div><p style={{ fontSize: 11, color: GRAY }}>Total Searches</p><p style={{ fontSize: 22, fontWeight: 800, color: INK }}>125.6K</p><p style={{ fontSize: 11, fontWeight: 600, color: GREEN }}>↑ 18.3% vs last week</p></div>
          </div>
        </div>
        {/* testimonial */}
        <div style={cardBase}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: INK, marginBottom: 16 }}>What Our Users Say</h3>
          <span style={{ fontSize: 40, color: O, lineHeight: 0.5, fontWeight: 800 }}>&ldquo;</span>
          <p style={{ fontSize: 15, color: INK, lineHeight: 1.6, margin: '8px 0 18px' }}>Ranktsy is a game changer! My traffic increased by 300% in just 30 days. The keyword data is incredibly accurate.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <span style={{ width: 42, height: 42, borderRadius: '50%', background: P, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>SJ</span>
            <div><p style={{ fontSize: 14, fontWeight: 700, color: INK }}>Sarah Johnson</p><p style={{ fontSize: 12.5, color: GRAY }}>Etsy Shop Owner</p></div>
          </div>
          <p style={{ color: '#F59E0B', fontSize: 16, marginTop: 14 }}>★★★★★</p>
        </div>
      </div>
    </section>
  )
}

/* ─── Gradient CTA ────────────────────────────────────────────────── */
function CTA() {
  return (
    <section style={{ background: BG, padding: '0 24px 64px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', background: `linear-gradient(115deg, ${P} 0%, #A84FD0 45%, ${O} 100%)`, borderRadius: 28, padding: '52px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 28, flexWrap: 'wrap', boxShadow: '0 30px 70px rgba(139,92,246,0.28)' }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.85)', marginBottom: 12 }}>READY TO GROW?</p>
          <h2 style={{ fontSize: 'clamp(28px,3.4vw,40px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: 12 }}>Start Your Etsy Success Journey Today</h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.88)', maxWidth: 520 }}>Join thousands of successful Etsy sellers using Ranktsy to grow their business.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/register" style={{ background: '#fff', color: O, textDecoration: 'none', fontSize: 15.5, fontWeight: 700, padding: '14px 26px', borderRadius: 12, boxShadow: '0 8px 22px rgba(17,24,39,0.16)' }}>Get started free</Link>
            <button style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.5)', color: '#fff', fontSize: 15.5, fontWeight: 600, padding: '14px 22px', borderRadius: 12, cursor: 'pointer', fontFamily: FONT }}>{ICONS.play} Watch Demo</button>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>No credit card required • Cancel anytime</p>
        </div>
      </div>
    </section>
  )
}

/* ─── Trust logos + footer ────────────────────────────────────────── */
function TrustFooter() {
  const logos = ['Etsy', 'ahrefs', 'Entrepreneur', 'shopify', 'Forbes', 'Mashable', 'BUSINESS INSIDER']
  return (
    <footer style={{ background: CARD, borderTop: `1px solid ${BORDER}`, padding: '40px 24px 48px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: GRAY, marginBottom: 20 }}>Trusted by top Etsy sellers and featured in</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '18px 40px', flexWrap: 'wrap', marginBottom: 34 }}>
          {logos.map(l => <span key={l} style={{ fontSize: 18, fontWeight: 700, color: '#9CA3AF', letterSpacing: l === 'BUSINESS INSIDER' ? '0.04em' : '-0.02em' }}>{l}</span>)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', paddingTop: 26, borderTop: `1px solid ${BORDER}` }}>
          <Wordmark />
          <p style={{ fontSize: 13, color: GRAY }}>© {new Date().getFullYear()} Ranktsy. Not affiliated with Etsy, Inc.</p>
          <div style={{ display: 'flex', gap: 20 }}>
            {[['Privacy', '/privacy'], ['Terms', '/terms'], ['Contact', '/contact']].map(([t, h]) => <Link key={t} href={h} style={{ fontSize: 13, color: GRAY, textDecoration: 'none' }}>{t}</Link>)}
          </div>
        </div>
      </div>
    </footer>
  )
}

export function NewLanding() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Tools />
        <Stats />
        <Band />
        <CTA />
      </main>
      <TrustFooter />
    </>
  )
}

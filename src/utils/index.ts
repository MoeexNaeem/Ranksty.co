/**
 * How long snapshot history is kept, in days (~13 months).
 *
 * Lives here rather than in lib/models so the Methodology page — a client
 * component — can quote the real number without importing mongoose. The TTL
 * index in lib/models reads this, so the number the public page states and the
 * number the database enforces cannot drift apart.
 */
export const SNAPSHOT_RETENTION_DAYS = 400

export const C = {
  // ── Vibrant SaaS palette — orange primary, purple secondary, green success ──
  // Colorful modern look: orange #FF5A1F is the primary action; purple #8B5CF6 is
  // the secondary/AI accent; charcoal #111827 headings, gray #6B7280 body, green
  // #10B981 for trends/success. Every token name is kept so consumers inherit it.
  orange:      '#FF5A1F',        // PRIMARY action / CTA / brand
  orangeLight: '#FF7A47',        // hover
  orangeFaint: 'rgba(255,90,31,0.10)', // soft orange wash
  purple:      '#8B5CF6',        // SECONDARY accent (AI / highlights)
  purpleFaint: 'rgba(139,92,246,0.10)',
  ember:       '#FF5A1F',        // alias → primary orange
  emberFaint:  'rgba(255,90,31,0.10)',
  lime:        '#FF5A1F',        // alias → orange
  limeFaint:   'rgba(255,90,31,0.14)',
  softLime:    '#FFF1EB',        // soft orange tile

  charcoal:    '#111827',        // dark charcoal — dark surfaces / footer
  charcoalMid: '#6B7280',        // muted gray — secondary text
  charcoalSoft:'rgba(17,24,39,0.06)', // faint dividers
  deepCharcoal:'#111827',        // deepest ink / inverted surface

  // ── Neutrals (cool gray stack) ─────────────────────────────
  snow:        '#FFFFFF',        // pure white — card fills
  offWhite:    '#F9FAFB',        // canvas / page background
  warmGray:    '#F3F4F6',        // tinted section surface
  lightGray:   '#E5E7EB',        // borders
  ghostGray:   '#9CA3AF',        // placeholder / faint
  overlay:     '#6B7280',        // muted body text

  // ── Surfaces ───────────────────────────────────────────────
  bg:          '#F9FAFB',        // app background
  card:        '#FFFFFF',        // card / table surface
  cardBorder:  '#E5E7EB',        // card + row borders
  headerBg:    '#F9FAFB',        // table header strip
  rowHover:    '#F9FAFB',        // table row hover
  inkSoft:     '#374151',        // table body text
  inkFaint:    '#9CA3AF',        // labels / captions

  // ── Semantic status ───────────────────────────────────────
  success:     '#10B981',  successBg: 'rgba(16,185,129,0.12)',   // trends / good
  warn:        '#F59E0B',  warnBg:    'rgba(245,158,11,0.14)',   // Medium
  danger:      '#EF4444',  dangerBg:  'rgba(239,68,68,0.12)',    // High / hard

  // ── Editorial language ──
  paper:       '#FFFFFF',        // page canvas / card base
  canvas:      '#F9FAFB',        // page background
  bone:        '#F3F4F6',        // secondary tinted surface / track fills
  softOrange:  '#FFF1EB',        // soft orange category tile
  hair:        '#E5E7EB',        // hairline (dividers)
  hairInk:     '#E5E7EB',        // card hairline
  ash:         '#E5E7EB',        // borders / dividers
  graphite:    '#6B7280',        // muted copy (body text)
  stone:       '#9CA3AF',        // faint strokes
  ink:         '#111827',        // charcoal — headlines & body text
} as const

// Contrast guide (avoids the dark-text-on-orange readability bug):
//   • C.orange background  → always use C.snow (white) text
//   • C.charcoal background → always use C.snow (white) text
//   • C.orangeFaint / warmGray / snow backgrounds → use C.charcoal text

// ─── D — DATA palette ────────────────────────────────────────────────────────
// Deliberately separate from `C` (brand). The brand's "no green" rule governs
// chrome — nav, buttons, hero, CTA, footer. Data signals are the exception: a
// real green→amber→red scale reads faster than a monochrome one, so stats, KD
// scores, competition badges and charts use these.
//
// Rule: never use D.* for chrome, never use C.orange as a data signal.
export const D = {
  good:      '#10B981',  goodBg:   'rgba(16,185,129,0.12)',  goodSoft:  '#D1FAE5',  // easy / low competition
  fair:      '#34D399',  fairBg:   'rgba(52,211,153,0.12)',                         // easy-ish
  mid:       '#F59E0B',  midBg:    'rgba(245,158,11,0.15)',   midSoft:   '#FEF3C7',  // medium
  warm:      '#FB923C',  warmBg:   'rgba(251,146,60,0.14)',                         // hard-ish
  hard:      '#EF4444',  hardBg:   'rgba(239,68,68,0.12)',    hardSoft:  '#FEE2E2',  // hard / high competition
  neutral:   '#6B7280',  neutralBg:'rgba(107,114,128,0.10)',                        // no data

  // Categorical series — vibrant, brand-aligned (orange, purple, green, blue…).
  series: ['#FF5A1F', '#8B5CF6', '#10B981', '#3B82F6', '#EC4899', '#F59E0B', '#06B6D4', '#6B7280'] as const,
} as const

// ─── Per-tool ACCENT system ──────────────────────────────────────────────────
// Ranktsy's vibrant look gives every tool its own hue (the colorful tool tiles).
// The hue drives the nav icon, the tab header chip, and — via the `--accent` CSS
// var on the dashboard content wrapper — the shared kit (stat caps, section dots,
// search icon). Orange + purple are the brand pair; the rest fill the spectrum.
export const ACCENT = {
  indigo:  '#6366F1', blue:    '#3B82F6', sky:     '#0EA5E9', cyan:    '#06B6D4',
  teal:    '#14B8A6', emerald: '#10B981', green:   '#22C55E', amber:   '#F59E0B',
  orange:  '#FF5A1F', rose:    '#F43F5E', red:     '#EF4444', pink:    '#EC4899',
  fuchsia: '#D946EF', purple:  '#8B5CF6', violet:  '#8B5CF6', slate:   '#64748B',
} as const

export type AccentName = keyof typeof ACCENT

/** #RRGGBB (+ optional alpha) → rgba() string. For computed soft tints/rings. */
export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Keyword-difficulty / competition heat: 0 = easy (green) → 100 = hard (red). */
export function heatColor(score: number): string {
  if (score < 20) return D.good
  if (score < 40) return D.fair
  if (score < 60) return D.mid
  if (score < 80) return D.warm
  return D.hard
}

/**
 * ISO-3166 alpha-2 → flag emoji, by offsetting each letter into the Unicode
 * regional-indicator block. Derived rather than mapped, so it covers every
 * country Etsy can return — a hardcoded map silently drops the ones it misses.
 */
export function flag(iso: string | null | undefined): string {
  if (!iso || !/^[A-Za-z]{2}$/.test(iso)) return ''
  return String.fromCodePoint(...[...iso.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65))
}

/** Competition level → {fg,bg}. Low is genuinely good news, so it reads green. */
export function compColor(level: 'Low' | 'Med' | 'High'): { fg: string; bg: string } {
  if (level === 'Low')  return { fg: D.good, bg: D.goodBg }
  if (level === 'High') return { fg: D.hard, bg: D.hardBg }
  return { fg: D.mid, bg: D.midBg }
}

export function formatNumber(n: number | null): string {
  if (n === null || n === undefined) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return n.toString()
}

export function formatPercent(n: number | null): string {
  if (n === null || n === undefined) return '—'
  return n.toFixed(1) + '%'
}

// Kept for any remaining imports
export function cn(...args: (string | undefined | false | null)[]): string {
  return args.filter(Boolean).join(' ')
}

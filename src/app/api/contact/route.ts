import { NextRequest, NextResponse } from 'next/server'
import { sendContactEmail } from '@/lib/auth/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Messages per IP per hour (per server process). Enough for a real person, not for spam. */
const PER_HOUR = 5
const hits = new Map<string, number[]>()

const SUBJECTS = new Set(['General', 'Technical Support', 'Billing & Subscriptions', 'Feature Request', 'Partnership', 'Press & Media'])
const isEmail = (s: string) => /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(s)

/** Public contact form: emails the message to the support inbox. */
export async function POST(req: NextRequest) {
  const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  const str = (k: string, max: number) => (typeof body?.[k] === 'string' ? (body[k] as string).trim().slice(0, max) : '')

  // Hidden field real people never fill in: bots that do get a quiet "sent".
  if (str('website', 200)) return NextResponse.json({ success: true })

  const name = str('name', 100), email = str('email', 200), message = str('message', 5000)
  const subject = SUBJECTS.has(str('subject', 60)) ? str('subject', 60) : 'General'
  if (!name || !email || !message) return NextResponse.json({ success: false, error: 'Please fill in your name, email and message.' }, { status: 400 })
  if (!isEmail(email)) return NextResponse.json({ success: false, error: 'Please enter a valid email address.' }, { status: 400 })
  if (message.length < 10) return NextResponse.json({ success: false, error: 'Please write a little more so we can help.' }, { status: 400 })

  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter(t => now - t < 3_600_000)
  if (recent.length >= PER_HOUR) {
    return NextResponse.json({ success: false, error: 'Too many messages from your connection. Please try again later or email us directly.' }, { status: 429 })
  }
  recent.push(now)
  hits.set(ip, recent)

  try {
    await sendContactEmail({ name, email, subject, message, ip })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[contact] send failed:', e)
    return NextResponse.json({ success: false, error: 'Your message could not be sent. Please email support@rankkw.online directly.' }, { status: 502 })
  }
}

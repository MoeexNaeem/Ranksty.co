import { NextResponse } from 'next/server'
import { clearAuthCookies } from '@/lib/auth/cookies'

// Per request: never pre-rendered or cached at build time (Etsy data must stay fresh).
export const dynamic = 'force-dynamic'

export async function POST() {
  await clearAuthCookies()
  return NextResponse.json({ success: true })
}

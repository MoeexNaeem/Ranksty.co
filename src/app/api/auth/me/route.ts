import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'

// Per request: never pre-rendered or cached at build time (Etsy data must stay fresh).
export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
  return NextResponse.json({ success: true, data: user })
}

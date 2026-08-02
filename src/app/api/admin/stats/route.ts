import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { CollectiveKeywordData } from '@/lib/models'
import { getCurrentUser } from '@/lib/auth/session'
import { isAdmin } from '@/lib/auth/roles'
import { getUsageToday } from '@/lib/usage'
import type { ApiResponse } from '@/types'

export const runtime = 'nodejs'

/**
 * Admin system stats: how many keywords are saved in the permanent
 * `collectivekeyworddatas` store, and how many Etsy / Google API calls have been
 * made today.
 */
export async function GET(): Promise<NextResponse<ApiResponse<unknown>>> {
  const auth = await getCurrentUser()
  if (!auth) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
  if (!isAdmin(auth)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  try {
    await connectDB()
    const [keywordsSaved, usage] = await Promise.all([
      CollectiveKeywordData.countDocuments(),
      getUsageToday(),
    ])
    return NextResponse.json({
      success: true,
      data: { keywordsSaved, etsyToday: usage.etsyCalls, googleToday: usage.googleCalls, day: usage.day },
    })
  } catch (e) {
    console.error('[Admin/stats] failed:', e)
    return NextResponse.json({ success: false, error: 'Could not load stats' }, { status: 500 })
  }
}

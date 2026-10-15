import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken, verifyRefreshToken } from '@/lib/auth/jwt'
import { ACCESS_TOKEN_NAME, REFRESH_TOKEN_NAME } from '@/lib/auth/cookies'

const PROTECTED = ['/dashboard', '/profile', '/admin']
const AUTH_ONLY = ['/login', '/register', '/forgot-password', '/reset-password'] // redirect if already logged in

/**
 * API routes that must work without a login. Every other /api route answers only
 * for a signed-in account, so nobody can use this site as an open relay to the
 * Etsy API (Etsy's terms require the key to be kept from third parties) or burn
 * the Google / Gemini quotas anonymously. Keep this list short; a new public
 * route must be added here on purpose.
 */
const PUBLIC_API = [
  '/api/auth/',          // login, register, OTP, password reset, me, logout
  '/api/etsy/oauth/',    // Etsy connect + callback (they handle their own login redirect)
  '/api/google/oauth/',  // Google Ads connect + callback
  '/api/cron/',          // CRON_SECRET-protected server jobs
  '/api/health',         // uptime / deploy health check
  '/api/contact',        // public contact form (rate-limited in the route)
  '/api/fx',             // cached currency rates, no Etsy data
]
// "/api/auth/" covers everything under it; "/api/health" covers itself and below.
const isPublicApi = (p: string) => PUBLIC_API.some(a => (a.endsWith('/') ? p.startsWith(a) : p === a || p.startsWith(a + '/')))

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isApi        = pathname.startsWith('/api/')
  const isProtected  = PROTECTED.some(p => pathname === p || pathname.startsWith(p + '/'))
  const isAuthPage   = AUTH_ONLY.some(p => pathname === p || pathname.startsWith(p))

  const accessToken  = req.cookies.get(ACCESS_TOKEN_NAME)?.value
  const refreshToken = req.cookies.get(REFRESH_TOKEN_NAME)?.value

  // Determine if authenticated
  let isAuthed = false
  if (accessToken) {
    const user = await verifyAccessToken(accessToken)
    if (user) isAuthed = true
  }
  if (!isAuthed && refreshToken) {
    const payload = await verifyRefreshToken(refreshToken)
    if (payload?.sub) isAuthed = true
  }

  // Login gate for the API (see PUBLIC_API). The route handlers still check the
  // session themselves; this rejects anonymous callers early, with JSON.
  if (isApi) {
    if (!isAuthed && !isPublicApi(pathname)) {
      return NextResponse.json({ success: false, code: 'auth_required', error: 'Please log in to use this.' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // Redirect unauthenticated users away from protected routes
  if (isProtected && !isAuthed) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages
  if (isAuthPage && isAuthed) {
    const url = req.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
    '/profile/:path*',
    '/admin/:path*',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
  ],
}

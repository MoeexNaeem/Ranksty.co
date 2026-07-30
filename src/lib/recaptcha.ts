/**
 * Google reCAPTCHA v2 — server-side token verification.
 *
 * REMOVED from Ranktsy: both entry points below are hard-disabled, so no captcha
 * is verified or required anywhere. Kept as inert stubs (rather than deleted) so
 * the routes and search gate that import them keep compiling unchanged.
 */

/**
 * Captcha has been REMOVED from Ranktsy. Forced off so the search gate is fully
 * dormant (guardSearch returns null → no captcha challenge and no search block)
 * regardless of environment keys.
 */
export function isRecaptchaConfigured(): boolean {
  return false
}

/**
 * Verify a reCAPTCHA response token with Google. Returns true when the token is
 * valid — or when reCAPTCHA isn't configured (so the feature is a safe no-op
 * until keys are added).
 */
export async function verifyRecaptcha(_token?: string | null, _remoteIp?: string): Promise<boolean> {
  // Captcha removed from Ranktsy — always pass so login/signup are never blocked.
  return true
}

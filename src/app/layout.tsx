import type { Metadata, Viewport } from 'next'
import { Providers } from '@/lib/providers'
import { Toaster }   from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title:       'Ranktsy — Etsy Keyword Research & Analytics',
  description: 'Data-driven keyword research, competition analysis, and trend tracking for Etsy sellers.',
  keywords:    ['Etsy SEO', 'Etsy keyword research', 'Etsy analytics'],
  openGraph:   { title: 'Ranktsy', description: 'Keyword research for Etsy sellers.', type: 'website' },
  robots:      { index: true, follow: true },
}
// Emits <meta name="viewport" content="width=device-width, initial-scale=1">.
//
// This silently did nothing while the layout rendered a manual <head>: Next's
// metadata injection de-duplicates head elements and a hand-written <head>
// suppressed it, so phones fell back to a 980px virtual viewport, no max-width
// media query ever matched, and the whole responsive layer in globals.css was
// dead code. Next 16 is explicit that root layouts must NOT hand-roll <head>.
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#09090b' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* DM Sans (Google Fonts) — the Cosmica substitute for Ranktsy's editorial
            zinc-grid style. No <head> wrapper: React 19 hoists link tags into the
            head on its own, and adding one back would break the viewport meta. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap" rel="stylesheet" />
        <Providers>
          {children}
          <Toaster position="bottom-right" toastOptions={{ style: { background: '#18181b', color: '#FFFFFF', borderRadius: 14, fontSize: 13, fontFamily: 'DM Sans, sans-serif' } }} />
        </Providers>
      </body>
    </html>
  )
}

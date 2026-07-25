import { Nav, Hero, Tools }   from '@/components/landing/NewLanding'
import { Features, HowItWorks, CTA, Footer, AboutContactTeaser } from '@/components/landing/Sections'
import { KeywordTool }         from '@/components/landing/KeywordTool'
import { DashboardSection }    from '@/components/landing/DashboardSection'

export const revalidate = 86400

/**
 * Ranktsy landing: the new vibrant DESIGN (Nav / split Hero + dashboard preview /
 * colourful Tools grid) followed by Rankkw's REAL content, verbatim — Features,
 * HowItWorks, the live KeywordTool, DashboardSection, About/Contact teaser, the
 * CTA and the full Footer (which links to every page: Methodology, Service
 * Policy, Refund, Terms, Privacy, About, Contact). Pricing is omitted for
 * commercial-access compliance parity with Rankkw. Content = Rankkw; only the
 * design differs.
 */
export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Tools />
        <Features />
        <HowItWorks />
        <KeywordTool />
        <DashboardSection />
        <AboutContactTeaser />
        <CTA />
      </main>
      <Footer />
    </>
  )
}

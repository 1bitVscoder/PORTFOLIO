import type { Metadata } from 'next';
import { AboutPageView } from '@/components/sections/about-page';

export const metadata: Metadata = {
  title: 'About · Zenith Soumya',
  description:
    'Zenith Soumya builds next-gen IoT systems, optimized Java/DSA engines, and agentic AI full-stack applications.',
  alternates: { canonical: '/about' },
};

/* Dedicated About page — composed like a case study (editorial reading
   rhythm with the Ledger woven in as a vitals strip and a colophon). Navbar,
   transitions and providers come from the root layout. */
export default function AboutRoute() {
  return <AboutPageView />;
}

import type { Metadata } from 'next';
import { ArcadePageView } from '@/components/sections/arcade-page';

export const metadata: Metadata = {
  title: 'Arcade · Zenith Soumya',
  description:
    'Interactive simulations, Java/DSA complexity engines, and agentic AI prompt routing pipelines.',
  alternates: { canonical: '/arcade' },
};

/* Dedicated Arcade page — composed of Complexity Race Arena and Agentic AI Flow 
   rendered stacked from top to bottom. Navbar, transitions and providers come 
   from the root layout. */
export default function ArcadeRoute() {
  return <ArcadePageView />;
}

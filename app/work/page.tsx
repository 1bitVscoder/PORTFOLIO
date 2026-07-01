import type { Metadata } from 'next';
import { WorksPage } from '@/components/sections/works-index';

// `/work` and `/work2` render two presentations of the same works data. `/work2`
// is the canonical, sitemap-listed variant; this one is kept live but de-indexed
// so search engines don't treat it as duplicate content. Sitemap omission alone
// doesn't prevent crawling, so emit an explicit robots:noindex here.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function WorksRoute() {
  return <WorksPage />;
}

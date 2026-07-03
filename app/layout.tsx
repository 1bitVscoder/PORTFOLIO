import type { Metadata, Viewport } from "next";
import { Doppio_One } from "next/font/google";
import "./globals.css";
import { CustomCursor } from "@/components/ui/CustomCursor";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SoundToggle } from "@/components/ui/SoundToggle";
import { BackToTop } from "@/components/ui/BackToTop";
import { AccentColorProvider } from "@/lib/AccentColorContext";
import { LenisProvider } from "@/lib/LenisProvider";
import { InteractiveBackground } from "@/components/sections/Hero";
import { Navbar } from "@/components/layout/Navbar";
import {
  TransitionProvider,
  TransitionStage,
} from "@/components/transitions";
import { siteMetadata } from "@/data";

const doppioOne = Doppio_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-navbar",
  display: "swap",
  // The navbar brand (the only above-the-fold consumer) is hidden/animated in
  // during the welcome→hero handoff, so the font isn't painted at first load.
  // Preloading it buys nothing and triggers Firefox's "preloaded but not used"
  // warning. display:swap still handles the fallback when it does paint.
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(siteMetadata.siteUrl),
  title: siteMetadata.title,
  description: siteMetadata.description,
  keywords: siteMetadata.keywords,
  authors: [{ name: siteMetadata.author }],
  alternates: { canonical: "/" },
  openGraph: {
    title: siteMetadata.openGraph.title,
    description: siteMetadata.openGraph.description,
    type: siteMetadata.openGraph.type,
    locale: siteMetadata.openGraph.locale,
    siteName: siteMetadata.openGraph.siteName,
  },
  twitter: {
    card: "summary_large_image",
    creator: siteMetadata.twitter.creator,
  },
};

export const viewport: Viewport = {
  themeColor: siteMetadata.themeColor,
};

// Run synchronously before paint — next/script's beforeInteractive is
// unreliable in App Router (fires after hydration), causing a theme flash on
// dark-mode users and a scroll-position flash on reload. Inline scripts execute
// at parse time, before React. Three concerns: apply saved dark theme, force
// manual scroll restoration, and flag the load as fresh for downstream code.
const BOOTSTRAP_SCRIPT = `
(function(){try{if(localStorage.getItem("portfolio_theme")==="dark"){document.documentElement.setAttribute("data-theme","dark")}}catch(e){}})();
if("scrollRestoration"in history){history.scrollRestoration="manual"}
window.scrollTo(0,0);
window.__freshLoad=true;
document.addEventListener("dragstart", function(e) {
  if (e.target && e.target.tagName === "IMG") {
    e.preventDefault();
  }
}, { passive: false });
`;

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: siteMetadata.person.name,
  jobTitle: siteMetadata.person.jobTitle,
  url: siteMetadata.siteUrl,
  description: siteMetadata.description,
  sameAs: siteMetadata.person.sameAs,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={doppioOne.variable} suppressHydrationWarning>
        {/* See BOOTSTRAP_SCRIPT above — pre-paint theme + scroll-restoration bootstrap. */}
        <script
          dangerouslySetInnerHTML={{
            __html: BOOTSTRAP_SCRIPT,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(personJsonLd).replace(/</g, '\\u003c'),
          }}
        />
        <LenisProvider>
          <AccentColorProvider>
            <TransitionProvider>
              <InteractiveBackground />
              <Navbar />
              <CustomCursor />
              <BackToTop />
              <SoundToggle />
              <ThemeToggle />
              {children}
              <TransitionStage />
            </TransitionProvider>
          </AccentColorProvider>
        </LenisProvider>
      </body>
    </html>
  );
}

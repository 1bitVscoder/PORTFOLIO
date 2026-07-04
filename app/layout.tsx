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
if(document.body){document.body.classList.remove("welcome-done")}
document.addEventListener("dragstart", function(e) {
  if (e.target && e.target.tagName === "IMG") {
    e.preventDefault();
  }
}, { passive: false });
`;

// Critical inline CSS that MUST be present before first paint:
// 1. Hides all body content until welcome animation completes (FOUC gate)
// 2. Duplicates the welcome wrapper's positioning so it works even before
//    CSS module chunks load on cached refreshes
// Deactivated by adding .welcome-done to <body> in WelcomeScreen.tsx.
const WELCOME_GATE_CSS = [
  'body:not(.welcome-done){visibility:hidden!important}',
  'body:not(.welcome-done) [data-welcome-wrapper]{',
  '  visibility:visible!important;',
  '  position:fixed!important;',
  '  inset:0!important;',
  '  z-index:9000!important;',
  '  display:flex!important;',
  '  justify-content:center!important;',
  '  align-items:center!important;',
  '  overflow:hidden!important;',
  '  background-color:var(--color-background,#FFFFFF)!important;',
  '}',
  'body:not(.welcome-done) [data-initials-container]{',
  '  visibility:visible!important;',
  '  position:absolute!important;',
  '  top:50%!important;',
  '  left:50%!important;',
  '  transform:translate(-50%,-50%)!important;',
  '  display:flex!important;',
  '  align-items:center!important;',
  '  justify-content:center!important;',
  '}',
  // Dark theme: if the bootstrap script has already set data-theme="dark"
  // but variables.css hasn't loaded yet, this hardcoded fallback keeps the
  // welcome overlay matching the dark background.
  '[data-theme=dark] [data-welcome-wrapper]{background-color:#171717!important}',
].join('');

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
        {/* FOUC gate: inline CSS parsed before ANY body content renders.
            Hides everything except the welcome overlay. Deactivated when
            WelcomeScreen adds .welcome-done to <body>. */}
        <style
          dangerouslySetInnerHTML={{
            __html: WELCOME_GATE_CSS,
          }}
        />
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

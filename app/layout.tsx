import type { Metadata, Viewport } from "next";
import { Doppio_One } from "next/font/google";
import "./globals.css";
import { CustomCursor } from "@/components/ui/CustomCursor";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SoundToggle } from "@/components/ui/SoundToggle";
import { BackToTop } from "@/components/ui/BackToTop";
import { AccentColorProvider } from "@/lib/AccentColorContext";
import { LenisProvider } from "@/lib/LenisProvider";
import { MobileBlockOverlay } from "@/components/ui/MobileBlockOverlay/MobileBlockOverlay";
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
  verification: {
    google: "is3luZHcfrQGitGlHhobsUHecT6KGQqqlKphDNLZ9_s",
  },
};

export const viewport: Viewport = {
  themeColor: siteMetadata.themeColor,
};

// Run synchronously before paint — next/script's beforeInteractive is
// unreliable in App Router (fires after hydration), causing a theme flash on
// dark-mode users and a scroll-position flash on reload. Inline scripts execute
// at parse time, before React.
//
// FOUC prevention strategy:
// Instead of body{visibility:hidden} (which is inheritable and can be overridden
// by any child setting visibility:visible), we create an opaque overlay <div>
// at z-index 9999 with the theme background color. This physically paints over
// ALL content — nothing can bleed through regardless of z-index, position, or
// visibility overrides on any child element.
//
// The [data-welcome-wrapper] element from WelcomeScreen sits INSIDE body and
// has its own z-index:9000, but the overlay at z-index:9999 covers it too.
// We punch a hole for the welcome wrapper using the same overlay div approach:
// the overlay IS the welcome wrapper's backdrop.
//
// On non-"/" pages, the overlay is removed on DOMContentLoaded.
// On "/", the WelcomeScreen component removes it via the 'welcome-gate' id.
//
// bfcache: When the browser restores from bfcache (back/forward), JS state is
// stale. We force a real reload via the pageshow event.
const BOOTSTRAP_SCRIPT = `
(function(){try{if(localStorage.getItem("portfolio_theme")==="dark"){document.documentElement.setAttribute("data-theme","dark")}}catch(e){}})();
if("scrollRestoration"in history){history.scrollRestoration="manual"}
window.scrollTo(0,0);
window.__freshLoad=true;
(function(){
  var isDark=document.documentElement.getAttribute("data-theme")==="dark";
  var bg=isDark?"#171717":"#FFFFFF";
  var overlay=document.createElement("div");
  overlay.id="welcome-gate";
  overlay.setAttribute("aria-hidden","true");
  overlay.style.cssText="position:fixed;inset:0;z-index:9998;background-color:"+bg+";pointer-events:none;transition:opacity 0.3s ease;";
  document.body.appendChild(overlay);
  if(window.location.pathname!=="/"){
    document.addEventListener("DOMContentLoaded",function(){
      var g=document.getElementById("welcome-gate");
      if(g){g.style.opacity="0";setTimeout(function(){g.remove()},350)}
    });
  }
})();
window.addEventListener("pageshow",function(e){
  if(e.persisted){window.location.reload()}
});
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
              <MobileBlockOverlay />
              {children}
              <TransitionStage />
            </TransitionProvider>
          </AccentColorProvider>
        </LenisProvider>
      </body>
    </html>
  );
}

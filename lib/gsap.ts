import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import animationConfig from "@/data/animation-config.json";

// Register GSAP plugins + set defaults client-side only. Both calls mutate
// GSAP's module-level state, so on the server they would (harmlessly today,
// but fragile) run on every RSC pre-render.
//
// IMPORT CONTRACT: this module is the single registration point for GSAP and
// its plugins. Every other module MUST import { gsap, ScrollTrigger } from
// "@/lib/gsap" — never directly from "gsap" / "gsap/ScrollTrigger". Importing
// the plugin elsewhere can load it before this side-effect runs, leaving
// ScrollTrigger unregistered. (Worth enforcing with an ESLint
// no-restricted-imports rule that exempts this file.)
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({
    ease: "power3.out",
    duration: animationConfig.durations.slow,
  });
}

// Export configured gsap and plugins
export { gsap, ScrollTrigger };

// Animation configuration constants (from data)
export const ANIMATION_CONFIG = {
  duration: animationConfig.durations,
  ease: animationConfig.easing.gsap,
  stagger: animationConfig.stagger,
  delays: animationConfig.delays,
} as const;

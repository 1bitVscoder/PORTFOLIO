

import { Ledger } from "@/components/sections/case-study/Ledger";
import { Contact } from "@/components/sections/Contact";
import { AboutPageHeroEcho } from "./Echo";
import { AboutPageIntro } from "./Intro";
import { AboutPageExperience } from "./Experience";
import { AboutPageCurrentProject } from "./CurrentProject";
import { AboutPageContributions } from "./Contributions";
import { AboutPageLeetCodeStats } from "./LeetCodeStats";
import { AboutPageCredentials } from "./Credentials";

const VITALS = [
  { label: "Status", primary: "Full time", secondary: "Builds independently" },
  { label: "Discipline", primary: "Full Stack", secondary: "Interface to infrastructure" },
  { label: "Building", primary: "FREELLMPROXY", secondary: "Universal LLM proxy API" },
  { label: "Based in", primary: "India", secondary: "A dark room with O(1) latency" },
  { label: "Ships", primary: "Real things", secondary: "Not mockups" },
];

export function AboutPageView() {
  return (
    <main>
      <AboutPageHeroEcho />
      <Ledger entries={VITALS} />
      <AboutPageIntro />
      <AboutPageExperience />
      <AboutPageCurrentProject />
      <AboutPageContributions />
      <AboutPageLeetCodeStats />
      <AboutPageCredentials />
      <Contact />
    </main>
  );
}

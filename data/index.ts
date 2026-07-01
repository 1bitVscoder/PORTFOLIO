// Centralized data exports with type safety
// Import JSON data and re-export with types

import type {
  SiteMetadata,
  Content,
  Navigation,
  DesignTokens,
  AnimationConfig,
  Features,
  CaseStudy,
  CaseStudies,
  TransitionsConfig,
  Project,
  GithubContributions,
} from './types';

// Import JSON files
import siteMetadataJson from './site-metadata.json';
import contentJson from './content.json';
import navigationJson from './navigation.json';
import designTokensJson from './design-tokens.json';
import animationConfigJson from './animation-config.json';
import featuresJson from './features.json';
import caseStudiesJson from './case-studies.json';
import transitionsJson from './transitions.json';
import githubContributionsJson from './github-contributions.json';
import leetcodeStatsJson from './leetcode-stats.json';

// Export typed data
// `as SiteMetadata`: TS widens JSON string literals (e.g. openGraph.type) to
// `string`, so the narrowed union types in SiteMetadata need an assertion at
// this single boundary — same pattern as transitionsConfig below.
export const siteMetadata: SiteMetadata = siteMetadataJson as SiteMetadata;
export const content: Content = contentJson;
export const navigation: Navigation = navigationJson;
export const designTokens: DesignTokens = designTokensJson;
export const animationConfig: AnimationConfig = animationConfigJson;
export const features: Features = featuresJson;
export const caseStudies: CaseStudies = caseStudiesJson;
export const transitionsConfig: TransitionsConfig = transitionsJson as TransitionsConfig;
// `as`: the JSON `level` fields widen to `number`, so the 0|1|2|3|4 literal
// union in GithubContributions needs an assertion at this single boundary.
export const githubContributions: GithubContributions =
  githubContributionsJson as GithubContributions;
export const leetcodeStats = leetcodeStatsJson;

if (process.env.NODE_ENV !== 'production') {
  Object.entries(caseStudies).forEach(([slug, cs]) => {
    if (cs.nextCase && !caseStudies[cs.nextCase.slug]) {
      console.warn(
        `[case-studies] "${slug}".nextCase.slug "${cs.nextCase.slug}" has no entry — NextCase will render the non-link branch.`
      );
    }
  });
}

// Re-export types for convenience
export type {
  SiteMetadata,
  Content,
  Navigation,
  DesignTokens,
  AnimationConfig,
  Features,
  // Sub-types that might be useful
  NavLink,
  SocialLink,
  HeroContent,
  SkillsContent,
  WelcomeScreenContent,
  PhilosophyContent,
  WorkflowContent,
  WorkflowStop,
  AboutContent,
  ServicesContent,
  ServiceFace,
  ArchiveContent,
  ColorTokens,
  TypographyTokens,
  DurationConfig,
  EasingConfig,
  CustomCursorConfig,
  InteractiveBackgroundConfig,
  // Case study types
  CaseStudy,
  CaseStudies,
  CaseStudyHeroContent,
  LedgerContent,
  LedgerEntry,
  ContextContent,
  VisionContent,
  PullContent,
  PullLine,
  PullAttribution,
  ProductContent,
  DashboardContent,
  ToggleContent,
  ToggleScreen,
  ArchitectureContent,
  ArchitectureLayer,
  ArchitectureFact,
  OutcomesContent,
  OutcomeMetric,
  ColophonContent,
  ColophonCredit,
  ColophonAction,
  NextCaseContent,
  TransitionsConfig,
  Project,
  // Works index
  WorksIndexContent,
  WorksIndexProject,
  // GitHub contributions
  GithubContributions,
  ContributionCell,
} from './types';

// Convenience helpers
export const getHeroLetters = () => ({
  firstName: content.hero.firstName.split(''),
  lastName: content.hero.lastName.split(''),
});

export const getAccentColors = () => designTokens.colors.accentPalette;

export const getServicesFaces = () => content.services.faces;

// Case study helpers
export const getCaseStudy = (slug: string): CaseStudy | undefined => caseStudies[slug];

export const getCaseStudySlugs = (): string[] => Object.keys(caseStudies);

// Project / cross-lookup helpers
const getProject = (id: string): Project | undefined =>
  content.projects.items.find((p) => p.id === id);

/** Convenience: resolve a project's theme color by slug. Falls back to the
 *  default accent (first palette entry) when the slug has no matching
 *  project. Used by TransitionLink in places that don't already carry the
 *  full Project record (e.g. NextCase). */
export const getProjectThemeColor = (slug: string): string =>
  getProject(slug)?.themeColor ?? designTokens.colors.accentPalette[0];

// Works index helper
export const getWorksIndex = () => content.worksIndex;

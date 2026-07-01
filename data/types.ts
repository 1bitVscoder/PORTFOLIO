// Type definitions for portfolio data files

// ============================================
// Site Metadata Types
// ============================================
export interface OpenGraphData {
  title: string;
  description: string;
  type: "website" | "article" | "profile";
  locale: string;
  siteName: string;
}

export interface TwitterData {
  card: string;
  creator: string;
}

export interface PersonData {
  name: string;
  jobTitle: string;
  sameAs: string[];
}

export interface SiteMetadata {
  title: string;
  description: string;
  author: string;
  siteUrl: string;
  themeColor: string;
  keywords: string[];
  openGraph: OpenGraphData;
  twitter: TwitterData;
  person: PersonData;
}

// ============================================
// Content Types
// ============================================
export interface HeroContent {
  firstName: string;
  lastName: string;
  title: string;
  tagline: string[];
  taglineHidden: string[];
}

export interface SkillsContent {
  marqueeItems: string[];
  separator: string;
}

export interface WelcomeScreenContent {
  greetings: string[];
  initials: {
    first: string;
    last: string;
  };
  greetingDuration: number;
  totalGreetingTime: number;
}

export interface UIContent {
  buttons: {
    menu: string;
    close: string;
    back: string;
  };
}

export interface PhilosophyContent {
  label: string;
  statement: string;
  highlights: string[];
}

export interface WorkflowStop {
  /** Short step name, e.g. "Discover". */
  name: string;
  /** Headline for the active step. */
  title: string;
  /** Supporting copy for the active step. */
  copy: string;
  /** Optional word inside `copy` to underline with the step accent (first match). */
  emphasis?: string;
  /** Brand palette key driving this step's accent. One of: 'teal' | 'red' |
   *  'orange' | 'green' (maps to the --wf-* vars in styles/variables.css).
   *  Typed as string because content is sourced from JSON. */
  accent: string;
}

export interface WorkflowContent {
  /** Eyebrow, e.g. "How I work". */
  label: string;
  /** Ordered process steps rendered by the Workflow section. */
  stops: WorkflowStop[];
}

export interface ExperienceEntry {
  role: string;
  org: string;
  /** Engagement type, e.g. "Independent venture", "Full-time". */
  kind: string;
  /** Display period, e.g. "2024 — Present". */
  period: string;
  summary: string;
  /** Responsibility bullets (optional detail under the summary). */
  points?: string[];
  tags?: string[];
  /** true = sample/placeholder content awaiting real data. */
  placeholder?: boolean;
}

export interface CertificationEntry {
  name: string;
  issuer: string;
  year: string;
  placeholder?: boolean;
}

export interface EducationEntry {
  credential: string;
  institution: string;
  period: string;
  detail?: string;
  /** Coursework / focus bullets (optional detail under the card). */
  points?: string[];
  placeholder?: boolean;
}

/** A formal title or attached certificate carried by a credential, e.g. the
 *  RNCP state title that an ESGI degree confers. Rendered as a "certified as"
 *  line beneath the parent credential so it is never duplicated as its own row. */
export interface CredentialTitle {
  /** Title name, e.g. "Application & Software Solutions Developer". */
  label: string;
  /** Issuing reference / level, e.g. "RNCP Level 6" or "WebForce3". */
  ref: string;
}

/** Unified credential record for the /about Credentials ledger. Merges what
 *  used to live in separate `education` + `certifications` arrays so a degree
 *  and the state title it confers are ONE entry, not two. */
export interface CredentialEntry {
  /** Display period, e.g. "2024 → 2025" or "2023". */
  period: string;
  /** Programme / credential name. */
  credential: string;
  /** Institution, e.g. "ESGI · Paris". */
  institution: string;
  /** Type chip: "Degree" | "Course" | "Foundation". */
  kind: string;
  /** Optional status note, e.g. "In progress". */
  status?: string;
  /** Formal titles / attached certs conferred by this credential. */
  titles?: CredentialTitle[];
  /** Coursework / focus bullets. */
  points?: string[];
}

export interface AboutContent {
  /** Eyebrow / rotated meta-label, e.g. "About". */
  label: string;
  /** Verb-stack lines, rendered uppercase. The LAST entry carries the
   *  accent + spotlight-reveal treatment. */
  verbs: string[];
  /** Supporting lede paragraph. */
  lede: string;
  /** Meta row items, joined with middot separators. A item matching
   *  "Currently building TASKTROX" is rendered in the accent color. */
  meta: string[];
  /** Profile narrative paragraphs (may contain **bold** markup). */
  bio: string[];
  /** Dev note flagging placeholder CV data. */
  _cvNote?: string;
  /** Work history (newest first). */
  experience: ExperienceEntry[];
  /** Unified, de-duplicated credentials ledger (degrees + their titles +
   *  standalone courses) shown on the /about page. Newest first. */
  credentials: CredentialEntry[];
  /** @deprecated Legacy split arrays kept only for the unmounted home About
   *  exploration variants. The /about page reads `credentials` instead. */
  certifications: CertificationEntry[];
  /** @deprecated See `certifications`. */
  education: EducationEntry[];
}

export interface ServiceFace {
  word: string;
  rail: string;
  label: string;
  /**
   * Trusted HTML. Only the `<b>` tag is expected for inline emphasis. Rendered
   * via `dangerouslySetInnerHTML`; do NOT populate from any source other than
   * checked-in `content.json` without a sanitization pass.
   */
  copy: string;
  tools: string[];
}

export interface ServicesContent {
  label: string;
  headline: { lead: string; accent: string };
  /**
   * Trusted HTML. Only the `<b>` tag is expected. See `ServiceFace.copy`.
   */
  intro: string;
  faces: ServiceFace[];
}

export interface ArchiveContent {
  label: string;
  statement: string;
  highlights: string[];
  metaLeft: string;
  metaRight: string;
  cta: string;
  ctaHref: string;
}

export interface Project {
  id: string;
  title: string;
  image: string;
  year: string;
  category: string;
  badge: string;
  themeColor: string;
  badgeColor?: string;
  badgeTextColor?: string;
  badgeShadowColor?: string;
  /** When true, the project is shown in the home page Projects section. Order-independent. */
  featured?: boolean;
}

export interface ProjectsContent {
  label: string;
  items: Project[];
}

export interface WorksIndexProject {
  /** Matches the case-study slug when one exists (gates the TransitionLink). */
  id: string;
  /** Display title. Casing is canonical; presentation may lowercase it. */
  title: string;
  /** Comma- or interpunct-separated discipline string ("Brand · Product · Web"). */
  discipline: string;
  year: number;
  /** Hex color — must be a member of design-tokens.accentPalette. */
  accent: string;
  /** Marquee scroll duration in seconds (per-row cadence). */
  marqueeDurationSec: number;
}

export interface WorksIndexContent {
  topBar: { mark: string; breadcrumb: string; lastRevised: string };
  intro: { eyebrow: string; headline: string; lede: string };
  legend: { number: string; project: string; meta: string };
  end: { left: string; right: string };
  projects: WorksIndexProject[];
}

export interface ContactContent {
  row1: {
    greeting: string;
    recipient: string;
    afterName: string;
    between: string;
    nameLabel: string;
    countryLabel: string;
  };
  row2: { lead: string; options: string[] };
  row3: {
    lead: string;
    emailLabel: string;
    phoneLabel: string;
    options: string[];
    defaultSelected: string;
  };
  row4: { lead: string; label: string };
  submit: string;
  fallback: { label: string; email: string };
}

export interface Content {
  hero: HeroContent;
  skills: SkillsContent;
  welcomeScreen: WelcomeScreenContent;
  ui: UIContent;
  philosophy: PhilosophyContent;
  workflow: WorkflowContent;
  about: AboutContent;
  services: ServicesContent;
  projects: ProjectsContent;
  archive: ArchiveContent;
  worksIndex: WorksIndexContent;
  contact: ContactContent;
}

// ============================================
// Navigation Types
// ============================================
export interface NavLink {
  id: string;
  label: string;
  href: string;
  description: string;
}

export interface SocialLink {
  id: string;
  label: string;
  href: string;
  platform: string;
}

export interface Navigation {
  mainLinks: NavLink[];
  socialLinks: SocialLink[];
  location: string;
}

// ============================================
// Design Tokens Types
// ============================================
export interface ColorTokens {
  background: string;
  text: {
    primary: string;
    dark: string;
  };
  accent: {
    teal: string;
    gold: string;
    red: string;
    orange: string;
    green: string;
    black: string;
  };
  ui: {
    gridLine: string;
  };
  accentPalette: string[];
}

export interface TypographyTokens {
  families: {
    primary: string;
    navbar: string;
  };
  sizes: {
    hero: string;
    nav: string;
    tagline: string;
    menu: string;
    works: string;
    skills: string;
  };
  weights: {
    regular: number;
    medium: number;
    semibold: number;
    bold: number;
  };
}

export interface SpacingTokens {
  navTop: string;
  navSide: string;
}

export interface LayoutTokens {
  maxWidth: string;
  minHeight: string;
}

export interface BorderRadiusTokens {
  portrait: string;
  small: string;
  medium: string;
  large: string;
}

export interface ZIndexTokens {
  base: number;
  above: number;
  nav: number;
  modal: number;
  cursor: number;
}

export interface DesignTokens {
  colors: ColorTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  layout: LayoutTokens;
  borderRadius: BorderRadiusTokens;
  zIndex: ZIndexTokens;
}

// ============================================
// Animation Config Types
// ============================================
export interface DurationConfig {
  fast: number;
  normal: number;
  slow: number;
  slower: number;
  slowest: number;
}

export interface EasingConfig {
  gsap: {
    outExpo: string;
    outQuart: string;
    inOutQuart: string;
    outBack: string;
    inOutBack: string;
    outCubic: string;
    outQuad: string;
    inQuad: string;
  };
  css: {
    outExpo: string;
    outQuart: string;
    inOutQuart: string;
  };
}

export interface StaggerConfig {
  fast: number;
  normal: number;
  slow: number;
  letters: number;
  words: number;
}

export interface DelayConfig {
  short: number;
  medium: number;
  long: number;
}

export interface CaseStudyScrollTriggerConfig {
  early: string;
  mid: string;
  late: string;
}

export interface CaseStudyBlockFadeConfig {
  yShort: number;
  yMedium: number;
  yTall: number;
  durationShort: number;
  durationMedium: number;
  durationLong: number;
  ease: string;
}

export interface CaseStudyAnimationConfig {
  scrollTrigger: CaseStudyScrollTriggerConfig;
  blockFade: CaseStudyBlockFadeConfig;
}

export interface AnimationConfig {
  durations: DurationConfig;
  easing: EasingConfig;
  stagger: StaggerConfig;
  delays: DelayConfig;
  caseStudy: CaseStudyAnimationConfig;
}

// ============================================
// Feature Config Types
// ============================================
export interface CursorTrailConfig {
  count: number;
  sizes: number[];
  lerpFactors: number[];
  colors: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
}

export interface CursorBurstConfig {
  enabled: boolean;
  scale: number;
  duration: number;
}

export interface CustomCursorConfig {
  enabled: boolean;
  hideOnTouch: boolean;
  trail: CursorTrailConfig;
  burst: CursorBurstConfig;
}

export interface BackgroundGridConfig {
  spacing: number;
  plusSignSize: number;
  strokeWidth: number;
}

export interface BackgroundPhysicsConfig {
  mouseRadius: number;
  repulsionStrength: number;
  returnStrength: number;
  friction: number;
  maxVelocity: number;
}

export interface InteractiveBackgroundConfig {
  enabled: boolean;
  grid: BackgroundGridConfig;
  physics: BackgroundPhysicsConfig;
}

export interface WelcomeScreenConfig {
  enabled: boolean;
  skipOnReturn: boolean;
  storageKey: string;
}

export interface SmoothScrollConfig {
  enabled: boolean;
  lerp: number;
  duration: number;
  smoothWheel: boolean;
}

export interface MenuConfig {
  enabled: boolean;
  animateOnHover: boolean;
  showDescriptions: boolean;
}

export interface AccentColorConfig {
  enabled: boolean;
  defaultColorIndex: number;
  cssVariableName: string;
}

export interface BackToTopConfig {
  enabled: boolean;
  scrollThreshold: number;
  scrollDuration: number;
}

export interface Features {
  customCursor: CustomCursorConfig;
  interactiveBackground: InteractiveBackgroundConfig;
  welcomeScreen: WelcomeScreenConfig;
  smoothScroll: SmoothScrollConfig;
  menu: MenuConfig;
  accentColorRotation: AccentColorConfig;
  backToTop: BackToTopConfig;
}

// ============================================
// Case Study Types
// ============================================
export interface CaseStudyHeroContent {
  title: string;
  lede: string;
  image: string;
  alt: string;
  pills?: string[];
  badge?: string;
  year?: string;
  backHref?: string;
}

export interface LedgerEntry {
  label: string;
  primary: string;
  secondary: string;
}

export interface LedgerContent {
  entries: LedgerEntry[];
}

export interface ContextContent {
  label: string;
  facts: string[];
  body: string[];
}

export interface VisionContent {
  label: string;
  titleLine1: string;
  titleLine2: string;
  titleAccent: string;
  body: string[];
  /**
   * Optional: the exact word in titleLine1 to wrap in the underline span.
   * When omitted, the component falls back to underlining the last word of
   * titleLine1 (legacy position-based behaviour). Populate this field when
   * the emphasised word is not the last word in the string.
   */
  titleUnderlineWord?: string;
}

export interface PullLine {
  text: string;
  accent?: boolean;
}

export interface PullAttribution {
  name: string;
  role: string;
  location?: string;
}

export interface PullContent {
  attribution: PullAttribution;
  act2: PullLine[];
  act3: PullLine[];
}

export interface ProductContent {
  label: string;
  titleLine1: string;
  titleLine2: string;
  titleAccent: string;
  body: string[];
}

export interface DashboardContent {
  badge?: string;
  figcaption?: string;
  image: string;
  alt: string;
}

export interface ToggleScreen {
  num: string;
  name: string;
  image: string;
  color: string;
  description: string;
  meta: string;
  hasGalleryCaption?: boolean;
}

export interface ToggleContent {
  label: string;
  titleLine1: string;
  titleAccent: string;
  screens: ToggleScreen[];
}

export interface OutcomeMetric {
  value: string;
  unit?: string;
  title: string;
  caption: string;
}

export interface OutcomesContent {
  label: string;
  titleLine1: string;
  titleLine2: string;
  titleAccent: string;
  metrics: OutcomeMetric[];
}

export interface ArchitectureLayer {
  /** Layer name, e.g. "Client", "API", "Data", "Runtime". */
  name: string;
  /** Tech chips for the layer, e.g. ["Next.js", "Tailwind"]. */
  tech: string[];
  /** One-line description (supports inline <b> via renderInline). */
  detail: string;
}

export interface ArchitectureFact {
  value: string;
  unit?: string;
  title: string;
  caption: string;
}

export interface ArchitectureContent {
  label: string;
  titleLine1: string;
  titleAccent: string;
  /** Lead paragraph (supports inline <b>). */
  intro: string;
  layers: ArchitectureLayer[];
  facts: ArchitectureFact[];
}

export interface ColophonCredit {
  role: string;
  primary: string;
  secondary: string;
}

export interface ColophonAction {
  label: string;
  href?: string;
}

export interface ColophonContent {
  leftLabel: string;
  titleLine1: string;
  titleAccent: string;
  credits: ColophonCredit[];
  rightLabel: string;
  bio: string[];
  actions: ColophonAction[];
}

export interface NextCaseContent {
  slug: string;
  counter: string;
}

export interface CaseStudy {
  hero?: CaseStudyHeroContent;
  ledger?: LedgerContent;
  context?: ContextContent;
  vision?: VisionContent;
  pull?: PullContent;
  product?: ProductContent;
  dashboard?: DashboardContent;
  toggle?: ToggleContent;
  architecture?: ArchitectureContent;
  outcomes?: OutcomesContent;
  colophon?: ColophonContent;
  nextCase?: NextCaseContent;
}

export type CaseStudies = Record<string, CaseStudy>;

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

export interface TransitionsConfig {
  /** Registry key of the default page-transition effect. Must match a key in
   *  components/transitions/registry.ts (e.g. 'iris-bloom'). */
  defaultEffect: string;
  /** Fallback strategy when prefers-reduced-motion: reduce is active. */
  reducedMotionFallback: 'crossfade' | 'none';
  /** Duration (seconds) of the reduced-motion fallback. */
  reducedMotionDuration: number;
  /** Per-effect config namespace. Each effect reads its own block via its
   *  registry key, so adding an effect cannot break another effect's tuning.
   *  Shape of each value is effect-specific; the registry key is the source
   *  of truth for what is valid. */
  effects?: Record<string, Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// GitHub contributions (built at build time by scripts/fetch-contributions.mjs)
// ---------------------------------------------------------------------------

/** One day in the GitHub contribution heatmap. */
export interface ContributionCell {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /** Contribution count for the day. */
  count: number;
  /** GitHub intensity bucket, 0 (none) → 4 (most). */
  level: 0 | 1 | 2 | 3 | 4;
}

/** The full last-year contribution grid, arranged as Sun→Sat week columns.
 *  Leading/trailing padding days are `null` so the grid has clean empty
 *  corners like GitHub's. Sourced from data/github-contributions.json. */
export interface GithubContributions {
  username: string;
  /** Total contributions in the last year. */
  total: number;
  /** ISO date the file was generated. */
  generatedAt: string;
  /** Week columns; each is 7 entries (Sun→Sat), `null` for padding. */
  weeks: Array<Array<ContributionCell | null>>;
}

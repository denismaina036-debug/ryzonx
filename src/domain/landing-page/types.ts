export type LandingStatMode = "manual" | "automatic";

export type LandingAutomaticStatKey =
  | "total_investors"
  | "verified_pool_managers"
  | "active_pools"
  | "completed_cycles"
  | "total_capital"
  | "total_pool_value"
  | "active_investors"
  | "daily_roi"
  | "monthly_roi"
  | "win_rate"
  | "closed_trades"
  | "average_investment"
  | "largest_investment"
  | "average_roi"
  | "total_deposits"
  | "total_withdrawals";

export type LandingStatIcon =
  | "TrendingUp"
  | "Users"
  | "BarChart3"
  | "Target"
  | "Activity"
  | "Wallet"
  | "Crown"
  | "ArrowDownToLine"
  | "ArrowUpFromLine"
  | "Landmark"
  | "LineChart"
  | "Shield";

export interface LandingStatItem {
  id: string;
  title: string;
  mode: LandingStatMode;
  manualValue?: string;
  automaticKey?: LandingAutomaticStatKey;
  icon: LandingStatIcon;
}

export interface LandingHeroFloatingStat extends LandingStatItem {
  changeType?: "positive" | "negative" | "neutral";
}

export interface LandingHeroContent {
  badge: string;
  heading: string;
  subheading: string;
  description: string;
  primaryButtonText: string;
  primaryButtonLink: string;
  secondaryButtonText: string;
  secondaryButtonLink: string;
  backgroundImageUrl: string;
  illustrationImageUrl: string;
  videoUrl: string;
  trustBanner: string;
  showTrustTicker: boolean;
  floatingStats: LandingHeroFloatingStat[];
}

export interface LandingSectionHeader {
  badge: string;
  title: string;
  description: string;
}

export interface LandingLinkItem {
  label: string;
  href: string;
}

export interface LandingFeatureCard {
  id: string;
  icon: LandingStatIcon;
  title: string;
  description: string;
}

export interface LandingHowItWorksStep {
  step: number;
  icon: LandingStatIcon;
  title: string;
  description: string;
}

export interface LandingSocialLinks {
  facebook: string;
  instagram: string;
  twitter: string;
  linkedin: string;
  telegram: string;
  youtube: string;
  discord: string;
}

export interface LandingContactInfo {
  companyName: string;
  supportEmail: string;
  generalEmail: string;
  phone: string;
  whatsapp: string;
  officeAddress: string;
  country: string;
  businessHours: string;
  googleMapsUrl: string;
}

export interface LandingFooterContent {
  aboutText: string;
  companyDescription: string;
  copyrightText: string;
  disclaimerText: string;
  logoUrl: string;
  quickLinks: LandingLinkItem[];
  legalLinks: LandingLinkItem[];
  newsletterTitle: string;
  newsletterDescription: string;
  ctaText: string;
  ctaLink: string;
}

export interface LandingSeoContent {
  title: string;
  description: string;
  keywords: string;
  openGraphImageUrl: string;
  socialPreviewImageUrl: string;
  faviconUrl: string;
}

export interface LandingSectionVisibility {
  hero: boolean;
  performance: boolean;
  journal: boolean;
  recentActivity: boolean;
  statistics: boolean;
  howItWorks: boolean;
  whyRyvonx: boolean;
  testimonials: boolean;
  faq: boolean;
  contact: boolean;
  ctaBanner: boolean;
}

export interface LandingSectionCopy {
  performance: LandingSectionHeader;
  journal: LandingSectionHeader & { viewAllLabel: string };
  recentActivity: LandingSectionHeader & {
    investmentsColumnTitle: string;
    payoutsColumnTitle: string;
    viewAllLabel: string;
  };
  statistics: LandingSectionHeader;
  howItWorks: LandingSectionHeader;
  whyRyvonx: LandingSectionHeader;
  testimonials: LandingSectionHeader;
  faq: LandingSectionHeader & { viewAllLabel: string };
  contact: LandingSectionHeader;
  ctaBanner: LandingSectionHeader & {
    primaryButtonText: string;
    primaryButtonLink: string;
    secondaryButtonText: string;
    secondaryButtonLink: string;
  };
}

export interface LandingPageContent {
  hero: LandingHeroContent;
  heroStats: LandingHeroFloatingStat[];
  statistics: LandingStatItem[];
  contact: LandingContactInfo;
  social: LandingSocialLinks;
  footer: LandingFooterContent;
  sections: LandingSectionVisibility;
  copy: LandingSectionCopy;
  howItWorksSteps: LandingHowItWorksStep[];
  whyRyvonxFeatures: LandingFeatureCard[];
  seo: LandingSeoContent;
}

export interface ResolvedLandingStat extends LandingStatItem {
  resolvedValue: string;
  changeType?: "positive" | "negative" | "neutral";
}

/** Landing CMS content with resolved stat values for public pages. */
export interface PublicLandingPageContent extends Omit<LandingPageContent, "heroStats" | "statistics"> {
  heroStats: ResolvedLandingStat[];
  statistics: ResolvedLandingStat[];
}

export type LandingInvestmentActivityType =
  | "pool_join"
  | "deposit"
  | "withdrawal"
  | "investment_confirmed"
  | "pool_settlement"
  | "profit_distribution";

export interface LandingInvestmentActivity {
  id: string;
  displayName: string;
  amount: number;
  createdAt: string;
  activityType: LandingInvestmentActivityType;
  poolName: string | null;
  subtitle: string;
}

import { ROUTES } from "@/constants/routes";
import { registerRoute, REGISTRATION_INTENTS } from "@/constants/registration";
import { APP_NAME } from "@/constants/routes";
import type { LandingPageContent } from "@/domain/landing-page/types";

export const DEFAULT_LANDING_PAGE_CONTENT: LandingPageContent = {
  hero: {
    badge: "Transparent Pool Trading Fund",
    heading: "Where Great Traders Meet Smart Investors.",
    subheading: "",
    description:
      "RyvonX is a trusted marketplace where skilled traders earn the opportunity to manage investment pools, while investors discover and invest alongside verified trading professionals.",
    primaryButtonText: "Join Pool",
    primaryButtonLink: registerRoute(REGISTRATION_INTENTS.JOIN_POOL),
    secondaryButtonText: "Create Pool",
    secondaryButtonLink: registerRoute(REGISTRATION_INTENTS.CREATE_POOL),
    backgroundImageUrl: "/images/hero-cover.png",
    illustrationImageUrl: "",
    videoUrl: "",
    trustBanner: "",
    showTrustTicker: true,
    floatingStats: [],
  },
  heroStats: [
    { id: "hs1", title: "Total Pool Value", mode: "automatic", automaticKey: "total_pool_value", icon: "TrendingUp", valueFormat: "currency" },
    { id: "hs2", title: "Active Investors", mode: "automatic", automaticKey: "active_investors", icon: "Users", valueFormat: "number" },
    { id: "hs3", title: "Today's ROI", mode: "automatic", automaticKey: "daily_roi", icon: "BarChart3", changeType: "positive", valueFormat: "percentage" },
    { id: "hs4", title: "Monthly ROI", mode: "automatic", automaticKey: "monthly_roi", icon: "Activity", changeType: "positive", valueFormat: "percentage" },
    { id: "hs5", title: "Win Rate", mode: "automatic", automaticKey: "win_rate", icon: "Target", valueFormat: "percentage" },
    { id: "hs6", title: "Closed Trades", mode: "automatic", automaticKey: "closed_trades", icon: "BarChart3", valueFormat: "number" },
  ],
  statistics: [
    { id: "s1", title: "Total Investors", mode: "automatic", automaticKey: "total_investors", icon: "Users", valueFormat: "number" },
    { id: "s2", title: "Average Investment", mode: "automatic", automaticKey: "average_investment", icon: "Wallet", valueFormat: "currency" },
    { id: "s3", title: "Largest Investment", mode: "automatic", automaticKey: "largest_investment", icon: "Crown", valueFormat: "currency" },
    { id: "s4", title: "Average ROI", mode: "automatic", automaticKey: "average_roi", icon: "TrendingUp", valueFormat: "percentage" },
    { id: "s5", title: "Total Deposits", mode: "automatic", automaticKey: "total_deposits", icon: "ArrowDownToLine", valueFormat: "currency" },
    { id: "s6", title: "Total Withdrawals", mode: "automatic", automaticKey: "total_withdrawals", icon: "ArrowUpFromLine", valueFormat: "currency" },
  ],
  contact: {
    companyName: APP_NAME,
    supportEmail: "hello@ryvonx.com",
    generalEmail: "hello@ryvonx.com",
    phone: "+1 (555) 000-0000",
    whatsapp: "",
    officeAddress: "100 Financial District\nNew York, NY 10005",
    country: "United States",
    businessHours: "Mon–Fri, 9:00 AM – 6:00 PM EST",
    googleMapsUrl: "",
  },
  social: {
    facebook: "",
    instagram: "",
    twitter: "",
    linkedin: "",
    telegram: "",
    youtube: "",
    discord: "",
  },
  footer: {
    aboutText: APP_NAME,
    companyDescription:
      "A transparent, professionally managed pool trading fund. Verify performance before you invest.",
    copyrightText: `© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.`,
    disclaimerText:
      "Investing involves risk. Past performance does not guarantee future results.",
    logoUrl: "/images/logo.png",
    quickLinks: [
      { label: "Performance", href: ROUTES.performance },
      { label: "Trading Journal", href: ROUTES.journal },
      { label: "Investors", href: ROUTES.investors },
      { label: "How It Works", href: ROUTES.howItWorks },
      { label: "FAQ", href: ROUTES.faq },
      { label: "Contact", href: ROUTES.contact },
    ],
    legalLinks: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
    newsletterTitle: "",
    newsletterDescription: "",
    ctaText: "",
    ctaLink: "",
  },
  sections: {
    hero: true,
    performance: true,
    journal: true,
    recentActivity: true,
    statistics: true,
    howItWorks: true,
    whyRyvonx: true,
    testimonials: true,
    faq: true,
    contact: true,
    ctaBanner: false,
  },
  copy: {
    performance: {
      badge: "Performance",
      title: "Pool Performance History",
      description:
        "Track the fund's growth over time. All data is updated in real-time and fully transparent.",
    },
    journal: {
      badge: "Trading Journal",
      title: "Latest Published Trades",
      description: "Every trade is verified and published for full transparency.",
      viewAllLabel: "View Full Journal",
    },
    recentActivity: {
      badge: "Live Activity",
      title: "Recent Investment Activity",
      description: "Real investment activity across the platform. Names are anonymized for privacy.",
      investmentsColumnTitle: "Recent Investments",
      payoutsColumnTitle: "Recent Payouts",
      viewAllLabel: "View all activity",
    },
    statistics: {
      badge: "Investors",
      title: "Fund Statistics",
      description: "Anonymized aggregate data about our investor community.",
    },
    howItWorks: {
      badge: "How It Works",
      title: "Four Simple Steps",
      description:
        "From account creation to profit tracking — a straightforward investment process.",
    },
    whyRyvonx: {
      badge: "Why Ryvonx",
      title: "Built on Trust & Transparency",
      description:
        "Everything we do reinforces our core values: transparency, trust, professionalism, and long-term growth.",
    },
    testimonials: {
      badge: "Testimonials",
      title: "What Our Investors Say",
      description: "Hear from members of the Ryvonx community.",
    },
    faq: {
      badge: "FAQ",
      title: "Frequently Asked Questions",
      description: "Everything you need to know about investing with Ryvonx.",
      viewAllLabel: "View All FAQ",
    },
    contact: {
      badge: "Contact",
      title: "Get in Touch",
      description: "Have questions about Ryvonx? We'd love to hear from you.",
    },
    ctaBanner: {
      badge: "Get Started",
      title: "Ready to invest with transparency?",
      description: "Join verified pools managed by professional traders.",
      primaryButtonText: "Join Pool",
      primaryButtonLink: registerRoute(REGISTRATION_INTENTS.JOIN_POOL),
      secondaryButtonText: "Browse Marketplace",
      secondaryButtonLink: ROUTES.marketplace,
    },
  },
  howItWorksSteps: [
    {
      step: 1,
      icon: "Users",
      title: "Create Account",
      description: "Sign up in minutes with email verification. No complex onboarding.",
    },
    {
      step: 2,
      icon: "ArrowDownToLine",
      title: "Deposit Funds",
      description: "Transfer your investment amount. Minimum deposit starts at $100.",
    },
    {
      step: 3,
      icon: "Users",
      title: "Join the Pool",
      description: "Once approved, you receive proportional ownership in the trading pool.",
    },
    {
      step: 4,
      icon: "LineChart",
      title: "Track & Withdraw",
      description: "Monitor performance in real-time and request withdrawals anytime.",
    },
  ],
  whyRyvonxFeatures: [
    { id: "f1", icon: "BarChart3", title: "Transparent Trading Journal", description: "Every closed trade published with full details." },
    { id: "f2", icon: "Shield", title: "Professional Fund Management", description: "Experienced team managing the pool strategy." },
    { id: "f3", icon: "BarChart3", title: "Visible Performance History", description: "Complete historical data available to all visitors." },
    { id: "f4", icon: "Users", title: "Community Investment Pool", description: "Join a collective of verified investors." },
    { id: "f5", icon: "Shield", title: "Secure Investor Portal", description: "Bank-grade encryption and Row Level Security." },
    { id: "f6", icon: "Target", title: "Manual Trade Verification", description: "All trades reviewed before publication." },
    { id: "f7", icon: "Activity", title: "Real-Time Performance Updates", description: "Live pool value and ROI metrics." },
  ],
  seo: {
    title: APP_NAME,
    description:
      "RyvonX is a trusted marketplace where skilled traders manage investment pools and investors discover verified trading professionals.",
    keywords: "pool trading, investment pools, forex, trading fund, RyvonX",
    openGraphImageUrl: "/images/og-image.png",
    socialPreviewImageUrl: "/images/og-image.png",
    faviconUrl: "/favicon.ico",
  },
};

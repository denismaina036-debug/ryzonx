export const APP_NAME = "Ryvonx" as const;

export const APP_DESCRIPTION =
  "A transparent pool trading fund management platform. Invest in a professionally managed trading pool with full visibility into performance." as const;

export const ROUTES = {
  // Public
  home: "/",
  performance: "/performance",
  journal: "/journal",
  investors: "/investors",
  howItWorks: "/how-it-works",
  faq: "/faq",
  contact: "/contact",
  about: "/about",
  activity: "/activity",
  transparency: "/investors",
  marketplace: "/marketplace",
  marketplaceStrategies: "/marketplace/strategies",
  marketplaceCycles: "/marketplace/cycles",
  managers: "/managers",

  // Auth
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  verifyEmail: "/verify-email",

  // Investor (protected)
  dashboard: "/dashboard",
  /** Investor portfolio — cycle commitments + legacy holdings */
  portfolio: "/dashboard/portfolio",
  deposits: "/dashboard/deposits",
  deposit: "/dashboard/deposits",
  pools: "/dashboard/pools",
  withdraw: "/dashboard/withdrawals",
  withdrawals: "/dashboard/withdrawals",
  transactions: "/dashboard/transactions",
  investments: "/dashboard/investments",
  trades: "/dashboard/trades",
  /** @deprecated Removed from nav — redirects to dashboard */
  statements: "/dashboard/statements",
  notifications: "/dashboard/notifications",
  settings: "/dashboard/settings",
  support: "/dashboard/support",
  challenge: "/dashboard/challenge",
  managerJourney: "/dashboard/manager-journey",

  // Pool Manager application & dashboard
  applyPoolManager: "/apply/pool-manager",
  poolManager: "/pool-manager",
  poolManagerStrategies: "/pool-manager/strategies",
  poolManagerInvestmentCycles: "/pool-manager/investment-cycles",
  poolManagerPerformance: "/pool-manager/performance",
  poolManagerPools: "/pool-manager/pools",
  poolManagerInvestors: "/pool-manager/investors",
  poolManagerAnalytics: "/pool-manager/analytics",
  poolManagerJournal: "/pool-manager/journal",
  poolManagerNotifications: "/pool-manager/notifications",
  poolManagerSettings: "/pool-manager/settings",
  poolManagerProfile: "/pool-manager/profile",
  poolManagerFinance: "/pool-manager/finance",
  managerPublicProfile: "/managers",

  // Admin (protected)
  admin: "/admin",
  adminFunds: "/admin/funds",
  adminInvestors: "/admin/investors",
  adminInvestments: "/admin/investments",
  adminTrades: "/admin/trades",
  adminChallenge: "/admin/pool-managers/challenges",
  adminJournal: "/admin/journal",
  /** Finance department */
  adminFinance: "/admin/finance",
  adminFinanceDeposits: "/admin/finance/deposits/pending",
  adminFinanceWithdrawals: "/admin/finance/withdrawals/pending",
  adminFinanceWallets: "/admin/finance/wallets",
  adminFinanceOperations: "/admin/finance/operations",
  /** @deprecated — redirects to finance routes */
  adminDeposits: "/admin/deposits",
  /** @deprecated — redirects to finance routes */
  adminCryptoWallets: "/admin/crypto-wallets",
  /** @deprecated — redirects to finance routes */
  adminWithdrawals: "/admin/withdrawals",
  /** Pool Managers department */
  adminPoolManagers: "/admin/pool-managers",
  adminPoolManagersApplications: "/admin/pool-managers/applications/pending",
  adminPoolManagersManagers: "/admin/pool-managers/managers",
  adminPoolManagersChallenges: "/admin/pool-managers/challenges",
  adminChallengeReview: "/admin/pool-managers/challenge-review",
  adminPoolManagersDevelopment: "/admin/pool-managers/development",
  adminPoolManagersAchievements: "/admin/pool-managers/achievements",
  adminPoolManagersContent: "/admin/pool-managers/content",
  adminPerformance: "/admin/performance",
  adminRatingConfiguration: "/admin/rating-configuration",
  adminSnapshots: "/admin/snapshots",
  adminTransactions: "/admin/transactions",
  adminSupport: "/admin/support",
  adminAnnouncements: "/admin/announcements",
  adminTestimonials: "/admin/testimonials",
  adminFaq: "/admin/faq",
  adminPages: "/admin/pages",
  adminReports: "/admin/reports",
  adminSettings: "/admin/settings",
  adminAuditLogs: "/admin/audit-logs",
  adminUsers: "/admin/users",
  adminProfile: "/admin/profile",
  /** @deprecated — redirects to pool-managers routes */
  adminPoolManagerApplications: "/admin/pool-manager-applications",
  adminGovernance: "/admin/governance",
  adminGovernanceRules: "/admin/governance/rules",
  adminGovernanceViolations: "/admin/governance/violations",
  adminGovernanceReports: "/admin/governance/reports",
  /** Administration & Governance workspace */
  adminStrategies: "/admin/strategies",
  adminInvestmentCycles: "/admin/investment-cycles",
  adminManagers: "/admin/managers",
  adminCapitalAllocation: "/admin/capital-allocation",
  adminCapitalHistory: "/admin/capital-allocation/history",
  /** @deprecated — redirects to pool-managers routes */
  adminManagerDevelopment: "/admin/manager-development",
  /** @deprecated — redirects to pool-managers routes */
  adminAchievements: "/admin/achievements",
  /** @deprecated — redirects to pool-managers routes */
  adminPoolContent: "/admin/pool-content",
  adminCapitalReports: "/admin/capital-allocation/reports",
  adminCommunicationTemplates: "/admin/communication/templates",
  adminCommunicationDashboard: "/admin/communication",
  adminCommunicationInbox: "/admin/communication/inbox",
  adminCommunicationOutbox: "/admin/communication/outbox",
  adminCommunicationBuilder: "/admin/communication/templates/builder",
  adminCommunicationBroadcasts: "/admin/communication/broadcasts",
  adminCommunicationAnnouncements: "/admin/communication/announcements",
  adminCommunicationSupport: "/admin/communication/support",
  adminCommunicationCampaigns: "/admin/communication/campaigns",
  adminCommunicationHistory: "/admin/communication/history",
  adminCommunicationAnalytics: "/admin/communication/analytics",
  adminCommunicationSettings: "/admin/communication/settings",
  adminCommunicationSearch: "/admin/communication/search",
  adminAutomation: "/admin/automation",
  adminAutomationEvents: "/admin/automation/events",
  adminAutomationRules: "/admin/automation/rules",
  adminAutomationWebhooks: "/admin/automation/webhooks",
  adminAutomationQueue: "/admin/automation/queue",
  adminAutomationNotifications: "/admin/automation/notifications",
  poolManagerDevelopment: "/pool-manager/development",
  poolManagerContent: "/pool-manager/content",
  /** @deprecated Use adminPerformance */
  adminPool: "/admin/performance",
} as const;

export type RouteKey = keyof typeof ROUTES;
export type RoutePath = (typeof ROUTES)[RouteKey];

export type FinanceTransactionStatus = "pending" | "approved" | "rejected" | "all";
export type PoolManagerApplicationFilter = "pending" | "approved" | "rejected" | "all";

export function adminFinanceDepositsPath(status: FinanceTransactionStatus = "pending") {
  return `/admin/finance/deposits/${status}`;
}

export function adminFinanceWithdrawalsPath(status: FinanceTransactionStatus = "pending") {
  return `/admin/finance/withdrawals/${status}`;
}

export function adminPoolManagersApplicationsPath(status: PoolManagerApplicationFilter = "pending") {
  return `/admin/pool-managers/applications/${status}`;
}

export function adminChallengeReviewPath(enrollmentId: string) {
  return `/admin/pool-managers/challenge-review/${enrollmentId}`;
}

export const PUBLIC_ROUTES: RoutePath[] = [
  ROUTES.home,
  ROUTES.performance,
  ROUTES.journal,
  ROUTES.investors,
  ROUTES.howItWorks,
  ROUTES.faq,
  ROUTES.contact,
  ROUTES.about,
  ROUTES.activity,
  ROUTES.marketplace,
  ROUTES.marketplaceStrategies,
  ROUTES.marketplaceCycles,
  ROUTES.managers,
  ROUTES.login,
  ROUTES.register,
  ROUTES.forgotPassword,
  ROUTES.resetPassword,
  ROUTES.verifyEmail,
];

export const INVESTOR_ROUTES: RoutePath[] = [
  ROUTES.dashboard,
  ROUTES.portfolio,
  ROUTES.deposits,
  ROUTES.pools,
  ROUTES.withdrawals,
  ROUTES.transactions,
  ROUTES.investments,
  ROUTES.trades,
  ROUTES.notifications,
  ROUTES.settings,
  ROUTES.support,
  ROUTES.challenge,
  ROUTES.managerJourney,
];

export const ADMIN_ROUTES: RoutePath[] = [
  ROUTES.admin,
  ROUTES.adminFunds,
  ROUTES.adminInvestors,
  ROUTES.adminInvestments,
  ROUTES.adminTrades,
  ROUTES.adminChallenge,
  ROUTES.adminJournal,
  ROUTES.adminFinance,
  ROUTES.adminFinanceDeposits,
  ROUTES.adminFinanceWithdrawals,
  ROUTES.adminFinanceWallets,
  ROUTES.adminDeposits,
  ROUTES.adminCryptoWallets,
  ROUTES.adminWithdrawals,
  ROUTES.adminPoolManagers,
  ROUTES.adminPoolManagersApplications,
  ROUTES.adminPoolManagersManagers,
  ROUTES.adminPoolManagersChallenges,
  ROUTES.adminPoolManagersDevelopment,
  ROUTES.adminPoolManagersAchievements,
  ROUTES.adminPoolManagersContent,
  ROUTES.adminPerformance,
  ROUTES.adminSnapshots,
  ROUTES.adminTransactions,
  ROUTES.adminSupport,
  ROUTES.adminAnnouncements,
  ROUTES.adminTestimonials,
  ROUTES.adminFaq,
  ROUTES.adminPages,
  ROUTES.adminReports,
  ROUTES.adminSettings,
  ROUTES.adminAuditLogs,
  ROUTES.adminUsers,
  ROUTES.adminProfile,
  ROUTES.adminPoolManagerApplications,
  ROUTES.adminGovernance,
  ROUTES.adminGovernanceRules,
  ROUTES.adminGovernanceViolations,
  ROUTES.adminGovernanceReports,
  ROUTES.adminStrategies,
  ROUTES.adminInvestmentCycles,
  ROUTES.adminManagers,
  ROUTES.adminCapitalAllocation,
  ROUTES.adminCapitalHistory,
  ROUTES.adminManagerDevelopment,
  ROUTES.adminAchievements,
  ROUTES.adminPoolContent,
  ROUTES.adminCapitalReports,
  ROUTES.adminCommunicationDashboard,
  ROUTES.adminCommunicationInbox,
  ROUTES.adminCommunicationOutbox,
  ROUTES.adminCommunicationTemplates,
  ROUTES.adminCommunicationBuilder,
  ROUTES.adminCommunicationBroadcasts,
  ROUTES.adminCommunicationAnnouncements,
  ROUTES.adminCommunicationSupport,
  ROUTES.adminCommunicationCampaigns,
  ROUTES.adminCommunicationHistory,
  ROUTES.adminCommunicationAnalytics,
  ROUTES.adminCommunicationSettings,
  ROUTES.adminCommunicationSearch,
  ROUTES.adminAutomation,
  ROUTES.adminAutomationEvents,
  ROUTES.adminAutomationRules,
  ROUTES.adminAutomationWebhooks,
  ROUTES.adminAutomationQueue,
  ROUTES.adminAutomationNotifications,
];

export const POOL_MANAGER_ROUTES: RoutePath[] = [
  ROUTES.poolManager,
  ROUTES.poolManagerStrategies,
  ROUTES.poolManagerInvestmentCycles,
  ROUTES.poolManagerPerformance,
  ROUTES.poolManagerPools,
  ROUTES.poolManagerInvestors,
  ROUTES.poolManagerAnalytics,
  ROUTES.poolManagerJournal,
  ROUTES.poolManagerNotifications,
  ROUTES.poolManagerSettings,
  ROUTES.poolManagerProfile,
  ROUTES.poolManagerFinance,
  ROUTES.poolManagerDevelopment,
  ROUTES.poolManagerContent,
];

export const AUTH_ROUTES: RoutePath[] = [
  ROUTES.login,
  ROUTES.register,
  ROUTES.forgotPassword,
  ROUTES.resetPassword,
  ROUTES.verifyEmail,
];

export const QUERY_KEYS = {
  fund: {
    all: ["fund"] as const,
    default: ["fund", "default"] as const,
    stats: (fundId: string) => ["fund", fundId, "stats"] as const,
    performance: (fundId: string, period: string) =>
      ["fund", fundId, "performance", period] as const,
    trades: (fundId: string) => ["fund", fundId, "trades"] as const,
    activity: (fundId: string) => ["fund", fundId, "activity"] as const,
    investors: (fundId: string) => ["fund", fundId, "investors"] as const,
  },
  pool: {
    all: ["pool"] as const,
    stats: ["pool", "stats"] as const,
    performance: ["pool", "performance"] as const,
    trades: ["pool", "trades"] as const,
    journal: ["pool", "journal"] as const,
  },
  investor: {
    all: ["investor"] as const,
    profile: ["investor", "profile"] as const,
    portfolio: ["investor", "portfolio"] as const,
    transactions: ["investor", "transactions"] as const,
    notifications: ["investor", "notifications"] as const,
  },
  admin: {
    all: ["admin"] as const,
    dashboard: ["admin", "dashboard"] as const,
    funds: ["admin", "funds"] as const,
    investors: ["admin", "investors"] as const,
    investments: ["admin", "investments"] as const,
    deposits: ["admin", "deposits"] as const,
    withdrawals: ["admin", "withdrawals"] as const,
    trades: ["admin", "trades"] as const,
    journal: ["admin", "journal"] as const,
    performance: ["admin", "performance"] as const,
    snapshots: ["admin", "snapshots"] as const,
    transactions: ["admin", "transactions"] as const,
    announcements: ["admin", "announcements"] as const,
    testimonials: ["admin", "testimonials"] as const,
    faq: ["admin", "faq"] as const,
    pages: ["admin", "pages"] as const,
    reports: ["admin", "reports"] as const,
    settings: ["admin", "settings"] as const,
    auditLogs: ["admin", "audit-logs"] as const,
    governance: ["admin", "governance"] as const,
    users: ["admin", "users"] as const,
  },
  public: {
    stats: ["public", "stats"] as const,
    recentActivity: ["public", "recent-activity"] as const,
    faq: ["public", "faq"] as const,
  },
} as const;

export const STALE_TIMES = {
  realtime: 30 * 1000,
  standard: 5 * 60 * 1000,
  static: 30 * 60 * 1000,
} as const;

export const PAGINATION = {
  defaultPageSize: 20,
  maxPageSize: 100,
} as const;

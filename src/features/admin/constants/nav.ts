import {
  LayoutDashboard,
  Landmark,
  Users,
  Wallet,
  TrendingUp,
  BookOpen,
  LineChart,
  Camera,
  Receipt,
  Megaphone,
  MessageSquareQuote,
  HelpCircle,
  FileText,
  FileBarChart,
  Settings,
  ScrollText,
  UserCog,
  Headphones,
  User,
  Shield,
  AlertTriangle,
  Banknote,
  History,
  Radio,
  Inbox,
  ArrowDownToLine,
  ArrowUpFromLine,
  Bitcoin,
  Briefcase,
  Trophy,
  Award,
  FileEdit,
  type LucideIcon,
} from "lucide-react";
import {
  ROUTES,
  adminFinanceDepositsPath,
  adminFinanceWithdrawalsPath,
  adminPoolManagersApplicationsPath,
} from "@/constants/routes";

export type AdminBadgeKey =
  | "pendingDeposits"
  | "pendingWithdrawals"
  | "pendingApplications";

export interface AdminNavLink {
  label: string;
  href: string;
  icon: LucideIcon;
  badgeKey?: AdminBadgeKey;
  matchPrefix?: string;
}

export interface AdminNavDepartment {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  items: AdminNavLink[];
}

export type AdminNavEntry =
  | { type: "link"; link: AdminNavLink }
  | { type: "department"; department: AdminNavDepartment };

export interface AdminNavSection {
  title?: string;
  entries: AdminNavEntry[];
}

export const ADMIN_DEPARTMENTS: AdminNavDepartment[] = [
  {
    id: "finance",
    label: "Finance",
    icon: Briefcase,
    href: ROUTES.adminFinance,
    items: [
      {
        label: "Overview",
        href: ROUTES.adminFinance,
        icon: LayoutDashboard,
      },
      {
        label: "Deposits",
        href: adminFinanceDepositsPath("pending"),
        icon: ArrowDownToLine,
        badgeKey: "pendingDeposits",
        matchPrefix: "/admin/finance/deposits",
      },
      {
        label: "Withdrawals",
        href: adminFinanceWithdrawalsPath("pending"),
        icon: ArrowUpFromLine,
        badgeKey: "pendingWithdrawals",
        matchPrefix: "/admin/finance/withdrawals",
      },
      {
        label: "Crypto Wallets",
        href: ROUTES.adminFinanceWallets,
        icon: Bitcoin,
      },
      {
        label: "Operations Center",
        href: ROUTES.adminFinanceOperations,
        icon: Receipt,
        matchPrefix: "/admin/finance/operations",
      },
    ],
  },
  {
    id: "pool-managers",
    label: "Pool Managers",
    icon: UserCog,
    href: ROUTES.adminPoolManagers,
    items: [
      {
        label: "Overview",
        href: ROUTES.adminPoolManagers,
        icon: LayoutDashboard,
      },
      {
        label: "Applications",
        href: adminPoolManagersApplicationsPath("pending"),
        icon: FileText,
        badgeKey: "pendingApplications",
        matchPrefix: "/admin/pool-managers/applications",
      },
      {
        label: "Active Managers",
        href: ROUTES.adminPoolManagersManagers,
        icon: Users,
      },
      {
        label: "Challenges",
        href: ROUTES.adminPoolManagersChallenges,
        icon: Trophy,
      },
      {
        label: "Development",
        href: ROUTES.adminPoolManagersDevelopment,
        icon: TrendingUp,
        matchPrefix: "/admin/pool-managers/development",
      },
      {
        label: "Achievements",
        href: ROUTES.adminPoolManagersAchievements,
        icon: Award,
      },
      {
        label: "Content Approval",
        href: ROUTES.adminPoolManagersContent,
        icon: FileEdit,
      },
    ],
  },
];

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    entries: [
      {
        type: "link",
        link: { label: "Operations Center", href: ROUTES.admin, icon: LayoutDashboard },
      },
    ],
  },
  {
    title: "Administration",
    entries: [
      { type: "link", link: { label: "Pool Review", href: ROUTES.adminFunds, icon: Landmark, matchPrefix: "/admin/funds" } },
    ],
  },
  {
    entries: ADMIN_DEPARTMENTS.map((department) => ({
      type: "department" as const,
      department,
    })),
  },
  {
    title: "Funds & Capital",
    entries: [
      { type: "link", link: { label: "Pool Review", href: ROUTES.adminFunds, icon: Landmark, matchPrefix: "/admin/funds" } },
      { type: "link", link: { label: "Investors", href: ROUTES.adminInvestors, icon: Users } },
      { type: "link", link: { label: "Investments", href: ROUTES.adminInvestments, icon: Wallet } },
      {
        type: "link",
        link: { label: "Capital Allocation", href: ROUTES.adminCapitalAllocation, icon: Banknote },
      },
      {
        type: "link",
        link: { label: "Allocation History", href: ROUTES.adminCapitalHistory, icon: History },
      },
      {
        type: "link",
        link: { label: "Capital Reports", href: ROUTES.adminCapitalReports, icon: FileBarChart },
      },
    ],
  },
  {
    title: "Governance",
    entries: [
      { type: "link", link: { label: "Governance Center", href: ROUTES.adminGovernance, icon: Shield, matchPrefix: "/admin/governance" } },
      { type: "link", link: { label: "Pool Rules", href: ROUTES.adminGovernanceRules, icon: Shield } },
      {
        type: "link",
        link: {
          label: "Violations & Reviews",
          href: ROUTES.adminGovernanceViolations,
          icon: AlertTriangle,
        },
      },
      {
        type: "link",
        link: { label: "Reports", href: ROUTES.adminGovernanceReports, icon: FileBarChart },
      },
    ],
  },
  {
    title: "Trading",
    entries: [
      { type: "link", link: { label: "Trades", href: ROUTES.adminTrades, icon: TrendingUp } },
      { type: "link", link: { label: "Trading Journal", href: ROUTES.adminJournal, icon: BookOpen } },
      { type: "link", link: { label: "Performance Intelligence", href: ROUTES.adminPerformance, icon: LineChart } },
      { type: "link", link: { label: "Rating Configuration", href: ROUTES.adminRatingConfiguration, icon: LineChart } },
      { type: "link", link: { label: "Daily Snapshots", href: ROUTES.adminSnapshots, icon: Camera } },
    ],
  },
  {
    title: "Content",
    entries: [
      { type: "link", link: { label: "Transactions", href: ROUTES.adminTransactions, icon: Receipt } },
      { type: "link", link: { label: "Announcements", href: ROUTES.adminAnnouncements, icon: Megaphone } },
      {
        type: "link",
        link: { label: "Testimonials", href: ROUTES.adminTestimonials, icon: MessageSquareQuote },
      },
      { type: "link", link: { label: "FAQ", href: ROUTES.adminFaq, icon: HelpCircle } },
      { type: "link", link: { label: "Pages", href: ROUTES.adminPages, icon: FileText } },
      { type: "link", link: { label: "Reports", href: ROUTES.adminReports, icon: FileBarChart } },
    ],
  },
  {
    title: "Communication",
    entries: [
      {
        type: "link",
        link: { label: "Dashboard", href: ROUTES.adminCommunicationDashboard, icon: Radio },
      },
      { type: "link", link: { label: "Inbox", href: ROUTES.adminCommunicationInbox, icon: Inbox } },
      {
        type: "link",
        link: { label: "Support", href: ROUTES.adminCommunicationSupport, icon: Headphones },
      },
      {
        type: "link",
        link: {
          label: "Announcements",
          href: ROUTES.adminCommunicationAnnouncements,
          icon: Megaphone,
        },
      },
    ],
  },
  {
    title: "System",
    entries: [
      { type: "link", link: { label: "Settings", href: ROUTES.adminSettings, icon: Settings } },
      { type: "link", link: { label: "Audit Logs", href: ROUTES.adminAuditLogs, icon: ScrollText } },
      { type: "link", link: { label: "System Users", href: ROUTES.adminUsers, icon: UserCog } },
      { type: "link", link: { label: "Profile", href: ROUTES.adminProfile, icon: User } },
    ],
  },
];

export const FINANCE_SECTION_NAV = [
  { label: "Overview", href: ROUTES.adminFinance },
  { label: "Deposits", href: adminFinanceDepositsPath("pending"), matchPrefix: "/admin/finance/deposits" },
  {
    label: "Withdrawals",
    href: adminFinanceWithdrawalsPath("pending"),
    matchPrefix: "/admin/finance/withdrawals",
  },
  { label: "Wallets", href: ROUTES.adminFinanceWallets },
  { label: "Operations", href: ROUTES.adminFinanceOperations, matchPrefix: "/admin/finance/operations" },
] as const;

export const FINANCE_STATUS_NAV = [
  { label: "Pending", status: "pending" as const },
  { label: "Approved", status: "approved" as const },
  { label: "Rejected", status: "rejected" as const },
  { label: "All", status: "all" as const },
];

export const POOL_MANAGERS_SECTION_NAV = [
  { label: "Overview", href: ROUTES.adminPoolManagers },
  {
    label: "Applications",
    href: adminPoolManagersApplicationsPath("pending"),
    matchPrefix: "/admin/pool-managers/applications",
  },
  { label: "Managers", href: ROUTES.adminPoolManagersManagers },
  { label: "Challenges", href: ROUTES.adminPoolManagersChallenges },
  {
    label: "Development",
    href: ROUTES.adminPoolManagersDevelopment,
    matchPrefix: "/admin/pool-managers/development",
  },
  { label: "Achievements", href: ROUTES.adminPoolManagersAchievements },
  { label: "Content", href: ROUTES.adminPoolManagersContent },
] as const;

export const POOL_MANAGERS_APPLICATION_STATUS_NAV = [
  { label: "Pending", status: "pending" as const },
  { label: "Approved", status: "approved" as const },
  { label: "Rejected", status: "rejected" as const },
  { label: "All", status: "all" as const },
];

export const ADMINISTRATION_SECTION_NAV = [
  { label: "Operations Center", href: ROUTES.admin },
  { label: "Strategy Review", href: ROUTES.adminStrategies, matchPrefix: "/admin/strategies" },
  { label: "Cycle Review", href: ROUTES.adminInvestmentCycles, matchPrefix: "/admin/investment-cycles" },
  { label: "Governance Center", href: ROUTES.adminGovernance, matchPrefix: "/admin/governance" },
] as const;

export const GOVERNANCE_SECTION_NAV = [
  { label: "Dashboard", href: ROUTES.adminGovernance },
  { label: "Pool Rules", href: ROUTES.adminGovernanceRules },
  { label: "Violations", href: ROUTES.adminGovernanceViolations },
  { label: "Reports", href: ROUTES.adminGovernanceReports },
] as const;

import {
  LayoutDashboard,
  Landmark,
  Users,
  Wallet,
  Bitcoin,
  TrendingUp,
  BookOpen,
  ArrowDownToLine,
  ArrowUpFromLine,
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
  Trophy,
  Shield,
  AlertTriangle,
  Banknote,
  Award,
  FileEdit,
  Mail,
  History,
  Radio,
  Inbox,
  Send,
  Target,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";

export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

export interface AdminNavSection {
  title?: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    items: [
      { label: "Dashboard", href: ROUTES.admin, icon: LayoutDashboard },
    ],
  },
  {
    title: "Funds & Capital",
    items: [
      { label: "Pools", href: ROUTES.adminFunds, icon: Landmark },
      { label: "Investors", href: ROUTES.adminInvestors, icon: Users },
      { label: "Investments", href: ROUTES.adminInvestments, icon: Wallet },
      { label: "Deposits", href: ROUTES.adminDeposits, icon: ArrowDownToLine },
      { label: "Crypto Wallets", href: ROUTES.adminCryptoWallets, icon: Bitcoin },
      { label: "Withdrawals", href: ROUTES.adminWithdrawals, icon: ArrowUpFromLine },
    ],
  },
  {
    title: "Governance",
    items: [
      { label: "Governance Dashboard", href: ROUTES.adminGovernance, icon: Shield },
      { label: "Pool Rules", href: ROUTES.adminGovernanceRules, icon: Shield },
      { label: "Violations & Reviews", href: ROUTES.adminGovernanceViolations, icon: AlertTriangle },
      { label: "Governance Reports", href: ROUTES.adminGovernanceReports, icon: FileBarChart },
    ],
  },
  {
    title: "Capital & Growth",
    items: [
      { label: "Capital Allocation", href: ROUTES.adminCapitalAllocation, icon: Banknote },
      { label: "Allocation History", href: ROUTES.adminCapitalHistory, icon: History },
      { label: "Manager Development", href: ROUTES.adminManagerDevelopment, icon: TrendingUp },
      { label: "Achievements", href: ROUTES.adminAchievements, icon: Award },
      { label: "Content Approval", href: ROUTES.adminPoolContent, icon: FileEdit },
      { label: "Capital Reports", href: ROUTES.adminCapitalReports, icon: FileBarChart },
    ],
  },
  {
    title: "Trading",
    items: [
      { label: "Trades", href: ROUTES.adminTrades, icon: TrendingUp },
      { label: "Trader Challenge", href: ROUTES.adminChallenge, icon: Trophy },
      { label: "Pool Manager Apps", href: ROUTES.adminPoolManagerApplications, icon: UserCog },
      { label: "Trading Journal", href: ROUTES.adminJournal, icon: BookOpen },
      { label: "Performance", href: ROUTES.adminPerformance, icon: LineChart },
      { label: "Daily Snapshots", href: ROUTES.adminSnapshots, icon: Camera },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Transactions", href: ROUTES.adminTransactions, icon: Receipt },
      { label: "Testimonials", href: ROUTES.adminTestimonials, icon: MessageSquareQuote },
      { label: "FAQ", href: ROUTES.adminFaq, icon: HelpCircle },
      { label: "Pages", href: ROUTES.adminPages, icon: FileText },
      { label: "Reports", href: ROUTES.adminReports, icon: FileBarChart },
    ],
  },
  {
    title: "Communication Center",
    items: [
      { label: "Dashboard", href: ROUTES.adminCommunicationDashboard, icon: Radio },
      { label: "Inbox", href: ROUTES.adminCommunicationInbox, icon: Inbox },
      { label: "Outbox", href: ROUTES.adminCommunicationOutbox, icon: Send },
      { label: "Templates", href: ROUTES.adminCommunicationTemplates, icon: Mail },
      { label: "Broadcasts", href: ROUTES.adminCommunicationBroadcasts, icon: Radio },
      { label: "Announcements", href: ROUTES.adminCommunicationAnnouncements, icon: Megaphone },
      { label: "Support", href: ROUTES.adminCommunicationSupport, icon: Headphones },
      { label: "Campaigns", href: ROUTES.adminCommunicationCampaigns, icon: Target },
      { label: "History", href: ROUTES.adminCommunicationHistory, icon: History },
      { label: "Analytics", href: ROUTES.adminCommunicationAnalytics, icon: BarChart3 },
      { label: "Settings", href: ROUTES.adminCommunicationSettings, icon: Settings },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Settings", href: ROUTES.adminSettings, icon: Settings },
      { label: "Audit Logs", href: ROUTES.adminAuditLogs, icon: ScrollText },
      { label: "System Users", href: ROUTES.adminUsers, icon: UserCog },
      { label: "Profile", href: ROUTES.adminProfile, icon: User },
    ],
  },
];

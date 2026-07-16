import {
  LayoutDashboard,
  Landmark,
  Users,
  LineChart,
  BookOpen,
  TrendingUp,
  Bell,
  Settings,
  UserCircle,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";

export interface PoolManagerNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const POOL_MANAGER_NAV_ITEMS: PoolManagerNavItem[] = [
  { label: "Overview", href: ROUTES.poolManager, icon: LayoutDashboard },
  { label: "My Pools", href: ROUTES.poolManagerPools, icon: Landmark },
  { label: "Investors", href: ROUTES.poolManagerInvestors, icon: Users },
  { label: "Analytics", href: ROUTES.poolManagerAnalytics, icon: LineChart },
  { label: "Journal", href: ROUTES.poolManagerJournal, icon: BookOpen },
  { label: "Development", href: ROUTES.poolManagerDevelopment, icon: TrendingUp },
  { label: "Notifications", href: ROUTES.poolManagerNotifications, icon: Bell },
  { label: "Profile", href: ROUTES.poolManagerProfile, icon: UserCircle },
  { label: "Settings", href: ROUTES.poolManagerSettings, icon: Settings },
];

export const PM_APPLICATION_STEPS = [
  { stage: 1, title: "Basic Information", description: "Your trading background" },
  { stage: 2, title: "Trader Challenge", description: "Prove your skill" },
  { stage: 3, title: "Strategy Submission", description: "Professional trading plan" },
  { stage: 4, title: "Admin Review", description: "RyvonX evaluation" },
  { stage: 5, title: "Activation", description: "Unlock your dashboard" },
] as const;

export const PM_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending: "Pending Review",
  under_review: "Under Review",
  requires_changes: "Requires Changes",
  interview_required: "Interview Required",
  approved: "Approved",
  rejected: "Rejected",
};

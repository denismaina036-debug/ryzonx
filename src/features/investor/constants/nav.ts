import {
  LayoutDashboard,
  Store,
  Briefcase,
  Users,
  Activity,
  Bell,
  Settings,
  Receipt,
  Headphones,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";

export interface InvestorNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

/** Primary investor navigation — Phase 6 investment experience */
export const INVESTOR_NAV_ITEMS: InvestorNavItem[] = [
  { label: "Home", href: ROUTES.dashboard, icon: LayoutDashboard },
  { label: "Marketplace", href: ROUTES.marketplace, icon: Store },
  { label: "Portfolio", href: ROUTES.portfolio, icon: Briefcase },
  { label: "Managers", href: `${ROUTES.marketplace}?tab=managers`, icon: Users },
  { label: "Activity", href: ROUTES.activity, icon: Activity },
  { label: "Notifications", href: ROUTES.notifications, icon: Bell },
  { label: "Settings", href: ROUTES.settings, icon: Settings },
];

/** Secondary links — accessible from settings/support areas */
export const INVESTOR_SECONDARY_NAV: InvestorNavItem[] = [
  { label: "My Investments", href: ROUTES.investments, icon: Briefcase },
  { label: "Transactions", href: ROUTES.transactions, icon: Receipt },
  { label: "Support", href: ROUTES.support, icon: Headphones },
];

export const INVESTOR_LOGOUT_ITEM = {
  label: "Log Out",
  icon: LogOut,
} as const;

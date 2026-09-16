import {
  LayoutDashboard,
  Compass,
  Star,
  Wallet,
  Store,
  Briefcase,
  Users,
  Activity,
  Bell,
  Settings,
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
  { label: "Watchlist", href: ROUTES.watchlist, icon: Star },
  { label: "Portfolio", href: ROUTES.tradingPortfolio, icon: Briefcase },
  { label: "Discover", href: ROUTES.discover, icon: Compass },
  { label: "Wallet", href: ROUTES.wallet, icon: Wallet },
  { label: "Marketplace", href: ROUTES.marketplace, icon: Store },
  { label: "Copy Activity", href: ROUTES.portfolio, icon: Briefcase },
  { label: "Verified traders", href: `${ROUTES.marketplace}?tab=managers`, icon: Users },
  { label: "Activity", href: ROUTES.personalActivity, icon: Activity },
  { label: "Notifications", href: ROUTES.notifications, icon: Bell },
  { label: "Settings", href: ROUTES.settings, icon: Settings },
];

/** Secondary links — accessible from settings/support areas */
export const INVESTOR_SECONDARY_NAV: InvestorNavItem[] = [
  { label: "My Copy Allocations", href: ROUTES.investments, icon: Briefcase },
  { label: "Platform Activity", href: ROUTES.platformActivity, icon: Activity },
  { label: "Support", href: ROUTES.support, icon: Headphones },
];

export const INVESTOR_LOGOUT_ITEM = {
  label: "Log Out",
  icon: LogOut,
} as const;

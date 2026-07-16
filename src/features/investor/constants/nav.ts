import {
  LayoutDashboard,
  Store,
  Briefcase,
  Route,
  Receipt,
  Headphones,
  Settings,
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

/** Order matches official dashboard UI spec */
export const INVESTOR_NAV_ITEMS: InvestorNavItem[] = [
  { label: "Dashboard", href: ROUTES.dashboard, icon: LayoutDashboard },
  { label: "Marketplace / Pools", href: ROUTES.marketplace, icon: Store },
  { label: "My Investments", href: ROUTES.investments, icon: Briefcase },
  {
    label: "Manager Journey",
    href: ROUTES.managerJourney,
    icon: Route,
    badge: "NEW",
  },
  { label: "Transactions", href: ROUTES.transactions, icon: Receipt },
  { label: "Support", href: ROUTES.support, icon: Headphones },
  { label: "Settings", href: ROUTES.settings, icon: Settings },
];

export const INVESTOR_LOGOUT_ITEM = {
  label: "Log Out",
  icon: LogOut,
} as const;

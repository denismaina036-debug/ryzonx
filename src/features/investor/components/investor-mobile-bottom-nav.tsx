"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Store,
  Briefcase,
  Route,
  User,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

const MOBILE_NAV_ITEMS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Dashboard", href: ROUTES.dashboard, icon: LayoutDashboard },
  { label: "Pools", href: ROUTES.marketplace, icon: Store },
  { label: "Investments", href: ROUTES.investments, icon: Briefcase },
  { label: "Journey", href: ROUTES.managerJourney, icon: Route },
  { label: "Profile", href: ROUTES.settings, icon: User },
];

export function InvestorMobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--id-border)] bg-[var(--id-glass)] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      aria-label="Mobile navigation"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1">
        {MOBILE_NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== ROUTES.dashboard && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 text-[10px] font-medium transition-colors",
                  isActive
                    ? "text-[var(--id-accent-text)]"
                    : "text-[var(--id-text-muted)] hover:text-[var(--id-text)]"
                )}
              >
                <Icon
                  className={cn("h-[18px] w-[18px]", isActive && "stroke-[2.25]")}
                  strokeWidth={isActive ? 2.25 : 1.75}
                />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

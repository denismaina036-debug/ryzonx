"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  LayoutDashboard,
  Store,
  User,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

interface MobileNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  matchPrefixes?: string[];
}

/** Left cluster + right cluster; the center gap is reserved for the floating action button. */
const LEFT_ITEMS: MobileNavItem[] = [
  { label: "Dashboard", href: ROUTES.dashboard, icon: LayoutDashboard },
  {
    label: "Marketplace",
    href: ROUTES.marketplace,
    icon: Store,
    matchPrefixes: ["/marketplace", "/managers"],
  },
];

const RIGHT_ITEMS: MobileNavItem[] = [
  {
    label: "Activity",
    href: ROUTES.personalActivity,
    icon: Activity,
    matchPrefixes: [ROUTES.personalActivity, ROUTES.trades],
  },
  {
    label: "Profile",
    href: ROUTES.settings,
    icon: User,
    matchPrefixes: [ROUTES.settings, ROUTES.notifications],
  },
];

export function InvestorMobileBottomNav() {
  const pathname = usePathname();

  function isActive(item: MobileNavItem) {
    if (item.href === ROUTES.dashboard) return pathname === item.href;
    if (pathname === item.href) return true;
    return (item.matchPrefixes ?? [item.href]).some((prefix) =>
      pathname.startsWith(prefix)
    );
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--id-border)] bg-[var(--id-glass)] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      aria-label="Mobile navigation"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 items-stretch px-1 pt-1">
        {LEFT_ITEMS.map((item) => (
          <NavButton key={item.href} item={item} active={isActive(item)} />
        ))}

        <li aria-hidden className="pointer-events-none" />

        {RIGHT_ITEMS.map((item) => (
          <NavButton key={item.href} item={item} active={isActive(item)} />
        ))}
      </ul>
    </nav>
  );
}

function NavButton({ item, active }: { item: MobileNavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        className={cn(
          "flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-medium transition-colors",
          active
            ? "text-[var(--id-accent-text)]"
            : "text-[var(--id-text-muted)] hover:text-[var(--id-text)]"
        )}
      >
        <Icon
          className={cn("h-[18px] w-[18px]", active && "stroke-[2.25]")}
          strokeWidth={active ? 2.25 : 1.75}
        />
        <span className="truncate">{item.label}</span>
      </Link>
    </li>
  );
}

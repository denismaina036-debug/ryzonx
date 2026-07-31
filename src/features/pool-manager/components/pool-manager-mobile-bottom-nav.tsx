"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Landmark,
  Layers,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import { tapNavItem } from "@/lib/ui/interaction";

interface MobileNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  matchPrefixes?: string[];
}

/** Mirrors investor mobile nav layout — center gap reserved for FAB. */
const LEFT_ITEMS: MobileNavItem[] = [
  {
    label: "Pools",
    href: ROUTES.poolManager,
    icon: Landmark,
    matchPrefixes: [ROUTES.poolManager, ROUTES.poolManagerPools],
  },
  {
    label: "Strategies",
    href: ROUTES.poolManagerStrategies,
    icon: Layers,
    matchPrefixes: [ROUTES.poolManagerStrategies],
  },
];

const RIGHT_ITEMS: MobileNavItem[] = [
  {
    label: "Trading",
    href: ROUTES.poolManagerJournal,
    icon: BookOpen,
    matchPrefixes: [ROUTES.poolManagerJournal, "/pool-manager/investment-cycles"],
  },
  {
    label: "Wallet",
    href: ROUTES.poolManagerFinance,
    icon: Wallet,
    matchPrefixes: [ROUTES.poolManagerFinance],
  },
];

export function PoolManagerMobileBottomNav() {
  const pathname = usePathname();

  function isActive(item: MobileNavItem) {
    if (pathname === item.href) return true;
    return (item.matchPrefixes ?? [item.href]).some((prefix) =>
      pathname === prefix || (prefix !== ROUTES.poolManager && pathname.startsWith(`${prefix}/`))
    );
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--id-border)] bg-[var(--id-glass)] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      aria-label="Pool Manager mobile navigation"
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
          tapNavItem,
          "flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-medium transition-colors",
          active
            ? "bg-[var(--pm-accent-soft)] text-[var(--pm-accent-text)]"
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

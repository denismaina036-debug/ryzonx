"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { APP_NAME, ROUTES } from "@/constants/routes";
import {
  INVESTOR_LOGOUT_ITEM,
  INVESTOR_NAV_ITEMS,
} from "@/features/investor/constants/nav";
import { InvestorMobileBottomNav } from "@/features/investor/components/investor-mobile-bottom-nav";
import { InvestorShellHeader } from "@/features/investor/components/investor-shell-header";
import { InvestorThemeToggle } from "@/features/investor/components/investor-theme-toggle";
import { SidebarPoolManagerPromo } from "@/features/investor/components/sidebar-pool-manager-promo";
import { InvestorThemeProvider } from "@/providers/investor-theme-provider";
import { useAuthActions } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface DashboardLayoutShellProps {
  children: ReactNode;
  userName?: string;
  userRole?: string;
  unreadNotifications?: number;
}

export function DashboardLayoutShell({
  children,
  userName,
  unreadNotifications = 0,
}: DashboardLayoutShellProps) {
  return (
    <InvestorThemeProvider>
      <div className="investor-dashboard flex min-h-screen bg-[var(--id-bg)]">
        <DashboardSidebar userName={userName} />

        <div className="flex min-w-0 flex-1 flex-col lg:pl-[17rem]">
          <InvestorShellHeader unreadNotifications={unreadNotifications} />
          <main className="flex-1 px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
            {children}
          </main>
        </div>

        <InvestorMobileBottomNav />
      </div>
    </InvestorThemeProvider>
  );
}

function DashboardSidebar({ userName }: { userName?: string }) {
  const pathname = usePathname();
  const { signOut } = useAuthActions();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[17rem] flex-col bg-[var(--id-sidebar)] lg:flex">
      <SidebarContent
        pathname={pathname}
        userName={userName}
        onSignOut={() => signOut()}
      />
    </aside>
  );
}

function SidebarContent({
  pathname,
  userName,
  onSignOut,
}: {
  pathname: string;
  userName?: string;
  onSignOut: () => void;
}) {
  const LogoutIcon = INVESTOR_LOGOUT_ITEM.icon;

  function isNavActive(href: string) {
    if (href === ROUTES.dashboard) return pathname === href;
    if (href === ROUTES.marketplace) {
      return pathname === href || pathname.startsWith("/marketplace/");
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      <div className="flex h-[4.5rem] items-center gap-2.5 px-6">
        <Image
          src="/images/logo.png"
          alt={`${APP_NAME} logo`}
          width={28}
          height={28}
          className="h-7 w-7 object-contain dark:brightness-0 dark:invert"
        />
        <p className="text-sm font-semibold tracking-tight text-[var(--id-text)]">
          {APP_NAME}
        </p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-2">
        {INVESTOR_NAV_ITEMS.map((item) => {
          const isActive = isNavActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-[var(--id-accent)] text-white"
                  : "text-[var(--id-text-muted)] hover:bg-[var(--id-surface-hover)] hover:text-[var(--id-text)]"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="rounded-full bg-[var(--id-accent)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-4 p-4">
        <SidebarPoolManagerPromo />

        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-[var(--id-text-muted)]">Dark Mode</span>
          <InvestorThemeToggle />
        </div>

        {userName && (
          <p className="truncate px-1 text-xs text-[var(--id-text-faint)]">{userName}</p>
        )}

        <button
          type="button"
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--id-text-muted)] transition-colors hover:bg-[var(--id-surface-hover)] hover:text-[var(--id-text)]"
        >
          <LogoutIcon className="h-4 w-4" strokeWidth={1.75} />
          {INVESTOR_LOGOUT_ITEM.label}
        </button>
      </div>
    </>
  );
}

export { DashboardSidebar };

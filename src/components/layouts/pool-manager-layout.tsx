"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { APP_NAME, ROUTES } from "@/constants/routes";
import { POOL_MANAGER_LEGACY_NAV_ITEMS, POOL_MANAGER_NAV_ITEMS } from "@/features/pool-manager/constants/nav";
import {
  pmNavActiveClass,
  pmNavIdleClass,
} from "@/features/pool-manager/constants/ui";
import { PoolManagerMobileProfileMenu } from "@/features/pool-manager/components/pool-manager-mobile-profile-menu";
import { InvestorThemeToggle } from "@/features/investor/components/investor-theme-toggle";
import { InvestorThemeProvider } from "@/providers/investor-theme-provider";
import { useAuthActions } from "@/hooks/use-auth";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

interface PoolManagerLayoutShellProps {
  children: ReactNode;
  userName?: string;
  avatarUrl?: string | null;
  userEmail?: string;
  managerSlug?: string | null;
}

export function PoolManagerLayoutShell({
  children,
  userName,
  avatarUrl,
  userEmail,
  managerSlug,
}: PoolManagerLayoutShellProps) {
  const pathname = usePathname();
  const { signOut } = useAuthActions();
  const displayName = userName ?? "Pool Manager";

  return (
    <InvestorThemeProvider>
      <div className="pool-manager-workspace flex min-h-screen overflow-x-hidden bg-[var(--id-bg)]">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-[var(--pm-sidebar-border)] bg-[var(--id-sidebar)] lg:flex xl:w-[17rem]">
          <div className="border-b border-[var(--pm-sidebar-border)] px-5 py-5">
            <div className="flex items-center gap-2.5">
              <Image
                src="/images/logo.png"
                alt={`${APP_NAME} logo`}
                width={28}
                height={28}
                className="h-7 w-7 object-contain dark:brightness-0 dark:invert"
              />
              <div>
                <p className="bg-[var(--pm-brand-gradient)] bg-clip-text text-xs font-semibold uppercase tracking-[0.14em] text-transparent">
                  Pool Manager
                </p>
                <p className="text-sm font-bold text-[var(--id-text)]">{APP_NAME}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
            {POOL_MANAGER_NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== ROUTES.poolManager && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                    isActive ? pmNavActiveClass : pmNavIdleClass
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}

            <div className="my-4 border-t border-[var(--id-border)] pt-4">
              {POOL_MANAGER_LEGACY_NAV_ITEMS.length > 0 && (
                <>
                  <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--id-text-faint)]">
                    Legacy
                  </p>
                  {POOL_MANAGER_LEGACY_NAV_ITEMS.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                      isActive
                        ? "bg-[var(--id-surface-hover)] text-[var(--id-text-secondary)]"
                        : pmNavIdleClass
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
                </>
              )}
            </div>
          </nav>

          <div className="space-y-3 border-t border-[var(--pm-sidebar-border)] p-4">
            <div className="flex items-center justify-between gap-2 px-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--id-text-faint)]">
                Theme
              </span>
              <InvestorThemeToggle />
            </div>

            <div className="flex items-center gap-3 px-2 py-1">
              <UserAvatar
                name={displayName}
                avatarUrl={avatarUrl}
                className="h-10 w-10 rounded-full ring-1 ring-[var(--id-border)]"
                fallbackClassName="text-xs"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--id-text)]">{displayName}</p>
                {userEmail && (
                  <p className="truncate text-xs text-[var(--id-text-muted)]">{userEmail}</p>
                )}
              </div>
            </div>

            {managerSlug && (
              <Link
                href={`${ROUTES.managerPublicProfile}/${managerSlug}`}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-xs text-[var(--pm-accent-text)] hover:bg-[var(--pm-accent-soft)]"
              >
                View public profile
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
            <Link
              href={ROUTES.portfolio}
              className="block rounded-lg px-3 py-2 text-xs text-[var(--id-text-muted)] hover:bg-[var(--id-surface-hover)] hover:text-[var(--id-text-secondary)]"
            >
              Investor Portfolio
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-[var(--id-text-muted)] hover:bg-[var(--id-surface-hover)] hover:text-[var(--id-text)]"
              onClick={() => signOut()}
            >
              Sign out
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col lg:pl-64 xl:pl-[17rem]">
          <header className="sticky top-0 z-20 border-b border-[var(--id-border)] bg-[var(--id-glass)] px-4 py-3 backdrop-blur-md sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <p className="truncate bg-[var(--pm-brand-gradient)] bg-clip-text text-sm font-medium text-transparent lg:hidden">
                Pool Manager
              </p>
              <p className="hidden text-sm text-[var(--id-text-muted)] lg:block">
                Professional pool management under RyvonX governance
              </p>

              <div className="ml-auto flex items-center gap-2">
                <InvestorThemeToggle className="lg:hidden" />
                <PoolManagerMobileProfileMenu
                  displayName={displayName}
                  avatarUrl={avatarUrl}
                  userEmail={userEmail}
                />
              </div>
            </div>
          </header>
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </InvestorThemeProvider>
  );
}

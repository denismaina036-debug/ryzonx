"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, LogOut, Settings } from "lucide-react";
import { APP_NAME, ROUTES } from "@/constants/routes";
import { POOL_MANAGER_NAV_ITEMS } from "@/features/pool-manager/constants/nav";
import { useAuthActions } from "@/hooks/use-auth";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    <div className="flex min-h-screen overflow-x-hidden bg-[#060910]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-amber-500/10 bg-[#0a0f18] lg:flex xl:w-[17rem]">
        <div className="border-b border-amber-500/10 px-5 py-5">
          <div className="flex items-center gap-2.5">
            <Image
              src="/images/logo.png"
              alt={`${APP_NAME} logo`}
              width={28}
              height={28}
              className="h-7 w-7 object-contain brightness-0 invert"
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-400/90">
                Pool Manager
              </p>
              <p className="text-sm font-bold text-white">{APP_NAME}</p>
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
                  isActive
                    ? "bg-amber-500/15 text-amber-200 ring-1 ring-inset ring-amber-500/25"
                    : "text-navy-400 hover:bg-white/[0.04] hover:text-navy-200"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-2 border-t border-amber-500/10 p-4">
          <div className="flex items-center gap-3 px-2 py-1">
            <UserAvatar
              name={displayName}
              avatarUrl={avatarUrl}
              className="h-10 w-10 rounded-full"
              fallbackClassName="text-xs"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{displayName}</p>
              {userEmail && (
                <p className="truncate text-xs text-navy-500">{userEmail}</p>
              )}
            </div>
          </div>

          {managerSlug && (
            <Link
              href={`${ROUTES.managerPublicProfile}/${managerSlug}`}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-xs text-amber-300/80 hover:bg-amber-500/10"
            >
              View public profile
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
          <Link
            href={ROUTES.dashboard}
            className="block rounded-lg px-3 py-2 text-xs text-navy-400 hover:bg-white/[0.04] hover:text-navy-200"
          >
            Investor Dashboard
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-navy-400 hover:text-white"
            onClick={() => signOut()}
          >
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64 xl:pl-[17rem]">
        <header className="sticky top-0 z-20 border-b border-white/[0.04] bg-[#060910]/90 px-4 py-3 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <p className="truncate text-sm font-medium text-amber-200/90 lg:hidden">
              Pool Manager
            </p>
            <p className="hidden text-sm text-navy-400 lg:block">
              Professional pool management under RyvonX governance
            </p>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="ml-auto flex h-9 shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-1 pl-1 pr-2 outline-none transition-colors hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-amber-500/30 lg:hidden"
                  aria-label="Open profile menu"
                >
                  <UserAvatar
                    name={displayName}
                    avatarUrl={avatarUrl}
                    className="h-7 w-7 rounded-lg"
                    fallbackClassName="text-[10px]"
                  />
                  <ChevronDown className="h-3.5 w-3.5 text-navy-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 border-white/10 bg-[#111827] text-white"
              >
                <DropdownMenuLabel>
                  <span className="block truncate font-medium text-white">{displayName}</span>
                  {userEmail && (
                    <span className="block truncate font-normal text-navy-400">{userEmail}</span>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem asChild>
                  <Link href={ROUTES.poolManagerProfile} className="cursor-pointer text-navy-200">
                    <Settings className="h-4 w-4" strokeWidth={1.75} />
                    Profile settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={ROUTES.dashboard} className="cursor-pointer text-navy-200">
                    Investor Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  className="text-red-400 focus:text-red-300"
                  onSelect={() => signOut()}
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.75} />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Bell, ChevronDown, LogOut, MessageSquare, Search, Settings } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { InvestorThemeToggle } from "@/features/investor/components/investor-theme-toggle";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/providers/auth-provider";
import { useAuthActions } from "@/hooks/use-auth";

interface InvestorShellHeaderProps {
  unreadNotifications?: number;
}

export function InvestorShellHeader({
  unreadNotifications = 0,
}: InvestorShellHeaderProps) {
  const { user } = useAuth();
  const { signOut } = useAuthActions();
  const displayName = user?.fullName ?? "Investor";

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--id-border)] bg-[var(--id-glass)] px-3 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <div className="relative hidden min-w-0 flex-1 md:block md:max-w-md lg:mx-auto lg:max-w-lg">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--id-text-faint)]"
            strokeWidth={1.75}
          />
          <input
            type="search"
            placeholder="Search pools, managers, or anything…"
            className="h-10 w-full rounded-full border border-[var(--id-border)] bg-[var(--id-surface-muted)] pl-10 pr-16 text-sm text-[var(--id-text)] placeholder:text-[var(--id-text-faint)] outline-none transition-colors focus:border-[var(--id-accent)] focus:ring-2 focus:ring-[var(--id-accent-soft)]"
            readOnly
            aria-label="Search"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-[var(--id-border)] bg-[var(--id-surface)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--id-text-faint)] sm:inline">
            ⌘K
          </kbd>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          <Link
            href={ROUTES.notifications}
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] text-[var(--id-text-secondary)] transition-colors hover:bg-[var(--id-surface-hover)] hover:text-[var(--id-text)]"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" strokeWidth={1.75} />
            {unreadNotifications > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--id-accent)] px-1 text-[10px] font-bold text-white">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            )}
          </Link>

          <Link
            href={ROUTES.support}
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] text-[var(--id-text-secondary)] transition-colors hover:bg-[var(--id-surface-hover)] hover:text-[var(--id-text)]"
            aria-label="Messages"
          >
            <MessageSquare className="h-4 w-4" strokeWidth={1.75} />
          </Link>

          <InvestorThemeToggle className="shrink-0 lg:hidden" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-9 shrink-0 items-center gap-2 rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] py-1 pl-1 pr-2 outline-none transition-colors hover:bg-[var(--id-surface-hover)] focus-visible:ring-2 focus-visible:ring-[var(--id-accent-soft)] sm:h-10 sm:pr-3"
                aria-label="Open profile menu"
              >
                <UserAvatar
                  name={displayName}
                  avatarUrl={user?.avatarUrl}
                  className="h-7 w-7 sm:h-8 sm:w-8"
                  fallbackClassName="text-[10px] sm:text-xs"
                />
                <span className="hidden min-w-0 sm:block">
                  <span className="block max-w-[8rem] truncate text-left text-sm font-medium leading-tight text-[var(--id-text)]">
                    {displayName}
                  </span>
                  <span className="block text-left text-[11px] leading-tight text-[var(--id-text-muted)]">
                    Investor
                  </span>
                </span>
                <ChevronDown className="hidden h-3.5 w-3.5 text-[var(--id-text-muted)] sm:block" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <span className="block truncate font-medium text-[var(--id-text)]">
                  {displayName}
                </span>
                <span className="block truncate font-normal text-[var(--id-text-muted)]">
                  {user?.email}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={ROUTES.settings} className="cursor-pointer">
                  <Settings className="h-4 w-4 text-[var(--id-text-muted)]" strokeWidth={1.75} />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-[var(--id-danger)] focus:text-[var(--id-danger)]"
                onSelect={() => signOut()}
              >
                <LogOut className="h-4 w-4" strokeWidth={1.75} />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

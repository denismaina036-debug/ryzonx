"use client";

import Link from "next/link";
import { Bell, ChevronDown, Globe, MessageSquare, Search } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/providers/auth-provider";
import { getInitials } from "@/lib/utils";

interface InvestorShellHeaderProps {
  unreadNotifications?: number;
}

export function InvestorShellHeader({
  unreadNotifications = 0,
}: InvestorShellHeaderProps) {
  const { user } = useAuth();
  const displayName = user?.fullName ?? "Investor";

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--id-border)] bg-[var(--id-glass)] px-4 py-3.5 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex items-center gap-4">
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

        <div className="ml-auto flex items-center gap-2 sm:gap-2.5">
          <Link
            href={ROUTES.notifications}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] text-[var(--id-text-secondary)] transition-colors hover:bg-[var(--id-surface-hover)] hover:text-[var(--id-text)]"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" strokeWidth={1.75} />
            {unreadNotifications > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--id-accent)] px-1 text-[10px] font-bold text-white">
                {unreadNotifications}
              </span>
            )}
          </Link>

          <Link
            href={ROUTES.support}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] text-[var(--id-text-secondary)] transition-colors hover:bg-[var(--id-surface-hover)] hover:text-[var(--id-text)]"
            aria-label="Messages"
          >
            <MessageSquare className="h-4 w-4" strokeWidth={1.75} />
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-500 px-1 text-[10px] font-bold text-white">
              3
            </span>
          </Link>

          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] text-[var(--id-text-secondary)] transition-colors hover:bg-[var(--id-surface-hover)] hover:text-[var(--id-text)]"
            aria-label="Language"
          >
            <Globe className="h-4 w-4" strokeWidth={1.75} />
          </button>

          <Link
            href={ROUTES.settings}
            className="flex h-10 items-center gap-2.5 rounded-xl border border-[var(--id-border)] bg-[var(--id-surface-muted)] py-1 pl-1 pr-2.5 transition-colors hover:bg-[var(--id-surface-hover)] sm:pr-3"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 text-xs font-semibold text-white">
              {getInitials(displayName)}
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block truncate text-sm font-medium leading-tight text-[var(--id-text)]">
                {displayName}
              </span>
              <span className="block text-[11px] leading-tight text-[var(--id-text-muted)]">
                Investor
              </span>
            </span>
            <ChevronDown className="hidden h-3.5 w-3.5 text-[var(--id-text-muted)] sm:block" />
          </Link>
        </div>
      </div>
    </header>
  );
}

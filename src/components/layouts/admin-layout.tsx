"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { APP_NAME } from "@/constants/routes";
import { ADMIN_NAV_SECTIONS } from "@/features/admin/constants/nav";
import { useAuthActions } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface AdminSidebarProps {
  userName?: string;
  pendingDeposits?: number;
  pendingWithdrawals?: number;
}

export function AdminSidebar({
  userName,
  pendingDeposits = 0,
  pendingWithdrawals = 0,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const { signOut } = useAuthActions();
  const [mobileOpen, setMobileOpen] = useState(false);

  const badgeCounts: Record<string, number> = {
    "/admin/deposits": pendingDeposits,
    "/admin/withdrawals": pendingWithdrawals,
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card shadow-sm lg:hidden"
        aria-label="Open admin menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <aside className="hidden w-64 shrink-0 flex-col border-r border-navy-800 bg-navy-950 lg:flex xl:w-72">
        <AdminSidebarContent
          pathname={pathname}
          userName={userName}
          badgeCounts={badgeCounts}
          onSignOut={() => signOut()}
        />
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-navy-950/50 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-navy-950 lg:hidden"
            >
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-navy-300 hover:bg-navy-900"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
              <AdminSidebarContent
                pathname={pathname}
                userName={userName}
                badgeCounts={badgeCounts}
                onSignOut={() => signOut()}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function AdminSidebarContent({
  pathname,
  userName,
  badgeCounts,
  onSignOut,
}: {
  pathname: string;
  userName?: string;
  badgeCounts: Record<string, number>;
  onSignOut: () => void;
}) {
  return (
    <>
      <div className="flex h-16 items-center gap-2.5 border-b border-navy-800 px-5">
        <Image
          src="/images/logo.png"
          alt={`${APP_NAME} logo`}
          width={28}
          height={28}
          className="h-7 w-7 object-contain brightness-0 invert"
        />
        <div>
          <p className="text-sm font-semibold text-white">{APP_NAME}</p>
          <p className="text-[10px] uppercase tracking-wider text-navy-400">Admin Portal</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        {ADMIN_NAV_SECTIONS.map((section, idx) => (
          <div key={idx} className={cn(idx > 0 && "mt-6")}>
            {section.title && (
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-navy-500">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/admin" && pathname.startsWith(item.href));
                const Icon = item.icon;
                const badge = badgeCounts[item.href] ?? 0;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-royal-600 text-white"
                        : "text-navy-300 hover:bg-navy-900 hover:text-white"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {badge > 0 && (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          isActive ? "bg-white/20 text-white" : "bg-gold-500 text-navy-950"
                        )}
                      >
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-navy-800 p-4">
        {userName && (
          <p className="mb-3 truncate px-3 text-xs text-navy-400">{userName}</p>
        )}
        <button
          type="button"
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-navy-300 transition-colors hover:bg-navy-900 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </>
  );
}

interface AdminTopBarProps {
  title?: string;
}

export function AdminTopBar({ title }: AdminTopBarProps) {
  return (
    <header className="mb-6 flex h-12 items-center border-b border-border pb-4 lg:hidden">
      <div className="pl-12">
        {title && <p className="text-sm font-medium text-navy-700">{title}</p>}
      </div>
    </header>
  );
}

interface AdminLayoutShellProps {
  children: ReactNode;
  userName?: string;
  pendingDeposits?: number;
  pendingWithdrawals?: number;
}

export function AdminLayoutShell({
  children,
  userName,
  pendingDeposits,
  pendingWithdrawals,
}: AdminLayoutShellProps) {
  return (
    <div className="flex min-h-screen bg-surface-1">
      <AdminSidebar
        userName={userName}
        pendingDeposits={pendingDeposits}
        pendingWithdrawals={pendingWithdrawals}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 p-4 pt-16 lg:p-8 lg:pt-8">{children}</main>
      </div>
    </div>
  );
}

export function AdminBreadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="mb-4 flex items-center gap-1 text-xs text-navy-500">
      {items.map((item, i) => (
        <span key={item.label} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3 w-3" />}
          {item.href ? (
            <Link href={item.href} className="hover:text-navy-800">
              {item.label}
            </Link>
          ) : (
            <span className="text-navy-700">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

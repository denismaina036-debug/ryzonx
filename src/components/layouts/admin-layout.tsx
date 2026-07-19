"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { APP_NAME } from "@/constants/routes";
import {
  ADMIN_NAV_SECTIONS,
  type AdminBadgeKey,
  type AdminNavDepartment,
  type AdminNavLink,
} from "@/features/admin/constants/nav";
import { useAuthActions } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface AdminSidebarProps {
  userName?: string;
  pendingDeposits?: number;
  pendingWithdrawals?: number;
  pendingApplications?: number;
}

function getBadgeCount(
  badgeKey: AdminBadgeKey | undefined,
  counts: Record<AdminBadgeKey, number>
): number {
  if (!badgeKey) return 0;
  return counts[badgeKey] ?? 0;
}

function isLinkActive(pathname: string, href: string, matchPrefix?: string): boolean {
  if (matchPrefix) {
    return pathname === matchPrefix || pathname.startsWith(`${matchPrefix}/`);
  }
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isDepartmentActive(pathname: string, department: AdminNavDepartment): boolean {
  return (
    pathname === department.href ||
    pathname.startsWith(`${department.href}/`) ||
    department.items.some((item) => isLinkActive(pathname, item.href, item.matchPrefix))
  );
}

function departmentPendingTotal(
  department: AdminNavDepartment,
  counts: Record<AdminBadgeKey, number>
): number {
  return department.items.reduce(
    (sum, item) => sum + getBadgeCount(item.badgeKey, counts),
    0
  );
}

export function AdminSidebar({
  userName,
  pendingDeposits = 0,
  pendingWithdrawals = 0,
  pendingApplications = 0,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const { signOut } = useAuthActions();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedDepartments, setExpandedDepartments] = useState<Record<string, boolean>>({});

  const badgeCounts: Record<AdminBadgeKey, number> = {
    pendingDeposits,
    pendingWithdrawals,
    pendingApplications,
  };

  useEffect(() => {
    setExpandedDepartments((prev) => {
      const next = { ...prev };
      for (const section of ADMIN_NAV_SECTIONS) {
        for (const entry of section.entries) {
          if (entry.type === "department" && isDepartmentActive(pathname, entry.department)) {
            next[entry.department.id] = true;
          }
        }
      }
      return next;
    });
  }, [pathname]);

  const toggleDepartment = (id: string) => {
    setExpandedDepartments((prev) => ({ ...prev, [id]: !prev[id] }));
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
          expandedDepartments={expandedDepartments}
          onToggleDepartment={toggleDepartment}
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
                expandedDepartments={expandedDepartments}
                onToggleDepartment={toggleDepartment}
                onSignOut={() => signOut()}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function NavLinkItem({
  item,
  pathname,
  badgeCounts,
  nested = false,
}: {
  item: AdminNavLink;
  pathname: string;
  badgeCounts: Record<AdminBadgeKey, number>;
  nested?: boolean;
}) {
  const isActive = isLinkActive(pathname, item.href, item.matchPrefix);
  const Icon = item.icon;
  const badge = getBadgeCount(item.badgeKey, badgeCounts);

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-xl text-sm font-medium transition-colors",
        nested ? "px-3 py-1.5 pl-9" : "px-3 py-2",
        isActive
          ? "bg-royal-600 text-white"
          : "text-navy-300 hover:bg-navy-900 hover:text-white"
      )}
    >
      {!nested && <Icon className="h-4 w-4 shrink-0" />}
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
}

function DepartmentNavItem({
  department,
  pathname,
  badgeCounts,
  expanded,
  onToggle,
}: {
  department: AdminNavDepartment;
  pathname: string;
  badgeCounts: Record<AdminBadgeKey, number>;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isActive = isDepartmentActive(pathname, department);
  const Icon = department.icon;
  const totalBadge = departmentPendingTotal(department, badgeCounts);

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-0.5">
        <Link
          href={department.href}
          className={cn(
            "flex flex-1 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
            isActive
              ? "bg-navy-900 text-white"
              : "text-navy-300 hover:bg-navy-900 hover:text-white"
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">{department.label}</span>
          {totalBadge > 0 && (
            <span className="rounded-full bg-gold-500 px-2 py-0.5 text-[10px] font-semibold text-navy-950">
              {totalBadge}
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={onToggle}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-navy-400 hover:bg-navy-900 hover:text-white"
          aria-label={expanded ? `Collapse ${department.label}` : `Expand ${department.label}`}
        >
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
          />
        </button>
      </div>
      {expanded && (
        <div className="space-y-0.5">
          {department.items.map((item) => (
            <NavLinkItem
              key={item.href}
              item={item}
              pathname={pathname}
              badgeCounts={badgeCounts}
              nested
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AdminSidebarContent({
  pathname,
  userName,
  badgeCounts,
  expandedDepartments,
  onToggleDepartment,
  onSignOut,
}: {
  pathname: string;
  userName?: string;
  badgeCounts: Record<AdminBadgeKey, number>;
  expandedDepartments: Record<string, boolean>;
  onToggleDepartment: (id: string) => void;
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
              {section.entries.map((entry) => {
                if (entry.type === "link") {
                  return (
                    <NavLinkItem
                      key={entry.link.href}
                      item={entry.link}
                      pathname={pathname}
                      badgeCounts={badgeCounts}
                    />
                  );
                }

                return (
                  <DepartmentNavItem
                    key={entry.department.id}
                    department={entry.department}
                    pathname={pathname}
                    badgeCounts={badgeCounts}
                    expanded={expandedDepartments[entry.department.id] ?? false}
                    onToggle={() => onToggleDepartment(entry.department.id)}
                  />
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
  pendingApplications?: number;
}

export function AdminLayoutShell({
  children,
  userName,
  pendingDeposits,
  pendingWithdrawals,
  pendingApplications,
}: AdminLayoutShellProps) {
  return (
    <div className="flex min-h-screen bg-surface-1">
      <AdminSidebar
        userName={userName}
        pendingDeposits={pendingDeposits}
        pendingWithdrawals={pendingWithdrawals}
        pendingApplications={pendingApplications}
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
          {i > 0 && <span className="text-navy-300">/</span>}
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

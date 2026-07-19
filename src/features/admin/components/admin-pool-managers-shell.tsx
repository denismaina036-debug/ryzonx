"use client";

import type { ReactNode } from "react";
import { UserCog } from "lucide-react";
import { AdminSubNav } from "./admin-sub-nav";
import { POOL_MANAGERS_SECTION_NAV } from "@/features/admin/constants/nav";

interface AdminPoolManagersShellProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  statusNav?: ReactNode;
  children: ReactNode;
}

export function AdminPoolManagersShell({
  title,
  description,
  actions,
  statusNav,
  children,
}: AdminPoolManagersShellProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-white to-royal-50/40 p-5 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-royal-600">
          <UserCog className="h-3.5 w-3.5" />
          Pool Managers
        </div>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy-950">{title}</h1>
            {description && <p className="mt-1 max-w-2xl text-sm text-navy-500">{description}</p>}
          </div>
          {actions}
        </div>
      </div>

      <AdminSubNav
        items={POOL_MANAGERS_SECTION_NAV.map((item) => ({
          label: item.label,
          href: item.href,
          matchPrefix: "matchPrefix" in item ? item.matchPrefix : undefined,
        }))}
      />

      {statusNav}
      {children}
    </div>
  );
}

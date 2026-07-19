"use client";

import type { ReactNode } from "react";
import { Shield } from "lucide-react";
import { AdminSubNav } from "./admin-sub-nav";
import { ADMINISTRATION_SECTION_NAV } from "@/features/admin/constants/nav";

interface AdminAdministrationShellProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  statusNav?: ReactNode;
  children: ReactNode;
}

export function AdminAdministrationShell({
  title,
  description,
  actions,
  statusNav,
  children,
}: AdminAdministrationShellProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-white to-royal-50/30 p-5 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-royal-700">
          <Shield className="h-3.5 w-3.5" />
          Administration & Governance
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
        items={ADMINISTRATION_SECTION_NAV.map((item) => ({
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

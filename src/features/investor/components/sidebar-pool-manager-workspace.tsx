import Link from "next/link";
import { ArrowRight, LayoutDashboard } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { USER_ROLES } from "@/constants/roles";

interface SidebarPoolManagerWorkspaceProps {
  userRole?: string;
}

export function SidebarPoolManagerWorkspace({ userRole }: SidebarPoolManagerWorkspaceProps) {
  if (userRole !== USER_ROLES.POOL_MANAGER) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-[var(--id-surface-muted)] p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20">
        <LayoutDashboard className="h-4 w-4 text-amber-300" strokeWidth={1.75} />
      </div>
      <p className="mt-3 text-sm font-semibold text-[var(--id-text)]">Manager Workspace</p>
      <p className="mt-1.5 text-xs leading-relaxed text-[var(--id-text-secondary)]">
        Create strategies, investment cycles, and manage your pools.
      </p>
      <Link
        href={ROUTES.poolManager}
        className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-semibold text-[#0a0f18] transition-opacity hover:opacity-90"
      >
        Open Workspace
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
      </Link>
    </div>
  );
}

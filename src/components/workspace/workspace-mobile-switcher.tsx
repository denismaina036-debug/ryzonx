"use client";

import { ArrowLeftRight } from "lucide-react";
import { useSyncExternalStore } from "react";
import type { WorkspaceId } from "@/lib/workspace/workspace-route-memory";
import {
  getWorkspaceSwitchHref,
  getWorkspaceSwitchLabel,
} from "@/lib/workspace/workspace-route-memory";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import Link from "next/link";

const WORKSPACE_DEFAULTS: Record<WorkspaceId, string> = {
  investor: ROUTES.portfolio,
  "pool-manager": ROUTES.poolManager,
};

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("ryvonx-workspace-routes", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("ryvonx-workspace-routes", onStoreChange);
  };
}

interface WorkspaceMobileSwitcherProps {
  target: WorkspaceId;
  className?: string;
}

export function WorkspaceMobileSwitcher({
  target,
  className,
}: WorkspaceMobileSwitcherProps) {
  const href = useSyncExternalStore(
    subscribe,
    () => getWorkspaceSwitchHref(target),
    () => WORKSPACE_DEFAULTS[target]
  );

  const label =
    target === "pool-manager" ? "Manager" : "Investor";

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition-colors lg:hidden",
        target === "pool-manager"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200"
          : "border-[var(--id-border)] bg-[var(--id-surface-muted)] text-[var(--id-text-secondary)] hover:bg-[var(--id-surface-hover)]",
        className
      )}
      aria-label={getWorkspaceSwitchLabel(target)}
    >
      <ArrowLeftRight className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
      <span>{label}</span>
    </Link>
  );
}

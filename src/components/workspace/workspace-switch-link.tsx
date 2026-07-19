"use client";

import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";
import type { WorkspaceId } from "@/lib/workspace/workspace-route-memory";
import {
  getWorkspaceSwitchHref,
  getWorkspaceSwitchLabel,
} from "@/lib/workspace/workspace-route-memory";
import { ROUTES } from "@/constants/routes";

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

function getServerHref(target: WorkspaceId) {
  return WORKSPACE_DEFAULTS[target];
}

interface WorkspaceSwitchLinkProps {
  target: WorkspaceId;
  className?: string;
  children?: ReactNode;
}

export function WorkspaceSwitchLink({
  target,
  className,
  children,
}: WorkspaceSwitchLinkProps) {
  const href = useSyncExternalStore(
    subscribe,
    () => getWorkspaceSwitchHref(target),
    () => getServerHref(target)
  );

  return (
    <Link href={href} className={className}>
      {children ?? getWorkspaceSwitchLabel(target)}
    </Link>
  );
}

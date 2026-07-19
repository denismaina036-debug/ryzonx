"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  getWorkspaceFromPath,
  rememberWorkspaceRoute,
} from "@/lib/workspace/workspace-route-memory";

/** Persists the last visited route per workspace for seamless switching. */
export function WorkspaceRouteMemorySync() {
  const pathname = usePathname();

  useEffect(() => {
    const workspace = getWorkspaceFromPath(pathname);
    if (workspace) rememberWorkspaceRoute(workspace, pathname);
  }, [pathname]);

  return null;
}

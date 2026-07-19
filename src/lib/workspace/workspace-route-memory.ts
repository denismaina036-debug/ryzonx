import { ROUTES } from "@/constants/routes";

export type WorkspaceId = "investor" | "pool-manager";

const STORAGE_KEY = "ryvonx-workspace-routes";

const WORKSPACE_DEFAULTS: Record<WorkspaceId, string> = {
  investor: ROUTES.portfolio,
  "pool-manager": ROUTES.poolManager,
};

export function getWorkspaceFromPath(pathname: string): WorkspaceId | null {
  if (pathname.startsWith("/pool-manager")) return "pool-manager";
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/marketplace") ||
    pathname.startsWith("/managers") ||
    pathname.startsWith("/apply")
  ) {
    return "investor";
  }
  return null;
}

function readStoredRoutes(): Partial<Record<WorkspaceId, string>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<Record<WorkspaceId, string>>;
  } catch {
    return {};
  }
}

export function rememberWorkspaceRoute(workspace: WorkspaceId, pathname: string) {
  if (typeof window === "undefined") return;
  const stored = readStoredRoutes();
  stored[workspace] = pathname;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  window.dispatchEvent(new Event("ryvonx-workspace-routes"));
}

export function getWorkspaceSwitchHref(target: WorkspaceId): string {
  if (typeof window === "undefined") return WORKSPACE_DEFAULTS[target];
  const stored = readStoredRoutes()[target];
  if (stored && getWorkspaceFromPath(stored) === target) return stored;
  return WORKSPACE_DEFAULTS[target];
}

export function getWorkspaceSwitchLabel(target: WorkspaceId): string {
  return target === "pool-manager" ? "Manager Workspace" : "Investor Portfolio";
}

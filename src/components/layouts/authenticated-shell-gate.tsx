"use client";

import { usePathname } from "next/navigation";
import { PublicLayout } from "@/components/layouts/public-layout";
import { DashboardLayoutShell } from "@/components/layouts/dashboard-layout";
import { USER_ROLES, hasMinimumRole } from "@/constants/roles";
import type { InvestorShellProps } from "@/lib/auth/investor-shell-props";
import type { ReactNode } from "react";

const AUTHENTICATED_SHELL_PREFIXES = ["/marketplace", "/managers", "/apply"] as const;

function shouldUseInvestorShell(
  pathname: string,
  user: InvestorShellProps["user"]
): boolean {
  if (!user || !hasMinimumRole(user.role, USER_ROLES.INVESTOR)) {
    return false;
  }
  return AUTHENTICATED_SHELL_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

interface AuthenticatedShellGateProps {
  shellProps: InvestorShellProps;
  children: ReactNode;
}

/** Routes logged-in investors through the same shell as /dashboard. */
export function AuthenticatedShellGate({
  shellProps,
  children,
}: AuthenticatedShellGateProps) {
  const pathname = usePathname();
  const inAppShell = shouldUseInvestorShell(pathname, shellProps.user);

  if (inAppShell && shellProps.user) {
    return (
      <DashboardLayoutShell
        userName={shellProps.user.fullName}
        userRole={shellProps.user.role}
        unreadNotifications={shellProps.unreadNotifications}
      >
        {children}
      </DashboardLayoutShell>
    );
  }

  return (
    <PublicLayout isAuthenticated={!!shellProps.user}>{children}</PublicLayout>
  );
}

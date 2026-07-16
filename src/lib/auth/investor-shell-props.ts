import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/types";

export interface InvestorShellProps {
  user: UserProfile | null;
  unreadNotifications: number;
  hasActivePool: boolean;
}

export async function getInvestorShellProps(): Promise<InvestorShellProps> {
  const user = await getCurrentUser();
  let unreadNotifications = 0;
  let hasActivePool = false;

  if (user) {
    try {
      const supabase = await createClient();

      const [notificationsResult, poolResult] = await Promise.all([
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_read", false),
        supabase
          .from("investor_portfolios")
          .select("fund_id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gt("total_invested", 0),
      ]);

      unreadNotifications = notificationsResult.count ?? 0;
      hasActivePool = (poolResult.count ?? 0) > 0;
    } catch {
      unreadNotifications = 0;
      hasActivePool = false;
    }
  }

  return { user, unreadNotifications, hasActivePool };
}

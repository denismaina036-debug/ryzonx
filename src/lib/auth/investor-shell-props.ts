import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/types";

export interface InvestorShellProps {
  user: UserProfile | null;
  unreadNotifications: number;
}

export async function getInvestorShellProps(): Promise<InvestorShellProps> {
  const user = await getCurrentUser();
  let unreadNotifications = 0;

  if (user) {
    try {
      const supabase = await createClient();
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      unreadNotifications = count ?? 0;
    } catch {
      unreadNotifications = 0;
    }
  }

  return { user, unreadNotifications };
}

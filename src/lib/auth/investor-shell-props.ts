import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { challengeCenterService } from "@/services/challenge-center.service";
import { CHALLENGE_DISPLAY_STATUS } from "@/domain/challenge/types";
import type { ChallengeDisplayStatus } from "@/domain/challenge/types";
import type { UserProfile } from "@/types";

export interface InvestorShellProps {
  user: UserProfile | null;
  unreadNotifications: number;
  hasActivePool: boolean;
  challengeDisplayStatus: ChallengeDisplayStatus;
}

export async function getInvestorShellProps(): Promise<InvestorShellProps> {
  const user = await getCurrentUser();
  let unreadNotifications = 0;
  let hasActivePool = false;
  let challengeDisplayStatus: ChallengeDisplayStatus = CHALLENGE_DISPLAY_STATUS.NONE;

  if (user) {
    try {
      const supabase = await createClient();

      const [notificationsResult, poolResult, challengeState] = await Promise.all([
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
        challengeCenterService.getChallengeCenterState(user.id).catch(() => null),
      ]);

      unreadNotifications = notificationsResult.count ?? 0;
      hasActivePool = (poolResult.count ?? 0) > 0;
      challengeDisplayStatus =
        challengeState?.displayStatus ?? CHALLENGE_DISPLAY_STATUS.NONE;
    } catch {
      unreadNotifications = 0;
      hasActivePool = false;
      challengeDisplayStatus = CHALLENGE_DISPLAY_STATUS.NONE;
    }
  }

  return { user, unreadNotifications, hasActivePool, challengeDisplayStatus };
}

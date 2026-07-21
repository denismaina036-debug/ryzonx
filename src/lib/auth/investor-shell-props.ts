import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { challengeCenterService } from "@/services/challenge-center.service";
import { CHALLENGE_DISPLAY_STATUS } from "@/domain/challenge/types";
import {
  resolvePmJourneyCardVariant,
  type PmJourneyCardVariant,
} from "@/domain/investor/pm-journey-variant";
import type { ChallengeDisplayStatus } from "@/domain/challenge/types";
import type { UserProfile } from "@/types";

export interface InvestorShellProps {
  user: UserProfile | null;
  unreadNotifications: number;
  hasActivePool: boolean;
  challengeDisplayStatus: ChallengeDisplayStatus;
  pmJourneyVariant: PmJourneyCardVariant;
}

export async function getInvestorShellProps(): Promise<InvestorShellProps> {
  const user = await getCurrentUser();
  let unreadNotifications = 0;
  let hasActivePool = false;
  let challengeDisplayStatus: ChallengeDisplayStatus = CHALLENGE_DISPLAY_STATUS.NONE;
  let pmJourneyVariant: PmJourneyCardVariant = "hidden";

  if (user) {
    try {
      const supabase = await createClient();
      const admin = createAdminClient();

      const [notificationsResult, poolResult, challengeState, applicationResult] =
        await Promise.all([
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
        admin
          .from("pool_manager_applications")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      unreadNotifications = notificationsResult.count ?? 0;
      hasActivePool = (poolResult.count ?? 0) > 0;
      challengeDisplayStatus =
        challengeState?.displayStatus ?? CHALLENGE_DISPLAY_STATUS.NONE;
      pmJourneyVariant = resolvePmJourneyCardVariant({
        role: user.role,
        registrationIntent: user.registrationIntent,
        hasStartedApplication: Boolean(applicationResult.data),
      });
    } catch {
      unreadNotifications = 0;
      hasActivePool = false;
      challengeDisplayStatus = CHALLENGE_DISPLAY_STATUS.NONE;
      pmJourneyVariant = "hidden";
    }
  }

  return { user, unreadNotifications, hasActivePool, challengeDisplayStatus, pmJourneyVariant };
}

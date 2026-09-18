import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { challengeCenterService } from "@/services/challenge-center.service";

export interface InvestorRequestContext {
  challengeState: Awaited<
    ReturnType<typeof challengeCenterService.getChallengeCenterState>
  > | null;
  application: { id: string; status: string } | null;
}

/**
 * Shared only for the lifetime of one React server render. Financial state is
 * deliberately excluded so it can never become cross-request stale data.
 */
export const getInvestorRequestContext = cache(
  async (userId: string): Promise<InvestorRequestContext> => {
    const admin = createAdminClient();
    const [challengeState, applicationResult] = await Promise.all([
      challengeCenterService.getChallengeCenterState(userId).catch(() => null),
      admin
        .from("pool_manager_applications")
        .select("id, status")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    return {
      challengeState,
      application: applicationResult.data as {
        id: string;
        status: string;
      } | null,
    };
  }
);

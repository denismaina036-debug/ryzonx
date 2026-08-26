import { createAdminClient } from "@/lib/supabase/admin";
import type { LandingInvestmentActivityType } from "@/domain/landing-page/types";
import { landingPageActivityService } from "@/services/landing-page-activity.service";

export type PlatformFeedActivityType = LandingInvestmentActivityType;

export interface PlatformFeedItem {
  id: string;
  displayName: string;
  subtitle: string;
  createdAt: string;
  amount: number | null;
  activityType: PlatformFeedActivityType;
}

function mapInvestmentActivity(
  item: Awaited<ReturnType<typeof landingPageActivityService.listRecent>>[number]
): PlatformFeedItem {
  return {
    id: item.id,
    displayName: item.displayName,
    subtitle: item.subtitle,
    createdAt: item.createdAt,
    amount: item.amount,
    activityType: item.activityType,
  };
}

/** Public money feed — deposits, withdrawals, and distributed profits only. */
export const publicActivityService = {
  async listRecent(limit = 30): Promise<PlatformFeedItem[]> {
    const fetchLimit = Math.max(limit * 2, 60);
    const transactions = await landingPageActivityService.listRecent(fetchLimit);

    return transactions
      .map(mapInvestmentActivity)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  },

  async countActiveInvestors(): Promise<number> {
    const db = createAdminClient();
    const { count, error } = await db
      .from("investor_portfolios")
      .select("user_id", { count: "exact", head: true });

    if (error) return 0;
    return count ?? 0;
  },
};

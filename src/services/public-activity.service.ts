import { createAdminClient } from "@/lib/supabase/admin";
import type { LandingInvestmentActivityType } from "@/domain/landing-page/types";
import { platformEventService } from "@/services/platform-event.service";
import { landingPageActivityService } from "@/services/landing-page-activity.service";
import type { PlatformEvent } from "@/domain/platform-events/types";

export type PlatformFeedActivityType = LandingInvestmentActivityType | "platform_event";

export interface PlatformFeedItem {
  id: string;
  displayName: string;
  subtitle: string;
  createdAt: string;
  amount: number | null;
  activityType: PlatformFeedActivityType;
}

const PUBLIC_EVENT_TYPES = new Set([
  "allocation.created",
  "allocation.funding_confirmed",
  "strategy.approved",
  "cycle.started",
  "cycle.status_changed",
  "pool_manager.approved",
  "ledger.transaction_posted",
  "trade.closed",
]);

const PLATFORM_EVENT_LABELS: Record<string, string> = {
  "allocation.created": "New Investment",
  "allocation.funding_confirmed": "Investment Funded",
  "strategy.approved": "Strategy Approved",
  "cycle.started": "Cycle Started",
  "cycle.status_changed": "Cycle Update",
  "pool_manager.approved": "Pool Manager Approved",
  "ledger.transaction_posted": "Ledger Transaction",
  "trade.closed": "Trade Closed",
};

function mapPlatformEvent(event: PlatformEvent): PlatformFeedItem {
  const payload = event.payload ?? {};
  const summary =
    (typeof payload.summary === "string" && payload.summary) ||
    (typeof payload.message === "string" && payload.message) ||
    event.eventType.replace(/\./g, " ");

  return {
    id: `event-${event.id}`,
    displayName: PLATFORM_EVENT_LABELS[event.eventType] ?? "Platform Update",
    subtitle: summary,
    createdAt: event.createdAt,
    amount: null,
    activityType: "platform_event",
  };
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

/** Unified public feed — live transactions plus platform milestones. */
export const publicActivityService = {
  async listRecent(limit = 30): Promise<PlatformFeedItem[]> {
    const fetchLimit = Math.max(limit * 2, 60);

    const [transactions, events] = await Promise.all([
      landingPageActivityService.listRecent(fetchLimit),
      platformEventService.listRecentPublic(Math.min(fetchLimit, 100)),
    ]);

    const platformItems = events
      .filter((event) => PUBLIC_EVENT_TYPES.has(event.eventType))
      .map(mapPlatformEvent);

    const transactionItems = transactions.map(mapInvestmentActivity);

    return [...transactionItems, ...platformItems]
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

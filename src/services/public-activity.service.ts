import { createAdminClient } from "@/lib/supabase/admin";
import { platformEventService } from "@/services/platform-event.service";
import type { PlatformEvent } from "@/domain/platform-events/types";

export interface PublicActivityItem {
  id: string;
  title: string;
  summary: string;
  createdAt: string;
  category: string;
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

function mapPublicActivity(event: PlatformEvent): PublicActivityItem {
  const payload = event.payload ?? {};
  const summary =
    (typeof payload.summary === "string" && payload.summary) ||
    (typeof payload.message === "string" && payload.message) ||
    event.eventType.replace(/\./g, " ");

  return {
    id: event.id,
    title: event.eventType.replace(/\./g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    summary,
    createdAt: event.createdAt,
    category: event.category,
  };
}

/** Ephemeral public activity feed — not personal transaction history. */
export const publicActivityService = {
  async listRecent(limit = 20): Promise<PublicActivityItem[]> {
    const events = await platformEventService.listRecentPublic(Math.min(limit * 3, 100));
    return events
      .filter((e) => PUBLIC_EVENT_TYPES.has(e.eventType))
      .slice(0, limit)
      .map(mapPublicActivity);
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

import { createAdminClient } from "@/lib/supabase/admin";
import type { CommunicationChannel } from "@/domain/communication/types";
import type { AutomationRuleAction, PlatformEvent } from "@/domain/platform-events/types";
import { communicationService } from "@/services/communication/communication.service";
import { buildUserCommunicationVariables } from "@/services/communication/user-variables";
import { emailQueueService } from "@/services/communication/email/email-queue.service";

type PoolRow = {
  id: string;
  name: string;
  slug: string;
  pool_manager_id: string | null;
  pool_manager_name: string | null;
  min_investment: number | string | null;
  target_capital: number | string | null;
  pool_duration_days: number | null;
};

type CycleRow = {
  id: string;
  name: string;
  fund_id: string | null;
  pool_manager_id: string;
  min_investment: number | string | null;
  target_capital: number | string | null;
  raised_capital: number | string | null;
  current_cycle_profit: number | string | null;
  investor_count: number | null;
  duration_days: number | null;
  funding_deadline: string | null;
  trading_started_at: string | null;
};

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://ryvonx.com").replace(/\/$/, "");
const USER_CHANNELS: CommunicationChannel[] = ["email", "in_app"];

function money(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function dateLabel(value: string | null | undefined, fallback = "Open-ended"): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function durationLabel(days: number | null | undefined): string {
  if (!days || days <= 0) return "Defined by the pool cycle";
  return `${days} day${days === 1 ? "" : "s"}`;
}

async function readPool(fundId: string): Promise<PoolRow> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("funds")
    .select("id, name, slug, pool_manager_id, pool_manager_name, min_investment, target_capital, pool_duration_days")
    .eq("id", fundId)
    .single();
  if (error || !data) throw new Error(error?.message ?? "Pool not found for automated communication.");
  return data as unknown as PoolRow;
}

async function readCycle(cycleId: string): Promise<CycleRow> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("investment_cycles")
    .select("id, name, fund_id, pool_manager_id, min_investment, target_capital, raised_capital, current_cycle_profit, investor_count, duration_days, funding_deadline, trading_started_at")
    .eq("id", cycleId)
    .single();
  if (error || !data) throw new Error(error?.message ?? "Cycle not found for automated communication.");
  return data as unknown as CycleRow;
}

async function managerName(managerId: string | null, fallback?: string | null): Promise<string> {
  if (!managerId) return fallback?.trim() || "RyvonX Pool Manager";
  const db = createAdminClient();
  const { data } = await db
    .from("pool_managers")
    .select("display_name, username")
    .eq("id", managerId)
    .maybeSingle();
  const row = data as { display_name?: string | null; username?: string | null } | null;
  return row?.display_name?.trim() || row?.username?.trim() || fallback?.trim() || "RyvonX Pool Manager";
}

function basePoolVariables(pool: PoolRow, manager: string) {
  return {
    pool_name: pool.name,
    manager_name: manager,
    minimum_investment: money(pool.min_investment),
    target_capital: money(pool.target_capital),
    payout_duration: durationLabel(pool.pool_duration_days),
    pool_url: `${APP_URL}/marketplace/${pool.slug}`,
  };
}

async function buildVariables(event: PlatformEvent): Promise<Record<string, string | number>> {
  const db = createAdminClient();

  if (event.eventType === "pool.published") {
    if (!event.entityId) throw new Error("Pool publication event has no pool identifier.");
    const pool = await readPool(event.entityId);
    const manager = await managerName(pool.pool_manager_id, pool.pool_manager_name);
    return basePoolVariables(pool, manager);
  }

  let cycleId: string | null = null;
  let profitAmount: number | null = null;
  let settlement: {
    investor_distribution_total: number | string | null;
    cycle_capital: number | string | null;
    distributed_at: string | null;
  } | null = null;

  if (event.eventType === "trade.profit_recorded") {
    if (!event.entityId) throw new Error("Profit event has no trade identifier.");
    const { data, error } = await db
      .from("trade_entries")
      .select("investment_cycle_id, realized_pnl")
      .eq("id", event.entityId)
      .single();
    if (error || !data) throw new Error(error?.message ?? "Trade not found for automated communication.");
    const trade = data as { investment_cycle_id: string; realized_pnl: number | string | null };
    cycleId = trade.investment_cycle_id;
    profitAmount = Number(trade.realized_pnl ?? 0);
  } else if (event.eventType === "distribution.completed") {
    if (!event.entityId) throw new Error("Distribution event has no settlement identifier.");
    const { data, error } = await db
      .from("profit_settlements")
      .select("investment_cycle_id, investor_distribution_total, cycle_capital, distributed_at")
      .eq("id", event.entityId)
      .single();
    if (error || !data) throw new Error(error?.message ?? "Settlement not found for automated communication.");
    const row = data as {
      investment_cycle_id: string;
      investor_distribution_total: number | string | null;
      cycle_capital: number | string | null;
      distributed_at: string | null;
    };
    cycleId = row.investment_cycle_id;
    settlement = row;
  } else {
    cycleId = event.entityId;
  }

  if (!cycleId) throw new Error("Pool activity event has no cycle identifier.");
  const cycle = await readCycle(cycleId);
  if (!cycle.fund_id) throw new Error("Cycle is not linked to a marketplace pool.");
  const pool = await readPool(cycle.fund_id);
  const manager = await managerName(cycle.pool_manager_id, pool.pool_manager_name);
  const common = {
    ...basePoolVariables(pool, manager),
    cycle_name: cycle.name,
    minimum_investment: money(cycle.min_investment ?? pool.min_investment),
    target_capital: money(cycle.target_capital ?? pool.target_capital),
    payout_duration: durationLabel(cycle.duration_days ?? pool.pool_duration_days),
    funding_deadline: dateLabel(cycle.funding_deadline),
    raised_capital: money(cycle.raised_capital),
    investor_count: cycle.investor_count ?? 0,
    trading_start_date: dateLabel(cycle.trading_started_at, dateLabel(event.createdAt)),
    cycle_profit_total: money(cycle.current_cycle_profit),
  };

  if (event.eventType === "trade.profit_recorded") {
    return { ...common, profit_amount: money(profitAmount) };
  }
  if (event.eventType === "distribution.completed" && settlement) {
    return {
      ...common,
      distributed_profit: money(settlement.investor_distribution_total),
      cycle_capital: money(settlement.cycle_capital),
      distribution_date: dateLabel(settlement.distributed_at, dateLabel(event.createdAt)),
    };
  }
  return common;
}

async function alreadyCreated(input: {
  eventId: string;
  templateSlug: string;
  relatedEntityType: string;
  recipientUserId?: string;
}): Promise<boolean> {
  const db = createAdminClient();
  let query = db
    .from("communications")
    .select("id", { count: "exact", head: true })
    .eq("template_slug", input.templateSlug)
    .eq("related_entity_type", input.relatedEntityType)
    .eq("related_entity_id", input.eventId);
  if (input.recipientUserId) query = query.eq("recipient_user_id", input.recipientUserId);
  const { count } = await query;
  return (count ?? 0) > 0;
}

async function fallbackActorId(event: PlatformEvent): Promise<string> {
  if (event.actorId) return event.actorId;
  const db = createAdminClient();
  const { data } = await db
    .from("profiles")
    .select("id")
    .eq("role", "administrator")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  const id = (data as { id?: string } | null)?.id;
  if (!id) throw new Error("No active administrator is available for the automated publication audit record.");
  return id;
}

export const automatedPoolBroadcastService = {
  async dispatch(event: PlatformEvent, action: AutomationRuleAction): Promise<void> {
    if (!action.templateSlug) throw new Error("Automated broadcast action has no template.");
    const channels = [...new Set(action.channels ?? ["telegram"])] as CommunicationChannel[];
    const unsupported = channels.filter((channel) => !["telegram", ...USER_CHANNELS].includes(channel));
    if (unsupported.length > 0) throw new Error(`Unsupported automated broadcast channel: ${unsupported.join(", ")}`);

    const variables = await buildVariables(event);
    const actorId = await fallbackActorId(event);

    if (channels.includes("telegram")) {
      const exists = await alreadyCreated({
        eventId: event.id,
        templateSlug: action.templateSlug,
        relatedEntityType: "automated_pool_activity_telegram",
      });
      if (!exists) {
        await communicationService.send({
          templateSlug: action.templateSlug,
          recipientUserId: actorId,
          variables,
          channels: ["telegram"],
          category: "announcements",
          priority: "normal",
          metadata: {
            automated_pool_activity: true,
            telegram_broadcast: true,
            audience: "all",
            platform_event_id: event.id,
            platform_event_type: event.eventType,
          },
          relatedEntityType: "automated_pool_activity_telegram",
          relatedEntityId: event.id,
          triggeredBy: actorId,
        });
      }
    }

    const requestedUserChannels = channels.filter((channel) => USER_CHANNELS.includes(channel));
    if (requestedUserChannels.length === 0) return;

    const db = createAdminClient();
    const { data: profiles, error } = await db
      .from("profiles")
      .select("id, email")
      .eq("is_active", true);
    if (error) throw new Error(error.message);

    const recipients = (profiles ?? []) as Array<{ id: string; email: string | null }>;
    const batchSize = 10;
    for (let index = 0; index < recipients.length; index += batchSize) {
      const batch = recipients.slice(index, index + batchSize);
      await Promise.all(batch.map(async (recipient) => {
        const effectiveChannels = requestedUserChannels.filter(
          (channel) => channel !== "email" || Boolean(recipient.email?.trim())
        );
        if (effectiveChannels.length === 0) return;
        if (await alreadyCreated({
          eventId: event.id,
          templateSlug: action.templateSlug!,
          relatedEntityType: "automated_pool_activity_user",
          recipientUserId: recipient.id,
        })) return;

        const userVariables = await buildUserCommunicationVariables(recipient.id, variables);
        await communicationService.send({
          templateSlug: action.templateSlug!,
          recipientUserId: recipient.id,
          variables: userVariables,
          channels: effectiveChannels,
          category: "announcements",
          priority: "normal",
          metadata: {
            automated_pool_activity: true,
            audience: action.audience ?? "all_active",
            platform_event_id: event.id,
            platform_event_type: event.eventType,
          },
          relatedEntityType: "automated_pool_activity_user",
          relatedEntityId: event.id,
          triggeredBy: actorId,
        });
      }));
    }

    if (requestedUserChannels.includes("email")) {
      void emailQueueService.processPending(100).catch((error) => {
        console.error("[automatedPoolBroadcast] Email queue processing failed:", error);
      });
    }
  },
};

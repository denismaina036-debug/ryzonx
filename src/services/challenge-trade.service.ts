import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { notificationService } from "@/services/notification.service";
import {
  CHALLENGE_TRADE_STATUS,
  type ChallengeTrade,
  type ChallengeTradeDirection,
  type ChallengeTradeStatus,
  type CreateChallengeTradeInput,
  type UpdateChallengeTradeInput,
} from "@/domain/challenge/types";

type TradeRow = {
  id: string;
  enrollment_id: string;
  user_id: string;
  trading_day: number;
  trade_date: string;
  instrument: string;
  market: string | null;
  direction: string;
  entry_price: string | number;
  exit_price: string | number;
  lot_size: string | number;
  profit_loss: string | number;
  notes: string | null;
  screenshot_url: string | null;
  status: string;
  rejection_reason: string | null;
  review_notes: string | null;
  source: string;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

function mapTrade(row: TradeRow): ChallengeTrade {
  return {
    id: row.id,
    enrollmentId: row.enrollment_id,
    userId: row.user_id,
    tradingDay: row.trading_day,
    tradeDate: row.trade_date,
    instrument: row.instrument,
    market: row.market,
    direction: row.direction as ChallengeTradeDirection,
    entryPrice: toNumber(row.entry_price),
    exitPrice: toNumber(row.exit_price),
    lotSize: toNumber(row.lot_size),
    profitLoss: toNumber(row.profit_loss),
    notes: row.notes,
    screenshotUrl: row.screenshot_url,
    status: row.status as ChallengeTradeStatus,
    rejectionReason: row.rejection_reason,
    reviewNotes: row.review_notes,
    source: row.source as ChallengeTrade["source"],
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function requireActiveEnrollment(enrollmentId: string, userId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("trader_challenge_enrollments")
    .select("id, user_id, status")
    .eq("id", enrollmentId)
    .maybeSingle();

  if (!data) throw new Error("Challenge enrollment not found.");
  const row = data as { id: string; user_id: string; status: string };
  if (row.user_id !== userId) throw new Error("Insufficient permissions.");
  if (row.status !== "active") {
    throw new Error("Trades can only be submitted while the challenge is active.");
  }
  return row;
}

export const challengeTradeService = {
  async listByEnrollment(
    enrollmentId: string,
    options?: { userId?: string }
  ): Promise<ChallengeTrade[]> {
    const db = createAdminClient();
    let requestUserId = options?.userId;

    if (!requestUserId) {
      const user = await requireAuth();
      requestUserId = user.id;
    }

    const { data: enrollment } = await db
      .from("trader_challenge_enrollments")
      .select("user_id")
      .eq("id", enrollmentId)
      .maybeSingle();

    if (!enrollment) return [];
    const ownerId = (enrollment as { user_id: string }).user_id;

    if (ownerId !== requestUserId) {
      // Allow admin reads when no explicit userId override was passed.
      if (!options?.userId) {
        const user = await requireAuth();
        if (user.role !== USER_ROLES.ADMINISTRATOR) {
          throw new Error("Insufficient permissions.");
        }
      } else {
        throw new Error("Insufficient permissions.");
      }
    }

    const { data, error } = await db
      .from("challenge_trades")
      .select("*")
      .eq("enrollment_id", enrollmentId)
      .order("trade_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return ((data ?? []) as TradeRow[]).map(mapTrade);
  },

  async createTrade(
    enrollmentId: string,
    input: CreateChallengeTradeInput
  ): Promise<ChallengeTrade> {
    const user = await requireAuth();
    await requireActiveEnrollment(enrollmentId, user.id);

    if (!input.instrument?.trim()) throw new Error("Instrument is required.");
    if (!input.tradeDate) throw new Error("Trade date is required.");

    const db = createAdminClient();
    const { data, error } = await db
      .from("challenge_trades")
      .insert({
        enrollment_id: enrollmentId,
        user_id: user.id,
        trading_day: input.tradingDay,
        trade_date: input.tradeDate,
        instrument: input.instrument.trim(),
        market: input.market?.trim() || null,
        direction: input.direction,
        entry_price: input.entryPrice,
        exit_price: input.exitPrice,
        lot_size: input.lotSize,
        profit_loss: input.profitLoss,
        notes: input.notes?.trim() || null,
        screenshot_url: input.screenshotUrl?.trim() || null,
        status: CHALLENGE_TRADE_STATUS.PENDING_REVIEW,
        source: "manual",
      } as never)
      .select("*")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Could not submit trade.");

    const { data: admins } = await db
      .from("profiles")
      .select("id")
      .eq("role", USER_ROLES.ADMINISTRATOR);

    for (const admin of (admins ?? []) as Array<{ id: string }>) {
      await notificationService.sendToUser({
        userId: admin.id,
        type: "admin_message",
        title: "Challenge trade submitted",
        message: `${user.fullName} submitted a trade for review (${input.instrument}).`,
        metadata: { enrollment_id: enrollmentId, trade_id: (data as TradeRow).id },
      });
    }

    return mapTrade(data as TradeRow);
  },

  async updateRejectedTrade(
    tradeId: string,
    input: UpdateChallengeTradeInput
  ): Promise<ChallengeTrade> {
    const user = await requireAuth();
    const db = createAdminClient();

    const { data: existing } = await db
      .from("challenge_trades")
      .select("*")
      .eq("id", tradeId)
      .maybeSingle();

    if (!existing) throw new Error("Trade not found.");
    const row = existing as TradeRow;
    if (row.user_id !== user.id) throw new Error("Insufficient permissions.");
    if (row.status !== CHALLENGE_TRADE_STATUS.REJECTED) {
      throw new Error("Only rejected trades can be edited and resubmitted.");
    }

    await requireActiveEnrollment(row.enrollment_id, user.id);

    const { data, error } = await db
      .from("challenge_trades")
      .update({
        trading_day: input.tradingDay ?? row.trading_day,
        trade_date: input.tradeDate ?? row.trade_date,
        instrument: input.instrument?.trim() ?? row.instrument,
        market: input.market?.trim() ?? row.market,
        direction: input.direction ?? row.direction,
        entry_price: input.entryPrice ?? row.entry_price,
        exit_price: input.exitPrice ?? row.exit_price,
        lot_size: input.lotSize ?? row.lot_size,
        profit_loss: input.profitLoss ?? row.profit_loss,
        notes: input.notes?.trim() ?? row.notes,
        screenshot_url: input.screenshotUrl?.trim() ?? row.screenshot_url,
        status: CHALLENGE_TRADE_STATUS.PENDING_REVIEW,
        rejection_reason: null,
        review_notes: null,
        reviewer_id: null,
        reviewed_at: null,
      } as never)
      .eq("id", tradeId)
      .select("*")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Update failed.");
    return mapTrade(data as TradeRow);
  },

  async reviewTrade(input: {
    tradeId: string;
    action: "approve" | "reject";
    reviewNotes?: string;
    rejectionReason?: string;
  }): Promise<ChallengeTrade> {
    const admin = await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    const { data: existing } = await db
      .from("challenge_trades")
      .select("*")
      .eq("id", input.tradeId)
      .maybeSingle();

    if (!existing) throw new Error("Trade not found.");
    const row = existing as TradeRow;

    if (row.status !== CHALLENGE_TRADE_STATUS.PENDING_REVIEW) {
      throw new Error("This trade has already been reviewed.");
    }

    if (input.action === "reject" && !input.rejectionReason?.trim()) {
      throw new Error("A rejection reason is required.");
    }

    const newStatus =
      input.action === "approve"
        ? CHALLENGE_TRADE_STATUS.APPROVED
        : CHALLENGE_TRADE_STATUS.REJECTED;

    const { data, error } = await db
      .from("challenge_trades")
      .update({
        status: newStatus,
        review_notes: input.reviewNotes?.trim() || null,
        rejection_reason:
          input.action === "reject" ? input.rejectionReason?.trim() : null,
        reviewer_id: admin.id,
        reviewed_at: new Date().toISOString(),
      } as never)
      .eq("id", input.tradeId)
      .select("*")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Review failed.");

    const trade = mapTrade(data as TradeRow);

    await notificationService.sendToUser({
      userId: row.user_id,
      type: input.action === "approve" ? "pm_challenge_started" : "pm_strategy_changes",
      title: input.action === "approve" ? "Trade approved" : "Trade rejected",
      message:
        input.action === "approve"
          ? `Your ${row.instrument} trade was approved and counted toward challenge progress.`
          : `Your ${row.instrument} trade was rejected: ${input.rejectionReason?.trim()}`,
      metadata: { trade_id: trade.id, enrollment_id: row.enrollment_id },
    });

    if (input.action === "approve") {
      const { challengeCenterService } = await import("@/services/challenge-center.service");
      await challengeCenterService.checkAndCompleteChallenge(row.enrollment_id);
    }

    return trade;
  },

  async getTradeForAdmin(tradeId: string): Promise<ChallengeTrade | null> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const supabase = await createClient();
    const { data } = await supabase
      .from("challenge_trades")
      .select("*")
      .eq("id", tradeId)
      .maybeSingle();
    return data ? mapTrade(data as TradeRow) : null;
  },
};

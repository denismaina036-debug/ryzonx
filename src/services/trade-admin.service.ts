import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { communicationTriggers } from "@/services/communication";
import { formatMoney } from "@/services/communication/user-variables";
import {
  TRADE_SCREENSHOT_BUCKET,
  TRADE_SCREENSHOT_MAX_BYTES,
  extensionForMime,
  isAllowedScreenshotMime,
} from "@/lib/storage/trade-screenshots";
import type { AdminTrade } from "@/features/admin/types";
import type { Tables } from "@/types/database.types";

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

type TradeRow = Tables<"trades"> & { funds?: { name: string } | null };

type PoolMemberRow = {
  user_id: string;
  total_invested: number;
  profiles: { full_name: string; email: string } | null;
};

export interface PoolMemberOption {
  userId: string;
  fullName: string;
  email: string;
  totalInvested: number;
}

export interface CreateAdminTradeInput {
  fundId: string;
  distributionMode: "pool" | "individual";
  targetUserId?: string;
  symbol: string;
  direction: "long" | "short";
  entryPrice: number;
  exitPrice?: number | null;
  currentPrice?: number | null;
  quantity: number;
  investedAmount: number;
  totalProfit: number;
  status: "open" | "closed" | "cancelled";
  investorStatus?: string;
  notes?: string;
  screenshotUrl?: string;
}

function mapTradeRow(row: TradeRow): AdminTrade {
  const fundName =
    row.funds && typeof row.funds === "object" && "name" in row.funds
      ? String(row.funds.name)
      : "—";

  return {
    id: row.id,
    fundId: row.fund_id,
    fundName,
    symbol: row.symbol,
    direction: row.direction,
    entryPrice: toNumber(row.entry_price),
    exitPrice: row.exit_price != null ? toNumber(row.exit_price) : null,
    stopLoss: null,
    takeProfit: null,
    quantity: toNumber(row.quantity),
    pnl: row.pnl != null ? toNumber(row.pnl) : null,
    pnlPercentage: row.pnl_percentage != null ? toNumber(row.pnl_percentage) : null,
    status: row.status,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    notes: row.notes,
    publishedAt: row.published_at,
    screenshotUrl: row.chart_screenshot_url,
  };
}

function distributeProRata(
  totalProfit: number,
  members: Array<{ userId: string; totalInvested: number }>
): Map<string, number> {
  const poolTotal = members.reduce((sum, member) => sum + member.totalInvested, 0);
  if (poolTotal <= 0 || members.length === 0) return new Map();

  const shares = new Map<string, number>();
  let allocated = 0;
  const sorted = [...members].sort((a, b) => b.totalInvested - a.totalInvested);

  for (let i = 0; i < sorted.length; i++) {
    const member = sorted[i];
    if (!member) continue;
    let share: number;
    if (i === sorted.length - 1) {
      share = Math.round((totalProfit - allocated) * 100) / 100;
    } else {
      share = Math.round(totalProfit * (member.totalInvested / poolTotal) * 100) / 100;
      allocated += share;
    }
    shares.set(member.userId, share);
  }

  return shares;
}

function resolveInvestorStatus(
  status: CreateAdminTradeInput["status"],
  investorStatus?: string
): string {
  if (investorStatus?.trim()) return investorStatus.trim();
  if (status === "closed") return "closed";
  if (status === "cancelled") return "cancelled";
  return "running";
}

export const tradeAdminService = {
  async getTrades(): Promise<AdminTrade[]> {
    await requireRole("administrator");
    const db = createAdminClient();

    const { data, error } = await db
      .from("trades")
      .select("*, funds(name)")
      .order("opened_at", { ascending: false });

    if (error) throw new Error(error.message);
    return ((data ?? []) as TradeRow[]).map(mapTradeRow);
  },

  async getPoolMembers(fundId: string): Promise<PoolMemberOption[]> {
    await requireRole("administrator");
    const db = createAdminClient();

    const { data, error } = await db
      .from("investor_portfolios")
      .select("user_id, total_invested, profiles(full_name, email)")
      .eq("fund_id", fundId)
      .gt("total_invested", 0)
      .order("total_invested", { ascending: false });

    if (error) throw new Error(error.message);

    return ((data ?? []) as PoolMemberRow[]).map((row) => ({
      userId: row.user_id,
      fullName: row.profiles?.full_name ?? "Investor",
      email: row.profiles?.email ?? "",
      totalInvested: toNumber(row.total_invested),
    }));
  },

  async updateTradeScreenshot(tradeId: string, screenshotUrl: string): Promise<void> {
    await requireRole("administrator");
    const db = createAdminClient();

    const { error } = await db
      .from("trades")
      .update({ chart_screenshot_url: screenshotUrl || null } as never)
      .eq("id", tradeId);

    if (error) throw new Error(error.message);
  },

  async uploadTradeScreenshot(
    file: Blob,
    mimeType: string,
    options?: { tradeId?: string; adminId?: string }
  ): Promise<string> {
    await requireRole("administrator");
    const db = createAdminClient();

    if (!isAllowedScreenshotMime(mimeType)) {
      throw new Error("Screenshot must be a JPEG, PNG, WebP, or GIF image.");
    }

    if (file.size > TRADE_SCREENSHOT_MAX_BYTES) {
      throw new Error("Screenshot must be 5 MB or smaller.");
    }

    if (file.size === 0) {
      throw new Error("Screenshot file is empty.");
    }

    const ext = extensionForMime(mimeType);
    const folder = options?.tradeId
      ? options.tradeId
      : `pending/${options?.adminId ?? "admin"}`;
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await db.storage
      .from(TRADE_SCREENSHOT_BUCKET)
      .upload(path, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) throw new Error(uploadError.message);

    const { data } = db.storage.from(TRADE_SCREENSHOT_BUCKET).getPublicUrl(path);
    if (!data.publicUrl) throw new Error("Failed to resolve screenshot URL.");
    return data.publicUrl;
  },

  async createTrade(input: CreateAdminTradeInput): Promise<AdminTrade> {
    const admin = await requireRole("administrator");
    const db = createAdminClient();

    if (!input.fundId) throw new Error("Select a pool.");
    if (!input.symbol.trim()) throw new Error("Trading pair is required.");
    if (input.investedAmount <= 0) throw new Error("Invested amount must be greater than zero.");
    if (input.quantity <= 0) throw new Error("Quantity must be greater than zero.");
    if (input.entryPrice <= 0) throw new Error("Entry price must be greater than zero.");

    const { data: fund } = await db
      .from("funds")
      .select("id, name, pool_value")
      .eq("id", input.fundId)
      .maybeSingle();

    if (!fund) throw new Error("Pool not found.");

    const members = await this.getPoolMembers(input.fundId);
    if (members.length === 0) {
      throw new Error("This pool has no participating investors yet.");
    }

    if (input.distributionMode === "individual") {
      if (!input.targetUserId) throw new Error("Select an investor for individual profit allocation.");
      const isMember = members.some((m) => m.userId === input.targetUserId);
      if (!isMember) throw new Error("Selected investor is not in this pool.");
    }

    const totalProfit = toNumber(input.totalProfit);
    const pnlPercentage =
      input.investedAmount > 0
        ? Math.round((totalProfit / input.investedAmount) * 10000) / 100
        : null;

    const isClosed = input.status === "closed";
    const isCancelled = input.status === "cancelled";
    const now = new Date().toISOString();
    const investorStatus = resolveInvestorStatus(input.status, input.investorStatus);

    const profitShares =
      input.distributionMode === "individual"
        ? new Map([[input.targetUserId!, totalProfit]])
        : distributeProRata(
            totalProfit,
            members.map((m) => ({ userId: m.userId, totalInvested: m.totalInvested }))
          );

    const { data: trade, error: tradeError } = await db
      .from("trades")
      .insert({
        fund_id: input.fundId,
        symbol: input.symbol.trim().toUpperCase(),
        direction: input.direction,
        entry_price: input.entryPrice,
        exit_price: isClosed ? (input.exitPrice ?? input.currentPrice ?? null) : null,
        current_price: !isClosed && !isCancelled ? (input.currentPrice ?? input.entryPrice) : null,
        quantity: input.quantity,
        invested_amount: input.investedAmount,
        pnl: totalProfit,
        pnl_percentage: pnlPercentage,
        status: input.status,
        investor_status: investorStatus,
        notes: input.notes?.trim() || null,
        chart_screenshot_url: input.screenshotUrl?.trim() || null,
        created_by: admin.id,
        opened_at: now,
        closed_at: isClosed || isCancelled ? now : null,
        published_at: isClosed ? now : null,
      } as never)
      .select("*, funds(name)")
      .single();

    if (tradeError || !trade) {
      throw new Error(tradeError?.message ?? "Failed to create trade.");
    }

    const tradeId = (trade as TradeRow).id;
    const fundName = (fund as { name: string }).name;

    for (const [userId, share] of profitShares) {
      if (share === 0) continue;

      const { data: portfolio } = await db
        .from("investor_portfolios")
        .select("unrealized_pnl, realized_pnl, current_value")
        .eq("user_id", userId)
        .eq("fund_id", input.fundId)
        .maybeSingle();

      const row = portfolio as {
        unrealized_pnl?: number;
        realized_pnl?: number;
        current_value?: number;
      } | null;

      const updates: Record<string, number> = {
        current_value: toNumber(row?.current_value) + share,
      };

      if (isClosed) {
        updates.realized_pnl = toNumber(row?.realized_pnl) + share;
      } else if (!isCancelled) {
        updates.unrealized_pnl = toNumber(row?.unrealized_pnl) + share;
      }

      await db
        .from("investor_portfolios")
        .update(updates as never)
        .eq("user_id", userId)
        .eq("fund_id", input.fundId);

      await db.from("transactions").insert({
        user_id: userId,
        fund_id: input.fundId,
        type: "adjustment",
        amount: Math.abs(share),
        status: "completed",
        payment_method: "trade_profit",
        notes:
          input.distributionMode === "individual"
            ? `Individual trade profit: ${input.symbol} (${fundName})`
            : `Pool trade profit share: ${input.symbol} (${fundName})`,
        reference: tradeId,
        processed_by: admin.id,
        processed_at: now,
      } as never);

      const profitLabel = share >= 0 ? "profit" : "loss";
      await communicationTriggers.poolProfitShare({
        userId,
        amount: formatMoney(Math.abs(share)),
        poolName: fundName,
        poolId: input.fundId,
        profitLabel,
      });
    }

    const { data: poolStats } = await db
      .from("pool_stats")
      .select("total_pool_value, total_closed_trades")
      .eq("fund_id", input.fundId)
      .maybeSingle();

    const statsRow = poolStats as {
      total_pool_value?: number;
      total_closed_trades?: number;
    } | null;

    await db
      .from("pool_stats")
      .update({
        total_pool_value: toNumber(statsRow?.total_pool_value) + totalProfit,
        total_closed_trades: toNumber(statsRow?.total_closed_trades) + (isClosed ? 1 : 0),
      } as never)
      .eq("fund_id", input.fundId);

    await db
      .from("funds")
      .update({
        pool_value: toNumber((fund as { pool_value?: number }).pool_value) + totalProfit,
      } as never)
      .eq("id", input.fundId);

    return mapTradeRow(trade as TradeRow);
  },
};

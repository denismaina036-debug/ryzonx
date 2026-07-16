import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { notificationService } from "@/services/notification.service";
import type { ReturnTier } from "@/features/investor/types/account";
import type { AdminFund } from "@/features/admin/types";

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type FundRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  is_default: boolean;
  min_investment: number;
  max_investment: number | null;
  pool_value: number;
  assets_under_management: number;
  active_investors: number;
  current_roi: number;
  pool_description: string | null;
  trading_pair: string | null;
  pool_duration_days: number | null;
  target_capital: number | null;
  profit_target_pct: number | null;
  target_investors: number | null;
  return_tiers: ReturnTier[] | null;
  is_invite_only: boolean;
  current_capital: number | null;
  card_background_color: string | null;
  pool_manager_name: string | null;
  pool_manager_icon_url: string | null;
  created_at: string;
  is_marketplace_listed?: boolean;
  featured?: boolean;
  tagline?: string | null;
  categories?: string[] | null;
  security_rating?: string | null;
  aggressiveness_level?: string | null;
  pool_health?: string;
  capacity_status?: string;
  ryvonx_rating?: number | null;
  suggested_investment?: number | null;
  risk_summary?: string | null;
  admin_comments?: string | null;
  cover_image_url?: string | null;
  logo_url?: string | null;
  lifecycle_status?: string;
  max_aum?: number | null;
  max_investors_cap?: number | null;
};

function mapFund(row: FundRow, canDelete = false): AdminFund {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
    status: row.status as AdminFund["status"],
    isDefault: row.is_default,
    minInvestment: toNumber(row.min_investment),
    maxInvestment: row.max_investment != null ? toNumber(row.max_investment) : null,
    poolValue: toNumber(row.pool_value),
    assetsUnderManagement: toNumber(row.assets_under_management),
    activeInvestors: toNumber(row.active_investors),
    currentRoi: toNumber(row.current_roi),
    createdAt: row.created_at,
    poolDescription: row.pool_description ?? row.description ?? "",
    tradingPair: row.trading_pair ?? "—",
    poolDurationDays: row.pool_duration_days ?? null,
    targetCapital: toNumber(row.target_capital),
    profitTargetPct: toNumber(row.profit_target_pct),
    targetInvestors: row.target_investors ?? 0,
    returnTiers: Array.isArray(row.return_tiers) ? row.return_tiers : [],
    isInviteOnly: row.is_invite_only,
    currentCapital: toNumber(row.current_capital),
    cardBackgroundColor: row.card_background_color ?? null,
    poolManagerName: row.pool_manager_name ?? null,
    poolManagerIconUrl: row.pool_manager_icon_url ?? null,
    canDelete,
    isMarketplaceListed: Boolean(row.is_marketplace_listed),
    featured: Boolean(row.featured),
    tagline: row.tagline ?? null,
    categories: row.categories ?? [],
    securityRating: row.security_rating ?? null,
    aggressivenessLevel: row.aggressiveness_level ?? null,
    poolHealth: row.pool_health ?? "healthy",
    capacityStatus: row.capacity_status ?? "open",
    ryvonxRating: row.ryvonx_rating != null ? toNumber(row.ryvonx_rating) : null,
    suggestedInvestment:
      row.suggested_investment != null ? toNumber(row.suggested_investment) : null,
    riskSummary: row.risk_summary ?? null,
    adminComments: row.admin_comments ?? null,
    coverImageUrl: row.cover_image_url ?? null,
    logoUrl: row.logo_url ?? null,
    lifecycleStatus: row.lifecycle_status ?? "live",
    maxAum: row.max_aum != null ? toNumber(row.max_aum) : null,
    maxInvestorsCap: row.max_investors_cap != null ? toNumber(row.max_investors_cap) : null,
  };
}

async function getDeletableFundIds(
  db: ReturnType<typeof createAdminClient>,
  rows: FundRow[]
): Promise<Set<string>> {
  const candidates = rows.filter((row) => !row.is_default).map((row) => row.id);
  if (candidates.length === 0) return new Set();

  const { data, error } = await db
    .from("investor_portfolios")
    .select("fund_id")
    .in("fund_id", candidates)
    .gt("total_invested", 0);

  if (error) throw new Error(error.message);

  const blocked = new Set(
    ((data ?? []) as Array<{ fund_id: string }>).map((row) => row.fund_id)
  );

  return new Set(candidates.filter((id) => !blocked.has(id)));
}

export const poolAdminService = {
  async getFunds(): Promise<AdminFund[]> {
    await requireRole("administrator");
    const db = createAdminClient();

    const { data, error } = await db.from("funds").select("*").neq("status", "archived").order("created_at");
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as FundRow[];
    const deletableIds = await getDeletableFundIds(db, rows);

    return rows.map((row) => mapFund(row, deletableIds.has(row.id)));
  },

  async createFund(input: {
    name: string;
    description: string;
    poolDescription: string;
    tradingPair: string;
    poolDurationDays: number;
    minInvestment: number;
    maxInvestment?: number | null;
    targetCapital: number;
    profitTargetPct: number;
    targetInvestors: number;
    returnTiers: ReturnTier[];
    isInviteOnly?: boolean;
    status?: string;
    cardBackgroundColor?: string | null;
    poolManagerName?: string | null;
    poolManagerIconUrl?: string | null;
  }): Promise<AdminFund> {
    await requireRole("administrator");
    const db = createAdminClient();

    const slug = `${slugify(input.name)}-${Date.now().toString(36)}`;

    const { data, error } = await db
      .from("funds")
      .insert({
        name: input.name.trim(),
        slug,
        description: input.description.trim(),
        pool_description: input.poolDescription.trim(),
        trading_pair: input.tradingPair.trim(),
        pool_duration_days: input.poolDurationDays,
        min_investment: input.minInvestment,
        max_investment: input.maxInvestment ?? null,
        target_capital: input.targetCapital,
        profit_target_pct: input.profitTargetPct,
        target_investors: input.targetInvestors,
        return_tiers: input.returnTiers,
        is_invite_only: input.isInviteOnly ?? false,
        status: input.status ?? "active",
        is_default: false,
        card_background_color: input.cardBackgroundColor?.trim() || null,
        pool_manager_name: input.poolManagerName?.trim() || null,
        pool_manager_icon_url: input.poolManagerIconUrl?.trim() || null,
      } as never)
      .select("*")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Failed to create pool.");
    const fund = mapFund(data as FundRow, false);

    const { data: investors } = await db
      .from("profiles")
      .select("id")
      .eq("role", "investor");

    for (const inv of (investors ?? []) as Array<{ id: string }>) {
      await notificationService.sendToUser({
        userId: inv.id,
        type: "pool_trading",
        title: "New pool available",
        message: `${fund.name} is open for participation.`,
        metadata: { fund_id: fund.id },
      });
    }

    return fund;
  },

  async updateFund(
    fundId: string,
    input: Partial<{
      name: string;
      description: string;
      poolDescription: string;
      tradingPair: string;
      poolDurationDays: number;
      minInvestment: number;
      maxInvestment: number | null;
      targetCapital: number;
      profitTargetPct: number;
      targetInvestors: number;
      returnTiers: ReturnTier[];
      isInviteOnly: boolean;
      status: string;
      cardBackgroundColor?: string | null;
      poolManagerName?: string | null;
      poolManagerIconUrl?: string | null;
      additionalCapital?: number;
    }>
  ): Promise<AdminFund> {
    await requireRole("administrator");
    const db = createAdminClient();

    const { data: existing } = await db
      .from("funds")
      .select("current_capital, is_default")
      .eq("id", fundId)
      .maybeSingle();

    if (!existing) throw new Error("Pool not found.");

    const updates: Record<string, unknown> = {};
    if (input.name != null) updates.name = input.name.trim();
    if (input.description != null) updates.description = input.description.trim();
    if (input.poolDescription != null) updates.pool_description = input.poolDescription.trim();
    if (input.tradingPair != null) updates.trading_pair = input.tradingPair.trim();
    if (input.poolDurationDays != null) updates.pool_duration_days = input.poolDurationDays;
    if (input.minInvestment != null) updates.min_investment = input.minInvestment;
    if (input.maxInvestment !== undefined) updates.max_investment = input.maxInvestment;
    if (input.targetCapital != null) updates.target_capital = input.targetCapital;
    if (input.profitTargetPct != null) updates.profit_target_pct = input.profitTargetPct;
    if (input.targetInvestors != null) updates.target_investors = input.targetInvestors;
    if (input.returnTiers != null) updates.return_tiers = input.returnTiers;
    if (input.isInviteOnly != null) updates.is_invite_only = input.isInviteOnly;
    if (input.status != null) updates.status = input.status;
    if (input.cardBackgroundColor !== undefined) {
      updates.card_background_color = input.cardBackgroundColor?.trim() || null;
    }
    if (input.poolManagerName !== undefined) {
      updates.pool_manager_name = input.poolManagerName?.trim() || null;
    }
    if (input.poolManagerIconUrl !== undefined) {
      updates.pool_manager_icon_url = input.poolManagerIconUrl?.trim() || null;
    }

    if (input.additionalCapital != null && input.additionalCapital > 0) {
      const row = existing as { current_capital?: number };
      updates.current_capital = toNumber(row.current_capital) + input.additionalCapital;
    }

    const { data, error } = await db
      .from("funds")
      .update(updates as never)
      .eq("id", fundId)
      .select("*")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Failed to update pool.");

    if (input.status === "active") {
      const fund = data as FundRow;
      const { data: investors } = await db
        .from("profiles")
        .select("id")
        .eq("role", "investor");

      for (const inv of (investors ?? []) as Array<{ id: string }>) {
        await notificationService.sendToUser({
          userId: inv.id,
          type: "pool_trading",
          title: "New pool available",
          message: `${fund.name} is now open for participation.`,
          metadata: { fund_id: fundId },
        });
      }
    }

    return mapFund(
      data as FundRow,
      (existing as { is_default: boolean }).is_default
        ? false
        : (await getDeletableFundIds(db, [data as FundRow])).has(fundId)
    );
  },

  async deleteFund(fundId: string): Promise<void> {
    await requireRole("administrator");
    const db = createAdminClient();

    const { data: fund } = await db
      .from("funds")
      .select("id, name, is_default, status")
      .eq("id", fundId)
      .maybeSingle();

    if (!fund) throw new Error("Pool not found.");

    const fundRow = fund as { id: string; name: string; is_default: boolean; status: string };
    if (fundRow.is_default) throw new Error("The default pool cannot be deleted.");

    const deletableIds = await getDeletableFundIds(db, [
      { is_default: fundRow.is_default, id: fundId } as FundRow,
    ]);
    if (!deletableIds.has(fundId)) {
      throw new Error(
        "Pool cannot be deleted until all investors have settled and left (no active allocations)."
      );
    }

    const { error: deleteError } = await db.from("funds").delete().eq("id", fundId);
    if (deleteError) {
      const { error: archiveError } = await db
        .from("funds")
        .update({ status: "archived" } as never)
        .eq("id", fundId);
      if (archiveError) throw new Error(archiveError.message);
    }
  },

  async inviteInvestor(fundId: string, userId: string): Promise<void> {
    const admin = await requireRole("administrator");
    const db = createAdminClient();

    const { data: fund } = await db
      .from("funds")
      .select("id, name")
      .eq("id", fundId)
      .maybeSingle();

    if (!fund) throw new Error("Pool not found.");

    const { error } = await db.from("pool_invitations").upsert(
      {
        fund_id: fundId,
        user_id: userId,
        invited_by: admin.id,
        status: "pending",
      } as never,
      { onConflict: "fund_id,user_id" }
    );

    if (error) throw new Error(error.message);

    await notificationService.sendToUser({
      userId,
      type: "pool_invitation",
      title: "Pool invitation",
      message: `You've been invited to join ${(fund as { name: string }).name}.`,
      metadata: { fund_id: fundId },
    });
  },

  async getInvestorsForInvite(): Promise<Array<{ id: string; fullName: string; email: string }>> {
    await requireRole("administrator");
    const db = createAdminClient();
    const { data } = await db
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "investor")
      .order("full_name");

    return ((data ?? []) as Array<{ id: string; full_name: string; email: string }>).map(
      (p) => ({
        id: p.id,
        fullName: p.full_name,
        email: p.email,
      })
    );
  },

  async updateMarketplaceSettings(
    fundId: string,
    input: {
      isMarketplaceListed?: boolean;
      featured?: boolean;
      tagline?: string;
      categories?: string[];
      securityRating?: string | null;
      aggressivenessLevel?: string | null;
      poolHealth?: string;
      capacityStatus?: string;
      ryvonxRating?: number | null;
      suggestedInvestment?: number | null;
      riskSummary?: string;
      adminComments?: string;
      coverImageUrl?: string | null;
      logoUrl?: string | null;
      lifecycleStatus?: string;
      maxAum?: number | null;
      maxInvestorsCap?: number | null;
    }
  ): Promise<AdminFund> {
    await requireRole("administrator");
    const db = createAdminClient();

    const updates: Record<string, unknown> = {};

    if (input.isMarketplaceListed != null) {
      updates.is_marketplace_listed = input.isMarketplaceListed;
      if (input.isMarketplaceListed) {
        updates.listed_at = new Date().toISOString();
      }
    }
    if (input.featured != null) updates.featured = input.featured;
    if (input.tagline != null) updates.tagline = input.tagline.trim() || null;
    if (input.categories != null) updates.categories = input.categories;
    if (input.securityRating !== undefined) updates.security_rating = input.securityRating;
    if (input.aggressivenessLevel !== undefined) {
      updates.aggressiveness_level = input.aggressivenessLevel;
    }
    if (input.poolHealth != null) updates.pool_health = input.poolHealth;
    if (input.capacityStatus != null) updates.capacity_status = input.capacityStatus;
    if (input.ryvonxRating !== undefined) updates.ryvonx_rating = input.ryvonxRating;
    if (input.suggestedInvestment !== undefined) {
      updates.suggested_investment = input.suggestedInvestment;
    }
    if (input.riskSummary != null) updates.risk_summary = input.riskSummary.trim() || null;
    if (input.adminComments != null) updates.admin_comments = input.adminComments.trim() || null;
    if (input.coverImageUrl !== undefined) updates.cover_image_url = input.coverImageUrl;
    if (input.logoUrl !== undefined) updates.logo_url = input.logoUrl;
    if (input.maxAum !== undefined) updates.max_aum = input.maxAum;
    if (input.maxInvestorsCap !== undefined) updates.max_investors_cap = input.maxInvestorsCap;

    if (input.lifecycleStatus != null) {
      updates.lifecycle_status = input.lifecycleStatus;
      if (input.lifecycleStatus === "live") {
        updates.status = "active";
        updates.is_marketplace_listed = input.isMarketplaceListed ?? true;
        updates.listed_at = new Date().toISOString();
      }
    }

    const { data, error } = await db
      .from("funds")
      .update(updates as never)
      .eq("id", fundId)
      .select("*")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Failed to update marketplace settings.");

    const deletableIds = await getDeletableFundIds(db, [data as FundRow]);
    return mapFund(data as FundRow, deletableIds.has(fundId));
  },
};

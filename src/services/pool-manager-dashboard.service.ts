import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import {
  buildPoolManagerPublicIdentity,
  normalizePoolManagerUsername,
  resolvePoolManagerPublicLabel,
  managerRowToIdentity,
  sanitizePmSocialLinks,
  validatePoolManagerUsername,
  type PmSocialLinks,
} from "@/domain/pool-manager/public-profile";
import { notificationService } from "@/services/notification.service";
import { parseCoverImagePosition } from "@/domain/pools/cover-image-position";
import type {
  PoolManagerDashboardStats,
  PoolManagerPublicProfile,
} from "@/domain/pool-manager/types";
import type { Pool } from "@/domain/pools/types";
import { resolvePublicDisplayCount } from "@/features/marketplace/utils/marketplace-pool-card-presentation";

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

async function getManagerIdForUser(userId: string): Promise<string | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("pool_managers")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "approved")
    .maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}

export const poolManagerDashboardService = {
  async getManagerId(): Promise<string> {
    const user = await requireRole(USER_ROLES.POOL_MANAGER);
    const managerId = await getManagerIdForUser(user.id);
    if (!managerId) throw new Error("Pool Manager profile not found.");
    return managerId;
  },

  async getDashboardStats(): Promise<PoolManagerDashboardStats> {
    const user = await requireRole(USER_ROLES.POOL_MANAGER);
    const managerId = await getManagerIdForUser(user.id);
    if (!managerId) {
      return {
        poolsManaged: 0,
        totalInvestors: 0,
        assetsUnderManagement: 0,
        newInvestorsThisMonth: 0,
        pendingWithdrawals: 0,
        recentDeposits: 0,
      };
    }

    const db = createAdminClient();
    const { data: pools } = await db
      .from("funds")
      .select("id, active_investors, assets_under_management")
      .eq("pool_manager_id", managerId);

    const poolRows = (pools ?? []) as Array<{
      id: string;
      active_investors: number;
      assets_under_management: number;
    }>;
    const poolIds = poolRows.map((p) => p.id);

    let pendingWithdrawals = 0;
    let recentDeposits = 0;

    if (poolIds.length > 0) {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [withdrawalsResult, depositsResult] = await Promise.all([
        db
          .from("transactions")
          .select("id", { count: "exact", head: true })
          .in("fund_id", poolIds)
          .eq("type", "withdrawal")
          .eq("status", "pending"),
        db
          .from("transactions")
          .select("id", { count: "exact", head: true })
          .in("fund_id", poolIds)
          .eq("type", "deposit")
          .eq("status", "approved")
          .gte("created_at", monthStart.toISOString()),
      ]);

      pendingWithdrawals = withdrawalsResult.count ?? 0;
      recentDeposits = depositsResult.count ?? 0;
    }

    return {
      poolsManaged: poolRows.length,
      totalInvestors: poolRows.reduce((s, p) => s + toNumber(p.active_investors), 0),
      assetsUnderManagement: poolRows.reduce(
        (s, p) => s + toNumber(p.assets_under_management),
        0
      ),
      newInvestorsThisMonth: 0,
      pendingWithdrawals,
      recentDeposits,
    };
  },

  async getMyPools(): Promise<Pool[]> {
    const managerId = await this.getManagerId();
    const db = createAdminClient();

    const { data } = await db
      .from("funds")
      .select("*")
      .eq("pool_manager_id", managerId)
      .order("created_at", { ascending: false });

    return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      slug: row.slug as string,
      description: (row.description as string) ?? "",
      status: row.status as Pool["status"],
      isDefault: Boolean(row.is_default),
      poolDescription: (row.pool_description as string) ?? "",
      tradingPair: (row.trading_pair as string) ?? "",
      poolDurationDays: row.pool_duration_days as number | null,
      minInvestment: toNumber(row.min_investment as number | null),
      maxInvestment:
        row.max_investment != null ? toNumber(row.max_investment as number) : null,
      targetCapital: toNumber(row.target_capital as number | null),
      currentCapital: toNumber(row.current_capital as number | null),
      profitTargetPct: toNumber(row.profit_target_pct as number | null),
      targetInvestors: toNumber(row.target_investors as number | null),
      returnTiers: (row.return_tiers as Pool["returnTiers"]) ?? [],
      isInviteOnly: Boolean(row.is_invite_only),
      cardBackgroundColor: (row.card_background_color as string) ?? null,
      coverImageUrl: (row.cover_image_url as string) ?? null,
      coverImagePosition: parseCoverImagePosition(row.cover_image_position),
      poolManagerId: (row.pool_manager_id as string) ?? null,
      poolManagerName: (row.pool_manager_name as string) ?? null,
      poolManagerIconUrl: (row.pool_manager_icon_url as string) ?? null,
      lifecycleStatus: (row.lifecycle_status as string) ?? "live",
      createdAt: row.created_at as string,
    }));
  },

  async createPoolDraft(input: {
    name: string;
    slug?: string;
    description?: string;
    minInvestment?: number;
  }): Promise<{ id: string; slug: string }> {
    const user = await requireRole(USER_ROLES.POOL_MANAGER);
    const managerId = await getManagerIdForUser(user.id);
    if (!managerId) throw new Error("Pool Manager profile not found.");

    const db = createAdminClient();
    const { data: manager } = await db
      .from("pool_managers")
      .select("username, slug, display_name, show_full_name, icon_url")
      .eq("id", managerId)
      .single();

    const slug =
      input.slug?.trim() ||
      input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 64);

    const mgr = manager as {
      username?: string | null;
      slug?: string | null;
      display_name: string;
      show_full_name?: boolean | null;
      icon_url: string | null;
    };
    const publicLabel = resolvePoolManagerPublicLabel(managerRowToIdentity(mgr));

    const { data, error } = await db
      .from("funds")
      .insert({
        name: input.name.trim(),
        slug,
        description: input.description?.trim() ?? null,
        min_investment: input.minInvestment ?? 100,
        pool_manager_id: managerId,
        pool_manager_name: publicLabel,
        pool_manager_icon_url: mgr.icon_url,
        status: "inactive",
        lifecycle_status: "draft",
        is_default: false,
      } as never)
      .select("id, slug")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Could not create pool.");

    return data as { id: string; slug: string };
  },

  async updatePoolDraft(
    poolId: string,
    input: {
      name?: string;
      description?: string;
      poolDescription?: string;
      minInvestment?: number;
      maxInvestment?: number;
      coverImageUrl?: string;
      cardBackgroundColor?: string;
    }
  ): Promise<void> {
    const managerId = await this.getManagerId();
    const db = createAdminClient();

    const { data: pool } = await db
      .from("funds")
      .select("lifecycle_status, pool_manager_id")
      .eq("id", poolId)
      .single();

    if (!pool) throw new Error("Pool not found.");
    const row = pool as { lifecycle_status: string; pool_manager_id: string | null };
    if (row.pool_manager_id !== managerId) throw new Error("Not your pool.");
    if (row.lifecycle_status !== "draft") {
      throw new Error("Only draft pools can be edited.");
    }

    const updates: Record<string, unknown> = {};
    if (input.name != null) updates.name = input.name.trim();
    if (input.description != null) updates.description = input.description.trim();
    if (input.poolDescription != null) {
      updates.pool_description = input.poolDescription.trim();
    }
    if (input.minInvestment != null) updates.min_investment = input.minInvestment;
    if (input.maxInvestment != null) updates.max_investment = input.maxInvestment;
    if (input.coverImageUrl != null) updates.cover_image_url = input.coverImageUrl;
    if (input.cardBackgroundColor != null) {
      updates.card_background_color = input.cardBackgroundColor;
    }

    const { error } = await db.from("funds").update(updates as never).eq("id", poolId);
    if (error) throw new Error(error.message);
  },

  async submitPoolForReview(poolId: string): Promise<void> {
    const managerId = await this.getManagerId();
    const user = await requireAuth();
    const db = createAdminClient();

    const { data: pool } = await db
      .from("funds")
      .select("name, lifecycle_status, pool_manager_id")
      .eq("id", poolId)
      .single();

    if (!pool) throw new Error("Pool not found.");
    const row = pool as {
      name: string;
      lifecycle_status: string;
      pool_manager_id: string | null;
    };
    if (row.pool_manager_id !== managerId) throw new Error("Not your pool.");
    if (row.lifecycle_status !== "draft") {
      throw new Error("Only draft pools can be submitted.");
    }

    const now = new Date().toISOString();
    const { error } = await db
      .from("funds")
      .update({
        lifecycle_status: "submitted",
        submitted_at: now,
      } as never)
      .eq("id", poolId);

    if (error) throw new Error(error.message);

    const { data: admins } = await db
      .from("profiles")
      .select("id")
      .eq("role", USER_ROLES.ADMINISTRATOR);

    for (const admin of (admins ?? []) as Array<{ id: string }>) {
      await notificationService.sendToUser({
        userId: admin.id,
        type: "admin_message",
        title: "Pool submitted for review",
        message: `${row.name} was submitted by a Pool Manager for approval.`,
        metadata: { pool_id: poolId, manager_id: managerId },
      });
    }

    await notificationService.sendToUser({
      userId: user.id,
      type: "pm_application_submitted",
      title: "Pool submitted",
      message: `"${row.name}" has been submitted for RyvonX review.`,
      metadata: { pool_id: poolId },
    });
  },

  async getPoolInvestors(poolId: string): Promise<
    Array<{
      userId: string;
      fullName: string;
      email: string;
      totalInvested: number;
      currentValue: number;
      ownershipPct: number;
    }>
  > {
    const managerId = await this.getManagerId();
    const db = createAdminClient();

    const { data: pool } = await db
      .from("funds")
      .select("pool_manager_id")
      .eq("id", poolId)
      .single();

    if ((pool as { pool_manager_id?: string } | null)?.pool_manager_id !== managerId) {
      throw new Error("Not your pool.");
    }

    const { data } = await db
      .from("investor_portfolios")
      .select("user_id, total_invested, current_value, ownership_percentage, profiles(full_name, email)")
      .eq("fund_id", poolId)
      .gt("total_invested", 0);

    return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
      const profile = row.profiles as { full_name: string; email: string } | null;
      return {
        userId: row.user_id as string,
        fullName: profile?.full_name ?? "Investor",
        email: profile?.email ?? "",
        totalInvested: toNumber(row.total_invested as number),
        currentValue: toNumber(row.current_value as number),
        ownershipPct: toNumber(row.ownership_percentage as number),
      };
    });
  },

  async getPublicProfile(slug: string): Promise<PoolManagerPublicProfile | null> {
    const supabase = await createClient();
    const { data: manager } = await supabase
      .from("pool_managers")
      .select("*")
      .eq("slug", slug)
      .eq("status", "approved")
      .maybeSingle();

    if (!manager) return null;
    const row = manager as Record<string, unknown>;
    const managerId = row.id as string;

    const db = createAdminClient();
    const [poolsRes, achievementsRes, reviewCountRes, tradeMetricsRes] = await Promise.all([
      db
        .from("funds")
        .select("active_investors, display_active_investors, assets_under_management")
        .eq("pool_manager_id", managerId)
        .in("lifecycle_status", ["live", "approved"]),
      db
        .from("pool_manager_achievements")
        .select("title, awarded_at")
        .eq("pool_manager_id", managerId)
        .order("awarded_at", { ascending: false }),
      db
        .from("pool_manager_reviews")
        .select("id", { count: "exact", head: true })
        .eq("pool_manager_id", managerId),
      db
        .from("trade_snapshots")
        .select("total_trades")
        .eq("pool_manager_id", managerId)
        .order("snapshot_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const poolRows = (poolsRes.data ?? []) as Array<{
      active_investors: number;
      display_active_investors: number;
      assets_under_management: number;
    }>;
    const achievements = (achievementsRes.data ?? []).map((a) => ({
      title: (a as { title: string }).title,
      awardedAt: (a as { awarded_at: string }).awarded_at,
    }));

    const createdAt = new Date(row.created_at as string);
    const yearsOn =
      (Date.now() - createdAt.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

    const identity = buildPoolManagerPublicIdentity({
      username: row.username as string | null,
      slug: row.slug as string | null,
      display_name: row.display_name as string,
      show_full_name: row.show_full_name as boolean | null,
      social_links: row.social_links,
    });

    const liveInvestors = poolRows.reduce((s, p) => s + toNumber(p.active_investors), 0);
    const seedInvestors = Math.max(
      toNumber(row.display_investor_count as number),
      ...poolRows.map((p) => toNumber(p.display_active_investors))
    );
    const liveReviewCount = reviewCountRes.count ?? 0;
    const seedReviewCount = toNumber(row.display_review_count as number);
    const liveTradeCount = toNumber(
      (tradeMetricsRes.data as { total_trades?: number } | null)?.total_trades
    );
    const seedTradeCount = toNumber(row.display_trade_count as number);

    return {
      id: managerId,
      slug: identity.slug,
      userId: (row.user_id as string) ?? null,
      displayName: identity.publicDisplayName,
      username: identity.username,
      publicDisplayName: identity.publicDisplayName,
      fullName: identity.fullName,
      showFullName: identity.showFullName,
      socialLinks: identity.socialLinks,
      publicSocialLinks: identity.publicSocialLinks,
      profilePhotoUrl: (row.profile_photo_url as string) ?? (row.icon_url as string),
      coverImageUrl: (row.cover_image_url as string) ?? null,
      biography: (row.bio as string) ?? null,
      tradingSince: (row.trading_since as string) ?? null,
      country: (row.country as string) ?? null,
      markets: (row.markets as string[]) ?? [],
      tradingStyle: (row.trading_style as string) ?? null,
      isVerified: Boolean(row.is_verified),
      ryvonxRating: row.ryvonx_rating != null ? toNumber(row.ryvonx_rating as number) : null,
      securityRating:
        row.security_rating != null ? toNumber(row.security_rating as number) : null,
      aggressivenessRating:
        row.aggressiveness_rating != null
          ? toNumber(row.aggressiveness_rating as number)
          : null,
      winRatePct: row.win_rate_pct != null ? toNumber(row.win_rate_pct as number) : null,
      avgMonthlyReturnPct:
        row.avg_monthly_return_pct != null
          ? toNumber(row.avg_monthly_return_pct as number)
          : null,
      maxDrawdownPct:
        row.max_drawdown_pct != null ? toNumber(row.max_drawdown_pct as number) : null,
      assetsUnderManagement: poolRows.reduce(
        (s, p) => s + toNumber(p.assets_under_management),
        0
      ),
      activeInvestors: resolvePublicDisplayCount(seedInvestors, liveInvestors),
      poolsManaged: poolRows.length,
      yearsOnRyvonX: Math.max(0, Math.round(yearsOn * 10) / 10),
      approvedAt: (row.approved_at as string) ?? null,
      managerLevel: (row.manager_level as string | null) ?? null,
      publicReviewCount: resolvePublicDisplayCount(seedReviewCount, liveReviewCount),
      publicTradeCount: resolvePublicDisplayCount(seedTradeCount, liveTradeCount),
      achievements,
    };
  },

  async updateMyProfile(input: {
    bio?: string;
    coverImageUrl?: string;
    profilePhotoUrl?: string;
    tradingStyle?: string;
    markets?: string[];
    username?: string;
    showFullName?: boolean;
    socialLinks?: PmSocialLinks;
  }): Promise<void> {
    const user = await requireRole(USER_ROLES.POOL_MANAGER);
    const managerId = await getManagerIdForUser(user.id);
    if (!managerId) throw new Error("Pool Manager profile not found.");

    const db = createAdminClient();

    const { data: current } = await db
      .from("pool_managers")
      .select("username, slug, display_name, show_full_name")
      .eq("id", managerId)
      .single();

    if (!current) throw new Error("Pool Manager profile not found.");

    const currentRow = current as unknown as {
      username?: string | null;
      slug?: string | null;
      display_name: string;
      show_full_name?: boolean | null;
    };

    const updates: Record<string, unknown> = {};
    if (input.bio != null) updates.bio = input.bio.trim();
    if (input.coverImageUrl != null) updates.cover_image_url = input.coverImageUrl;
    if (input.profilePhotoUrl != null) {
      updates.profile_photo_url = input.profilePhotoUrl;
      updates.icon_url = input.profilePhotoUrl;
    }
    if (input.tradingStyle != null) updates.trading_style = input.tradingStyle.trim();
    if (input.markets != null) updates.markets = input.markets;
    if (input.showFullName != null) updates.show_full_name = input.showFullName;
    if (input.socialLinks != null) {
      updates.social_links = sanitizePmSocialLinks(input.socialLinks);
    }

    if (input.username != null) {
      const normalized = normalizePoolManagerUsername(input.username);
      const validationError = validatePoolManagerUsername(normalized);
      if (validationError) throw new Error(validationError);

      if (normalized !== (currentRow.username ?? currentRow.slug)) {
        const { data: conflict } = await db
          .from("pool_managers")
          .select("id")
          .or(`username.eq.${normalized},slug.eq.${normalized}`)
          .neq("id", managerId)
          .maybeSingle();

        if (conflict) throw new Error("That username is already taken.");
      }

      updates.username = normalized;
      updates.slug = normalized;
    }

    const { error } = await db
      .from("pool_managers")
      .update(updates as never)
      .eq("id", managerId);

    if (error) throw new Error(error.message);

    const { data: refreshed } = await db
      .from("pool_managers")
      .select("username, slug, display_name, show_full_name")
      .eq("id", managerId)
      .single();

    if (refreshed) {
      const refreshedRow = refreshed as unknown as {
        username?: string | null;
        slug?: string | null;
        display_name: string;
        show_full_name?: boolean | null;
      };
      const label = resolvePoolManagerPublicLabel(managerRowToIdentity(refreshedRow));
      await db
        .from("funds")
        .update({ pool_manager_name: label } as never)
        .eq("pool_manager_id", managerId);
    }
  },
};

export const poolManagerAdminPoolService = {
  async updatePoolLifecycle(input: {
    poolId: string;
    lifecycleStatus: string;
    notifyManager?: boolean;
  }): Promise<void> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    const { data: pool } = await db
      .from("funds")
      .select("name, pool_manager_id, lifecycle_status")
      .eq("id", input.poolId)
      .single();

    if (!pool) throw new Error("Pool not found.");
    const row = pool as {
      name: string;
      pool_manager_id: string | null;
      lifecycle_status: string;
    };

    const updates: Record<string, unknown> = {
      lifecycle_status: input.lifecycleStatus,
    };

    if (input.lifecycleStatus === "live" || input.lifecycleStatus === "approved") {
      updates.approved_at = new Date().toISOString();
    }
    if (input.lifecycleStatus === "live") {
      updates.status = "active";
    }
    if (input.lifecycleStatus === "paused") {
      updates.status = "paused";
    }
    if (input.lifecycleStatus === "closed" || input.lifecycleStatus === "archived") {
      updates.status = "closed";
    }

    const { error } = await db
      .from("funds")
      .update(updates as never)
      .eq("id", input.poolId);

    if (error) throw new Error(error.message);

    if (!row.pool_manager_id || input.notifyManager === false) return;

    const { data: manager } = await db
      .from("pool_managers")
      .select("user_id")
      .eq("id", row.pool_manager_id)
      .maybeSingle();

    const userId = (manager as { user_id?: string } | null)?.user_id;
    if (!userId) return;

    const notifMap: Record<string, { type: string; title: string; message: string }> = {
      approved: {
        type: "pm_pool_approved",
        title: "Pool approved",
        message: `"${row.name}" has been approved by RyvonX.`,
      },
      live: {
        type: "pm_pool_approved",
        title: "Pool is live",
        message: `"${row.name}" is now live and accepting investors.`,
      },
      paused: {
        type: "pm_pool_suspended",
        title: "Pool paused",
        message: `"${row.name}" has been paused by administration.`,
      },
      restricted: {
        type: "pm_pool_suspended",
        title: "Pool restricted",
        message: `"${row.name}" is temporarily restricted.`,
      },
      closed: {
        type: "pm_pool_closed",
        title: "Pool closed",
        message: `"${row.name}" has been closed.`,
      },
    };

    const notif = notifMap[input.lifecycleStatus];
    if (notif) {
      await notificationService.sendToUser({
        userId,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        metadata: { pool_id: input.poolId, lifecycle_status: input.lifecycleStatus },
      });
    }
  },
};

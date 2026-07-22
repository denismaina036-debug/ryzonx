import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { strategyService } from "@/services/strategy.service";
import { investmentCycleService } from "@/services/investment-cycle.service";
import { poolManagerDashboardService } from "@/services/pool-manager-dashboard.service";
import type { ReturnTier } from "@/features/investor/types/account";
import type { Pool } from "@/domain/pools/types";
import type {
  ManagedPoolConfig,
  ManagedPoolFormInput,
  ManagedPoolRiskLevel,
} from "@/domain/pools/managed-pool";
import { DEFAULT_MANAGED_POOL_RETURN_TIERS } from "@/domain/pools/managed-pool";
import {
  normalizeFixedReturnRows,
  type FixedReturnRow,
} from "@/domain/pools/fixed-return";
import { normalizeVariableReturnTiers } from "@/domain/pools/variable-return";
import type { ManagedPoolReturnModel } from "@/domain/pools/return-model";
import { tradingSessionLabel, formatTradingDateTimeLabel } from "@/domain/pools/trading-session";
import { poolGovernanceLockService } from "@/services/pool-governance-lock.service";
import {
  normalizeManagedPoolForm,
  validateManagedPoolForm,
} from "@/domain/pools/managed-pool-validation";
import {
  DEFAULT_COVER_IMAGE_POSITION,
  parseCoverImagePosition,
  serializeCoverImagePosition,
} from "@/domain/pools/cover-image-position";
import { normalizeMarketCodes } from "@/domain/reference-data/utils";
import { resolvePoolManagerPublicLabel, managerRowToIdentity } from "@/domain/pool-manager/public-profile";

function parseAmount(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

function parseMarkets(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function riskToAggressiveness(risk: ManagedPoolRiskLevel | ""): string | null {
  const map: Record<string, string> = {
    conservative: "low",
    balanced: "moderate",
    growth: "high",
    aggressive: "extreme",
  };
  return risk ? map[risk] ?? null : null;
}

function aggressivenessToRisk(level: string | null | undefined): ManagedPoolRiskLevel | "" {
  const map: Record<string, ManagedPoolRiskLevel> = {
    low: "conservative",
    moderate: "balanced",
    high: "growth",
    extreme: "aggressive",
  };
  return level ? map[level] ?? "" : "";
}

function resolveReturnModel(value: string | undefined): ManagedPoolReturnModel {
  return value === "fixed" ? "fixed" : "variable";
}

function readManagedConfig(poolFaq: unknown): ManagedPoolConfig {
  if (!poolFaq || typeof poolFaq !== "object" || Array.isArray(poolFaq)) return {};
  const faq = poolFaq as { managedPool?: ManagedPoolConfig };
  return faq.managedPool ?? {};
}

function buildPoolFaq(existing: unknown, config: ManagedPoolConfig): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  return { ...base, managedPool: config };
}

function normalizeReturnTiers(tiers: ReturnTier[]): ReturnTier[] {
  return normalizeVariableReturnTiers(tiers);
}

function readFixedReturnRows(config: ManagedPoolConfig, legacyTiers: ReturnTier[]): FixedReturnRow[] {
  if (config.fixedReturnRows?.length) {
    return normalizeFixedReturnRows(config.fixedReturnRows);
  }
  if (config.returnModel === "fixed" && legacyTiers.length) {
    return normalizeFixedReturnRows(
      legacyTiers.map((tier) => ({
        investmentAmount: tier.minAmount,
        fixedReturnAmount: tier.minAmount * (1 + tier.returnPct / 100),
      }))
    );
  }
  return [];
}

function formToFundPatch(
  input: ManagedPoolFormInput,
  config: ManagedPoolConfig,
  existingFaq: unknown
) {
  const minInvestment = parseAmount(input.minInvestment);
  const maxInvestment = parseAmount(input.maxInvestment);
  const targetCapital = parseAmount(input.maxPoolSize);
  const maxInvestors = parseAmount(input.maxInvestors);
  const durationDays = parseAmount(input.tradingDurationDays);
  const targetReturn = parseAmount(input.targetReturnPct);
  const visibility = input.visibility;
  const returnModel = resolveReturnModel(input.returnModel);
  const returnTiers =
    returnModel === "variable" ? normalizeReturnTiers(input.returnTiers) : [];
  const fixedReturnRows =
    returnModel === "fixed" ? normalizeFixedReturnRows(input.fixedReturnRows) : [];
  const sessionLabel = tradingSessionLabel(input.tradingSessionKey, input.tradingSessionCustom);
  const marketsTradedCodes = normalizeMarketCodes(input.marketsTradedCodes);
  const tradingInstrumentCodes = (input.tradingInstrumentCodes ?? []).filter(Boolean);
  const marketCode = marketsTradedCodes[0] ?? input.marketTypeCode.trim();
  const instrumentCode = tradingInstrumentCodes[0] ?? input.tradingInstrumentCode.trim();
  const marketsTraded = [...new Set([...tradingInstrumentCodes, ...marketsTradedCodes])];

  const managedConfig: ManagedPoolConfig = {
    ...config,
    strategyId: input.strategyId.trim() || config.strategyId,
    strategyName: input.strategyName.trim(),
    tradingStyle: input.tradingStyle.trim(),
    timeframes: input.timeframes.trim(),
    tradingSessions: sessionLabel ?? input.tradingSessions.trim(),
    tradingHours: input.tradingTimeNy.trim()
      ? formatTradingDateTimeLabel(input.tradingTimeNy.trim()) ?? input.tradingHours.trim()
      : input.tradingHours.trim(),
    returnModel,
    fixedReturnRows: returnModel === "fixed" ? fixedReturnRows : undefined,
    tradingSessionKey: input.tradingSessionKey || undefined,
    tradingSessionCustom: input.tradingSessionCustom.trim() || undefined,
    tradingTimeNy: input.tradingTimeNy.trim() || undefined,
    marketTypeCode: marketCode || undefined,
    tradingInstrumentCode: instrumentCode || undefined,
    marketsTradedCodes: marketsTradedCodes.length ? marketsTradedCodes : undefined,
    tradingInstrumentCodes: tradingInstrumentCodes.length ? tradingInstrumentCodes : undefined,
    expectedBehavior: input.expectedBehavior.trim(),
    managerNotes: input.managerNotes.trim(),
    tradingMethodology: input.tradingMethodology.trim(),
    fundingPeriodDays: parseAmount(input.fundingPeriodDays),
    openingDate: input.scheduleOpenEnded ? undefined : input.openingDate || undefined,
    closingDate: input.scheduleOpenEnded ? undefined : input.closingDate || undefined,
    scheduleOpenEnded: input.scheduleOpenEnded,
    durationUnit: input.durationUnit,
    maxDrawdownPct: parseAmount(input.maxDrawdownPct),
    leverage: input.leverage.trim() || undefined,
    visibility,
  };

  return {
    name: input.poolName.trim(),
    description: input.poolDescription.trim() || null,
    pool_description:
      [input.tradingMethodology.trim(), input.managerNotes.trim()]
        .filter(Boolean)
        .join("\n\n") ||
      input.poolDescription.trim() ||
      null,
    cover_image_url: input.poolImageUrl?.trim() || null,
    cover_image_position: serializeCoverImagePosition(
      input.coverImagePosition ?? DEFAULT_COVER_IMAGE_POSITION
    ),
    card_background_color: input.cardBackgroundColor?.trim() || "#0f1623",
    return_tiers: returnTiers,
    investor_share_pct:
      returnModel === "variable" ? (parseAmount(input.investorSharePct) ?? 80) : 80,
    pool_manager_share_pct:
      returnModel === "variable" ? (parseAmount(input.poolManagerSharePct) ?? 20) : 20,
    tagline: input.poolName.trim() || null,
    markets_traded: marketsTraded.length ? marketsTraded : parseMarkets(input.markets),
    min_investment: minInvestment ?? 100,
    max_investment: maxInvestment ?? null,
    target_capital: targetCapital ?? null,
    max_aum: targetCapital ?? null,
    target_investors: maxInvestors != null ? Math.floor(maxInvestors) : null,
    pool_duration_days: durationDays ?? null,
    profit_target_pct: targetReturn ?? null,
    aggressiveness_level: riskToAggressiveness(input.riskLevel),
    risk_summary: input.tradingMethodology.trim() || null,
    is_invite_only: visibility === "invite_only",
    hide_from_marketplace: visibility === "private",
    pool_faq: buildPoolFaq(existingFaq, managedConfig),
  };
}

export function poolToManagedForm(
  pool: Pool,
  config: ManagedPoolConfig,
  marketsTraded?: string[],
  profitSharing?: { investorSharePct?: number; poolManagerSharePct?: number },
  targetInvestors?: number | null,
  aggressivenessLevel?: string | null
): ManagedPoolFormInput {
  const returnTiers =
    pool.returnTiers?.length > 0 ? pool.returnTiers : [...DEFAULT_MANAGED_POOL_RETURN_TIERS];

  const instrumentFromConfig = config.tradingInstrumentCode ?? "";
  const marketFromConfig = config.marketTypeCode ?? "";
  const marketsTradedCodes = config.marketsTradedCodes?.length
    ? normalizeMarketCodes(config.marketsTradedCodes)
    : marketFromConfig
      ? normalizeMarketCodes([marketFromConfig])
      : marketsTraded?.length
        ? normalizeMarketCodes(marketsTraded.filter((code) => !code.includes(":")))
        : [];
  const tradingInstrumentCodes = config.tradingInstrumentCodes?.length
    ? config.tradingInstrumentCodes
    : instrumentFromConfig
      ? [instrumentFromConfig]
      : marketsTraded?.filter((code) => code.includes(":")) ?? [];
  const legacyMarkets = marketsTraded?.length
    ? marketsTraded.join(", ")
    : config.tradingStyle?.includes(",")
      ? config.tradingStyle
      : "";

  return {
    poolName: pool.name,
    poolDescription: pool.description,
    poolImageUrl: pool.coverImageUrl ?? "",
    coverImagePosition: pool.coverImagePosition ?? { ...DEFAULT_COVER_IMAGE_POSITION },
    cardBackgroundColor: pool.cardBackgroundColor ?? "#0f1623",
    strategyId: config.strategyId ?? config.internalStrategyId ?? "",
    strategyName: config.strategyName ?? pool.name,
    strategyDescription: pool.poolDescription || pool.description,
    tradingStyle: config.tradingStyle ?? "",
    markets: legacyMarkets,
    timeframes: config.timeframes ?? "",
    tradingSessions: config.tradingSessions ?? "",
    tradingHours: config.tradingTimeNy
      ? config.tradingTimeNy
      : config.tradingHours?.replace(/\s*\(New York Time\)$/i, "") ?? "",
    returnModel: config.returnModel ?? "variable",
    fixedReturnRows: readFixedReturnRows(config, pool.returnTiers ?? []),
    tradingSessionKey: config.tradingSessionKey ?? "",
    tradingSessionCustom: config.tradingSessionCustom ?? "",
    tradingTimeNy: config.tradingTimeNy ?? "",
    marketTypeCode: marketsTradedCodes[0] ?? marketFromConfig,
    tradingInstrumentCode: tradingInstrumentCodes[0] ?? instrumentFromConfig,
    marketsTradedCodes,
    tradingInstrumentCodes,
    expectedBehavior: config.expectedBehavior ?? "",
    managerNotes: config.managerNotes ?? "",
    tradingMethodology: config.tradingMethodology ?? pool.poolDescription ?? "",
    minInvestment: pool.minInvestment ? String(pool.minInvestment) : "",
    maxInvestment: pool.maxInvestment != null ? String(pool.maxInvestment) : "",
    maxPoolSize: pool.targetCapital ? String(pool.targetCapital) : "",
    maxInvestors:
      targetInvestors != null
        ? String(targetInvestors)
        : pool.targetInvestors
          ? String(pool.targetInvestors)
          : "",
    fundingPeriodDays: config.fundingPeriodDays != null ? String(config.fundingPeriodDays) : "",
    tradingDurationDays: pool.poolDurationDays != null ? String(pool.poolDurationDays) : "",
    durationUnit: config.durationUnit ?? "days",
    openingDate: config.openingDate ?? "",
    closingDate: config.closingDate ?? "",
    scheduleOpenEnded: config.scheduleOpenEnded ?? false,
    riskLevel: aggressivenessToRisk(aggressivenessLevel),
    targetReturnPct: pool.profitTargetPct ? String(pool.profitTargetPct) : "",
    maxDrawdownPct: config.maxDrawdownPct != null ? String(config.maxDrawdownPct) : "",
    leverage: config.leverage ?? "",
    returnTiers,
    investorSharePct:
      profitSharing?.investorSharePct != null
        ? String(profitSharing.investorSharePct)
        : "80",
    poolManagerSharePct:
      profitSharing?.poolManagerSharePct != null
        ? String(profitSharing.poolManagerSharePct)
        : "20",
    visibility: config.visibility ?? (pool.isInviteOnly ? "invite_only" : "public"),
  };
}

async function ensureDraftCycleForPool(
  poolId: string,
  actorUserId: string,
  existingConfig: ManagedPoolConfig,
  existingFaq: unknown
): Promise<void> {
  if (existingConfig.internalCycleId) return;

  const strategyId =
    existingConfig.strategyId ?? existingConfig.internalStrategyId ?? null;
  if (!strategyId) return;

  const cycle = await investmentCycleService.createDraftCycleForPool(poolId, actorUserId);
  const nextConfig: ManagedPoolConfig = {
    ...existingConfig,
    strategyId,
    internalStrategyId: strategyId,
    internalCycleId: cycle.id,
  };

  const db = createAdminClient();
  await db
    .from("funds")
    .update({ pool_faq: buildPoolFaq(existingFaq, nextConfig) } as never)
    .eq("id", poolId);
}

export const managedPoolService = {
  async listMine(): Promise<Pool[]> {
    return poolManagerDashboardService.getMyPools();
  },

  async getForManager(poolId: string): Promise<{
    pool: Pool;
    config: ManagedPoolConfig;
    marketsTraded: string[];
    profitSharing?: { investorSharePct?: number; poolManagerSharePct?: number };
    targetInvestors?: number | null;
    aggressivenessLevel?: string | null;
  }> {
    const managerId = await poolManagerDashboardService.getManagerId();
    const db = createAdminClient();
    const { data, error } = await db.from("funds").select("*").eq("id", poolId).single();
    if (error || !data) throw new Error("Pool not found.");
    const row = data as Record<string, unknown>;
    if ((row.pool_manager_id as string) !== managerId) throw new Error("Not your pool.");

    const pools = await poolManagerDashboardService.getMyPools();
    const pool = pools.find((p) => p.id === poolId);
    if (!pool) throw new Error("Pool not found.");

    const config = readManagedConfig(row.pool_faq);
    const markets = row.markets_traded as string[] | null;
    if (markets?.length && !config.tradingStyle) {
      config.tradingStyle = markets.join(", ");
    }

    return {
      pool,
      config,
      marketsTraded: markets ?? [],
      profitSharing: {
        investorSharePct:
          row.investor_share_pct != null ? Number(row.investor_share_pct) : undefined,
        poolManagerSharePct:
          row.pool_manager_share_pct != null ? Number(row.pool_manager_share_pct) : undefined,
      },
      targetInvestors:
        row.target_investors != null ? Number(row.target_investors as number) : null,
      aggressivenessLevel: (row.aggressiveness_level as string | null) ?? null,
    };
  },

  async createDraft(input: ManagedPoolFormInput): Promise<{ id: string; slug: string }> {
    const normalized = normalizeManagedPoolForm(input);
    const validationError = validateManagedPoolForm(normalized, { mode: "draft" });
    if (validationError) throw new Error(validationError);

    const user = await requireRole(USER_ROLES.POOL_MANAGER);
    const managerId = await poolManagerDashboardService.getManagerId();
    const db = createAdminClient();

    const { data: manager } = await db
      .from("pool_managers")
      .select("username, slug, display_name, show_full_name, icon_url")
      .eq("id", managerId)
      .single();

    const slug = normalized.poolName
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
    const patch = formToFundPatch(normalized, {}, null);

    const { data, error } = await db
      .from("funds")
      .insert({
        ...patch,
        slug,
        pool_manager_id: managerId,
        pool_manager_name: publicLabel,
        pool_manager_icon_url: mgr.icon_url,
        status: "inactive",
        lifecycle_status: "draft",
        is_default: false,
        pool_config_version: 1,
      } as never)
      .select("id, slug")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Could not create pool.");

    const created = data as { id: string; slug: string };
    const config = readManagedConfig(patch.pool_faq);
    await ensureDraftCycleForPool(created.id, user.id, config, patch.pool_faq);

    return created;
  },

  async updateDraft(poolId: string, input: ManagedPoolFormInput): Promise<void> {
    const normalized = normalizeManagedPoolForm(input);
    const validationError = validateManagedPoolForm(normalized, { mode: "draft" });
    if (validationError) throw new Error(validationError);

    const user = await requireRole(USER_ROLES.POOL_MANAGER);

    await poolGovernanceLockService.assertPoolEditable(poolId);

    const managerId = await poolManagerDashboardService.getManagerId();
    const db = createAdminClient();

    const { data: existing } = await db
      .from("funds")
      .select("lifecycle_status, pool_manager_id, pool_faq")
      .eq("id", poolId)
      .single();

    if (!existing) throw new Error("Pool not found.");
    const row = existing as {
      lifecycle_status: string;
      pool_manager_id: string | null;
      pool_faq: unknown;
    };
    if (row.pool_manager_id !== managerId) throw new Error("Not your pool.");
    if (row.lifecycle_status !== "draft") {
      throw new Error("Only draft pools can be edited.");
    }

    const config = readManagedConfig(row.pool_faq);
    const patch = formToFundPatch(normalized, config, row.pool_faq);

    const { error } = await db.from("funds").update(patch as never).eq("id", poolId);
    if (error) throw new Error(error.message);

    const nextConfig = readManagedConfig(patch.pool_faq);
    await ensureDraftCycleForPool(poolId, user.id, nextConfig, patch.pool_faq);
  },

  /** Apply an admin-approved pool revision (internal — called by entityRevisionService). */
  async applyApprovedRevision(poolId: string, input: ManagedPoolFormInput): Promise<void> {
    const normalized = normalizeManagedPoolForm(input);
    const validationError = validateManagedPoolForm(normalized, { mode: "submit" });
    if (validationError) throw new Error(validationError);

    const db = createAdminClient();
    const { data: existing } = await db
      .from("funds")
      .select("pool_faq")
      .eq("id", poolId)
      .single();
    if (!existing) throw new Error("Pool not found.");

    const config = readManagedConfig((existing as { pool_faq: unknown }).pool_faq);
    const patch = formToFundPatch(normalized, config, (existing as { pool_faq: unknown }).pool_faq);
    const { error } = await db.from("funds").update(patch as never).eq("id", poolId);
    if (error) throw new Error(error.message);
  },

  async submitForReview(poolId: string): Promise<void> {
    const { pool, config, marketsTraded, targetInvestors, aggressivenessLevel } =
      await this.getForManager(poolId);
    if ((pool.lifecycleStatus ?? "draft") !== "draft") {
      throw new Error("Only draft pools can be submitted.");
    }

    const form = poolToManagedForm(
      pool,
      config,
      marketsTraded,
      undefined,
      targetInvestors,
      aggressivenessLevel
    );
    const validationError = validateManagedPoolForm(form, { mode: "submit" });
    if (validationError) throw new Error(validationError);

    const strategyId = form.strategyId || config.strategyId || config.internalStrategyId;
    if (!strategyId) {
      throw new Error("Select an approved strategy before submitting.");
    }

    await strategyService.getByIdForManager(strategyId);

    const db = createAdminClient();
    const { data: row } = await db.from("funds").select("pool_faq").eq("id", poolId).single();
    const nextConfig: ManagedPoolConfig = {
      ...config,
      strategyId,
      internalStrategyId: strategyId,
    };

    await db
      .from("funds")
      .update({
        pool_faq: buildPoolFaq((row as { pool_faq?: unknown } | null)?.pool_faq, nextConfig),
      } as never)
      .eq("id", poolId);

    const user = await requireRole(USER_ROLES.POOL_MANAGER);
    await ensureDraftCycleForPool(
      poolId,
      user.id,
      nextConfig,
      buildPoolFaq((row as { pool_faq?: unknown } | null)?.pool_faq, nextConfig)
    );

    await poolManagerDashboardService.submitPoolForReview(poolId);

    if (config.internalCycleId) {
      try {
        const cycle = await investmentCycleService.getById(config.internalCycleId);
        if (cycle?.status === "draft") {
          await investmentCycleService.submit(config.internalCycleId);
        }
      } catch {
        /* linked cycle may be missing or already submitted */
      }
    }
  },

  async approveAndGoLive(poolId: string): Promise<void> {
    const admin = await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    const { data: fundRow } = await db.from("funds").select("*").eq("id", poolId).single();
    if (!fundRow) throw new Error("Pool not found.");

    const fund = fundRow as Record<string, unknown>;
    const config = readManagedConfig(fund.pool_faq);
    const strategyId = config.strategyId ?? config.internalStrategyId;

    if (strategyId) {
      try {
        await strategyService.adminReview(strategyId, "approved");
        await strategyService.adminReview(strategyId, "available");
      } catch {
        /* may already be approved */
      }
    }

    const cycleDates = config.scheduleOpenEnded
      ? {}
      : {
          openingDate: config.openingDate,
          closingDate: config.closingDate,
        };

    if (config.internalCycleId) {
      try {
        await db
          .from("investment_cycles")
          .update({ fund_id: poolId, cycle_number: 1 } as never)
          .eq("id", config.internalCycleId);
        await investmentCycleService.adminActivateCycleForPoolGoLive(config.internalCycleId);
      } catch {
        await investmentCycleService.createFirstCycleForApprovedPool(
          poolId,
          admin.id,
          cycleDates
        );
      }
    } else {
      await investmentCycleService.createFirstCycleForApprovedPool(
        poolId,
        admin.id,
        cycleDates
      );
    }

    await db
      .from("funds")
      .update({
        lifecycle_status: "live",
        status: "active",
        is_marketplace_listed: true,
        approved_at: new Date().toISOString(),
        listed_at: new Date().toISOString(),
        hide_from_marketplace: false,
      } as never)
      .eq("id", poolId);
  },

  async listCycles(poolId: string) {
    return investmentCycleService.listByFundForManager(poolId);
  },

  async createCycle(
    poolId: string,
    input: { name?: string; openingDate?: string; closingDate?: string }
  ) {
    await this.getForManager(poolId);
    const cycle = await investmentCycleService.createFromPool({
      fundId: poolId,
      ...input,
    });
    return investmentCycleService.activateForLivePool(cycle.id);
  },
};

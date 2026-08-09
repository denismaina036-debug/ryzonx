import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { strategyService } from "@/services/strategy.service";
import { investmentCycleService } from "@/services/investment-cycle.service";
import { poolManagerDashboardService } from "@/services/pool-manager-dashboard.service";
import type { Pool } from "@/domain/pools/types";
import type { CreatePoolInvestmentCycleInput } from "@/domain/investment/types";
import type {
  ManagedPoolConfig,
  ManagedPoolFormInput,
  ManagedPoolRiskLevel,
} from "@/domain/pools/managed-pool";
import {
  tradingSessionLabel,
  formatTradingScheduleLabel,
  resolveTradingScheduleFromConfig,
} from "@/domain/pools/trading-session";
import { validateMultiplier } from "@/domain/roi/calculator";
import { poolGovernanceLockService } from "@/services/pool-governance-lock.service";
import {
  normalizeManagedPoolForm,
  validateManagedPoolForm,
} from "@/domain/pools/managed-pool-validation";
import {
  DEFAULT_COVER_IMAGE_POSITION,
  serializeCoverImagePosition,
} from "@/domain/pools/cover-image-position";
import { normalizeCoverImageUrl } from "@/lib/pools/cover-image-url";
import { revalidatePoolMarketplaceSurfaces } from "@/lib/pools/revalidate-pool-surfaces";
import { inferPayoutDurationPreset } from "@/domain/pools/payout-duration";
import {
  durationToDays,
  inferReturnDurationPreset,
  migrateLegacyPayoutPreset,
  resolveReturnDuration,
} from "@/domain/roi/return-duration";
import { defaultRoiMultipliers } from "@/features/pool-manager/components/managed-pool/pm-roi-multiplier-editor";
import { platformInvestmentLevelService } from "@/services/platform-investment-level.service";
import { poolRoiService } from "@/services/pool-roi.service";
import type { ReturnDurationPreset, ReturnDurationUnit } from "@/domain/roi/types";
import { normalizeMarketCodes } from "@/domain/reference-data/utils";
import { resolvePoolManagerPublicLabel, managerRowToIdentity } from "@/domain/pool-manager/public-profile";

function parseAmount(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

function resolvePoolDurationDays(input: ManagedPoolFormInput): number | undefined {
  const resolved = resolveReturnDuration({
    preset: input.returnDurationPreset,
    value: parseAmount(input.returnDurationValue),
    unit: input.returnDurationUnit,
  });
  return durationToDays(resolved.value, resolved.unit);
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

function formToFundPatch(
  input: ManagedPoolFormInput,
  config: ManagedPoolConfig,
  existingFaq: unknown
) {
  const minInvestment = parseAmount(input.minInvestment);
  const maxInvestment = parseAmount(input.maxInvestment);
  const targetCapital = parseAmount(input.maxPoolSize);
  const maxInvestors = parseAmount(input.maxInvestors);
  const displayActiveInvestors = parseAmount(input.displayActiveInvestors);
  const displayRaisedCapital = parseAmount(input.displayRaisedCapital);
  const durationDays = resolvePoolDurationDays(input);
  const durationResolved = resolveReturnDuration({
    preset: input.returnDurationPreset,
    value: parseAmount(input.returnDurationValue),
    unit: input.returnDurationUnit,
  });
  const targetReturn = parseAmount(input.targetReturnPct);
  const visibility = input.visibility;
  const sessionLabel = tradingSessionLabel(input.tradingSessionKey, input.tradingSessionCustom);
  const scheduleLabel = formatTradingScheduleLabel({
    preset: input.tradingSchedulePreset,
    days: input.tradingScheduleDays,
    time: input.tradingScheduleTime,
    legacyDateTime: input.tradingTimeNy,
  });
  const marketsTradedCodes = normalizeMarketCodes(input.marketsTradedCodes);
  const tradingInstrumentCodes = (input.tradingInstrumentCodes ?? []).filter(Boolean);
  const marketCode = marketsTradedCodes[0] ?? input.marketTypeCode.trim();
  const instrumentCode = tradingInstrumentCodes[0] ?? input.tradingInstrumentCode.trim();
  const marketsTraded = marketsTradedCodes.length
    ? marketsTradedCodes
    : parseMarkets(input.markets);

  const managedConfig: ManagedPoolConfig = {
    ...config,
    strategyId: input.strategyId.trim() || config.strategyId,
    strategyName: input.strategyName.trim(),
    tradingStyle: input.tradingStyle.trim(),
    timeframes: input.timeframes.trim(),
    tradingSessions: sessionLabel ?? input.tradingSessions.trim(),
    tradingHours: scheduleLabel ?? input.tradingHours.trim(),
    tradingSessionKey: input.tradingSessionKey || undefined,
    tradingSessionCustom: input.tradingSessionCustom.trim() || undefined,
    tradingSchedulePreset: input.tradingSchedulePreset || undefined,
    tradingScheduleDays: input.tradingScheduleDays.length
      ? input.tradingScheduleDays
      : undefined,
    tradingScheduleTime: input.tradingScheduleTime.trim() || undefined,
    tradingTimeNy: undefined,
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
    payoutDurationPreset: input.payoutDurationPreset,
    returnDurationPreset: input.returnDurationPreset,
    returnDurationValue: durationResolved.value,
    returnDurationUnit: durationResolved.unit,
    maxDrawdownPct: parseAmount(input.maxDrawdownPct),
    leverage: input.leverage.trim() || undefined,
    visibility,
  };

  const patch: Record<string, unknown> = {
    name: input.poolName.trim(),
    description: input.poolDescription.trim() || null,
    pool_description:
      [input.tradingMethodology.trim(), input.managerNotes.trim()]
        .filter(Boolean)
        .join("\n\n") ||
      input.poolDescription.trim() ||
      null,
    cover_image_position: serializeCoverImagePosition(
      input.coverImagePosition ?? DEFAULT_COVER_IMAGE_POSITION
    ),
    card_background_color: input.cardBackgroundColor?.trim() || "#0f1623",
    tagline: input.poolName.trim() || null,
    markets_traded: marketsTraded.length ? marketsTraded : parseMarkets(input.markets),
    min_investment: minInvestment ?? 100,
    max_investment: maxInvestment ?? null,
    target_capital: targetCapital ?? null,
    max_aum: targetCapital ?? null,
    target_investors: maxInvestors != null ? Math.floor(maxInvestors) : null,
    display_active_investors:
      displayActiveInvestors != null ? Math.max(0, Math.floor(displayActiveInvestors)) : 0,
    display_raised_capital:
      displayRaisedCapital != null ? Math.max(0, displayRaisedCapital) : 0,
    pool_duration_days: durationDays ?? null,
    return_duration_preset: input.returnDurationPreset,
    return_duration_value: durationResolved.value,
    return_duration_unit: durationResolved.unit,
    profit_target_pct: targetReturn ?? null,
    aggressiveness_level: riskToAggressiveness(input.riskLevel),
    risk_summary: input.tradingMethodology.trim() || null,
    is_invite_only: visibility === "invite_only",
    hide_from_marketplace: visibility === "private",
    pool_faq: buildPoolFaq(existingFaq, managedConfig),
  };

  if (input.poolImageUrl?.trim()) {
    patch.cover_image_url = normalizeCoverImageUrl(input.poolImageUrl);
  }

  return patch;
}

export function poolToManagedForm(
  pool: Pool,
  config: ManagedPoolConfig,
  marketsTraded?: string[],
  _profitSharing?: { investorSharePct?: number; poolManagerSharePct?: number },
  targetInvestors?: number | null,
  aggressivenessLevel?: string | null,
  displayMetrics?: { displayActiveInvestors?: number; displayRaisedCapital?: number } | null,
  roiData?: {
    returnDurationPreset?: string | null;
    returnDurationValue?: number | null;
    returnDurationUnit?: string | null;
    roiMultipliers?: Array<{ investmentLevelId: string; multiplier: string }>;
  }
): ManagedPoolFormInput {
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
  const schedule = resolveTradingScheduleFromConfig(config);

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
    tradingHours: config.tradingHours ?? "",
    tradingSessionKey: config.tradingSessionKey ?? "",
    tradingSessionCustom: config.tradingSessionCustom ?? "",
    tradingTimeNy: "",
    tradingSchedulePreset: schedule.tradingSchedulePreset,
    tradingScheduleDays: schedule.tradingScheduleDays,
    tradingScheduleTime: schedule.tradingScheduleTime,
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
    displayActiveInvestors:
      displayMetrics?.displayActiveInvestors != null && displayMetrics.displayActiveInvestors > 0
        ? String(displayMetrics.displayActiveInvestors)
        : "",
    displayRaisedCapital:
      displayMetrics?.displayRaisedCapital != null && displayMetrics.displayRaisedCapital > 0
        ? String(displayMetrics.displayRaisedCapital)
        : "",
    fundingPeriodDays: config.fundingPeriodDays != null ? String(config.fundingPeriodDays) : "",
    tradingDurationDays: pool.poolDurationDays != null ? String(pool.poolDurationDays) : "",
    durationUnit: config.durationUnit ?? "days",
    payoutDurationPreset: inferPayoutDurationPreset({
      payoutDurationPreset: config.payoutDurationPreset,
      durationDays: pool.poolDurationDays,
      durationUnit: config.durationUnit,
    }),
    returnDurationPreset: inferReturnDurationPreset({
      preset: (roiData?.returnDurationPreset ??
        config.returnDurationPreset ??
        migrateLegacyPayoutPreset(config.payoutDurationPreset)) as ReturnDurationPreset,
      value: roiData?.returnDurationValue ?? config.returnDurationValue ?? pool.poolDurationDays,
      unit: (roiData?.returnDurationUnit ??
        config.returnDurationUnit ??
        config.durationUnit ??
        "days") as ReturnDurationUnit,
    }),
    returnDurationValue: String(
      roiData?.returnDurationValue ??
        config.returnDurationValue ??
        pool.poolDurationDays ??
        1
    ),
    returnDurationUnit: (roiData?.returnDurationUnit ??
      config.returnDurationUnit ??
      config.durationUnit ??
      "days") as ReturnDurationUnit,
    roiMultipliers: roiData?.roiMultipliers ?? [],
    openingDate: config.openingDate ?? "",
    closingDate: config.closingDate ?? "",
    scheduleOpenEnded: config.scheduleOpenEnded ?? false,
    riskLevel: aggressivenessToRisk(aggressivenessLevel),
    targetReturnPct: pool.profitTargetPct ? String(pool.profitTargetPct) : "",
    maxDrawdownPct: config.maxDrawdownPct != null ? String(config.maxDrawdownPct) : "",
    leverage: config.leverage ?? "",
    visibility: config.visibility ?? (pool.isInviteOnly ? "invite_only" : "public"),
  };
}

async function savePoolRoiMultipliers(
  poolId: string,
  input: ManagedPoolFormInput
): Promise<void> {
  if (!input.roiMultipliers?.length) return;

  const entries = input.roiMultipliers.map((entry) => {
    const validationError = validateMultiplier(entry.multiplier);
    if (validationError) {
      throw new Error(validationError);
    }
    return {
      investmentLevelId: entry.investmentLevelId,
      multiplier: Number(entry.multiplier),
    };
  });

  await poolRoiService.upsertMultipliers(poolId, entries);
}

function slugifyPoolName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

async function generateUniquePoolSlug(
  db: ReturnType<typeof createAdminClient>,
  poolName: string
): Promise<string> {
  const base = slugifyPoolName(poolName) || "pool";
  let candidate = base;
  let suffix = 2;

  for (let attempt = 0; attempt < 100; attempt++) {
    const { data } = await db.from("funds").select("id").eq("slug", candidate).maybeSingle();
    if (!data) return candidate;
    const suffixText = `-${suffix}`;
    candidate = `${base.slice(0, Math.max(1, 64 - suffixText.length))}${suffixText}`;
    suffix += 1;
  }

  throw new Error("Could not generate a unique pool URL. Try a different pool name.");
}

async function loadPoolRoiFormData(poolId: string): Promise<{
  returnDurationPreset?: string | null;
  returnDurationValue?: number | null;
  returnDurationUnit?: string | null;
  roiMultipliers: Array<{ investmentLevelId: string; multiplier: string }>;
}> {
  const [duration, multipliers, levels] = await Promise.all([
    poolRoiService.getReturnDuration(poolId),
    poolRoiService.getCompleteMultipliers(poolId),
    platformInvestmentLevelService.listActive(),
  ]);

  const multiplierEntries =
    multipliers.length > 0
      ? multipliers.map((m) => ({
          investmentLevelId: m.investmentLevelId,
          multiplier: String(m.multiplier),
        }))
      : defaultRoiMultipliers(levels);

  return {
    returnDurationPreset: duration.preset,
    returnDurationValue: duration.value,
    returnDurationUnit: duration.unit,
    roiMultipliers: multiplierEntries,
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

/** Statuses where the owning Pool Manager may edit operational pool details. */
const PM_OPERATIONAL_EDITABLE_STATUSES = new Set([
  "draft",
  "live",
  "approved",
  "paused",
]);

function parseIsoOrNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Keep the Active Investment Cycle synchronized with pool operational config.
 * Does not change cycle status or investment workflow.
 */
async function syncActiveCycleFromPoolConfig(
  poolId: string,
  input: ManagedPoolFormInput,
  config: ManagedPoolConfig
): Promise<void> {
  const db = createAdminClient();
  const { data: cycles } = await db
    .from("investment_cycles")
    .select("id, status, funding_started_at")
    .eq("fund_id", poolId)
    .in("status", ["draft", "submitted", "approved", "funding", "trading", "distribution"])
    .order("cycle_number", { ascending: false })
    .limit(1);

  const cycle = (cycles ?? [])[0] as
    | { id: string; status: string; funding_started_at: string | null }
    | undefined;
  if (!cycle) return;

  const openingDate = input.scheduleOpenEnded ? null : parseIsoOrNull(input.openingDate);
  const closingDate = input.scheduleOpenEnded ? null : parseIsoOrNull(input.closingDate);
  const durationDays = resolvePoolDurationDays(input);
  const targetCapital = parseAmount(input.maxPoolSize);
  const minInvestment = parseAmount(input.minInvestment);

  const patch: Record<string, unknown> = {
    opening_date: openingDate,
    closing_date: closingDate,
    funding_deadline: closingDate,
    duration_days: durationDays ?? null,
    target_capital: targetCapital ?? null,
    min_investment: minInvestment ?? null,
    max_capacity: targetCapital ?? null,
  };

  // Explicit PM edit of Funding Start updates the live timestamp once funding has begun.
  if (
    openingDate &&
    (cycle.status === "funding" ||
      cycle.status === "trading" ||
      cycle.status === "distribution" ||
      Boolean(cycle.funding_started_at))
  ) {
    patch.funding_started_at = openingDate;
  }

  const { error } = await db
    .from("investment_cycles")
    .update(patch as never)
    .eq("id", cycle.id);
  if (error) throw new Error(error.message);

  // Keep linked cycle id on pool config for continuity.
  if (!config.internalCycleId) {
    const nextConfig: ManagedPoolConfig = { ...config, internalCycleId: cycle.id };
    const { data: fund } = await db.from("funds").select("pool_faq").eq("id", poolId).single();
    await db
      .from("funds")
      .update({
        pool_faq: buildPoolFaq((fund as { pool_faq?: unknown } | null)?.pool_faq, nextConfig),
      } as never)
      .eq("id", poolId);
  }
}

export const managedPoolService = {
  async listMine(): Promise<Pool[]> {
    return poolManagerDashboardService.getMyPools();
  },

  async getForManager(poolId: string): Promise<{
    pool: Pool;
    config: ManagedPoolConfig;
    marketsTraded: string[];
    targetInvestors?: number | null;
    aggressivenessLevel?: string | null;
    displayActiveInvestors?: number;
    displayRaisedCapital?: number;
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
      targetInvestors:
        row.target_investors != null ? Number(row.target_investors as number) : null,
      aggressivenessLevel: (row.aggressiveness_level as string | null) ?? null,
      displayActiveInvestors: Number(row.display_active_investors ?? 0) || 0,
      displayRaisedCapital: Number(row.display_raised_capital ?? 0) || 0,
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

    const slug = await generateUniquePoolSlug(db, normalized.poolName);

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

    if (error || !data) {
      if (error?.code === "23505" && error.message.includes("funds_slug_key")) {
        throw new Error("A pool with a similar name already exists. Try a different pool name.");
      }
      throw new Error(error?.message ?? "Could not create pool.");
    }

    const created = data as { id: string; slug: string };
    const config = readManagedConfig(patch.pool_faq);
    await ensureDraftCycleForPool(created.id, user.id, config, patch.pool_faq);
    await savePoolRoiMultipliers(created.id, normalized);

    return created;
  },

  async updateDraft(poolId: string, input: ManagedPoolFormInput): Promise<void> {
    const normalized = normalizeManagedPoolForm(input);
    const validationError = validateManagedPoolForm(normalized, {
      mode: "draft",
    });
    if (validationError) throw new Error(validationError);

    const user = await requireRole(USER_ROLES.POOL_MANAGER);
    const managerId = await poolManagerDashboardService.getManagerId();
    const db = createAdminClient();

    const { data: existing } = await db
      .from("funds")
      .select("lifecycle_status, pool_manager_id, pool_faq, slug")
      .eq("id", poolId)
      .single();

    if (!existing) throw new Error("Pool not found.");
    const row = existing as {
      lifecycle_status: string;
      pool_manager_id: string | null;
      pool_faq: unknown;
      slug: string;
    };
    if (row.pool_manager_id !== managerId) throw new Error("Not your pool.");

    const lifecycle = row.lifecycle_status || "draft";
    if (!PM_OPERATIONAL_EDITABLE_STATUSES.has(lifecycle)) {
      throw new Error(
        "This pool can no longer be edited by the Pool Manager. Contact an administrator."
      );
    }

    // Draft pools remain fully locked against active-cycle conflicts.
    // Approved/live pools allow operational edits by the owning PM.
    if (lifecycle === "draft") {
      await poolGovernanceLockService.assertPoolEditable(poolId);
    }

    const config = readManagedConfig(row.pool_faq);
    const patch = formToFundPatch(normalized, config, row.pool_faq);
    if (normalized.poolImageUrl?.trim()) {
      patch.cover_image_url = normalizeCoverImageUrl(normalized.poolImageUrl);
    } else {
      delete patch.cover_image_url;
    }

    const { error } = await db.from("funds").update(patch as never).eq("id", poolId);
    if (error) throw new Error(error.message);

    const nextConfig = readManagedConfig(patch.pool_faq);
    if (lifecycle === "draft") {
      await ensureDraftCycleForPool(poolId, user.id, nextConfig, patch.pool_faq);
    }

    await syncActiveCycleFromPoolConfig(poolId, normalized, nextConfig);
    await savePoolRoiMultipliers(poolId, normalized);
    revalidatePoolMarketplaceSurfaces(row.slug);
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
    if (normalized.poolImageUrl?.trim()) {
      patch.cover_image_url = normalizeCoverImageUrl(normalized.poolImageUrl);
    } else {
      delete patch.cover_image_url;
    }
    const { error } = await db.from("funds").update(patch as never).eq("id", poolId);
    if (error) throw new Error(error.message);

    await savePoolRoiMultipliers(poolId, normalized);

    const { data: fundRow } = await db.from("funds").select("slug").eq("id", poolId).maybeSingle();
    revalidatePoolMarketplaceSurfaces((fundRow as { slug?: string } | null)?.slug ?? null);
  },

  async submitForReview(poolId: string): Promise<void> {
    const {
      pool,
      config,
      marketsTraded,
      targetInvestors,
      aggressivenessLevel,
      displayActiveInvestors,
      displayRaisedCapital,
    } = await this.getForManager(poolId);
    if ((pool.lifecycleStatus ?? "draft") !== "draft") {
      throw new Error("Only draft pools can be submitted.");
    }

    const roiData = await loadPoolRoiFormData(poolId);
    const form = poolToManagedForm(
      pool,
      config,
      marketsTraded,
      undefined,
      targetInvestors,
      aggressivenessLevel,
      { displayActiveInvestors, displayRaisedCapital },
      roiData
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

    try {
      const { poolSeedService } = await import("@/services/investment-engine/pool-seed.service");
      await poolSeedService.applySeedCapitalIfConfigured(poolId);
    } catch {
      /* seed is optional */
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

    revalidatePoolMarketplaceSurfaces((fund.slug as string | undefined) ?? null);
  },

  async loadRoiFormData(poolId: string) {
    return loadPoolRoiFormData(poolId);
  },

  async listCycles(poolId: string) {
    return investmentCycleService.listByFundForManager(poolId);
  },

  async createCycle(poolId: string, input: CreatePoolInvestmentCycleInput) {
    await this.getForManager(poolId);
    const cycle = await investmentCycleService.createFromPool(input);
    return investmentCycleService.activateForLivePool(cycle.id);
  },

  async deleteForManager(poolId: string): Promise<{ returnedTotal: number; investorCount: number }> {
    const user = await requireRole(USER_ROLES.POOL_MANAGER);
    await this.getForManager(poolId);

    const { poolParticipationService } = await import("@/services/pool-participation.service");
    const result = await poolParticipationService.liquidatePoolForDeletion(poolId, user.id);

    const db = createAdminClient();
    const { data: fundRow } = await db.from("funds").select("slug").eq("id", poolId).maybeSingle();
    revalidatePoolMarketplaceSurfaces((fundRow as { slug?: string } | null)?.slug ?? null);

    return result;
  },

  async rejectSubmission(poolId: string, reviewNote?: string): Promise<void> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    const { data: fund } = await db
      .from("funds")
      .select("id, name, lifecycle_status, pool_manager_id, slug")
      .eq("id", poolId)
      .maybeSingle();

    if (!fund) throw new Error("Pool not found.");
    const row = fund as {
      id: string;
      name: string;
      lifecycle_status: string;
      pool_manager_id: string | null;
      slug: string;
    };

    if (!["submitted", "under_review"].includes(row.lifecycle_status)) {
      throw new Error("Only submitted pools can be rejected.");
    }

    const { error } = await db
      .from("funds")
      .update({
        lifecycle_status: "rejected",
        is_marketplace_listed: false,
        admin_comments: reviewNote?.trim() || null,
      } as never)
      .eq("id", poolId);

    if (error) throw new Error(error.message);
    revalidatePoolMarketplaceSurfaces(row.slug);
  },
};

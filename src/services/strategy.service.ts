import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import type { StrategyRiskProfile, StrategyStatus, StrategyVisibility } from "@/constants/strategy";
import { auditService } from "@/services/audit.service";
import {
  assertStrategyTransition,
  isStrategyEditable,
} from "@/lib/investment/strategy-lifecycle";
import { generateInvestmentSlug } from "@/lib/investment/utils";
import { adminNotesService } from "@/services/admin-notes.service";
import { publishPlatformEvent, PLATFORM_EVENT_TYPES } from "@/lib/platform-events/publish";
import { resolvePoolManagerUserId } from "@/lib/platform-events/resolve-recipients";
import type {
  CreateStrategyInput,
  Strategy,
  UpdateStrategyInput,
} from "@/domain/investment/types";
import type { PoolManagerStrategyData } from "@/domain/pool-manager/types";

type StrategyRow = {
  id: string;
  pool_manager_id: string;
  slug: string;
  name: string;
  description: string | null;
  objectives: string | null;
  risk_profile: StrategyRiskProfile | null;
  investment_style: string | null;
  supported_assets: string[];
  status: StrategyStatus;
  visibility: StrategyVisibility;
  submitted_at: string | null;
  approved_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapStrategy(row: StrategyRow): Strategy {
  return {
    id: row.id,
    poolManagerId: row.pool_manager_id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    objectives: row.objectives,
    riskProfile: row.risk_profile,
    investmentStyle: row.investment_style,
    supportedAssets: row.supported_assets ?? [],
    status: row.status,
    visibility: row.visibility,
    submittedAt: row.submitted_at,
    approvedAt: row.approved_at,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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

async function requireManagerId(): Promise<{ userId: string; managerId: string }> {
  const user = await requireRole(USER_ROLES.POOL_MANAGER);
  const managerId = await getManagerIdForUser(user.id);
  if (!managerId) throw new Error("Pool Manager profile not found.");
  return { userId: user.id, managerId };
}

function statusTimestampPatch(
  status: StrategyStatus,
  now: string
): Partial<StrategyRow> {
  switch (status) {
    case "submitted":
      return { submitted_at: now };
    case "approved":
      return { approved_at: now };
    case "archived":
      return { archived_at: now };
    default:
      return {};
  }
}

export const strategyService = {
  async listMine(): Promise<Strategy[]> {
    const { managerId } = await requireManagerId();
    const db = createAdminClient();
    const { data, error } = await db
      .from("strategies")
      .select("*")
      .eq("pool_manager_id", managerId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return ((data ?? []) as StrategyRow[]).map(mapStrategy);
  },

  async listAll(filters?: { status?: StrategyStatus }): Promise<Strategy[]> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    let query = db.from("strategies").select("*").order("created_at", { ascending: false });

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return ((data ?? []) as StrategyRow[]).map(mapStrategy);
  },

  async getById(id: string): Promise<Strategy | null> {
    const db = createAdminClient();
    const { data, error } = await db.from("strategies").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return mapStrategy(data as StrategyRow);
  },

  async getByIdForManager(id: string): Promise<Strategy> {
    const { managerId } = await requireManagerId();
    const strategy = await this.getById(id);
    if (!strategy) throw new Error("Strategy not found.");
    if (strategy.poolManagerId !== managerId) {
      throw new Error("Insufficient permissions");
    }
    return strategy;
  },

  async create(input: CreateStrategyInput): Promise<Strategy> {
    const { userId, managerId } = await requireManagerId();
    if (!input.name?.trim()) throw new Error("Strategy name is required.");

    const db = createAdminClient();
    const slug = input.slug?.trim() || generateInvestmentSlug(input.name);

    const { data, error } = await db
      .from("strategies")
      .insert({
        pool_manager_id: managerId,
        slug,
        name: input.name.trim(),
        description: input.description?.trim() ?? null,
        objectives: input.objectives?.trim() ?? null,
        risk_profile: input.riskProfile ?? null,
        investment_style: input.investmentStyle?.trim() ?? null,
        supported_assets: input.supportedAssets ?? [],
        visibility: input.visibility ?? "private",
        status: "draft",
      } as never)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    const strategy = mapStrategy(data as StrategyRow);

    await auditService.log({
      actorId: userId,
      action: "strategy_created",
      entityType: "strategy",
      entityId: strategy.id,
      newValues: { status: strategy.status, name: strategy.name },
    });

    return strategy;
  },

  /** First strategy from PM application — pre-approved on activation. */
  async createApprovedFromApplication(input: {
    managerId: string;
    userId: string;
    strategyData: PoolManagerStrategyData;
  }): Promise<Strategy | null> {
    const s = input.strategyData;
    if (!s.strategyName?.trim()) return null;

    const db = createAdminClient();
    const slug = generateInvestmentSlug(s.strategyName);
    const now = new Date().toISOString();
    const objectives = [s.tradingPhilosophy, s.riskManagement, s.entryStrategy, s.exitStrategy]
      .filter(Boolean)
      .join("\n\n");
    const markets =
      s.marketsTraded
        ?.split(",")
        .map((m) => m.trim())
        .filter(Boolean) ?? [];
    const riskMap: Record<string, StrategyRiskProfile> = {
      conservative: "conservative",
      balanced: "balanced",
      moderate: "moderate",
      aggressive: "aggressive",
      high: "aggressive",
    };
    const riskProfile = s.targetRiskLevel
      ? riskMap[s.targetRiskLevel.toLowerCase()] ?? "balanced"
      : "balanced";

    const { data, error } = await db
      .from("strategies")
      .insert({
        pool_manager_id: input.managerId,
        slug,
        name: s.strategyName.trim(),
        description: s.tradingPhilosophy?.trim() ?? null,
        objectives: objectives || null,
        risk_profile: riskProfile,
        investment_style: s.entryStrategy?.trim() ?? null,
        supported_assets: markets,
        visibility: "public",
        status: "available",
        approved_at: now,
        submitted_at: now,
      } as never)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    const strategy = mapStrategy(data as StrategyRow);

    await auditService.log({
      actorId: input.userId,
      action: "strategy_created_from_application",
      entityType: "strategy",
      entityId: strategy.id,
      newValues: { status: strategy.status, name: strategy.name, source: "application" },
    });

    return strategy;
  },

  async update(id: string, input: UpdateStrategyInput): Promise<Strategy> {
    const { userId, managerId } = await requireManagerId();
    const existing = await this.getById(id);
    if (!existing) throw new Error("Strategy not found.");
    if (existing.poolManagerId !== managerId) throw new Error("Insufficient permissions");
    if (!isStrategyEditable(existing.status)) {
      if (["approved", "available", "operating", "paused"].includes(existing.status)) {
        const { entityRevisionService } = await import("@/services/entity-revision.service");
        await entityRevisionService.submitStrategyRevision(id, input);
        return existing;
      }
      throw new Error("Strategy cannot be edited in its current status.");
    }

    const db = createAdminClient();
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.description !== undefined) patch.description = input.description;
    if (input.objectives !== undefined) patch.objectives = input.objectives;
    if (input.riskProfile !== undefined) patch.risk_profile = input.riskProfile;
    if (input.investmentStyle !== undefined) patch.investment_style = input.investmentStyle;
    if (input.supportedAssets !== undefined) patch.supported_assets = input.supportedAssets;
    if (input.visibility !== undefined) patch.visibility = input.visibility;

    const { data, error } = await db
      .from("strategies")
      .update(patch as never)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    const strategy = mapStrategy(data as StrategyRow);

    await auditService.log({
      actorId: userId,
      action: "strategy_updated",
      entityType: "strategy",
      entityId: strategy.id,
      oldValues: { status: existing.status },
      newValues: patch,
    });

    return strategy;
  },

  async transition(
    id: string,
    nextStatus: StrategyStatus,
    actor: "manager" | "admin"
  ): Promise<Strategy> {
    let userId: string;
    if (actor === "admin") {
      userId = (await requireRole(USER_ROLES.ADMINISTRATOR)).id;
    } else {
      const ctx = await requireManagerId();
      userId = ctx.userId;
    }

    const existing = await this.getById(id);
    if (!existing) throw new Error("Strategy not found.");

    if (actor === "manager") {
      const { managerId } = await requireManagerId();
      if (existing.poolManagerId !== managerId) throw new Error("Insufficient permissions");
    }

    assertStrategyTransition(existing.status, nextStatus, actor);

    const now = new Date().toISOString();
    const db = createAdminClient();
    const { data, error } = await db
      .from("strategies")
      .update({
        status: nextStatus,
        ...statusTimestampPatch(nextStatus, now),
      } as never)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    const strategy = mapStrategy(data as StrategyRow);

    await auditService.log({
      actorId: userId,
      action: "strategy_status_changed",
      entityType: "strategy",
      entityId: strategy.id,
      oldValues: { status: existing.status },
      newValues: { status: nextStatus },
    });

    if (nextStatus === "approved") {
      const poolManagerUserId = await resolvePoolManagerUserId(strategy.poolManagerId);
      publishPlatformEvent({
        eventType: PLATFORM_EVENT_TYPES.STRATEGY_APPROVED,
        category: "investment",
        entityType: "strategy",
        entityId: strategy.id,
        actorId: userId,
        payload: {
          poolManagerUserId,
          strategyId: strategy.id,
          strategyName: strategy.name,
          summary: `Strategy ${strategy.name} approved`,
        },
      });
    } else if (nextStatus === "submitted") {
      publishPlatformEvent({
        eventType: PLATFORM_EVENT_TYPES.STRATEGY_SUBMITTED,
        category: "investment",
        entityType: "strategy",
        entityId: strategy.id,
        actorId: userId,
        payload: {
          strategyId: strategy.id,
          strategyName: strategy.name,
          summary: `Strategy ${strategy.name} submitted for review`,
        },
      });
    }

    return strategy;
  },

  async adminReview(
    id: string,
    nextStatus: StrategyStatus,
    reviewNote?: string
  ): Promise<Strategy> {
    const strategy = await this.transition(id, nextStatus, "admin");
    if (reviewNote?.trim()) {
      await adminNotesService.addNote({
        entityType: "strategy",
        entityId: id,
        note: reviewNote.trim(),
      });
    }
    return strategy;
  },

  async submit(id: string): Promise<Strategy> {
    return this.transition(id, "submitted", "manager");
  },

  /** Approved strategies selectable when creating pools. */
  async listApprovedForPoolCreation(): Promise<Strategy[]> {
    const { managerId } = await requireManagerId();
    const db = createAdminClient();
    const { data, error } = await db
      .from("strategies")
      .select("*")
      .eq("pool_manager_id", managerId)
      .in("status", ["approved", "available", "operating", "paused"])
      .order("approved_at", { ascending: false, nullsFirst: false });

    if (error) throw new Error(error.message);
    return ((data ?? []) as StrategyRow[]).map(mapStrategy);
  },

  /** Public marketplace browse — no auth required. */
  async listPublic(): Promise<Strategy[]> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("strategies")
      .select("*")
      .eq("visibility", "public")
      .in("status", ["approved", "available", "operating", "paused"])
      .order("approved_at", { ascending: false, nullsFirst: false });

    if (error) throw new Error(error.message);
    return ((data ?? []) as StrategyRow[]).map(mapStrategy);
  },

  async getPublicBySlug(slug: string): Promise<Strategy | null> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("strategies")
      .select("*")
      .eq("slug", slug)
      .eq("visibility", "public")
      .in("status", ["approved", "available", "operating", "paused", "archived"])
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;
    return mapStrategy(data as StrategyRow);
  },
};

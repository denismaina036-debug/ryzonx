import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole, requireAuth } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import {
  CAPITAL_COMMITTEE_LABELS,
  MANAGER_LEVEL_LABELS,
  MANAGER_LEVEL_ORDER,
  PROMOTION_REQUIREMENTS,
} from "@/constants/capital-allocation";
import type {
  AchievementDefinition,
  CareerEvent,
  ManagerAchievement,
  ManagerContentItem,
  ManagerDevelopmentProfile,
} from "@/domain/capital-allocation/types";
import { auditService } from "@/services/audit.service";
import { notificationService } from "@/services/notification.service";

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

async function getActorId(): Promise<string> {
  const user = await requireRole(USER_ROLES.ADMINISTRATOR);
  return user.id;
}

async function getManagerUserId(poolManagerId: string): Promise<string | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("pool_managers")
    .select("user_id")
    .eq("id", poolManagerId)
    .maybeSingle();
  return (data as { user_id?: string } | null)?.user_id ?? null;
}

export const poolManagerGrowthService = {
  async getDevelopmentProfile(managerId: string): Promise<ManagerDevelopmentProfile> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    const { data: manager } = await db.from("pool_managers").select("*").eq("id", managerId).single();
    if (!manager) throw new Error("Manager not found.");
    const mgr = manager as Record<string, unknown>;

    const [achievementsRes, eventsRes, poolsRes] = await Promise.all([
      db
        .from("pool_manager_achievements")
        .select("*")
        .eq("pool_manager_id", managerId)
        .order("awarded_at", { ascending: false }),
      db
        .from("pool_manager_career_events")
        .select("*")
        .eq("pool_manager_id", managerId)
        .order("created_at", { ascending: false }),
      db.from("funds").select("id, name, allocation_status, is_ryvonx_backed, investor_capital, ryvonx_capital").eq("pool_manager_id", managerId),
    ]);

    const level = (mgr.manager_level as string) ?? "verified_pool_manager";
    const levelIdx = MANAGER_LEVEL_ORDER.indexOf(level as (typeof MANAGER_LEVEL_ORDER)[number]);
    const nextLevel: string | null =
      levelIdx >= 0 && levelIdx < MANAGER_LEVEL_ORDER.length - 1
        ? String(MANAGER_LEVEL_ORDER[levelIdx + 1])
        : null;

    const achievements: ManagerAchievement[] = (achievementsRes.data ?? []).map((a) => {
      const r = a as Record<string, unknown>;
      return {
        id: r.id as string,
        achievementKey: r.achievement_key as string,
        title: r.title as string,
        description: (r.description as string | null) ?? null,
        awardedAt: r.awarded_at as string,
        committeeLabel: (r.committee_label as string | null) ?? null,
      };
    });

    const careerEvents: CareerEvent[] = (eventsRes.data ?? []).map((e) => {
      const r = e as Record<string, unknown>;
      return {
        id: r.id as string,
        eventType: r.event_type as string,
        title: r.title as string,
        description: (r.description as string | null) ?? null,
        previousLevel: (r.previous_level as string | null) ?? null,
        newLevel: (r.new_level as string | null) ?? null,
        committeeLabel: (r.committee_label as string | null) ?? null,
        createdAt: r.created_at as string,
      };
    });

    return {
      managerId,
      displayName: mgr.display_name as string,
      managerLevel: level,
      levelPromotedAt: (mgr.level_promoted_at as string | null) ?? null,
      nextLevelReviewAt: (mgr.next_level_review_at as string | null) ?? null,
      developmentNotes: (mgr.development_notes as string | null) ?? null,
      governanceStage: (mgr.governance_stage as string) ?? "active",
      achievements,
      careerEvents,
      promotionRequirements: nextLevel ? (PROMOTION_REQUIREMENTS[nextLevel] ?? []) : [],
      nextLevel,
      pools: (poolsRes.data ?? []).map((p) => {
        const r = p as Record<string, unknown>;
        return {
          id: r.id as string,
          name: r.name as string,
          allocationStatus: (r.allocation_status as string) ?? "none",
          isRyvonxBacked: Boolean(r.is_ryvonx_backed),
          totalAum: toNumber(r.investor_capital as number) + toNumber(r.ryvonx_capital as number),
        };
      }),
      evaluationSummary: (mgr.development_notes as string | null) ?? null,
    };
  },

  async listManagersForDevelopment(): Promise<Array<{ id: string; displayName: string; managerLevel: string; poolsManaged: number }>> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { data: managers } = await db
      .from("pool_managers")
      .select("id, display_name, manager_level")
      .eq("status", "approved")
      .order("display_name");

    const { data: funds } = await db.from("funds").select("pool_manager_id").not("pool_manager_id", "is", null);
    const countMap = new Map<string, number>();
    for (const f of funds ?? []) {
      const id = (f as { pool_manager_id: string }).pool_manager_id;
      countMap.set(id, (countMap.get(id) ?? 0) + 1);
    }

    return (managers ?? []).map((m) => {
      const r = m as { id: string; display_name: string; manager_level: string };
      return {
        id: r.id,
        displayName: r.display_name,
        managerLevel: r.manager_level,
        poolsManaged: countMap.get(r.id) ?? 0,
      };
    });
  },

  async promoteManager(input: {
    managerId: string;
    newLevel: string;
    notes?: string;
    nextReviewAt?: string;
  }): Promise<void> {
    const actorId = await getActorId();
    const db = createAdminClient();

    const { data: manager } = await db
      .from("pool_managers")
      .select("display_name, manager_level, user_id")
      .eq("id", input.managerId)
      .single();
    if (!manager) throw new Error("Manager not found.");
    const mgr = manager as { display_name: string; manager_level: string; user_id: string | null };

    await db
      .from("pool_managers")
      .update({
        manager_level: input.newLevel,
        level_promoted_at: new Date().toISOString(),
        level_promoted_by: actorId,
        next_level_review_at: input.nextReviewAt ?? null,
        development_notes: input.notes ?? null,
      } as never)
      .eq("id", input.managerId);

    await db.from("pool_manager_career_events").insert({
      pool_manager_id: input.managerId,
      event_type: "promotion",
      previous_level: mgr.manager_level,
      new_level: input.newLevel,
      title: `Promoted to ${MANAGER_LEVEL_LABELS[input.newLevel] ?? input.newLevel}`,
      description: input.notes ?? null,
      committee_label: CAPITAL_COMMITTEE_LABELS.promotion,
      actor_id: actorId,
    } as never);

    await auditService.log({
      actorId,
      action: "manager_promoted",
      entityType: "pool_manager",
      entityId: input.managerId,
      oldValues: { manager_level: mgr.manager_level },
      newValues: { manager_level: input.newLevel },
    });

    if (mgr.user_id) {
      await notificationService.sendToUser({
        userId: mgr.user_id,
        type: "manager_promotion_achieved",
        title: "Career promotion achieved",
        message: `Congratulations! The RyvonX Investment Committee has promoted you to ${MANAGER_LEVEL_LABELS[input.newLevel] ?? input.newLevel}.`,
        metadata: { manager_id: input.managerId, new_level: input.newLevel },
      });
    }
  },

  async listAchievementDefinitions(): Promise<AchievementDefinition[]> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { data } = await db
      .from("pool_manager_achievement_definitions")
      .select("*")
      .order("sort_order");
    return (data ?? []).map((d) => {
      const r = d as Record<string, unknown>;
      return {
        id: r.id as string,
        achievementKey: r.achievement_key as string,
        title: r.title as string,
        description: (r.description as string | null) ?? null,
        category: r.category as string,
        isActive: Boolean(r.is_active),
      };
    });
  },

  async awardAchievement(input: {
    managerId: string;
    achievementKey: string;
    title: string;
    description?: string;
    fundId?: string;
  }): Promise<void> {
    const actorId = await getActorId();
    const db = createAdminClient();

    await db.from("pool_manager_achievements").insert({
      pool_manager_id: input.managerId,
      fund_id: input.fundId ?? null,
      achievement_key: input.achievementKey,
      title: input.title,
      description: input.description ?? null,
      awarded_by: actorId,
      committee_label: CAPITAL_COMMITTEE_LABELS.achievement,
    } as never);

    await auditService.log({
      actorId,
      action: "achievement_awarded",
      entityType: "pool_manager",
      entityId: input.managerId,
      newValues: { achievement_key: input.achievementKey },
    });

    const userId = await getManagerUserId(input.managerId);
    if (userId) {
      await notificationService.sendToUser({
        userId,
        type: "manager_achievement_awarded",
        title: "Achievement awarded",
        message: `You have been awarded: ${input.title}`,
        metadata: { achievement_key: input.achievementKey },
      });
    }
  },

  async getManagerAchievements(managerId: string): Promise<ManagerAchievement[]> {
    const db = createAdminClient();
    const { data } = await db
      .from("pool_manager_achievements")
      .select("*")
      .eq("pool_manager_id", managerId)
      .order("awarded_at", { ascending: false });
    return (data ?? []).map((a) => {
      const r = a as Record<string, unknown>;
      return {
        id: r.id as string,
        achievementKey: r.achievement_key as string,
        title: r.title as string,
        description: (r.description as string | null) ?? null,
        awardedAt: r.awarded_at as string,
        committeeLabel: (r.committee_label as string | null) ?? null,
      };
    });
  },

  async listContentQueue(status = "submitted"): Promise<ManagerContentItem[]> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { data } = await db
      .from("pool_manager_content")
      .select("*")
      .eq("status", status)
      .order("submitted_at", { ascending: false });

    const managerIds = [...new Set((data ?? []).map((c) => (c as { pool_manager_id: string }).pool_manager_id))];
    const managerMap = new Map<string, string>();
    if (managerIds.length > 0) {
      const { data: mgrs } = await db.from("pool_managers").select("id, display_name").in("id", managerIds);
      for (const m of mgrs ?? []) {
        managerMap.set((m as { id: string }).id, (m as { display_name: string }).display_name);
      }
    }

    return (data ?? []).map((c) => {
      const r = c as Record<string, unknown>;
      return {
        id: r.id as string,
        poolManagerId: r.pool_manager_id as string,
        managerName: managerMap.get(r.pool_manager_id as string) ?? null,
        fundId: (r.fund_id as string | null) ?? null,
        fundName: null,
        contentType: r.content_type as string,
        title: r.title as string,
        body: r.body as string,
        status: r.status as string,
        submittedAt: (r.submitted_at as string | null) ?? null,
        publishedAt: (r.published_at as string | null) ?? null,
        reviewNotes: (r.review_notes as string | null) ?? null,
        createdAt: r.created_at as string,
      };
    });
  },

  async reviewContent(input: {
    contentId: string;
    approve: boolean;
    reviewNotes?: string;
  }): Promise<void> {
    const actorId = await getActorId();
    const db = createAdminClient();

    const { data: content } = await db
      .from("pool_manager_content")
      .select("pool_manager_id, title")
      .eq("id", input.contentId)
      .single();
    if (!content) throw new Error("Content not found.");
    const row = content as { pool_manager_id: string; title: string };

    const updates: Record<string, unknown> = {
      reviewed_by: actorId,
      review_notes: input.reviewNotes ?? null,
      status: input.approve ? "published" : "rejected",
      published_at: input.approve ? new Date().toISOString() : null,
    };
    await db.from("pool_manager_content").update(updates as never).eq("id", input.contentId);

    const userId = await getManagerUserId(row.pool_manager_id);
    if (userId) {
      await notificationService.sendToUser({
        userId,
        type: input.approve ? "content_approved" : "content_rejected",
        title: input.approve ? "Content approved for publication" : "Content not approved",
        message: input.approve
          ? `"${row.title}" has been approved by the RyvonX Governance Committee and is now public.`
          : `"${row.title}" was not approved. ${input.reviewNotes ?? ""}`.trim(),
      });
    }
  },

  async submitContent(input: {
    fundId?: string;
    contentType: string;
    title: string;
    body: string;
  }): Promise<void> {
    const user = await requireAuth();
    const db = createAdminClient();

    const { data: manager } = await db
      .from("pool_managers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!manager) throw new Error("Pool manager profile not found.");
    const managerId = (manager as { id: string }).id;

    await db.from("pool_manager_content").insert({
      pool_manager_id: managerId,
      fund_id: input.fundId ?? null,
      content_type: input.contentType,
      title: input.title,
      body: input.body,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    } as never);
  },

  async getMyDevelopmentSummary(): Promise<{
    managerLevel: string;
    achievements: ManagerAchievement[];
    nextLevel: string | null;
    promotionRequirements: string[];
  } | null> {
    const user = await requireAuth();
    const db = createAdminClient();
    const { data: manager } = await db
      .from("pool_managers")
      .select("id, manager_level")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!manager) return null;
    const mgr = manager as { id: string; manager_level: string };
    const achievements = await poolManagerGrowthService.getManagerAchievements(mgr.id);
    const levelIdx = MANAGER_LEVEL_ORDER.indexOf(mgr.manager_level as (typeof MANAGER_LEVEL_ORDER)[number]);
    const nextLevel: string | null =
      levelIdx >= 0 && levelIdx < MANAGER_LEVEL_ORDER.length - 1
        ? String(MANAGER_LEVEL_ORDER[levelIdx + 1])
        : null;
    return {
      managerLevel: mgr.manager_level,
      achievements,
      nextLevel,
      promotionRequirements: nextLevel ? (PROMOTION_REQUIREMENTS[nextLevel] ?? []) : [],
    };
  },

  async getPublishedContent(managerId?: string, limit = 10): Promise<ManagerContentItem[]> {
    const db = createAdminClient();
    let query = db
      .from("pool_manager_content")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit);
    if (managerId) query = query.eq("pool_manager_id", managerId);

    const { data } = await query;
    return (data ?? []).map((c) => {
      const r = c as Record<string, unknown>;
      return {
        id: r.id as string,
        poolManagerId: r.pool_manager_id as string,
        managerName: null,
        fundId: (r.fund_id as string | null) ?? null,
        fundName: null,
        contentType: r.content_type as string,
        title: r.title as string,
        body: r.body as string,
        status: r.status as string,
        submittedAt: (r.submitted_at as string | null) ?? null,
        publishedAt: (r.published_at as string | null) ?? null,
        reviewNotes: null,
        createdAt: r.created_at as string,
      };
    });
  },
};

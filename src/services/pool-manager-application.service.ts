import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { DEFAULT_FUND_ID } from "@/constants/funds";
import { notificationService } from "@/services/notification.service";
import {
  PM_APPLICATION_STAGES,
  PM_APPLICATION_STATUS,
  type PoolManagerApplication,
  type PoolManagerApplicationReview,
  type PoolManagerBasicInfo,
  type PoolManagerStrategyData,
  type PoolManagerApplicationStatus,
} from "@/domain/pool-manager/types";

type ApplicationRow = {
  id: string;
  user_id: string;
  status: string;
  current_stage: number;
  basic_info: PoolManagerBasicInfo;
  strategy_data: PoolManagerStrategyData;
  strategy_submitted_at: string | null;
  challenge_enrollment_id: string | null;
  pool_manager_id: string | null;
  admin_notes: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapApplication(row: ApplicationRow): PoolManagerApplication {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status as PoolManagerApplicationStatus,
    currentStage: row.current_stage as PoolManagerApplication["currentStage"],
    basicInfo: row.basic_info ?? {},
    strategyData: row.strategy_data ?? {},
    strategySubmittedAt: row.strategy_submitted_at,
    challengeEnrollmentId: row.challenge_enrollment_id,
    poolManagerId: row.pool_manager_id,
    adminNotes: row.admin_notes,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    approvedAt: row.approved_at,
    rejectedAt: row.rejected_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

async function ensureApplicantRole(userId: string): Promise<void> {
  const db = createAdminClient();
  const { data: profile } = await db
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  const role = (profile as { role?: string } | null)?.role;
  if (role === USER_ROLES.INVESTOR) {
    await db
      .from("profiles")
      .update({ role: USER_ROLES.POOL_MANAGER_APPLICANT } as never)
      .eq("id", userId);
  }
}

export const poolManagerApplicationService = {
  async getMyApplication(): Promise<PoolManagerApplication | null> {
    const user = await requireAuth();
    const supabase = await createClient();

    const { data } = await supabase
      .from("pool_manager_applications")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    return data ? mapApplication(data as ApplicationRow) : null;
  },

  async getOrCreateApplication(): Promise<PoolManagerApplication> {
    const user = await requireAuth();
    const db = createAdminClient();

    const { data: existing } = await db
      .from("pool_manager_applications")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return mapApplication(existing as ApplicationRow);
    }

    if (user.role === USER_ROLES.POOL_MANAGER) {
      throw new Error("You are already an approved Pool Manager.");
    }

    const { data, error } = await db
      .from("pool_manager_applications")
      .insert({
        user_id: user.id,
        status: PM_APPLICATION_STATUS.DRAFT,
        current_stage: PM_APPLICATION_STAGES.BASIC_INFO,
      } as never)
      .select("*")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Could not start application.");

    await ensureApplicantRole(user.id);
    return mapApplication(data as ApplicationRow);
  },

  async saveBasicInfo(basicInfo: PoolManagerBasicInfo): Promise<PoolManagerApplication> {
    const user = await requireAuth();
    const db = createAdminClient();

    const application = await this.getOrCreateApplication();
    if (
      application.status !== PM_APPLICATION_STATUS.DRAFT &&
      application.status !== PM_APPLICATION_STATUS.REQUIRES_CHANGES
    ) {
      throw new Error("Basic information cannot be edited at this stage.");
    }

    const nextStage = Math.max(
      application.currentStage,
      PM_APPLICATION_STAGES.BASIC_INFO
    );

    const { data, error } = await db
      .from("pool_manager_applications")
      .update({
        basic_info: basicInfo,
        current_stage: nextStage,
      } as never)
      .eq("id", application.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Save failed.");
    await ensureApplicantRole(user.id);
    return mapApplication(data as ApplicationRow);
  },

  async submitApplication(basicInfo: PoolManagerBasicInfo): Promise<PoolManagerApplication> {
    const user = await requireAuth();
    const db = createAdminClient();

    if (!basicInfo.tradingExperience?.trim() || !basicInfo.country?.trim() || !basicInfo.biography?.trim()) {
      throw new Error("Please complete all required application fields.");
    }

    const application = await this.getOrCreateApplication();
    if (
      application.status !== PM_APPLICATION_STATUS.DRAFT &&
      application.status !== PM_APPLICATION_STATUS.REQUIRES_CHANGES
    ) {
      throw new Error("Your application has already been submitted.");
    }

    const now = new Date().toISOString();
    const { data, error } = await db
      .from("pool_manager_applications")
      .update({
        basic_info: basicInfo,
        status: PM_APPLICATION_STATUS.PENDING,
        current_stage: PM_APPLICATION_STAGES.ADMIN_REVIEW,
        submitted_at: now,
      } as never)
      .eq("id", application.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Submission failed.");

    await ensureApplicantRole(user.id);

    await notificationService.sendToUser({
      userId: user.id,
      type: "pm_application_submitted",
      title: "Application submitted",
      message: "Your Pool Manager application is pending review by the RyvonX team.",
      metadata: { application_id: application.id },
    });

    const { data: admins } = await db
      .from("profiles")
      .select("id")
      .eq("role", USER_ROLES.ADMINISTRATOR);

    for (const admin of (admins ?? []) as Array<{ id: string }>) {
      await notificationService.sendToUser({
        userId: admin.id,
        type: "admin_message",
        title: "New Pool Manager application",
        message: `${user.fullName} submitted a Pool Manager application for review.`,
        metadata: { application_id: application.id, user_id: user.id },
      });
    }

    const { publishPlatformEvent, PLATFORM_EVENT_TYPES } = await import(
      "@/lib/platform-events/publish"
    );
    publishPlatformEvent({
      eventType: PLATFORM_EVENT_TYPES.POOL_MANAGER_APPLICATION_SUBMITTED,
      category: "administration",
      entityType: "pool_manager_application",
      entityId: application.id,
      actorId: user.id,
      payload: {
        applicantUserId: user.id,
        applicantName: user.fullName,
        country: basicInfo.country,
        summary: `Pool Manager application submitted by ${user.fullName}`,
      },
    });

    return mapApplication(data as ApplicationRow);
  },

  async completeStage1(): Promise<PoolManagerApplication> {
    const user = await requireAuth();
    const db = createAdminClient();
    const application = await this.getOrCreateApplication();
    const info = application.basicInfo;

    if (!info.tradingExperience || !info.country || !info.biography) {
      throw new Error("Please complete all required basic information fields.");
    }

    const { data, error } = await db
      .from("pool_manager_applications")
      .update({
        current_stage: PM_APPLICATION_STAGES.CHALLENGE,
      } as never)
      .eq("id", application.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Could not advance stage.");
    return mapApplication(data as ApplicationRow);
  },

  async linkChallengeEnrollment(enrollmentId: string): Promise<PoolManagerApplication> {
    const user = await requireAuth();
    const db = createAdminClient();
    const application = await this.getOrCreateApplication();

    const { data: enrollment } = await db
      .from("trader_challenge_enrollments")
      .select("id, user_id, status")
      .eq("id", enrollmentId)
      .maybeSingle();

    if (!enrollment || (enrollment as { user_id: string }).user_id !== user.id) {
      throw new Error("Invalid challenge enrollment.");
    }

    const status = (enrollment as { status: string }).status;
    const challengeComplete =
      status === "active" || status === "passed" || status === "completed";

    const { data, error } = await db
      .from("pool_manager_applications")
      .update({
        challenge_enrollment_id: enrollmentId,
        current_stage: challengeComplete
          ? PM_APPLICATION_STAGES.STRATEGY
          : PM_APPLICATION_STAGES.CHALLENGE,
      } as never)
      .eq("id", application.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Could not link challenge.");

    if (challengeComplete) {
      await notificationService.sendToUser({
        userId: user.id,
        type: "pm_challenge_started",
        title: "Challenge in progress",
        message: "Your trader challenge is linked to your Pool Manager application.",
        metadata: { application_id: application.id, enrollment_id: enrollmentId },
      });
    }

    return mapApplication(data as ApplicationRow);
  },

  async completeStage2(): Promise<PoolManagerApplication> {
    const user = await requireAuth();
    const db = createAdminClient();
    const application = await this.getOrCreateApplication();

    if (!application.challengeEnrollmentId) {
      throw new Error("Join the RyvonX Trader Challenge before continuing.");
    }

    const { data: enrollment } = await db
      .from("trader_challenge_enrollments")
      .select("status")
      .eq("id", application.challengeEnrollmentId)
      .maybeSingle();

    const status = (enrollment as { status?: string } | null)?.status;
    if (status !== "passed" && status !== "completed" && status !== "active") {
      throw new Error(
        "Your challenge must be active or passed before proceeding. Contact support if you have completed it."
      );
    }

    const { data, error } = await db
      .from("pool_manager_applications")
      .update({ current_stage: PM_APPLICATION_STAGES.STRATEGY } as never)
      .eq("id", application.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Could not advance stage.");
    return mapApplication(data as ApplicationRow);
  },

  async saveStrategyDraft(
    strategyData: PoolManagerStrategyData
  ): Promise<PoolManagerApplication> {
    const user = await requireAuth();
    const db = createAdminClient();
    const application = await this.getOrCreateApplication();

    if (application.currentStage < PM_APPLICATION_STAGES.STRATEGY) {
      throw new Error("Complete earlier stages before submitting your strategy.");
    }

    const { data, error } = await db
      .from("pool_manager_applications")
      .update({ strategy_data: strategyData } as never)
      .eq("id", application.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Save failed.");
    return mapApplication(data as ApplicationRow);
  },

  async submitStrategy(): Promise<PoolManagerApplication> {
    const user = await requireAuth();
    const db = createAdminClient();
    const application = await this.getOrCreateApplication();
    const s = application.strategyData;

    if (!s.strategyName || !s.tradingPhilosophy || !s.riskManagement) {
      throw new Error("Complete required strategy sections before submitting.");
    }

    const now = new Date().toISOString();
    const { data, error } = await db
      .from("pool_manager_applications")
      .update({
        strategy_data: s,
        strategy_submitted_at: now,
        status: PM_APPLICATION_STATUS.PENDING,
        current_stage: PM_APPLICATION_STAGES.ADMIN_REVIEW,
        submitted_at: now,
      } as never)
      .eq("id", application.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Submission failed.");

    await notificationService.sendToUser({
      userId: user.id,
      type: "pm_application_submitted",
      title: "Application submitted",
      message:
        "Your Pool Manager application is now pending review by the RyvonX administration team.",
      metadata: { application_id: application.id },
    });

    const { data: admins } = await db
      .from("profiles")
      .select("id")
      .eq("role", USER_ROLES.ADMINISTRATOR);

    for (const admin of (admins ?? []) as Array<{ id: string }>) {
      await notificationService.sendToUser({
        userId: admin.id,
        type: "admin_message",
        title: "New Pool Manager application",
        message: `${user.fullName} submitted a Pool Manager application for review.`,
        metadata: { application_id: application.id, user_id: user.id },
      });
    }

    return mapApplication(data as ApplicationRow);
  },

  async getApplicationReviews(applicationId: string): Promise<PoolManagerApplicationReview[]> {
    const user = await requireAuth();
    const supabase = await createClient();

    const { data: app } = await supabase
      .from("pool_manager_applications")
      .select("user_id")
      .eq("id", applicationId)
      .maybeSingle();

    if (!app) return [];
    const isOwner = (app as { user_id: string }).user_id === user.id;
    const isAdmin = user.role === USER_ROLES.ADMINISTRATOR;
    if (!isOwner && !isAdmin) return [];

    const { data } = await supabase
      .from("pool_manager_application_reviews")
      .select("*")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false });

    return ((data ?? []) as Array<{
      id: string;
      application_id: string;
      reviewer_id: string;
      previous_status: string | null;
      new_status: string;
      notes: string | null;
      created_at: string;
    }>).map((row) => ({
      id: row.id,
      applicationId: row.application_id,
      reviewerId: row.reviewer_id,
      previousStatus: row.previous_status as PoolManagerApplicationStatus | null,
      newStatus: row.new_status as PoolManagerApplicationStatus,
      notes: row.notes,
      createdAt: row.created_at,
    }));
  },

  async getActiveChallengeForApplication(): Promise<{
    id: string;
    title: string;
    description: string;
    price: number;
    profitTargetPct: number;
    maxDailyLossPct: number | null;
    maxOverallLossPct: number;
    minTradingDays: number;
    maxRiskPerTradePct: number | null;
    durationDays: number;
    tradingRules: string | null;
    rulesSummary: string | null;
  } | null> {
    const supabase = await createClient();
    const { data } = await supabase
      .from("trader_challenges")
      .select("*")
      .eq("fund_id", DEFAULT_FUND_ID)
      .eq("is_active", true)
      .maybeSingle();

    if (!data) return null;
    const row = data as Record<string, unknown>;
    return {
      id: row.id as string,
      title: row.title as string,
      description: row.description as string,
      price: Number(row.price),
      profitTargetPct: Number(row.profit_target_pct),
      maxDailyLossPct:
        row.max_daily_loss_pct != null ? Number(row.max_daily_loss_pct) : null,
      maxOverallLossPct: Number(row.max_overall_loss_pct),
      minTradingDays: Number(row.min_trading_days ?? 0),
      maxRiskPerTradePct:
        row.max_risk_per_trade_pct != null ? Number(row.max_risk_per_trade_pct) : null,
      durationDays: Number(row.duration_days),
      tradingRules: (row.trading_rules as string | null) ?? null,
      rulesSummary: (row.rules_summary as string | null) ?? null,
    };
  },
};

export const poolManagerAdminService = {
  async listApplications(): Promise<
    Array<
      PoolManagerApplication & {
        applicantName: string;
        applicantEmail: string;
      }
    >
  > {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    const { data, error } = await db
      .from("pool_manager_applications")
      .select("*, profiles(full_name, email)")
      .order("submitted_at", { ascending: false, nullsFirst: false });

    if (error) throw new Error(error.message);

    return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
      const profiles = row.profiles as { full_name: string; email: string } | null;
      const app = mapApplication(row as unknown as ApplicationRow);
      return {
        ...app,
        applicantName: profiles?.full_name ?? "Unknown",
        applicantEmail: profiles?.email ?? "",
      };
    });
  },

  async getApplicationById(id: string): Promise<
    PoolManagerApplication & {
      applicantName: string;
      applicantEmail: string;
    }
  > {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    const { data, error } = await db
      .from("pool_manager_applications")
      .select("*, profiles(full_name, email)")
      .eq("id", id)
      .single();

    if (error || !data) throw new Error(error?.message ?? "Application not found.");

    const profiles = (data as Record<string, unknown>).profiles as {
      full_name: string;
      email: string;
    } | null;
    return {
      ...mapApplication(data as unknown as ApplicationRow),
      applicantName: profiles?.full_name ?? "Unknown",
      applicantEmail: profiles?.email ?? "",
    };
  },

  async updateApplicationStatus(input: {
    applicationId: string;
    newStatus: PoolManagerApplicationStatus;
    notes?: string;
    initialRating?: {
      ryvonxRating?: number;
      experienceLevel?: string;
      riskClassification?: string;
      isVerified?: boolean;
      featured?: boolean;
    };
  }): Promise<PoolManagerApplication> {
    const admin = await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    const { data: current, error: fetchError } = await db
      .from("pool_manager_applications")
      .select("*")
      .eq("id", input.applicationId)
      .single();

    if (fetchError || !current) {
      throw new Error(fetchError?.message ?? "Application not found.");
    }

    const row = current as ApplicationRow;
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      status: input.newStatus,
      reviewed_at: now,
      admin_notes: input.notes?.trim() || row.admin_notes,
    };

    if (input.newStatus === PM_APPLICATION_STATUS.APPROVED) {
      if (row.challenge_enrollment_id) {
        const { data: enrollment } = await db
          .from("trader_challenge_enrollments")
          .select("status")
          .eq("id", row.challenge_enrollment_id)
          .maybeSingle();
        const enrollmentStatus = (enrollment as { status?: string } | null)?.status;
        if (enrollmentStatus !== "passed" && enrollmentStatus !== "completed") {
          throw new Error(
            "The challenge must be passed or completed before approving as Pool Manager."
          );
        }
      }
      updates.approved_at = now;
      updates.current_stage = PM_APPLICATION_STAGES.ACTIVATION;
    }
    if (input.newStatus === PM_APPLICATION_STATUS.REJECTED) {
      updates.rejected_at = now;
    }
    if (input.newStatus === PM_APPLICATION_STATUS.REQUIRES_CHANGES) {
      updates.current_stage = PM_APPLICATION_STAGES.ADMIN_REVIEW;
    }

    const { data, error } = await db
      .from("pool_manager_applications")
      .update(updates as never)
      .eq("id", input.applicationId)
      .select("*")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Update failed.");

    await db.from("pool_manager_application_reviews").insert({
      application_id: input.applicationId,
      reviewer_id: admin.id,
      previous_status: row.status,
      new_status: input.newStatus,
      notes: input.notes?.trim() || null,
    } as never);

    const updated = mapApplication(data as ApplicationRow);

    if (input.newStatus === PM_APPLICATION_STATUS.APPROVED) {
      await this.activatePoolManager(updated, input.initialRating);
    } else {
      await this.notifyStatusChange(updated, input.newStatus, input.notes);
    }

    return updated;
  },

  async updateChallengeAccountInfo(input: {
    applicationId: string;
    challengeAccountInfo?: string;
    broker?: string;
    server?: string;
    login?: string;
    initialBalance?: number;
  }): Promise<PoolManagerApplication> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    const { data: current, error: fetchError } = await db
      .from("pool_manager_applications")
      .select("*")
      .eq("id", input.applicationId)
      .single();

    if (fetchError || !current) {
      throw new Error(fetchError?.message ?? "Application not found.");
    }

    const row = current as ApplicationRow;
    const basicInfo = {
      ...(row.basic_info ?? {}),
      challengeAccountInfo: input.challengeAccountInfo?.trim() ?? row.basic_info?.challengeAccountInfo,
    };

    const { data, error } = await db
      .from("pool_manager_applications")
      .update({ basic_info: basicInfo } as never)
      .eq("id", input.applicationId)
      .select("*")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Update failed.");

    const updated = mapApplication(data as ApplicationRow);

    const hasStructuredAccount =
      input.broker?.trim() && input.server?.trim() && input.login?.trim();

    if (hasStructuredAccount) {
      const { challengeCenterService } = await import("@/services/challenge-center.service");
      await challengeCenterService.provisionChallengeAccount({
        applicationId: updated.id,
        userId: updated.userId,
        broker: input.broker!.trim(),
        server: input.server!.trim(),
        login: input.login!.trim(),
        initialBalance: input.initialBalance ?? 10000,
        notes: input.challengeAccountInfo?.trim(),
      });
    } else if (input.challengeAccountInfo?.trim()) {
      await notificationService.sendToUser({
        userId: updated.userId,
        type: "pm_application_submitted",
        title: "Challenge account details",
        message:
          "Your RyvonX challenge account details have been provided. Complete the challenge, then await final approval.",
        metadata: { application_id: updated.id },
      });
    }

    return updated;
  },

  async activatePoolManager(
    application: PoolManagerApplication,
    initialRating?: {
      ryvonxRating?: number;
      experienceLevel?: string;
      riskClassification?: string;
      isVerified?: boolean;
      featured?: boolean;
    }
  ): Promise<void> {
    const admin = await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    const { data: profile } = await db
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", application.userId)
      .single();

    const fullName =
      (profile as { full_name?: string } | null)?.full_name ?? "Pool Manager";
    const avatarUrl = (profile as { avatar_url?: string | null } | null)?.avatar_url;
    const info = application.basicInfo;

    let slug = slugify(fullName);
    const { data: slugConflict } = await db
      .from("pool_managers")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (slugConflict) {
      slug = `${slug}-${application.id.slice(0, 8)}`;
    }

    const { data: manager, error: managerError } = await db
      .from("pool_managers")
      .insert({
        user_id: application.userId,
        display_name: fullName,
        icon_url: avatarUrl,
        bio: info.biography ?? null,
        country: info.country ?? null,
        markets: info.marketsTraded ?? [],
        trading_style: info.tradingStyle ?? null,
        profile_photo_url: avatarUrl,
        slug,
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: admin.id,
        application_id: application.id,
        is_verified: initialRating?.isVerified ?? true,
        avg_monthly_return_pct: info.averageMonthlyReturn ?? null,
        ryvonx_rating: initialRating?.ryvonxRating ?? null,
        manager_level: initialRating?.experienceLevel ?? null,
        aggressiveness_rating:
          initialRating?.riskClassification != null
            ? Number(initialRating.riskClassification)
            : null,
      } as never)
      .select("id")
      .single();

    if (managerError || !manager) {
      throw new Error(managerError?.message ?? "Could not create Pool Manager profile.");
    }

    const managerId = (manager as { id: string }).id;

    await db
      .from("pool_manager_applications")
      .update({ pool_manager_id: managerId } as never)
      .eq("id", application.id);

    await db
      .from("profiles")
      .update({ role: USER_ROLES.POOL_MANAGER } as never)
      .eq("id", application.userId);

    try {
      const { strategyService } = await import("@/services/strategy.service");
      await strategyService.createApprovedFromApplication({
        managerId,
        userId: application.userId,
        strategyData: application.strategyData,
      });
    } catch (err) {
      console.error("[activatePoolManager] Could not seed initial strategy:", err);
    }

    await notificationService.sendToUser({
      userId: application.userId,
      type: "pm_application_approved",
      title: "Congratulations — you're approved!",
      message:
        "Your Pool Manager application has been approved. Your dashboard and pool creation tools are now unlocked.",
      metadata: {
        application_id: application.id,
        pool_manager_id: managerId,
        slug,
      },
    });

    const { publishPlatformEvent, PLATFORM_EVENT_TYPES } = await import(
      "@/lib/platform-events/publish"
    );
    publishPlatformEvent({
      eventType: PLATFORM_EVENT_TYPES.POOL_MANAGER_APPROVED,
      category: "investment",
      entityType: "pool_manager",
      entityId: managerId,
      actorId: admin.id,
      payload: {
        poolManagerUserId: application.userId,
        applicationId: application.id,
        slug,
        summary: `Pool Manager ${fullName} approved`,
      },
    });
  },

  async notifyStatusChange(
    application: PoolManagerApplication,
    status: PoolManagerApplicationStatus,
    notes?: string
  ): Promise<void> {
    const typeMap: Partial<Record<PoolManagerApplicationStatus, string>> = {
      [PM_APPLICATION_STATUS.UNDER_REVIEW]: "pm_application_submitted",
      [PM_APPLICATION_STATUS.REQUIRES_CHANGES]: "pm_strategy_changes",
      [PM_APPLICATION_STATUS.INTERVIEW_REQUIRED]: "pm_interview_scheduled",
      [PM_APPLICATION_STATUS.REJECTED]: "pm_application_rejected",
    };

    const titleMap: Partial<Record<PoolManagerApplicationStatus, string>> = {
      [PM_APPLICATION_STATUS.UNDER_REVIEW]: "Application under review",
      [PM_APPLICATION_STATUS.REQUIRES_CHANGES]: "Strategy requires changes",
      [PM_APPLICATION_STATUS.INTERVIEW_REQUIRED]: "Interview required",
      [PM_APPLICATION_STATUS.REJECTED]: "Application not approved",
    };

    const messageMap: Partial<Record<PoolManagerApplicationStatus, string>> = {
      [PM_APPLICATION_STATUS.UNDER_REVIEW]:
        "Your Pool Manager application is now being reviewed by our team.",
      [PM_APPLICATION_STATUS.REQUIRES_CHANGES]:
        notes ??
        "Please update your strategy submission based on admin feedback and resubmit.",
      [PM_APPLICATION_STATUS.INTERVIEW_REQUIRED]:
        notes ?? "An interview has been scheduled. Check your notifications for details.",
      [PM_APPLICATION_STATUS.REJECTED]:
        notes ?? "Your Pool Manager application was not approved at this time.",
    };

    const notifType = typeMap[status];
    if (!notifType) return;

    await notificationService.sendToUser({
      userId: application.userId,
      type: notifType,
      title: titleMap[status] ?? "Application update",
      message: messageMap[status] ?? "Your application status has changed.",
      metadata: { application_id: application.id, status },
    });
  },
};

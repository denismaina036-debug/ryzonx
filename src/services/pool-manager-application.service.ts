import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { DEFAULT_FUND_ID } from "@/constants/funds";
import { notificationService } from "@/services/notification.service";
import { adminNotifyService } from "@/services/communication";
import { platformSettingsService } from "@/services/platform-settings.service";
import {
  PM_APPLICATION_STAGES,
  PM_APPLICATION_SECTIONS,
  PM_APPLICATION_STATUS,
  PM_ADMISSION_PATH,
  type PoolManagerApplication,
  type PoolManagerApplicationReview,
  type PoolManagerBasicInfo,
  type PoolManagerStrategyData,
  type PoolManagerApplicationStatus,
  type PoolManagerApplicationData,
  type PoolManagerApplicationSection,
  type PoolManagerAdmissionPath,
} from "@/domain/pool-manager/types";
import { getCountryName } from "@/constants/countries";
import {
  formatPmInitialRatingNotes,
  resolveManagerCareerLevel,
  resolvePmAggressivenessRating,
  resolvePmSecurityRating,
} from "@/features/admin/constants/pm-initial-rating";
import {
  allSectionsComplete,
  admissionFeeForPath,
  isSectionComplete,
} from "@/domain/pool-manager/admission-validation";
import { pmAdmissionSettingsService } from "@/services/pm-admission-settings.service";
import {
  AdmissionInsufficientBalanceError,
  type AdmissionPaymentState,
} from "@/domain/pool-manager/admission-errors";

type ApplicationRow = {
  id: string;
  user_id: string;
  status: string;
  current_stage: number;
  basic_info: PoolManagerBasicInfo;
  strategy_data: PoolManagerStrategyData;
  application_data?: PoolManagerApplicationData;
  admission_path?: string | null;
  payment_status?: string;
  admission_fee_amount?: number | string | null;
  strategy_submitted_at: string | null;
  challenge_enrollment_id: string | null;
  challenge_template_id?: string | null;
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
  const applicationData = row.application_data ?? {};
  const admissionPath =
    row.admission_path === PM_ADMISSION_PATH.TRADING_CHALLENGE ||
    row.admission_path === PM_ADMISSION_PATH.DIRECT_ACCESS
      ? row.admission_path
      : applicationData.admissionPath ?? null;

  return {
    id: row.id,
    userId: row.user_id,
    status: row.status as PoolManagerApplicationStatus,
    currentStage: row.current_stage as PoolManagerApplication["currentStage"],
    basicInfo: row.basic_info ?? {},
    strategyData: row.strategy_data ?? {},
    applicationData: { ...applicationData, admissionPath: admissionPath ?? applicationData.admissionPath },
    admissionPath,
    paymentStatus:
      row.payment_status === "paid" || row.payment_status === "waived"
        ? row.payment_status
        : "pending",
    admissionFeeAmount:
      row.admission_fee_amount != null ? Number(row.admission_fee_amount) : null,
    strategySubmittedAt: row.strategy_submitted_at,
    challengeEnrollmentId: row.challenge_enrollment_id,
    challengeTemplateId: row.challenge_template_id ?? null,
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

function buildLegacyBasicInfo(data: PoolManagerApplicationData): PoolManagerBasicInfo {
  const bg = data.professionalBackground;
  const perf = data.tradingPerformance;
  const stmt = data.personalStatement;
  const meth = data.tradingMethodology;

  return {
    tradingExperience: bg?.tradingExperience,
    marketsTraded: bg?.marketsTraded,
    country: getCountryName(bg?.countryOfResidence) ?? bg?.countryOfResidence,
    tradingStyle: meth?.primaryTradingStyle,
    averageMonthlyReturn: perf?.averageMonthlyReturn
      ? Number(perf.averageMonthlyReturn)
      : undefined,
    biography: stmt?.whyPoolManager,
    previousExperience: perf?.fundedAccountExperience ?? perf?.capitalManagementExperience,
  };
}

async function chargeAdmissionFee(input: {
  userId: string;
  amount: number;
  admissionPath: PoolManagerAdmissionPath;
}): Promise<void> {
  const db = createAdminClient();
  const { ensurePlatformFundingFund } = await import("@/services/platform-funding.service");
  await ensurePlatformFundingFund();

  const { data: portfolio } = await db
    .from("investor_portfolios")
    .select("available_balance")
    .eq("user_id", input.userId)
    .eq("fund_id", DEFAULT_FUND_ID)
    .maybeSingle();

  const available = Number(
    (portfolio as { available_balance?: number } | null)?.available_balance ?? 0
  );

  if (available < input.amount) {
    throw new AdmissionInsufficientBalanceError(available, input.amount);
  }

  const { error: deductError } = await db
    .from("investor_portfolios")
    .update({ available_balance: available - input.amount } as never)
    .eq("user_id", input.userId)
    .eq("fund_id", DEFAULT_FUND_ID);

  if (deductError) throw new Error(deductError.message);

  const pathLabel =
    input.admissionPath === PM_ADMISSION_PATH.TRADING_CHALLENGE
      ? "Trading Challenge"
      : "Direct Access";

  await db.from("transactions").insert({
    user_id: input.userId,
    fund_id: DEFAULT_FUND_ID,
    type: "adjustment",
    amount: input.amount,
    status: "completed",
    payment_method: "pm_admission_fee",
    notes: `Pool Manager admission fee — ${pathLabel}`,
  } as never);
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

    const initialApplicationData =
      user.registrationCountry
        ? {
            professionalBackground: {
              countryOfResidence: user.registrationCountry,
            },
          }
        : {};

    const { data, error } = await db
      .from("pool_manager_applications")
      .insert({
        user_id: user.id,
        status: PM_APPLICATION_STATUS.DRAFT,
        current_stage: PM_APPLICATION_STAGES.PROFESSIONAL_BACKGROUND,
        application_data: initialApplicationData,
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

  async saveApplicationSection(input: {
    section: PoolManagerApplicationSection;
    data: Partial<PoolManagerApplicationData>;
  }): Promise<PoolManagerApplication> {
    const user = await requireAuth();
    const db = createAdminClient();

    const applicationsEnabled = await platformSettingsService.get("pool_manager_applications_enabled");
    if (applicationsEnabled === false) {
      throw new Error("Pool Manager applications are currently closed.");
    }

    const application = await this.getOrCreateApplication();
    if (
      application.status !== PM_APPLICATION_STATUS.DRAFT &&
      application.status !== PM_APPLICATION_STATUS.REQUIRES_CHANGES
    ) {
      throw new Error("Application cannot be edited at this stage.");
    }

    const merged: PoolManagerApplicationData = {
      ...application.applicationData,
      ...input.data,
    };

    if (input.section === PM_APPLICATION_SECTIONS.PROFESSIONAL_BACKGROUND && input.data.professionalBackground) {
      merged.professionalBackground = {
        ...application.applicationData.professionalBackground,
        ...input.data.professionalBackground,
      };
    }
    if (input.section === PM_APPLICATION_SECTIONS.TRADING_METHODOLOGY && input.data.tradingMethodology) {
      merged.tradingMethodology = {
        ...application.applicationData.tradingMethodology,
        ...input.data.tradingMethodology,
      };
    }
    if (input.section === PM_APPLICATION_SECTIONS.RISK_MANAGEMENT && input.data.riskManagement) {
      merged.riskManagement = {
        ...application.applicationData.riskManagement,
        ...input.data.riskManagement,
      };
    }
    if (input.section === PM_APPLICATION_SECTIONS.TRADING_PERFORMANCE && input.data.tradingPerformance) {
      merged.tradingPerformance = {
        ...application.applicationData.tradingPerformance,
        ...input.data.tradingPerformance,
      };
    }
    if (input.section === PM_APPLICATION_SECTIONS.PERSONAL_STATEMENT && input.data.personalStatement) {
      merged.personalStatement = {
        ...application.applicationData.personalStatement,
        ...input.data.personalStatement,
      };
    }
    if (input.data.admissionPath) {
      merged.admissionPath = input.data.admissionPath;
    }
    if (input.data.reviewConfirmations) {
      merged.reviewConfirmations = {
        ...application.applicationData.reviewConfirmations,
        ...input.data.reviewConfirmations,
      };
    }

    if (!isSectionComplete(input.section, merged)) {
      throw new Error("Please complete all required fields in this section.");
    }

    const nextStage = Math.max(application.currentStage, input.section + 1) as PoolManagerApplication["currentStage"];
    let admissionPath: PoolManagerAdmissionPath | null = application.admissionPath;
    let admissionFeeAmount = application.admissionFeeAmount;

    if (input.section === PM_APPLICATION_SECTIONS.ADMISSION_PATH && merged.admissionPath) {
      admissionPath = merged.admissionPath;
      const settings = await pmAdmissionSettingsService.get();
      admissionFeeAmount = admissionFeeForPath(merged.admissionPath, settings);
    }

    const basicInfoPatch = buildLegacyBasicInfo(merged);

    const { data, error } = await db
      .from("pool_manager_applications")
      .update({
        application_data: merged,
        basic_info: basicInfoPatch,
        current_stage: nextStage,
        admission_path: admissionPath,
        admission_fee_amount: admissionFeeAmount,
      } as never)
      .eq("id", application.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Save failed.");
    await ensureApplicantRole(user.id);
    return mapApplication(data as ApplicationRow);
  },

  async getAdmissionPaymentState(): Promise<AdmissionPaymentState> {
    const user = await requireAuth();
    const application = await this.getOrCreateApplication();
    const admissionPath =
      application.applicationData.admissionPath ?? application.admissionPath;
    const settings = await pmAdmissionSettingsService.get();
    const fee = admissionPath ? admissionFeeForPath(admissionPath, settings) : null;

    if (
      application.paymentStatus === "paid" ||
      application.paymentStatus === "waived"
    ) {
      return {
        availableBalance: 0,
        fee,
        admissionPath,
        sufficient: true,
        alreadyPaid: true,
      };
    }

    const db = createAdminClient();
    const { ensurePlatformFundingFund } = await import(
      "@/services/platform-funding.service"
    );
    await ensurePlatformFundingFund();

    const { data: portfolio } = await db
      .from("investor_portfolios")
      .select("available_balance")
      .eq("user_id", user.id)
      .eq("fund_id", DEFAULT_FUND_ID)
      .maybeSingle();

    const availableBalance = Number(
      (portfolio as { available_balance?: number } | null)?.available_balance ?? 0
    );

    return {
      availableBalance,
      fee,
      admissionPath,
      sufficient: fee != null && availableBalance >= fee,
      alreadyPaid: false,
    };
  },

  async submitAdmissionApplication(): Promise<PoolManagerApplication> {
    const user = await requireAuth();
    const db = createAdminClient();

    const applicationsEnabled = await platformSettingsService.get("pool_manager_applications_enabled");
    if (applicationsEnabled === false) {
      throw new Error("Pool Manager applications are currently closed.");
    }

    const application = await this.getOrCreateApplication();
    if (
      application.status !== PM_APPLICATION_STATUS.DRAFT &&
      application.status !== PM_APPLICATION_STATUS.REQUIRES_CHANGES
    ) {
      throw new Error("Your application has already been submitted.");
    }

    const data = application.applicationData;
    if (!allSectionsComplete(data)) {
      throw new Error("Complete every section before submitting your application.");
    }

    const admissionPath = data.admissionPath ?? application.admissionPath;
    if (!admissionPath) {
      throw new Error("Select an admission path before submitting.");
    }

    const settings = await pmAdmissionSettingsService.get();
    const admissionFeeAmount = admissionFeeForPath(admissionPath, settings);
    const now = new Date().toISOString();

    let paymentStatus = application.paymentStatus;
    if (paymentStatus !== "paid" && paymentStatus !== "waived") {
      await chargeAdmissionFee({
        userId: user.id,
        amount: admissionFeeAmount,
        admissionPath,
      });
      paymentStatus = "paid";

      await notificationService.sendToUser({
        userId: user.id,
        type: "pool_trading",
        title: "Admission fee paid",
        message: `Your Pool Manager admission fee of $${admissionFeeAmount.toLocaleString()} was paid from your wallet balance.`,
        metadata: { application_id: application.id, admission_path: admissionPath },
      });
    }

    const { data: row, error } = await db
      .from("pool_manager_applications")
      .update({
        application_data: data,
        basic_info: buildLegacyBasicInfo(data),
        status: PM_APPLICATION_STATUS.PENDING,
        current_stage: PM_APPLICATION_STAGES.ADMIN_REVIEW,
        admission_path: admissionPath,
        admission_fee_amount: admissionFeeAmount,
        payment_status: paymentStatus,
        submitted_at: now,
      } as never)
      .eq("id", application.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error || !row) throw new Error(error?.message ?? "Submission failed.");

    await ensureApplicantRole(user.id);

    const pathLabel =
      admissionPath === PM_ADMISSION_PATH.TRADING_CHALLENGE
        ? "Trading Challenge"
        : "Direct Access";

    await notificationService.sendToUser({
      userId: user.id,
      type: "pm_application_submitted",
      title: "Application submitted",
      message: `Your Pool Manager application (${pathLabel}) is pending review by the RyvonX team.`,
      metadata: { application_id: application.id, admission_path: admissionPath },
    });

    await adminNotifyService.newPmApplication({
      applicantName: user.fullName ?? user.email ?? "Applicant",
      applicationId: application.id,
      triggeredBy: user.id,
    });

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
        admissionPath,
        summary: `Pool Manager application (${pathLabel}) submitted by ${user.fullName}`,
      },
    });

    return mapApplication(row as ApplicationRow);
  },

  /** @deprecated Legacy single-form submit — prefer submitAdmissionApplication */
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

    await adminNotifyService.newPmApplication({
      applicantName: user.fullName ?? user.email ?? "Applicant",
      applicationId: application.id,
      triggeredBy: user.id,
    });

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

    await adminNotifyService.newPmApplication({
      applicantName: user.fullName ?? user.email ?? "Applicant",
      applicationId: application.id,
      triggeredBy: user.id,
    });

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
      displayReviewCount?: number;
      displayTradeCount?: number;
      displayInvestorCount?: number;
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
      const admissionPath =
        row.admission_path ??
        (row.application_data as PoolManagerApplicationData | undefined)?.admissionPath;

      if (
        admissionPath === PM_ADMISSION_PATH.TRADING_CHALLENGE ||
        (!admissionPath && row.challenge_enrollment_id)
      ) {
        if (row.challenge_enrollment_id) {
          const { data: enrollment } = await db
            .from("trader_challenge_enrollments")
            .select("status")
            .eq("id", row.challenge_enrollment_id)
            .maybeSingle();
          const enrollmentStatus = (enrollment as { status?: string } | null)?.status;
          if (enrollmentStatus !== "passed" && enrollmentStatus !== "completed") {
            throw new Error(
              "The challenge must be passed before approving as Pool Manager."
            );
          }
        } else {
          throw new Error(
            "Trading Challenge applicants must complete and pass the challenge before final approval."
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

  async approveChallengeApplication(input: {
    applicationId: string;
    templateId: string;
    notes?: string;
  }): Promise<PoolManagerApplication> {
    const admin = await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    const template = await import("@/services/challenge-template.service").then((m) =>
      m.challengeTemplateService.getById(input.templateId)
    );
    if (!template || template.status !== "active") {
      throw new Error("Active challenge template not found.");
    }

    const { data: current, error: fetchError } = await db
      .from("pool_manager_applications")
      .select("*")
      .eq("id", input.applicationId)
      .single();

    if (fetchError || !current) {
      throw new Error(fetchError?.message ?? "Application not found.");
    }

    const row = current as ApplicationRow;
    const admissionPath =
      row.admission_path ??
      (row.application_data as PoolManagerApplicationData | undefined)?.admissionPath;

    if (admissionPath !== PM_ADMISSION_PATH.TRADING_CHALLENGE) {
      throw new Error("Challenge approval applies only to Trading Challenge applicants.");
    }

    const { ensurePoolManagerChallengeRow } = await import("@/services/challenge-center.service");

    const challengeRow = await ensurePoolManagerChallengeRow(template);
    const challengeId = challengeRow.id;
    let enrollmentId = row.challenge_enrollment_id;

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + template.maxEvaluationDays);

    if (!enrollmentId) {
      const { data: enrollment, error: enrollError } = await db
        .from("trader_challenge_enrollments")
        .insert({
          user_id: row.user_id,
          challenge_id: challengeId,
          application_id: row.id,
          challenge_template_id: input.templateId,
          status: "approved",
          challenge_deadline: deadline.toISOString(),
        } as never)
        .select("id")
        .single();

      if (enrollError || !enrollment) {
        throw new Error(enrollError?.message ?? "Could not create challenge enrollment.");
      }
      enrollmentId = (enrollment as { id: string }).id;
    } else {
      await db
        .from("trader_challenge_enrollments")
        .update({
          status: "approved",
          application_id: row.id,
          challenge_template_id: input.templateId,
          challenge_deadline: deadline.toISOString(),
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", enrollmentId);
    }

    const now = new Date().toISOString();
    const { data, error } = await db
      .from("pool_manager_applications")
      .update({
        status: PM_APPLICATION_STATUS.UNDER_REVIEW,
        challenge_enrollment_id: enrollmentId,
        challenge_template_id: input.templateId,
        reviewed_at: now,
        admin_notes: input.notes?.trim() || row.admin_notes,
      } as never)
      .eq("id", input.applicationId)
      .select("*")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Update failed.");

    await db.from("pool_manager_application_reviews").insert({
      application_id: input.applicationId,
      reviewer_id: admin.id,
      previous_status: row.status,
      new_status: PM_APPLICATION_STATUS.UNDER_REVIEW,
      notes:
        input.notes?.trim() ||
        `Challenge approved — assigned template: ${template.name}. Assign account credentials.`,
    } as never);

    const updated = mapApplication(data as ApplicationRow);

    await notificationService.sendToUser({
      userId: updated.userId,
      type: "pm_application_submitted",
      title: "Challenge approved",
      message:
        "Your application has been approved for the Trading Challenge. Challenge account details will be provided shortly.",
      metadata: { application_id: updated.id, enrollment_id: enrollmentId },
    });

    return updated;
  },

  async updateChallengeAccountInfo(input: {
    applicationId: string;
    templateId: string;
    challengeAccountInfo?: string;
    broker?: string;
    server?: string;
    login?: string;
    password?: string;
    investorPassword?: string;
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
    const templateId = input.templateId || row.challenge_template_id;
    if (!templateId) {
      throw new Error("Challenge template is required.");
    }

    const { data, error } = await db
      .from("pool_manager_applications")
      .update({
        challenge_template_id: templateId,
      } as never)
      .eq("id", input.applicationId)
      .select("*")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Update failed.");

    const updated = mapApplication(data as ApplicationRow);

    const hasStructuredAccount =
      input.broker?.trim() &&
      input.server?.trim() &&
      input.login?.trim() &&
      input.password?.trim();

    if (hasStructuredAccount) {
      const { challengeCenterService } = await import("@/services/challenge-center.service");
      await challengeCenterService.provisionChallengeAccount({
        applicationId: updated.id,
        userId: updated.userId,
        templateId,
        broker: input.broker!.trim(),
        server: input.server!.trim(),
        login: input.login!.trim(),
        password: input.password!.trim(),
        investorPassword: input.investorPassword?.trim(),
        notes: input.challengeAccountInfo?.trim(),
        assignedBy: admin.id,
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
      displayReviewCount?: number;
      displayTradeCount?: number;
      displayInvestorCount?: number;
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
    const appData = application.applicationData;
    const biography =
      appData.personalStatement?.whyPoolManager ??
      info.biography ??
      null;
    const countryRaw =
      appData.professionalBackground?.countryOfResidence ?? info.country ?? null;
    const country = countryRaw ? getCountryName(countryRaw) ?? countryRaw : null;
    const markets =
      appData.professionalBackground?.marketsTraded ?? info.marketsTraded ?? [];
    const tradingStyle =
      appData.tradingMethodology?.primaryTradingStyle ?? info.tradingStyle ?? null;
    const avgReturnRaw = appData.tradingPerformance?.averageMonthlyReturn;
    const avgReturn =
      avgReturnRaw != null && avgReturnRaw !== ""
        ? Number(avgReturnRaw)
        : info.averageMonthlyReturn ?? null;

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
        bio: biography,
        country,
        markets,
        trading_style: tradingStyle,
        profile_photo_url: avatarUrl,
        slug,
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: admin.id,
        application_id: application.id,
        username: slug,
        is_verified: initialRating?.isVerified ?? true,
        avg_monthly_return_pct: avgReturn,
        ryvonx_rating: initialRating?.ryvonxRating ?? null,
        display_review_count: initialRating?.displayReviewCount ?? 0,
        display_trade_count: initialRating?.displayTradeCount ?? 0,
        display_investor_count: initialRating?.displayInvestorCount ?? 0,
        manager_level: resolveManagerCareerLevel(initialRating?.experienceLevel),
        governance_stage: "approved",
        development_notes: formatPmInitialRatingNotes(
          initialRating?.experienceLevel,
          initialRating?.riskClassification
        ),
        aggressiveness_rating: resolvePmAggressivenessRating(initialRating?.riskClassification),
        security_rating: resolvePmSecurityRating(initialRating?.experienceLevel),
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

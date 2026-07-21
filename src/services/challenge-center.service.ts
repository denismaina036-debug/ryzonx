import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { DEFAULT_FUND_ID } from "@/constants/funds";
import { notificationService } from "@/services/notification.service";
import { challengeTradeService } from "@/services/challenge-trade.service";
import {
  challengeTemplateService,
  templateToChallengeConfig,
} from "@/services/challenge-template.service";
import {
  computeChallengeStatistics,
  isChallengeCriteriaMet,
  resolveChallengeDisplayStatus,
} from "@/services/challenge-statistics.service";
import {
  CHALLENGE_DISPLAY_STATUS,
  type ChallengeCenterState,
  type ChallengeConfig,
  type ChallengeEnrollmentRecord,
  type ProvisionChallengeAccountInput,
} from "@/domain/challenge/types";
import type { ChallengeTemplate } from "@/domain/challenge/challenge-template";
import { PM_APPLICATION_STATUS } from "@/domain/pool-manager/types";

type EnrollmentRow = {
  id: string;
  challenge_id: string;
  user_id: string;
  application_id: string | null;
  challenge_template_id: string | null;
  status: string;
  started_at: string | null;
  initial_balance: string | number | null;
  account_broker: string | null;
  account_server: string | null;
  account_login: string | null;
  account_password: string | null;
  account_investor_password: string | null;
  challenge_account_details: string | null;
  admin_rules: string | null;
};

type ChallengeRow = {
  id: string;
  title: string;
  profit_target_pct: string | number;
  max_overall_loss_pct: string | number;
  max_daily_loss_pct: string | number | null;
  min_trading_days: number;
  duration_days: number;
  rules_summary: string | null;
  trading_rules: string | null;
};

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

function mapLegacyChallenge(row: ChallengeRow): ChallengeConfig {
  return {
    id: row.id,
    title: row.title,
    profitTargetPct: toNumber(row.profit_target_pct),
    maxOverallLossPct: toNumber(row.max_overall_loss_pct),
    maxDailyLossPct:
      row.max_daily_loss_pct != null ? toNumber(row.max_daily_loss_pct) : null,
    minTradingDays: row.min_trading_days ?? 0,
    durationDays: row.duration_days,
    minClosedTrades: 0,
    currency: "USD",
    platform: "MetaTrader 5 (MT5)",
    rulesSummary: row.rules_summary,
    tradingRules: row.trading_rules,
  };
}

function mapEnrollment(row: EnrollmentRow, template: ChallengeTemplate | null): ChallengeEnrollmentRecord {
  const initialBalance =
    row.initial_balance != null
      ? toNumber(row.initial_balance)
      : template?.startingBalance ?? 0;

  return {
    id: row.id,
    challengeId: row.challenge_id,
    userId: row.user_id,
    applicationId: row.application_id,
    status: row.status,
    startedAt: row.started_at,
    account: {
      broker: row.account_broker,
      server: row.account_server,
      login: row.account_login,
      password: row.account_password,
      investorPassword: row.account_investor_password,
      initialBalance,
      notes: row.challenge_account_details ?? null,
    },
  };
}

async function getPoolManagerChallenge(): Promise<ChallengeRow | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("trader_challenges")
    .select("*")
    .eq("fund_id", DEFAULT_FUND_ID)
    .eq("is_active", true)
    .maybeSingle();

  if (data) return data as ChallengeRow;

  const { data: fallback } = await db
    .from("trader_challenges")
    .select("*")
    .eq("fund_id", DEFAULT_FUND_ID)
    .eq("purpose", "pool_manager")
    .maybeSingle();

  return (fallback as ChallengeRow | null) ?? null;
}

async function resolveTemplateForEnrollment(
  enrollmentRow: EnrollmentRow | null,
  applicationTemplateId: string | null
): Promise<ChallengeTemplate | null> {
  const templateId = enrollmentRow?.challenge_template_id ?? applicationTemplateId;
  if (templateId) {
    return challengeTemplateService.getById(templateId);
  }
  return challengeTemplateService.getDefault();
}

export const challengeCenterService = {
  async getChallengeCenterState(userId?: string): Promise<ChallengeCenterState> {
    const resolvedUserId = userId ?? (await requireAuth()).id;
    const db = createAdminClient();

    const applicationResult = await db
      .from("pool_manager_applications")
      .select("id, status, challenge_enrollment_id, challenge_template_id")
      .eq("user_id", resolvedUserId)
      .maybeSingle();

    const application = applicationResult.data as {
      id: string;
      status: string;
      challenge_enrollment_id: string | null;
      challenge_template_id: string | null;
    } | null;

    let enrollmentRow: EnrollmentRow | null = null;

    if (application?.challenge_enrollment_id) {
      const { data } = await db
        .from("trader_challenge_enrollments")
        .select("*")
        .eq("id", application.challenge_enrollment_id)
        .maybeSingle();
      enrollmentRow = (data as EnrollmentRow | null) ?? null;
    }

    if (!enrollmentRow) {
      const { data } = await db
        .from("trader_challenge_enrollments")
        .select("*")
        .eq("user_id", resolvedUserId)
        .in("status", [
          "waiting",
          "awaiting_setup",
          "approved",
          "challenge_assigned",
          "active",
          "challenge_submitted",
          "completed",
          "passed",
          "failed",
        ])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      enrollmentRow = (data as EnrollmentRow | null) ?? null;
    }

    const template = await resolveTemplateForEnrollment(
      enrollmentRow,
      application?.challenge_template_id ?? null
    );

    let challenge: ChallengeConfig | null = null;
    if (template) {
      challenge = templateToChallengeConfig(template);
    } else {
      const challengeRow = await getPoolManagerChallenge();
      challenge = challengeRow ? mapLegacyChallenge(challengeRow) : null;
    }

    const enrollment = enrollmentRow ? mapEnrollment(enrollmentRow, template) : null;
    const applicationRejected = application?.status === PM_APPLICATION_STATUS.REJECTED;

    const displayStatus = resolveChallengeDisplayStatus(enrollment, applicationRejected);

    if (!enrollment || !challenge) {
      return {
        displayStatus,
        canStart: false,
        canSubmitTrades: false,
        applicationId: application?.id ?? null,
        enrollment,
        challenge,
        template,
        statistics: null,
        trades: [],
      };
    }

    const trades = await challengeTradeService.listByEnrollment(enrollment.id, {
      userId: resolvedUserId,
    });
    const statistics = computeChallengeStatistics({ challenge, enrollment, trades });

    const canStart =
      displayStatus === CHALLENGE_DISPLAY_STATUS.WAITING &&
      Boolean(enrollment.account.login || enrollment.account.broker);

    const canSubmitTrades = displayStatus === CHALLENGE_DISPLAY_STATUS.ACTIVE;

    return {
      displayStatus,
      canStart,
      canSubmitTrades,
      applicationId: application?.id ?? enrollment.applicationId,
      enrollment,
      challenge,
      template,
      statistics,
      trades,
    };
  },

  async startChallenge(): Promise<ChallengeCenterState> {
    const user = await requireAuth();
    const db = createAdminClient();
    const state = await this.getChallengeCenterState(user.id);

    if (!state.enrollment) throw new Error("No challenge enrollment found.");
    if (!state.canStart) {
      throw new Error("Challenge cannot be started yet. Wait for account credentials.");
    }

    const now = new Date().toISOString();
    const { error } = await db
      .from("trader_challenge_enrollments")
      .update({
        status: "active",
        started_at: now,
        updated_at: now,
      } as never)
      .eq("id", state.enrollment.id)
      .eq("user_id", user.id);

    if (error) throw new Error(error.message);

    await notificationService.sendToUser({
      userId: user.id,
      type: "pm_challenge_started",
      title: "Challenge started",
      message: "Your Pool Manager challenge is now active. Record each trade in your Challenge Journal.",
      metadata: { enrollment_id: state.enrollment.id },
    });

    const { data: admins } = await db
      .from("profiles")
      .select("id")
      .eq("role", USER_ROLES.ADMINISTRATOR);

    for (const admin of (admins ?? []) as Array<{ id: string }>) {
      await notificationService.sendToUser({
        userId: admin.id,
        type: "admin_message",
        title: "Challenge started",
        message: `${user.fullName} started their Pool Manager challenge.`,
        metadata: { enrollment_id: state.enrollment.id, user_id: user.id },
      });
    }

    return this.getChallengeCenterState(user.id);
  },

  async provisionChallengeAccount(
    input: ProvisionChallengeAccountInput
  ): Promise<{ enrollmentId: string }> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    const template = await challengeTemplateService.getById(input.templateId);
    if (!template) {
      throw new Error("Challenge template not found.");
    }

    const challengeRow = await getPoolManagerChallenge();
    if (!challengeRow) {
      throw new Error("No active Pool Manager challenge configuration found.");
    }

    const notes = input.notes?.trim() || null;
    const initialBalance = template.startingBalance;
    const now = new Date().toISOString();

    const { data: existingEnrollment } = await db
      .from("trader_challenge_enrollments")
      .select("id")
      .eq("user_id", input.userId)
      .eq("challenge_id", challengeRow.id)
      .maybeSingle();

    let enrollmentId: string;

    if (existingEnrollment) {
      enrollmentId = (existingEnrollment as { id: string }).id;
      const { error } = await db
        .from("trader_challenge_enrollments")
        .update({
          status: "challenge_assigned",
          application_id: input.applicationId,
          challenge_template_id: input.templateId,
          account_broker: input.broker.trim(),
          account_server: input.server.trim(),
          account_login: input.login.trim(),
          account_password: input.password.trim(),
          account_investor_password: input.investorPassword?.trim() || null,
          initial_balance: initialBalance,
          challenge_account_details: notes,
          assigned_at: now,
          assigned_by: input.assignedBy,
          updated_at: now,
        } as never)
        .eq("id", enrollmentId);

      if (error) throw new Error(error.message);
    } else {
      const { data, error } = await db
        .from("trader_challenge_enrollments")
        .insert({
          user_id: input.userId,
          challenge_id: challengeRow.id,
          application_id: input.applicationId,
          challenge_template_id: input.templateId,
          status: "challenge_assigned",
          account_broker: input.broker.trim(),
          account_server: input.server.trim(),
          account_login: input.login.trim(),
          account_password: input.password.trim(),
          account_investor_password: input.investorPassword?.trim() || null,
          initial_balance: initialBalance,
          challenge_account_details: notes,
          assigned_at: now,
          assigned_by: input.assignedBy,
        } as never)
        .select("id")
        .single();

      if (error || !data) throw new Error(error?.message ?? "Could not create enrollment.");
      enrollmentId = (data as { id: string }).id;
    }

    await db
      .from("pool_manager_applications")
      .update({
        challenge_enrollment_id: enrollmentId,
        challenge_template_id: input.templateId,
        current_stage: 2,
      } as never)
      .eq("id", input.applicationId);

    await notificationService.sendToUser({
      userId: input.userId,
      type: "pm_application_submitted",
      title: "Challenge account ready",
      message:
        "Your challenge credentials are available. Open the Challenge Center and click Start Challenge when ready.",
      metadata: {
        application_id: input.applicationId,
        enrollment_id: enrollmentId,
      },
    });

    return { enrollmentId };
  },

  async checkAndCompleteChallenge(enrollmentId: string): Promise<void> {
    const db = createAdminClient();
    const state = await this.getAdminReviewState(enrollmentId);

    if (!state.statistics || state.enrollment?.status !== "active") return;

    if (!isChallengeCriteriaMet(state.statistics)) return;

    const { error } = await db
      .from("trader_challenge_enrollments")
      .update({
        status: "challenge_submitted",
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", enrollmentId)
      .eq("status", "active");

    if (error) return;

    if (state.enrollment) {
      await notificationService.sendToUser({
        userId: state.enrollment.userId,
        type: "pm_challenge_passed",
        title: "Challenge criteria met",
        message:
          "You have met all challenge requirements. Awaiting final administrator review.",
        metadata: { enrollment_id: enrollmentId },
      });

      const { data: admins } = await db
        .from("profiles")
        .select("id")
        .eq("role", USER_ROLES.ADMINISTRATOR);

      for (const admin of (admins ?? []) as Array<{ id: string }>) {
        await notificationService.sendToUser({
          userId: admin.id,
          type: "admin_message",
          title: "Challenge completed",
          message: `An applicant completed challenge requirements. Review and approve when ready.`,
          metadata: { enrollment_id: enrollmentId },
        });
      }
    }
  },

  async markChallengeOutcome(input: {
    enrollmentId: string;
    outcome: "passed" | "failed";
    notes?: string;
  }): Promise<void> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    if (input.outcome === "passed") {
      const { data: enrollmentData } = await db
        .from("trader_challenge_enrollments")
        .select("challenge_template_id")
        .eq("id", input.enrollmentId)
        .maybeSingle();

      const templateId = (enrollmentData as { challenge_template_id: string | null } | null)
        ?.challenge_template_id;
      const template = templateId
        ? await challengeTemplateService.getById(templateId)
        : await challengeTemplateService.getDefault();

      if (template?.tradingJournal.required) {
        const { count } = await db
          .from("challenge_trades")
          .select("id", { count: "exact", head: true })
          .eq("enrollment_id", input.enrollmentId);
        if (!count || count < 1) {
          throw new Error(
            "Challenge cannot be passed without at least one trading journal entry."
          );
        }
      }
    }

    const status = input.outcome === "passed" ? "passed" : "failed";
    const { data: enrollment, error } = await db
      .from("trader_challenge_enrollments")
      .update({
        status,
        admin_rules: input.notes?.trim() || null,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", input.enrollmentId)
      .select("user_id, application_id")
      .single();

    if (error || !enrollment) throw new Error(error?.message ?? "Update failed.");

    const row = enrollment as { user_id: string; application_id: string | null };

    await db.from("trader_challenge_results" as never).insert({
      enrollment_id: input.enrollmentId,
      application_id: row.application_id,
      passed: input.outcome === "passed",
      notes: input.notes?.trim() || null,
      completed_at: new Date().toISOString(),
    } as never);

    await notificationService.sendToUser({
      userId: row.user_id,
      type: input.outcome === "passed" ? "pm_challenge_passed" : "pm_challenge_failed",
      title: input.outcome === "passed" ? "Challenge passed" : "Challenge not passed",
      message:
        input.outcome === "passed"
          ? "Congratulations — you passed the trading challenge. Awaiting final Pool Manager approval."
          : input.notes?.trim() ??
            "Your challenge was not passed at this time. Contact support for details.",
      metadata: { enrollment_id: input.enrollmentId },
    });
  },

  async getAdminReviewState(enrollmentId: string): Promise<
    ChallengeCenterState & {
      applicantName: string;
      applicantEmail: string;
    }
  > {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    const { data: enrollmentData, error } = await db
      .from("trader_challenge_enrollments")
      .select("*, profiles!trader_challenge_enrollments_user_id_fkey(full_name, email)")
      .eq("id", enrollmentId)
      .single();

    if (error || !enrollmentData) {
      throw new Error(error?.message ?? "Enrollment not found.");
    }

    const profiles = (enrollmentData as Record<string, unknown>).profiles as {
      full_name: string;
      email: string;
    } | null;

    const enrollmentRow = enrollmentData as unknown as EnrollmentRow;
    const userId = enrollmentRow.user_id;

    const state = await this.getChallengeCenterState(userId);

    return {
      ...state,
      applicantName: profiles?.full_name ?? "Unknown",
      applicantEmail: profiles?.email ?? "",
    };
  },

  async listActiveEnrollmentsForAdmin(): Promise<
    Array<{
      enrollmentId: string;
      applicantName: string;
      status: string;
      tradesPending: number;
      startedAt: string | null;
    }>
  > {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    const { data, error } = await db
      .from("trader_challenge_enrollments")
      .select("id, status, started_at, user_id, profiles!trader_challenge_enrollments_user_id_fkey(full_name)")
      .in("status", [
        "waiting",
        "approved",
        "challenge_assigned",
        "active",
        "challenge_submitted",
        "completed",
        "passed",
        "failed",
      ])
      .order("updated_at", { ascending: false });

    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Array<Record<string, unknown>>;
    const results = await Promise.all(
      rows.map(async (row) => {
        const enrollmentId = row.id as string;
        const { count } = await db
          .from("challenge_trades")
          .select("id", { count: "exact", head: true })
          .eq("enrollment_id", enrollmentId)
          .eq("status", "pending_review");

        const profiles = row.profiles as { full_name: string } | null;
        return {
          enrollmentId,
          applicantName: profiles?.full_name ?? "Unknown",
          status: row.status as string,
          tradesPending: count ?? 0,
          startedAt: (row.started_at as string | null) ?? null,
        };
      })
    );

    return results;
  },
};
